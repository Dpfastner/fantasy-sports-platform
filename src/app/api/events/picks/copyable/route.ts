import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/events/picks/copyable?tournamentId=xxx&excludePoolId=yyy
// Returns the user's submitted bracket entries from other pools for the same tournament.
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId is required' }, { status: 400 })
    }

    const excludePoolId = searchParams.get('excludePoolId')
    const admin = createAdminClient()

    // Find bracket pools for this tournament
    let poolsQuery = admin
      .from('event_pools')
      .select('id, name')
      .eq('tournament_id', tournamentId)
      .eq('game_type', 'bracket')

    if (excludePoolId) {
      poolsQuery = poolsQuery.neq('id', excludePoolId)
    }

    const { data: pools } = await poolsQuery
    if (!pools?.length) {
      return NextResponse.json({ entries: [] })
    }

    const poolMap = new Map(pools.map(p => [p.id, p.name]))

    // Find user's submitted entries in those pools
    const { data: entries } = await admin
      .from('event_entries')
      .select('id, pool_id, display_name, submitted_at')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .in('pool_id', pools.map(p => p.id))

    if (!entries?.length) {
      return NextResponse.json({ entries: [] })
    }

    // Fetch picks for each entry
    const result = []
    for (const entry of entries) {
      const { data: picks } = await admin
        .from('event_picks')
        .select('game_id, participant_id')
        .eq('entry_id', entry.id)

      if (!picks?.length) continue

      result.push({
        entryId: entry.id,
        poolName: poolMap.get(entry.pool_id) || 'Unknown Pool',
        displayName: entry.display_name,
        pickCount: picks.length,
        picks: picks
          .filter(p => p.game_id)
          .map(p => ({ gameId: p.game_id, participantId: p.participant_id })),
      })
    }

    return NextResponse.json({ entries: result })
  } catch (err) {
    console.error('Copyable picks fetch error:', err)
    Sentry.captureException(err, { tags: { route: 'events/picks/copyable' } })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
