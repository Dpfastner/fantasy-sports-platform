import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { tradeVetoSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { createNotification, notifyLeagueMembers } from '@/lib/notifications'
import { getCurrentWeek } from '@/lib/week'
import { getLeagueYear } from '@/lib/league-helpers'

const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })

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

    const supabase = createAdminClient()

    // Verify commissioner role
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'commissioner' && membership.role !== 'co_commissioner')) {
      return NextResponse.json({ error: 'Only commissioners can veto trades' }, { status: 403 })
    }

    const rawBody = await request.json()
    const validation = validateBody(tradeVetoSchema, rawBody)
    if (!validation.success) return validation.response

    const { tradeId, reason } = validation.data

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

    // Can veto proposed or accepted (executed) trades
    if (trade.status !== 'proposed' && trade.status !== 'accepted') {
      return NextResponse.json({ error: 'This trade cannot be vetoed' }, { status: 400 })
    }

    const proposerTeam = Array.isArray(trade.proposer_team) ? trade.proposer_team[0] : trade.proposer_team
    const receiverTeam = Array.isArray(trade.receiver_team) ? trade.receiver_team[0] : trade.receiver_team

    // If the trade was already executed (status = 'accepted'), reverse roster changes
    if (trade.status === 'accepted') {
      const { data: league } = await supabase
        .from('leagues')
        .select('seasons(year)')
        .eq('id', leagueId)
        .single()
      const year = (league?.seasons as { year: number } | { year: number }[] | null)
      const leagueYear = Array.isArray(year) ? year[0]?.year : year?.year
      const currentWeek = await getCurrentWeek(leagueYear || 2025)

      const items = trade.trade_items || []

      // Reverse each traded school: close the new period, reopen the old one
      for (const item of items) {
        if (item.direction !== 'giving') continue

        const givingTeamId = item.team_id
        const receivingTeamId = givingTeamId === trade.proposer_team_id
          ? trade.receiver_team_id
          : trade.proposer_team_id

        // Close the new roster period (on receiving team)
        const { data: newPeriod } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', receivingTeamId)
          .eq('school_id', item.school_id)
          .is('end_week', null)
          .single()

        if (newPeriod) {
          await supabase
            .from('roster_periods')
            .update({ end_week: currentWeek })
            .eq('id', newPeriod.id)
        }

        // Reopen the old roster period (on giving team) — find the most recently closed one
        const { data: oldPeriod } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', givingTeamId)
          .eq('school_id', item.school_id)
          .not('end_week', 'is', null)
          .order('end_week', { ascending: false })
          .limit(1)
          .single()

        if (oldPeriod) {
          await supabase
            .from('roster_periods')
            .update({ end_week: null })
            .eq('id', oldPeriod.id)
        }
      }

      // Restore dropped schools
      const droppedSchools = (trade.dropped_schools as { teamId: string; schoolId: string; slotNumber: number }[] | null) || []
      for (const drop of droppedSchools) {
        // Reopen the dropped school's roster period
        const { data: droppedPeriod } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', drop.teamId)
          .eq('school_id', drop.schoolId)
          .not('end_week', 'is', null)
          .order('end_week', { ascending: false })
          .limit(1)
          .single()

        if (droppedPeriod) {
          await supabase
            .from('roster_periods')
            .update({ end_week: null })
            .eq('id', droppedPeriod.id)
        }
      }

      // Decrement trades_used on both teams
      for (const teamId of [trade.proposer_team_id, trade.receiver_team_id]) {
        const { data: team } = await supabase
          .from('fantasy_teams')
          .select('trades_used')
          .eq('id', teamId)
          .single()

        if (team && team.trades_used > 0) {
          await supabase
            .from('fantasy_teams')
            .update({ trades_used: team.trades_used - 1 })
            .eq('id', teamId)
        }
      }
    }

    // Update trade status to vetoed
    await supabase
      .from('trades')
      .update({
        status: 'vetoed',
        resolved_at: new Date().toISOString(),
        commissioner_override: true,
        override_reason: reason,
      })
      .eq('id', tradeId)

    logActivity({
      userId: user.id,
      leagueId,
      action: 'trade.vetoed',
      details: { tradeId, reason, wasExecuted: trade.status === 'accepted' },
    })

    // Notify both teams
    if (proposerTeam) {
      createNotification({
        userId: proposerTeam.user_id,
        leagueId,
        type: 'trade_vetoed',
        title: 'Trade Vetoed',
        body: `A commissioner vetoed the trade${trade.status === 'accepted' ? ' and reversed the roster changes' : ''}. Reason: ${reason}`,
        data: { tradeId },
      })
    }
    if (receiverTeam) {
      createNotification({
        userId: receiverTeam.user_id,
        leagueId,
        type: 'trade_vetoed',
        title: 'Trade Vetoed',
        body: `A commissioner vetoed the trade${trade.status === 'accepted' ? ' and reversed the roster changes' : ''}. Reason: ${reason}`,
        data: { tradeId },
      })
    }

    // Notify league
    notifyLeagueMembers({
      leagueId,
      excludeUserId: null,
      type: 'trade_vetoed',
      title: 'Trade Vetoed',
      body: `A commissioner vetoed a trade between ${proposerTeam?.name || 'Unknown'} and ${receiverTeam?.name || 'Unknown'}.`,
      data: { tradeId },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Trade veto error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to veto trade' },
      { status: 500 }
    )
  }
}
