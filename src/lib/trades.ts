import { createAdminClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'

// ── Types ──────────────────────────────────────────────────

interface ExecuteTradeParams {
  tradeId: string
  leagueId: string
  currentWeek: number
  dropSchoolIds?: string[] // schools the accepting team drops to make room (uneven trades)
  acceptingTeamId?: string // the team accepting (needed to know who drops)
}

interface DroppedSchoolRecord {
  teamId: string
  schoolId: string
  slotNumber: number
}

// ── Execute Trade ──────────────────────────────────────────

/**
 * Execute a trade: swap roster periods for both teams.
 *
 * For each trade item with direction='giving':
 *   1. Find the active roster_period for that school on the giving team
 *   2. Close it (set end_week = currentWeek)
 *   3. Insert a new roster_period for the receiving team
 *
 * If dropSchoolIds are provided (uneven trade), close those roster periods too.
 * Records all dropped schools in the trade's dropped_schools JSONB for veto restoration.
 */
export async function executeTrade(params: ExecuteTradeParams): Promise<{ success: boolean; error?: string }> {
  const { tradeId, leagueId, currentWeek, dropSchoolIds, acceptingTeamId } = params
  const supabase = createAdminClient()

  // Fetch trade and items
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .select('id, proposer_team_id, receiver_team_id, status')
    .eq('id', tradeId)
    .eq('league_id', leagueId)
    .single()

  if (tradeError || !trade) {
    return { success: false, error: 'Trade not found' }
  }

  const { data: items } = await supabase
    .from('trade_items')
    .select('id, team_id, school_id, direction')
    .eq('trade_id', tradeId)

  if (!items || items.length === 0) {
    return { success: false, error: 'No trade items found' }
  }

  const droppedSchools: DroppedSchoolRecord[] = []

  // Process each "giving" item — swap the school from one team to the other
  for (const item of items) {
    if (item.direction !== 'giving') continue

    const givingTeamId = item.team_id
    const receivingTeamId = givingTeamId === trade.proposer_team_id
      ? trade.receiver_team_id
      : trade.proposer_team_id

    // Find active roster period for this school on the giving team
    const { data: rosterPeriod, error: rpError } = await supabase
      .from('roster_periods')
      .select('id, slot_number')
      .eq('fantasy_team_id', givingTeamId)
      .eq('school_id', item.school_id)
      .is('end_week', null)
      .single()

    if (rpError || !rosterPeriod) {
      return { success: false, error: `School is no longer on the giving team's active roster` }
    }

    // Close the giving team's roster period
    const { error: closeError } = await supabase
      .from('roster_periods')
      .update({ end_week: currentWeek })
      .eq('id', rosterPeriod.id)

    if (closeError) {
      return { success: false, error: 'Failed to close roster period' }
    }

    // Open a new roster period for the receiving team
    const { error: insertError } = await supabase
      .from('roster_periods')
      .insert({
        fantasy_team_id: receivingTeamId,
        school_id: item.school_id,
        slot_number: rosterPeriod.slot_number,
        start_week: currentWeek,
      })

    if (insertError) {
      // Attempt rollback
      await supabase
        .from('roster_periods')
        .update({ end_week: null })
        .eq('id', rosterPeriod.id)
      return { success: false, error: 'Failed to create new roster period' }
    }
  }

  // Handle drop schools (uneven trades)
  if (dropSchoolIds && dropSchoolIds.length > 0 && acceptingTeamId) {
    for (const schoolId of dropSchoolIds) {
      const { data: dropPeriod } = await supabase
        .from('roster_periods')
        .select('id, slot_number')
        .eq('fantasy_team_id', acceptingTeamId)
        .eq('school_id', schoolId)
        .is('end_week', null)
        .single()

      if (dropPeriod) {
        await supabase
          .from('roster_periods')
          .update({ end_week: currentWeek })
          .eq('id', dropPeriod.id)

        droppedSchools.push({
          teamId: acceptingTeamId,
          schoolId,
          slotNumber: dropPeriod.slot_number,
        })
      }
    }
  }

  // Also record any proposer drops (stored on the trade at proposal time)
  const { data: tradeWithDrops } = await supabase
    .from('trades')
    .select('dropped_schools')
    .eq('id', tradeId)
    .single()

  const existingDrops = (tradeWithDrops?.dropped_schools as DroppedSchoolRecord[] | null) || []
  const allDrops = [...existingDrops, ...droppedSchools]

  // Mark trade as resolved
  const { error: updateError } = await supabase
    .from('trades')
    .update({
      status: 'accepted',
      resolved_at: new Date().toISOString(),
      dropped_schools: allDrops.length > 0 ? allDrops : null,
    })
    .eq('id', tradeId)

  if (updateError) {
    return { success: false, error: 'Failed to update trade status' }
  }

  // Increment trades_used on both teams
  for (const teamId of [trade.proposer_team_id, trade.receiver_team_id]) {
    await supabase.rpc('increment_field', {
      table_name: 'fantasy_teams',
      field_name: 'trades_used',
      row_id: teamId,
      amount: 1,
    }).then(({ error }) => {
      // Fallback if rpc doesn't exist — just do a raw update
      if (error) {
        supabase
          .from('fantasy_teams')
          .select('trades_used')
          .eq('id', teamId)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase
                .from('fantasy_teams')
                .update({ trades_used: (data.trades_used || 0) + 1 })
                .eq('id', teamId)
                .then(() => {})
            }
          })
      }
    })
  }

  return { success: true }
}

