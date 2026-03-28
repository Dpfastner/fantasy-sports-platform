/**
 * Live Scores API — On-demand ESPN score refresh for event tournaments.
 *
 * Called by client-side polling (every 30s) when games are live.
 * Checks staleness: if scores were updated <30s ago, returns cached DB data.
 * If stale, fetches ESPN, updates DB, triggers scoring if games completed.
 *
 * Supports: hockey, rugby, golf
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { syncHockeyScores, syncRugbyScores, syncGolfScores } from '@/lib/events/sync-scores'

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
    .select('id, sport, format, status, config')
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
    const config = (tournament.config || {}) as Record<string, unknown>

    if (tournament.sport === 'hockey') {
      syncResult = await syncHockeyScores(admin, tournamentId)
    } else if (tournament.sport === 'rugby') {
      syncResult = await syncRugbyScores(admin, tournamentId, config)
    } else if (tournament.sport === 'golf') {
      syncResult = await syncGolfScores(admin, tournamentId, config)
    }

    // Trigger scoring if games newly completed
    if (syncResult?.newCompletions) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.VERCEL_URL}` || 'https://www.rivyls.com'
        const scoreRes = await fetch(
          `${baseUrl}/api/events/score`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
            },
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

  // Return current game state from DB
  const { data: games } = await admin
    .from('event_games')
    .select('id, round, game_number, participant_1_id, participant_2_id, participant_1_score, participant_2_score, starts_at, status, result, period, clock, live_status, winner_id')
    .eq('tournament_id', tournamentId)
    .order('game_number')

  // For golf: also return participant metadata (leaderboard data)
  let participants = null
  if (tournament.sport === 'golf') {
    const { data: parts } = await admin
      .from('event_participants')
      .select('id, name, short_name, seed, logo_url, external_id, metadata')
      .eq('tournament_id', tournamentId)
    participants = parts
  }

  return NextResponse.json({
    games: games || [],
    participants,
    synced: isStale,
    syncResult,
  })
}
