/**
 * Live Scores API — On-demand ESPN score refresh for CFB league games.
 *
 * Called by client-side polling (every 30s) when games are live.
 * Checks staleness: if scores were updated <30s ago, returns cached DB data.
 * If stale, fetches ESPN scoreboard, updates games table, recalculates points.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { fetchScoreboard } from '@/lib/api/espn'
import { calculateAllPoints } from '@/lib/points/calculator'
import { calculateCurrentWeek } from '@/lib/constants/season'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function GET(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const seasonId = request.nextUrl.searchParams.get('seasonId')
  if (!seasonId) {
    return NextResponse.json({ error: 'seasonId required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Check staleness — skip ESPN fetch if any game updated within 30s
  const { data: recentGame } = await admin
    .from('games')
    .select('updated_at')
    .eq('season_id', seasonId)
    .eq('game_date', today)
    .in('status', ['live', 'completed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const lastUpdate = recentGame?.updated_at ? new Date(recentGame.updated_at).getTime() : 0
  const isStale = Date.now() - lastUpdate > 30_000

  let syncResult = null

  if (isStale) {
    // Get school mappings
    const { data: schools } = await admin
      .from('schools')
      .select('id, external_api_id')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
      }
    }

    const year = now.getFullYear()
    const currentWeek = calculateCurrentWeek(year, now.getTime())

    // Fetch live scores from ESPN
    const games = await fetchScoreboard(year, currentWeek, 2)

    let updated = 0
    let live = 0
    let completed = 0

    for (const game of games) {
      const competition = game.competitions?.[0]
      if (!competition) continue

      const homeComp = competition.competitors.find((c: Record<string, unknown>) => c.homeAway === 'home')
      const awayComp = competition.competitors.find((c: Record<string, unknown>) => c.homeAway === 'away')
      if (!homeComp || !awayComp) continue

      const homeSchoolId = schoolMap.get(homeComp.team.id)
      const awaySchoolId = schoolMap.get(awayComp.team.id)
      if (!homeSchoolId && !awaySchoolId) continue

      let status = 'scheduled'
      if (competition.status.type.state === 'in') { status = 'live'; live++ }
      else if (competition.status.type.state === 'post') { status = 'completed'; completed++ }
      if (status === 'scheduled') continue

      const { error } = await admin
        .from('games')
        .update({
          home_score: parseInt(homeComp.score) || 0,
          away_score: parseInt(awayComp.score) || 0,
          status,
          quarter: status === 'live' ? String(competition.status.period) : null,
          clock: status === 'live' ? competition.status.displayClock : null,
          possession_team_id: competition.situation?.possession
            ? schoolMap.get(competition.situation.possession) || null
            : null,
          updated_at: now.toISOString(),
        })
        .eq('external_game_id', game.id)
        .eq('season_id', seasonId)

      if (!error) updated++
    }

    // Calculate points if games completed
    if (completed > 0) {
      const year = now.getFullYear()
      const currentWeek = calculateCurrentWeek(year, now.getTime())
      await calculateAllPoints(seasonId, currentWeek, admin)
    }

    syncResult = { gamesUpdated: updated, live, completed }
  }

  // Return today's games
  const { data: todaysGames } = await admin
    .from('games')
    .select('id, external_game_id, home_school_id, away_school_id, home_score, away_score, status, quarter, clock, possession_team_id, game_time, is_conference_game')
    .eq('season_id', seasonId)
    .eq('game_date', today)
    .order('game_time')

  return NextResponse.json({
    games: todaysGames || [],
    synced: isStale,
    syncResult,
  })
}
