import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { tradeProposalSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { createNotification } from '@/lib/notifications'
import { getExpiresAt, expireStaleTradesForLeague, sendExpirationReminders } from '@/lib/trades'
import { getCurrentWeek } from '@/lib/week'
import { getSimulatedDate } from '@/lib/week'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

// ── POST: Propose a trade ─────────────────────────────────

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

    // Verify membership
    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const rawBody = await request.json()
    const validation = validateBody(tradeProposalSchema, rawBody)
    if (!validation.success) return validation.response

    const { receiverTeamId, giving, receiving, message, counterToTradeId, dropSchoolIds } = validation.data
    const supabase = createAdminClient()

    // Get user's team
    const { data: myTeam } = await supabase
      .from('fantasy_teams')
      .select('id, name, trades_used')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!myTeam) {
      return NextResponse.json({ error: 'You do not have a team in this league' }, { status: 400 })
    }

    // Get receiver team
    const { data: receiverTeam } = await supabase
      .from('fantasy_teams')
      .select('id, name, user_id, trades_used')
      .eq('id', receiverTeamId)
      .eq('league_id', leagueId)
      .single()

    if (!receiverTeam) {
      return NextResponse.json({ error: 'Receiver team not found in this league' }, { status: 400 })
    }

    if (receiverTeam.id === myTeam.id) {
      return NextResponse.json({ error: 'Cannot trade with yourself' }, { status: 400 })
    }

    // Check league settings
    const { data: settings } = await supabase
      .from('league_settings')
      .select('trades_enabled, trade_deadline, max_trades_per_season')
      .eq('league_id', leagueId)
      .single()

    if (!settings?.trades_enabled) {
      return NextResponse.json({ error: 'Trading is disabled in this league' }, { status: 403 })
    }

    // Check trade deadline
    if (settings.trade_deadline) {
      const { data: league } = await supabase
        .from('leagues')
        .select('seasons(year)')
        .eq('id', leagueId)
        .single()
      const year = (league?.seasons as { year: number } | { year: number }[] | null)
      const leagueYear = Array.isArray(year) ? year[0]?.year : year?.year
      const simulatedDate = await getSimulatedDate(leagueYear || 2025)
      if (simulatedDate > new Date(settings.trade_deadline)) {
        return NextResponse.json({ error: 'The trade deadline has passed' }, { status: 403 })
      }
    }

    // Check trade limits
    const maxTrades = settings.max_trades_per_season ?? 10
    if (myTeam.trades_used >= maxTrades) {
      return NextResponse.json({ error: 'You have reached your trade limit for the season' }, { status: 400 })
    }
    if (receiverTeam.trades_used >= maxTrades) {
      return NextResponse.json({ error: 'The other team has reached their trade limit for the season' }, { status: 400 })
    }

    // Block same-school-for-same-school trades (e.g. trading Georgia for Georgia)
    const overlap = giving.filter(id => receiving.includes(id))
    if (overlap.length > 0) {
      return NextResponse.json({ error: 'Cannot trade a school for the same school' }, { status: 400 })
    }

    // Check that receiving schools are not already on proposer's active roster
    for (const schoolId of receiving) {
      const { data: alreadyOnRoster } = await supabase
        .from('roster_periods')
        .select('id')
        .eq('fantasy_team_id', myTeam.id)
        .eq('school_id', schoolId)
        .is('end_week', null)
        .maybeSingle()

      if (alreadyOnRoster) {
        return NextResponse.json({ error: 'You already have one of the requested schools on your roster' }, { status: 400 })
      }
    }

    // Check that giving schools are not already on receiver's active roster
    for (const schoolId of giving) {
      const { data: alreadyOnRoster } = await supabase
        .from('roster_periods')
        .select('id')
        .eq('fantasy_team_id', receiverTeam.id)
        .eq('school_id', schoolId)
        .is('end_week', null)
        .maybeSingle()

      if (alreadyOnRoster) {
        return NextResponse.json({ error: 'The other team already has one of the schools you are offering' }, { status: 400 })
      }
    }

    // Verify giving schools are on user's active roster
    for (const schoolId of giving) {
      const { data: rp } = await supabase
        .from('roster_periods')
        .select('id')
        .eq('fantasy_team_id', myTeam.id)
        .eq('school_id', schoolId)
        .is('end_week', null)
        .single()

      if (!rp) {
        return NextResponse.json({ error: 'One or more schools you are offering are not on your roster' }, { status: 400 })
      }
    }

    // Verify receiving schools are on receiver's active roster
    for (const schoolId of receiving) {
      const { data: rp } = await supabase
        .from('roster_periods')
        .select('id')
        .eq('fantasy_team_id', receiverTeam.id)
        .eq('school_id', schoolId)
        .is('end_week', null)
        .single()

      if (!rp) {
        return NextResponse.json({ error: 'One or more schools you are requesting are not on the other team\'s roster' }, { status: 400 })
      }
    }

    // If proposer receives more than they give, check if drops are needed based on roster capacity
    const proposerNetGain = receiving.length - giving.length

    // Get proposer's current roster count and max roster size
    const { data: proposerRoster } = await supabase
      .from('roster_periods')
      .select('id')
      .eq('fantasy_team_id', myTeam.id)
      .is('end_week', null)

    const { data: tradeSettings } = await supabase
      .from('league_settings')
      .select('schools_per_team')
      .eq('league_id', leagueId)
      .single()

    const maxRoster = tradeSettings?.schools_per_team || 12
    const proposerRosterCount = proposerRoster?.length || 0
    const proposerRosterAfter = proposerRosterCount + proposerNetGain
    const proposerDropsRequired = proposerRosterAfter > maxRoster ? proposerRosterAfter - maxRoster : 0

    if (proposerDropsRequired > 0) {
      if (!dropSchoolIds || dropSchoolIds.length !== proposerDropsRequired) {
        return NextResponse.json({
          error: `Your roster would exceed the maximum of ${maxRoster}. Select ${proposerDropsRequired} school(s) to drop.`,
          requireDrops: proposerDropsRequired,
        }, { status: 400 })
      }
      // Validate drop schools are on proposer's roster and not in the trade
      for (const schoolId of dropSchoolIds) {
        if (giving.includes(schoolId) || receiving.includes(schoolId)) {
          return NextResponse.json({ error: 'Cannot drop a school that is part of the trade' }, { status: 400 })
        }
        const { data: rp } = await supabase
          .from('roster_periods')
          .select('id')
          .eq('fantasy_team_id', myTeam.id)
          .eq('school_id', schoolId)
          .is('end_week', null)
          .single()
        if (!rp) {
          return NextResponse.json({ error: 'Drop school is not on your roster' }, { status: 400 })
        }
      }
    }

    // If this is a counter-offer, mark the original trade as 'countered'
    if (counterToTradeId) {
      const { data: originalTrade } = await supabase
        .from('trades')
        .select('id, status')
        .eq('id', counterToTradeId)
        .eq('league_id', leagueId)
        .single()

      if (originalTrade && originalTrade.status === 'proposed') {
        await supabase
          .from('trades')
          .update({ status: 'countered', resolved_at: new Date().toISOString() })
          .eq('id', counterToTradeId)
      }
    }

    // Build proposer dropped_schools record
    let proposerDroppedSchools = null
    if (dropSchoolIds && dropSchoolIds.length > 0) {
      const drops = []
      for (const schoolId of dropSchoolIds) {
        const { data: rp } = await supabase
          .from('roster_periods')
          .select('slot_number')
          .eq('fantasy_team_id', myTeam.id)
          .eq('school_id', schoolId)
          .is('end_week', null)
          .single()
        drops.push({ teamId: myTeam.id, schoolId, slotNumber: rp?.slot_number || 0 })
      }
      proposerDroppedSchools = drops
    }

    // Insert trade
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        league_id: leagueId,
        proposer_team_id: myTeam.id,
        receiver_team_id: receiverTeam.id,
        status: 'proposed',
        message: message || null,
        expires_at: getExpiresAt(),
        counter_to_trade_id: counterToTradeId || null,
        dropped_schools: proposerDroppedSchools,
      })
      .select('id')
      .single()

    if (tradeError || !trade) {
      console.error('Error creating trade:', tradeError)
      return NextResponse.json({ error: 'Couldn\'t create the trade. Try again.' }, { status: 500 })
    }

    // Insert trade items
    const tradeItems = [
      ...giving.map(schoolId => ({
        trade_id: trade.id,
        team_id: myTeam.id,
        school_id: schoolId,
        direction: 'giving' as const,
      })),
      ...receiving.map(schoolId => ({
        trade_id: trade.id,
        team_id: receiverTeam.id,
        school_id: schoolId,
        direction: 'giving' as const,
      })),
    ]

    const { error: itemsError } = await supabase
      .from('trade_items')
      .insert(tradeItems)

    if (itemsError) {
      console.error('Error creating trade items:', itemsError)
      // Clean up the trade
      await supabase.from('trades').delete().eq('id', trade.id)
      return NextResponse.json({ error: 'Couldn\'t create the trade. Try again.' }, { status: 500 })
    }

    // Log activity
    logActivity({
      userId: user.id,
      leagueId,
      action: 'trade.proposed',
      details: {
        tradeId: trade.id,
        proposerTeam: myTeam.name,
        receiverTeam: receiverTeam.name,
        givingCount: giving.length,
        receivingCount: receiving.length,
      },
    })

    // Notify receiver
    createNotification({
      userId: receiverTeam.user_id,
      leagueId,
      type: 'trade_proposed',
      title: 'Trade Offer Received',
      body: `${myTeam.name} has proposed a trade. View it on your team page.`,
      data: { tradeId: trade.id },
    })

    return NextResponse.json({ success: true, tradeId: trade.id })

  } catch (error) {
    Sentry.captureException(error)
    console.error('Propose trade error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Couldn\'t propose the trade. Try again.' },
      { status: 500 }
    )
  }
}

// ── GET: List trades for a league ─────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Lazy cleanup
    await expireStaleTradesForLeague(leagueId)
    await sendExpirationReminders(leagueId)

    // Fetch trades with items and related data
    const { data: trades, error } = await supabase
      .from('trades')
      .select(`
        *,
        trade_items (
          id, team_id, school_id, direction,
          schools:school_id (id, name, abbreviation, logo_url, conference)
        ),
        proposer_team:proposer_team_id (id, name, user_id),
        receiver_team:receiver_team_id (id, name, user_id)
      `)
      .eq('league_id', leagueId)
      .order('proposed_at', { ascending: false })

    if (error) {
      console.error('Error fetching trades:', error)
      return NextResponse.json({ error: 'Couldn\'t load trades. Try refreshing the page.' }, { status: 500 })
    }

    return NextResponse.json({ trades: trades || [] })

  } catch (error) {
    Sentry.captureException(error)
    console.error('List trades error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Couldn\'t load trades. Try refreshing the page.' },
      { status: 500 }
    )
  }
}
