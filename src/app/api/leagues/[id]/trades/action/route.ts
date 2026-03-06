import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { tradeActionSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { createNotification, notifyLeagueMembers } from '@/lib/notifications'
import { executeTrade } from '@/lib/trades'
import { getCurrentWeek } from '@/lib/week'
import { getLeagueYear } from '@/lib/league-helpers'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId } = await params
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'Not a league member' }, { status: 403 })
    }

    const rawBody = await request.json()
    const validation = validateBody(tradeActionSchema, rawBody)
    if (!validation.success) return validation.response

    const { tradeId, action, dropSchoolIds } = validation.data
    const supabase = createAdminClient()

    // Fetch the trade
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select(`
        *,
        trade_items (id, team_id, school_id, direction),
        proposer_team:proposer_team_id (id, name, user_id),
        receiver_team:receiver_team_id (id, name, user_id)
      `)
      .eq('id', tradeId)
      .eq('league_id', leagueId)
      .single()

    if (tradeError || !trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (trade.status !== 'proposed') {
      return NextResponse.json({ error: 'Trade is no longer pending' }, { status: 400 })
    }

    // Check if expired
    if (trade.expires_at && new Date(trade.expires_at) < new Date()) {
      await supabase
        .from('trades')
        .update({ status: 'expired', resolved_at: new Date().toISOString() })
        .eq('id', tradeId)
      return NextResponse.json({ error: 'Trade has expired' }, { status: 400 })
    }

    const proposerTeam = Array.isArray(trade.proposer_team) ? trade.proposer_team[0] : trade.proposer_team
    const receiverTeam = Array.isArray(trade.receiver_team) ? trade.receiver_team[0] : trade.receiver_team

    if (!proposerTeam || !receiverTeam) {
      return NextResponse.json({ error: 'Trade teams not found' }, { status: 500 })
    }

    // ── ACCEPT ──────────────────────────────────────────────

    if (action === 'accept') {
      // Only receiver can accept
      if (receiverTeam.user_id !== user.id) {
        return NextResponse.json({ error: 'Only the receiving team can accept' }, { status: 403 })
      }

      // Verify all schools still on respective active rosters
      const items = (trade.trade_items || []) as { id: string; team_id: string; school_id: string; direction: string }[]
      for (const item of items) {
        if (item.direction !== 'giving') continue
        const { data: rp } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', item.team_id)
          .eq('school_id', item.school_id)
          .is('end_week', null)
          .single()

        if (!rp) {
          return NextResponse.json({
            error: 'A school in this trade is no longer on the roster. The trade cannot be completed.',
          }, { status: 400 })
        }
      }

      // Verify no duplicate schools will result from the trade
      // Schools the proposer will receive (currently on receiver's roster, direction = 'giving' by receiver)
      const schoolsGoingToProposer = items.filter(i => i.team_id === receiverTeam.id && i.direction === 'giving').map(i => i.school_id)
      const schoolsGoingToReceiver = items.filter(i => i.team_id === proposerTeam.id && i.direction === 'giving').map(i => i.school_id)

      for (const schoolId of schoolsGoingToProposer) {
        const { data: dup } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', proposerTeam.id)
          .eq('school_id', schoolId)
          .is('end_week', null)
          .maybeSingle()
        if (dup && !schoolsGoingToReceiver.includes(schoolId)) {
          return NextResponse.json({ error: 'Trade would result in duplicate schools on a roster. It can no longer be completed.' }, { status: 400 })
        }
      }

      for (const schoolId of schoolsGoingToReceiver) {
        const { data: dup } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', receiverTeam.id)
          .eq('school_id', schoolId)
          .is('end_week', null)
          .maybeSingle()
        if (dup && !schoolsGoingToProposer.includes(schoolId)) {
          return NextResponse.json({ error: 'Trade would result in duplicate schools on a roster. It can no longer be completed.' }, { status: 400 })
        }
      }

      // Check for uneven trade — receiver may need to drop schools if roster would exceed max
      const receiverGiving = items.filter(i => i.team_id === receiverTeam.id && i.direction === 'giving').length
      const receiverReceiving = items.filter(i => i.team_id === proposerTeam.id && i.direction === 'giving').length
      const receiverNetGain = receiverReceiving - receiverGiving

      // Get receiver's current roster count and max roster size
      const { data: receiverRoster } = await supabase
        .from('roster_periods')
        .select('id')
        .eq('fantasy_team_id', receiverTeam.id)
        .is('end_week', null)

      const { data: leagueSettings } = await supabase
        .from('league_settings')
        .select('schools_per_team')
        .eq('league_id', leagueId)
        .single()

      const maxRosterSize = leagueSettings?.schools_per_team || 12
      const currentRosterCount = receiverRoster?.length || 0
      const rosterAfterTrade = currentRosterCount + receiverNetGain
      const dropsRequired = rosterAfterTrade > maxRosterSize ? rosterAfterTrade - maxRosterSize : 0

      if (dropsRequired > 0) {
        if (!dropSchoolIds || dropSchoolIds.length !== dropsRequired) {
          return NextResponse.json({
            error: `Your roster would exceed the maximum of ${maxRosterSize}. Select ${dropsRequired} school(s) to drop.`,
            requireDrops: dropsRequired,
          }, { status: 400 })
        }
        // Validate drop schools
        const tradeSchoolIds = new Set(items.map(i => i.school_id))
        for (const schoolId of dropSchoolIds) {
          if (tradeSchoolIds.has(schoolId)) {
            return NextResponse.json({ error: 'Cannot drop a school that is part of the trade' }, { status: 400 })
          }
          const { data: rp } = await supabase
            .from('roster_periods')
            .select('id')
            .eq('fantasy_team_id', receiverTeam.id)
            .eq('school_id', schoolId)
            .is('end_week', null)
            .single()
          if (!rp) {
            return NextResponse.json({ error: 'Drop school is not on your roster' }, { status: 400 })
          }
        }
      }

      // Get current week
      const { data: league } = await supabase
        .from('leagues')
        .select('seasons(year)')
        .eq('id', leagueId)
        .single()
      const year = (league?.seasons as { year: number } | { year: number }[] | null)
      const leagueYear = Array.isArray(year) ? year[0]?.year : year?.year
      const currentWeek = await getCurrentWeek(leagueYear || 2025)

      // Execute the trade
      const result = await executeTrade({
        tradeId,
        leagueId,
        currentWeek,
        dropSchoolIds: dropSchoolIds || undefined,
        acceptingTeamId: receiverTeam.id,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Trade execution failed' }, { status: 500 })
      }

      // Get school names for notification
      const schoolIds = items.map(i => i.school_id)
      const { data: schools } = await supabase
        .from('schools')
        .select('id, name')
        .in('id', schoolIds)
      const schoolNames = new Map(schools?.map(s => [s.id, s.name]) || [])

      const proposerGivingNames = items
        .filter(i => i.team_id === proposerTeam.id && i.direction === 'giving')
        .map(i => schoolNames.get(i.school_id) || 'Unknown')
      const receiverGivingNames = items
        .filter(i => i.team_id === receiverTeam.id && i.direction === 'giving')
        .map(i => schoolNames.get(i.school_id) || 'Unknown')

      logActivity({
        userId: user.id,
        leagueId,
        action: 'trade.executed',
        details: {
          tradeId,
          proposerTeam: proposerTeam.name,
          receiverTeam: receiverTeam.name,
          proposerGave: proposerGivingNames,
          receiverGave: receiverGivingNames,
        },
      })

      // Notify proposer
      createNotification({
        userId: proposerTeam.user_id,
        leagueId,
        type: 'trade_accepted',
        title: 'Trade Accepted!',
        body: `${receiverTeam.name} accepted your trade.`,
        data: { tradeId },
      })

      // Notify league
      notifyLeagueMembers({
        leagueId,
        excludeUserId: null,
        type: 'trade_accepted',
        title: 'Trade Completed',
        body: `${proposerTeam.name} traded ${proposerGivingNames.join(', ')} to ${receiverTeam.name} for ${receiverGivingNames.join(', ')}.`,
        data: { tradeId },
      })

      return NextResponse.json({ success: true, action: 'accepted' })
    }

    // ── REJECT ──────────────────────────────────────────────

    if (action === 'reject') {
      if (receiverTeam.user_id !== user.id) {
        return NextResponse.json({ error: 'Only the receiving team can reject' }, { status: 403 })
      }

      await supabase
        .from('trades')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', tradeId)

      logActivity({
        userId: user.id,
        leagueId,
        action: 'trade.rejected',
        details: { tradeId },
      })

      createNotification({
        userId: proposerTeam.user_id,
        leagueId,
        type: 'trade_rejected',
        title: 'Trade Rejected',
        body: `${receiverTeam.name} rejected your trade offer.`,
        data: { tradeId },
      })

      return NextResponse.json({ success: true, action: 'rejected' })
    }

    // ── CANCEL ──────────────────────────────────────────────

    if (action === 'cancel') {
      if (proposerTeam.user_id !== user.id) {
        return NextResponse.json({ error: 'Only the proposing team can cancel' }, { status: 403 })
      }

      await supabase
        .from('trades')
        .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
        .eq('id', tradeId)

      logActivity({
        userId: user.id,
        leagueId,
        action: 'trade.cancelled',
        details: { tradeId },
      })

      createNotification({
        userId: receiverTeam.user_id,
        leagueId,
        type: 'trade_cancelled',
        title: 'Trade Cancelled',
        body: `${proposerTeam.name} cancelled their trade offer.`,
        data: { tradeId },
      })

      return NextResponse.json({ success: true, action: 'cancelled' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Trade action error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process trade action' },
      { status: 500 }
    )
  }
}
