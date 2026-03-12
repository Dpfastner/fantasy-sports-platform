/**
 * Event Gameday Sync — Live score updates for event tournaments.
 *
 * Ported from gameday-sync (league system) pattern:
 * - Smart windowing: only runs 30min before first game → 4hrs after last game
 * - Updates scores, period, clock, status in real-time
 * - Triggers scoring when games complete (bracket/survivor/pickem)
 * - Logs all ESPN calls to espn_api_health
 *
 * Schedule: Called externally every 10 minutes during game days
 * (Hobby plan only allows daily Vercel crons, so this is triggered
 * via external cron service or manual call)
 *
 * Also supports Vercel Cron daily trigger to check if games are today.
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { areCronsEnabled, getEnvironment } from '@/lib/env'
import {
  fetchHockeyTournamentGames,
  fetchRugbyMatches,
  fetchGolfLeaderboard,
  syncGameResults,
  type ESPNHockeyGame,
  type ESPNRugbyMatch,
} from '@/lib/events/espn-adapters'

function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return false
  }
  return true
}

export async function GET(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!areCronsEnabled()) {
      return NextResponse.json({
        skipped: true,
        reason: `Crons disabled in ${getEnvironment()} environment`,
      })
    }

    const admin = createAdminClient()
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // ── Step 1: Find tournaments with games today ──
    const { data: todaysGames } = await admin
      .from('event_games')
      .select('id, tournament_id, starts_at, status')
      .gte('starts_at', `${todayStr}T00:00:00Z`)
      .lte('starts_at', `${todayStr}T23:59:59Z`)
      .order('starts_at', { ascending: true })

    // Also check for carryover live games (started yesterday, still in progress)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: liveGames } = await admin
      .from('event_games')
      .select('id, tournament_id, starts_at, status')
      .gte('starts_at', `${yesterdayStr}T00:00:00Z`)
      .lte('starts_at', `${yesterdayStr}T23:59:59Z`)
      .eq('status', 'live')

    const allRelevantGames = [
      ...(todaysGames || []),
      ...(liveGames || []),
    ]

    if (allRelevantGames.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No event games scheduled for today',
        timestamp: now.toISOString(),
      })
    }

    // All games done for today?
    const hasActiveGames = allRelevantGames.some(
      g => g.status === 'live' || g.status === 'scheduled'
    )

    if (!hasActiveGames) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'All event games for today are complete',
        timestamp: now.toISOString(),
      })
    }

    // ── Step 2: Smart windowing ──
    const hasCarryoverLive = (liveGames?.length || 0) > 0
    const scheduledTimes = (todaysGames || [])
      .filter(g => g.starts_at)
      .map(g => new Date(g.starts_at).getTime())
      .sort((a, b) => a - b)

    if (scheduledTimes.length > 0 && !hasCarryoverLive) {
      const firstGameMs = scheduledTimes[0]
      const lastGameMs = scheduledTimes[scheduledTimes.length - 1]
      const windowStartMs = firstGameMs - 30 * 60 * 1000  // 30 min before first game
      const windowEndMs = lastGameMs + 4 * 60 * 60 * 1000 // 4 hrs after last game
      const nowMs = now.getTime()

      if (nowMs < windowStartMs || nowMs > windowEndMs) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: `Outside game window (${new Date(windowStartMs).toISOString()} - ${new Date(windowEndMs).toISOString()})`,
          nextCheck: nowMs < windowStartMs ? new Date(windowStartMs).toISOString() : 'tomorrow',
          timestamp: now.toISOString(),
        })
      }
    }

    // ── Step 3: Get tournaments to sync ──
    const tournamentIds = [...new Set(allRelevantGames.map(g => g.tournament_id))]
    const { data: tournaments } = await admin
      .from('event_tournaments')
      .select('id, sport, format, status, config')
      .in('id', tournamentIds)
      .in('status', ['active', 'upcoming'])

    if (!tournaments?.length) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No active tournaments with today\'s games',
        timestamp: now.toISOString(),
      })
    }

    // ── Step 4: Sync scores per sport ──
    const results: Record<string, unknown> = {}
    let totalUpdated = 0
    let totalLive = 0
    let totalCompleted = 0
    const newlyCompleted: { tournamentId: string; format: string; config: unknown }[] = []

    for (const tournament of tournaments) {
      const sport = tournament.sport
      const tournamentId = tournament.id

      try {
        if (sport === 'hockey') {
          const espnGames = await fetchHockeyTournamentGames(now.getFullYear(), admin)

          // Get our games for this tournament to match
          const { data: ourGames } = await admin
            .from('event_games')
            .select('id, external_id, participant_1_id, participant_2_id, status')
            .eq('tournament_id', tournamentId)

          let updated = 0
          let live = 0
          let completed = 0
          const prevStatuses = new Map(ourGames?.map(g => [g.id, g.status]) || [])

          for (const espnGame of espnGames) {
            // Match by external_id or by team names
            const ourGame = ourGames?.find(g => g.external_id === espnGame.espnEventId)
            if (!ourGame) continue

            // Only update live or completed games
            if (espnGame.status === 'scheduled') continue

            if (espnGame.status === 'live') live++
            if (espnGame.status === 'completed') completed++

            const updateData: Record<string, unknown> = {
              participant_1_score: espnGame.homeScore,
              participant_2_score: espnGame.awayScore,
              status: espnGame.status === 'completed' ? 'completed' : 'live',
              period: espnGame.period,
              clock: espnGame.clock,
              updated_at: now.toISOString(),
            }

            // Set winner if completed
            if (espnGame.isComplete && espnGame.winnerTeamId) {
              // Find participant by matching ESPN team ID in metadata or external_id
              const { data: participants } = await admin
                .from('event_participants')
                .select('id, external_id, metadata')
                .eq('tournament_id', tournamentId)

              const winner = participants?.find(p =>
                p.external_id === espnGame.winnerTeamId ||
                (p.metadata as Record<string, unknown>)?.espn_team_id === espnGame.winnerTeamId
              )

              if (winner) {
                updateData.winner_id = winner.id
                updateData.result = {
                  winner_name: espnGame.homeScore! > espnGame.awayScore!
                    ? espnGame.homeTeamName
                    : espnGame.awayTeamName,
                  is_overtime: espnGame.isOvertime,
                }
              }
            }

            const { error } = await admin
              .from('event_games')
              .update(updateData)
              .eq('id', ourGame.id)

            if (!error) {
              updated++
              // Track newly completed games
              if (espnGame.status === 'completed' && prevStatuses.get(ourGame.id) !== 'completed') {
                newlyCompleted.push({ tournamentId, format: tournament.format, config: tournament.config })
              }
            }
          }

          totalUpdated += updated
          totalLive += live
          totalCompleted += completed

          results[`hockey_${tournamentId}`] = {
            espn_games_fetched: espnGames.length,
            games_updated: updated,
            live,
            completed,
          }
        } else if (sport === 'rugby') {
          // Fetch today's rugby matches
          const dateStr = todayStr.replace(/-/g, '')
          const espnMatches = await fetchRugbyMatches([dateStr], admin)

          // Get our games for this tournament
          const { data: ourGames } = await admin
            .from('event_games')
            .select('id, external_id, participant_1_id, participant_2_id, status')
            .eq('tournament_id', tournamentId)

          // Get participants for team code matching
          const { data: participants } = await admin
            .from('event_participants')
            .select('id, short_name, external_id')
            .eq('tournament_id', tournamentId)

          const participantByCode = new Map(participants?.map(p => [p.short_name, p]) || [])

          let updated = 0
          let live = 0
          let completed = 0
          const prevStatuses = new Map(ourGames?.map(g => [g.id, g.status]) || [])

          for (const match of espnMatches) {
            if (match.status === 'scheduled') continue

            // Match by external_id or by team codes
            const ourGame = ourGames?.find(g => g.external_id === match.espnEventId)
            if (!ourGame) continue

            if (match.status === 'live') live++
            if (match.status === 'completed') completed++

            const updateData: Record<string, unknown> = {
              participant_1_score: match.homeScore,
              participant_2_score: match.awayScore,
              status: match.status === 'completed' ? 'completed' : 'live',
              period: match.period ? `${match.period}` : null,
              clock: match.displayClock || null,
              is_draw: match.isDraw,
              updated_at: now.toISOString(),
            }

            if (match.isComplete && match.winnerTeamCode) {
              const winnerParticipant = participantByCode.get(match.winnerTeamCode)
              if (winnerParticipant) {
                updateData.winner_id = winnerParticipant.id
              }
            }

            const { error } = await admin
              .from('event_games')
              .update(updateData)
              .eq('id', ourGame.id)

            if (!error) {
              updated++
              if (match.status === 'completed' && prevStatuses.get(ourGame.id) !== 'completed') {
                newlyCompleted.push({ tournamentId, format: tournament.format, config: tournament.config })
              }
            }
          }

          totalUpdated += updated
          totalLive += live
          totalCompleted += completed

          results[`rugby_${tournamentId}`] = {
            matches_fetched: espnMatches.length,
            games_updated: updated,
            live,
            completed,
          }
        } else if (sport === 'golf') {
          const config = (tournament.config || {}) as Record<string, unknown>
          const espnTournamentId = config.espn_tournament_id as string | undefined
          const golfers = await fetchGolfLeaderboard(espnTournamentId, admin)

          // Get our games (matchups) for this tournament
          const { data: ourGames } = await admin
            .from('event_games')
            .select('id, participant_1_id, participant_2_id, status')
            .eq('tournament_id', tournamentId)

          // Get participants with external IDs
          const { data: participants } = await admin
            .from('event_participants')
            .select('id, external_id')
            .eq('tournament_id', tournamentId)

          const golferById = new Map(golfers.map(g => [g.espnPlayerId, g]))
          const participantByExternal = new Map(participants?.map(p => [p.external_id, p]) || [])

          let updated = 0
          let completed = 0

          for (const game of ourGames || []) {
            const p1 = participants?.find(p => p.id === game.participant_1_id)
            const p2 = participants?.find(p => p.id === game.participant_2_id)
            if (!p1?.external_id || !p2?.external_id) continue

            const g1 = golferById.get(p1.external_id)
            const g2 = golferById.get(p2.external_id)
            if (!g1 || !g2) continue

            // Build live status text
            const liveStatus = `${g1.name}: ${g1.score || 'E'} | ${g2.name}: ${g2.score || 'E'}`

            const bothDone = (g1.status !== 'active') && (g2.status !== 'active')
            const updateData: Record<string, unknown> = {
              live_status: liveStatus,
              updated_at: now.toISOString(),
            }

            if (bothDone && game.status !== 'completed') {
              // Determine winner by position (lower is better)
              const p1Pos = g1.position || 999
              const p2Pos = g2.position || 999
              if (p1Pos < p2Pos) updateData.winner_id = p1.id
              else if (p2Pos < p1Pos) updateData.winner_id = p2.id
              updateData.status = 'completed'
              completed++
              newlyCompleted.push({ tournamentId, format: tournament.format, config: tournament.config })
            }

            const { error } = await admin
              .from('event_games')
              .update(updateData)
              .eq('id', game.id)

            if (!error) updated++
          }

          totalUpdated += updated
          totalCompleted += completed

          results[`golf_${tournamentId}`] = {
            golfers_fetched: golfers.length,
            games_updated: updated,
            completed,
          }
        }
      } catch (err) {
        console.error(`[event-gameday-sync] Error syncing ${sport} tournament ${tournamentId}:`, err)
        Sentry.captureException(err, { tags: { cron: 'event-gameday-sync', sport, tournamentId } })
        results[`${sport}_${tournamentId}`] = { error: String(err) }
      }
    }

    // ── Step 5: Trigger scoring for newly completed games ──
    const scoredTournaments = new Set<string>()
    for (const { tournamentId, format, config } of newlyCompleted) {
      if (scoredTournaments.has(tournamentId)) continue
      scoredTournaments.add(tournamentId)

      try {
        if (format === 'bracket') {
          await scoreBracketPicks(admin, tournamentId)
        } else if (format === 'survivor') {
          const weekDeadlines = ((config as Record<string, unknown>)?.week_deadlines || []) as string[]
          await scoreSurvivorPicks(admin, tournamentId, weekDeadlines)
        } else if (format === 'pickem') {
          await scorePickemPicks(admin, tournamentId)
        }
        results[`scoring_${tournamentId}`] = { triggered: true, format }
      } catch (err) {
        console.error(`[event-gameday-sync] Scoring error for ${tournamentId}:`, err)
        Sentry.captureException(err, { tags: { cron: 'event-gameday-sync', action: 'scoring', tournamentId } })
        results[`scoring_${tournamentId}`] = { error: String(err) }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        tournaments_synced: tournaments.length,
        games_updated: totalUpdated,
        live: totalLive,
        completed: totalCompleted,
        scoring_triggered: scoredTournaments.size,
      },
      results,
    })
  } catch (error) {
    console.error('Event gameday sync cron error:', error)
    Sentry.captureException(error, { tags: { cron: 'event-gameday-sync' } })
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}

// ── Scoring functions (duplicated from event-sync for independent operation) ──
// These are called when games transition to 'completed' during live sync.

async function scoreBracketPicks(admin: ReturnType<typeof createAdminClient>, tournamentId: string) {
  const { data: pools } = await admin
    .from('event_pools')
    .select('id, scoring_rules')
    .eq('tournament_id', tournamentId)

  if (!pools?.length) return

  const { data: games } = await admin
    .from('event_games')
    .select('id, round, winner_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')

  if (!games?.length) return

  const gameResults: Record<string, string> = {}
  for (const g of games) {
    if (g.winner_id) gameResults[g.id] = g.winner_id
  }

  const defaultScoring: Record<string, number> = {
    'regional_quarterfinal': 1,
    'regional_semifinal': 2,
    'regional_final': 4,
    'semifinal': 8,
    'championship': 16,
  }

  for (const pool of pools) {
    const scoring = (pool.scoring_rules && Object.keys(pool.scoring_rules).length > 0)
      ? pool.scoring_rules as Record<string, number>
      : defaultScoring

    const { data: entries } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', pool.id)

    if (!entries?.length) continue

    for (const entry of entries) {
      const { data: picks } = await admin
        .from('event_picks')
        .select('game_id, participant_id')
        .eq('entry_id', entry.id)

      if (!picks?.length) continue

      let score = 0
      for (const pick of picks) {
        if (!pick.game_id) continue
        const correctWinner = gameResults[pick.game_id]
        if (correctWinner && correctWinner === pick.participant_id) {
          const game = games.find(g => g.id === pick.game_id)
          const roundPoints = game ? (scoring[game.round] || 1) : 1
          score += roundPoints
        }
      }

      await admin
        .from('event_entries')
        .update({ score, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
    }

    await updatePoolRanks(admin, pool.id)
  }
}

async function scoreSurvivorPicks(
  admin: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  _weekDeadlines: string[]
) {
  const { data: pools } = await admin
    .from('event_pools')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (!pools?.length) return

  for (const pool of pools) {
    const { data: weeks } = await admin
      .from('event_pool_weeks')
      .select('id, week_number, deadline, resolution_status')
      .eq('pool_id', pool.id)
      .eq('resolution_status', 'pending')

    if (!weeks?.length) continue

    for (const week of weeks) {
      if (new Date(week.deadline) > new Date()) continue

      const { data: allRoundGames } = await admin
        .from('event_games')
        .select('id, status, winner_id')
        .eq('tournament_id', tournamentId)
        .eq('week_number', week.week_number)

      const allFinal = allRoundGames?.every(g => g.status === 'completed')
      if (!allFinal) continue

      const winnerIds = new Set<string>()
      for (const game of allRoundGames || []) {
        if (game.winner_id) winnerIds.add(game.winner_id)
      }

      const { data: entries } = await admin
        .from('event_entries')
        .select('id, score, is_active')
        .eq('pool_id', pool.id)
        .eq('is_active', true)

      if (!entries?.length) continue

      for (const entry of entries) {
        const { data: pick } = await admin
          .from('event_picks')
          .select('participant_id')
          .eq('entry_id', entry.id)
          .eq('week_number', week.week_number)
          .maybeSingle()

        if (!pick) {
          await admin
            .from('event_entries')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', entry.id)
          continue
        }

        if (!winnerIds.has(pick.participant_id)) {
          await admin
            .from('event_entries')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', entry.id)
        } else {
          await admin
            .from('event_entries')
            .update({
              score: (entry.score || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id)
        }
      }

      await admin
        .from('event_pool_weeks')
        .update({ resolution_status: 'resolved' })
        .eq('id', week.id)
    }

    await updatePoolRanks(admin, pool.id)
  }
}

async function scorePickemPicks(admin: ReturnType<typeof createAdminClient>, tournamentId: string) {
  const { data: pools } = await admin
    .from('event_pools')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (!pools?.length) return

  const { data: games } = await admin
    .from('event_games')
    .select('id, winner_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')

  if (!games?.length) return

  const gameResults: Record<string, string> = {}
  for (const g of games) {
    if (g.winner_id) gameResults[g.id] = g.winner_id
  }

  for (const pool of pools) {
    const { data: entries } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', pool.id)

    if (!entries?.length) continue

    for (const entry of entries) {
      const { data: picks } = await admin
        .from('event_picks')
        .select('game_id, participant_id')
        .eq('entry_id', entry.id)

      if (!picks?.length) continue

      let score = 0
      for (const pick of picks) {
        if (!pick.game_id) continue
        if (gameResults[pick.game_id] === pick.participant_id) score++
      }

      await admin
        .from('event_entries')
        .update({ score, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
    }

    await updatePoolRanks(admin, pool.id)
  }
}

async function updatePoolRanks(admin: ReturnType<typeof createAdminClient>, poolId: string) {
  const { data: entries } = await admin
    .from('event_entries')
    .select('id, score, is_active')
    .eq('pool_id', poolId)
    .order('score', { ascending: false })

  if (!entries?.length) return

  let rank = 0
  let prevScore = -1
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].score !== prevScore) {
      rank = i + 1
      prevScore = entries[i].score
    }
    await admin
      .from('event_entries')
      .update({ rank })
      .eq('id', entries[i].id)
  }
}