// ── Expire Stale Trades ────────────────────────────────────

/**
 * Lazy expiration: called on page load / API calls.
 * Marks expired trades and sends notifications.
 */
export async function expireStaleTradesForLeague(leagueId: string): Promise<void> {
  const supabase = createAdminClient()

  // Find and expire
  const { data: expiredTrades } = await supabase
    .from('trades')
    .select('id, proposer_team_id, receiver_team_id')
    .eq('league_id', leagueId)
    .eq('status', 'proposed')
    .lt('expires_at', new Date().toISOString())

  if (!expiredTrades || expiredTrades.length === 0) return

  const expiredIds = expiredTrades.map(t => t.id)

  await supabase
    .from('trades')
    .update({ status: 'expired', resolved_at: new Date().toISOString() })
    .in('id', expiredIds)

  // Notify proposers
  for (const trade of expiredTrades) {
    // Get proposer user_id
    const { data: team } = await supabase
      .from('fantasy_teams')
      .select('user_id')
      .eq('id', trade.proposer_team_id)
      .single()

    if (team) {
      createNotification({
        userId: team.user_id,
        leagueId,
        type: 'trade_expired',
        title: 'Trade Expired',
        body: 'Your trade proposal has expired without a response.',
        data: { tradeId: trade.id },
      })
    }
  }
}

// ── Send Expiration Reminders ──────────────────────────────

/**
 * Check for trades expiring within 24 hours and send reminders.
 * Called lazily on page load.
 */
export async function sendExpirationReminders(leagueId: string): Promise<void> {
  const supabase = createAdminClient()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: expiringTrades } = await supabase
    .from('trades')
    .select('id, receiver_team_id')
    .eq('league_id', leagueId)
    .eq('status', 'proposed')
    .eq('reminder_sent', false)
    .lt('expires_at', tomorrow.toISOString())
    .gt('expires_at', new Date().toISOString())

  if (!expiringTrades || expiringTrades.length === 0) return

  for (const trade of expiringTrades) {
    const { data: team } = await supabase
      .from('fantasy_teams')
      .select('user_id')
      .eq('id', trade.receiver_team_id)
      .single()

    if (team) {
      createNotification({
        userId: team.user_id,
        leagueId,
        type: 'trade_expiring',
        title: 'Trade Expiring Soon',
        body: 'A trade offer expires today. View it on your team page.',
        data: { tradeId: trade.id },
      })
    }

    await supabase
      .from('trades')
      .update({ reminder_sent: true })
      .eq('id', trade.id)
  }
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Get the expiration timestamp: midnight EST, 3 days from now.
 */
export function getExpiresAt(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  // Midnight EST = 05:00 UTC (EST is UTC-5)
  d.setUTCHours(5, 0, 0, 0)
  return d.toISOString()
}
