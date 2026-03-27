/**
 * Live Scores API — On-demand ESPN score refresh.
 *
 * Called by client-side polling (every 30s) when games are live.
 * Checks staleness: if scores were updated <30s ago, returns cached DB data.
 * If stale, fetches ESPN, updates DB, triggers scoring if games completed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { syncHockeyScores } from '@/lib/events/sync-scores'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function GET(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const tournamentId = request.nextUrl.searchParams.get('tournamentId')
  if (!tournamentId) {
    return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get tournament info
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id, sport, format, status')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  // Check staleness — skip ESPN fetch if updated within last 30 seconds
  const { data: recentGame } = await admin
    .from('event_games')
    .select('updated_at')
    .eq('tournament_id', tournamentId)
    .in('status', ['live', 'completed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const lastUpdate = recentGame?.updated_at ? new Date(recentGame.updated_at).getTime() : 0
  const isStale = Date.now() - lastUpdate > 30_000

  let syncResult = null

  if (isStale) {
    // Fetch fresh scores from ESPN
    if (tournament.sport === 'hockey') {
      syncResult = await syncHockeyScores(admin, tournamentId)

      // Trigger scoring if games newly completed
      if (syncResult.newCompletions) {
        try {
          const scoreRes = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rivyls.com'}/api/events/score`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tournamentId }),
            }
          )
          if (!scoreRes.ok) {
            console.error('[live-scores] Scoring trigger failed:', scoreRes.status)
          }
        } catch (err) {
          console.error('[live-scores] Scoring trigger error:', err)
        }
      }
    }
    // TODO: Add rugby, golf adapters when needed
  }

  // Return current game state from DB
  const { data: games } = await admin
    .from('event_games')
    .select('id, round, game_number, participant_1_id, participant_2_id, participant_1_score, participant_2_score, starts_at, status, result, period, clock, live_status, winner_id')
    .eq('tournament_id', tournamentId)
    .order('game_number')

  return NextResponse.json({
    games: games || [],
    synced: isStale,
    syncResult,
  })
}
