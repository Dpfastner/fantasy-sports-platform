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
import { notifyPoolMembers } from '@/lib/notifications'
import {
  fetchHockeyTournamentGames,
  fetchRugbyMatches,
  fetchRugbyMatchesSportsDb,
  fetchGolfLeaderboard,
  syncGameResults,
  type ESPNHockeyGame,
  type ESPNRugbyMatch,
} from '@/lib/events/espn-adapters'
import {
  scoreRosterEntry,
  type RosterScoringRules,
  DEFAULT_ROSTER_SCORING,
} from '@/lib/events/shared'

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

    // ── Step 1b: Find roster/multi tournaments active today (no games needed) ──
    const { data: rosterTournaments } = await admin
      .from('event_tournaments')
      .select('id, sport, format, status, config')
      .in('format', ['roster', 'multi'])
      .in('status', ['active', 'upcoming'])
      .lte('starts_at', now.toISOString())
      .gte('ends_at', now.toISOString())

    const hasGames = allRelevantGames.length > 0
    const hasRosterTournaments = (rosterTournaments?.length || 0) > 0

    if (!hasGames && !hasRosterTournaments) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No event games scheduled for today and no active roster tournaments',
        timestamp: now.toISOString(),
      })
    }

    // All games done for today? (still proceed if roster tournaments are active)
    const hasActiveGames = allRelevantGames.some(
      g => g.status === 'live' || g.status === 'scheduled'
    )

    if (!hasActiveGames && !hasRosterTournaments) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'All event games for today are complete',
        timestamp: now.toISOString(),
      })
    }

    // ── Step 2: Smart windowing (only for game-based tournaments) ──
    const hasCarryoverLive = (liveGames?.length || 0) > 0
    const scheduledTimes = (todaysGames || [])
      .filter(g => g.starts_at)
      .map(g => new Date(g.starts_at).getTime())
      .sort((a, b) => a - b)

    // Skip windowing check if roster tournaments are active (they always need syncing)
    if (scheduledTimes.length > 0 && !hasCarryoverLive && !hasRosterTournaments) {
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
    const gameTournamentIds = [...new Set(allRelevantGames.map(g => g.tournament_id))]
    let tournaments: { id: string; sport: string; format: string; status: string; config: unknown }[] = []

    if (gameTournamentIds.length > 0) {
      const { data: gameTournaments } = await admin
        .from('event_tournaments')
        .select('id, sport, format, status, config')
        .in('id', gameTournamentIds)
        .in('status', ['active', 'upcoming'])
      if (gameTournaments?.length) tournaments.push(...gameTournaments)
    }

    // Merge roster tournaments (deduplicate by ID)
    if (rosterTournaments?.length) {
      const existingIds = new Set(tournaments.map(t => t.id))
      for (const rt of rosterTournaments) {
        if (!existingIds.has(rt.id)) tournaments.push(rt)
      }
    }

    if (!tournaments.length) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No active tournaments to sync',
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
          // Fetch today's rugby matches — check score_source config
          const tConfig = (tournament.config || {}) as Record<string, unknown>
          let espnMatches: ESPNRugbyMatch[]
          if (tConfig.score_source === 'sportsdb') {
            const leagueId = String(tConfig.sportsdb_league_id || '5563')
            espnMatches = await fetchRugbyMatchesSportsDb(leagueId)
          } else {
            const dateStr = todayStr.replace(/-/g, '')
            espnMatches = await fetchRugbyMatches([dateStr], admin)
          }

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

            // Match by external_id first, then fall back to team codes
            let ourGame = ourGames?.find(g => g.external_id === match.espnEventId)
            if (!ourGame) {
              // Fallback: match by home/away team codes via participants
              const homeParticipant = participantByCode.get(match.homeTeamCode)
              const awayParticipant = participantByCode.get(match.awayTeamCode)
              if (homeParticipant && awayParticipant) {
                ourGame = ourGames?.find(g =>
                  (g.participant_1_id === homeParticipant.id && g.participant_2_id === awayParticipant.id) ||
                  (g.participant_1_id === awayParticipant.id && g.participant_2_id === homeParticipant.id)
                )
                // Write back external_id for fast future matching
                if (ourGame) {
                  await admin.from('event_games').update({ external_id: match.espnEventId }).eq('id', ourGame.id)
                }
              }
            }
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

          // Get participants with external IDs
          const { data: participants } = await admin
            .from('event_participants')
            .select('id, external_id, metadata')
            .eq('tournament_id', tournamentId)

          const golferById = new Map(golfers.map(g => [g.espnPlayerId, g]))

          // ── Update participant metadata with live scores (for roster pools) ──
          let participantsUpdated = 0
          for (const participant of participants || []) {
            if (!participant.external_id) continue
            const golfer = golferById.get(participant.external_id)
            if (!golfer) continue

            const existingMeta = (participant.metadata || {}) as Record<string, unknown>
            const updatedMeta = {
              ...existingMeta,
              r1: golfer.roundScores?.[0] ?? existingMeta.r1 ?? null,
              r2: golfer.roundScores?.[1] ?? existingMeta.r2 ?? null,
              r3: golfer.roundScores?.[2] ?? existingMeta.r3 ?? null,
              r4: golfer.roundScores?.[3] ?? existingMeta.r4 ?? null,
              total_strokes: golfer.roundScores
                ? golfer.roundScores.filter((s): s is number => s !== null).reduce((a, b) => a + b, 0) || null
                : existingMeta.total_strokes,
              score_to_par: golfer.scoreToPar ?? existingMeta.score_to_par ?? null,
              status: golfer.status || existingMeta.status || 'active',
              position: golfer.position || existingMeta.position || null,
              score_display: golfer.score || existingMeta.score_display || null,
              country: golfer.country || existingMeta.country || null,
              country_code: golfer.countryCode || existingMeta.country_code || null,
            }

            const { error } = await admin
              .from('event_participants')
              .update({ metadata: updatedMeta, updated_at: now.toISOString() })
              .eq('id', participant.id)

            if (!error) participantsUpdated++
          }

          // ── Update pick'em matchup games (if any exist) ──
          const { data: ourGames } = await admin
            .from('event_games')
            .select('id, participant_1_id, participant_2_id, status')
            .eq('tournament_id', tournamentId)

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

          // ── Score roster pools after participant metadata sync ──
          if (participantsUpdated > 0) {
            const { data: rosterPools } = await admin
              .from('event_pools')
              .select('id, scoring_rules')
              .eq('tournament_id', tournamentId)
              .eq('game_type', 'roster')

            for (const pool of rosterPools || []) {
              try {
                await scoreRosterPoolLive(admin, pool, tournamentId)
              } catch (err) {
                console.error(`[event-gameday-sync] Roster scoring error for pool ${pool.id}:`, err)
                Sentry.captureException(err, { tags: { cron: 'event-gameday-sync', action: 'roster_scoring', poolId: pool.id } })
              }
            }
          }

          totalUpdated += updated
          totalCompleted += completed

          results[`golf_${tournamentId}`] = {
            golfers_fetched: golfers.length,
            participants_updated: participantsUpdated,
            games_updated: updated,
            completed,
            roster_pools_scored: (await admin.from('event_pools').select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId).eq('game_type', 'roster')).count || 0,
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
        } else if (format === 'multi') {
          // Multi-format tournaments: score each pool type separately based on game_type
          const { data: multiPools } = await admin
            .from('event_pools')
            .select('id, game_type, scoring_rules')
            .eq('tournament_id', tournamentId)

          for (const mp of multiPools || []) {
            if (mp.game_type === 'bracket') await scoreBracketPicks(admin, tournamentId)
            else if (mp.game_type === 'pickem') await scorePickemPicks(admin, tournamentId)
            // roster pools are scored inline during golf sync (above)
          }
        }
        results[`scoring_${tournamentId}`] = { triggered: true, format }

        // Notify pool members about results (fire-and-forget)
        const { data: scoredPools } = await admin
          .from('event_pools')
          .select('id, name, tournament_id, event_tournaments(slug)')
          .eq('tournament_id', tournamentId)
        for (const sp of scoredPools || []) {
          const slug = (sp.event_tournaments as unknown as { slug: string })?.slug
          notifyPoolMembers({
            poolId: sp.id,
            type: 'event_results',
            title: 'Scores updated',
            body: `Games have finished and scores have been updated in ${sp.name}.`,
            data: { poolId: sp.id, tournamentSlug: slug },
          })
        }
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
    'regional_quarterfinal': 2,
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
        .update({ total_points: score, updated_at: new Date().toISOString() })
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
    // Get tournament slug for notification URLs
    const { data: poolTournament } = await admin
      .from('event_tournaments')
      .select('slug, name')
      .eq('id', tournamentId)
      .single()

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
        .select('id, user_id, total_points, is_active')
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
          // Notify: eliminated (missed deadline)
          const { createNotification } = await import('@/lib/notifications')
          createNotification({
            userId: entry.user_id,
            type: 'event_eliminated',
            title: 'Eliminated - Missed Pick',
            body: `You missed the Round ${week.week_number} deadline and have been eliminated.`,
            data: { poolId: pool.id, tournamentSlug: poolTournament?.slug },
          })
          continue
        }

        if (!winnerIds.has(pick.participant_id)) {
          await admin
            .from('event_entries')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', entry.id)
          // Notify: eliminated (wrong pick)
          const { createNotification } = await import('@/lib/notifications')
          createNotification({
            userId: entry.user_id,
            type: 'event_eliminated',
            title: 'Eliminated',
            body: `Your Round ${week.week_number} pick lost. Better luck next time!`,
            data: { poolId: pool.id, tournamentSlug: poolTournament?.slug },
          })
        } else {
          await admin
            .from('event_entries')
            .update({
              total_points: (Number(entry.total_points) || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id)
          // Notify: survived
          const { createNotification } = await import('@/lib/notifications')
          createNotification({
            userId: entry.user_id,
            type: 'event_survived',
            title: 'You survived!',
            body: `Your Round ${week.week_number} pick won. You advance to the next round.`,
            data: { poolId: pool.id, tournamentSlug: poolTournament?.slug },
          })
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
        .update({ total_points: score, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
    }

    await updatePoolRanks(admin, pool.id)
  }
}

// Rank is computed at read time from total_points ordering — no separate column needed
async function updatePoolRanks(_admin: ReturnType<typeof createAdminClient>, _poolId: string) {
  // no-op: rank is derived from total_points sort order on the client
}

/** Score all entries in a roster pool using live participant metadata */
async function scoreRosterPoolLive(
  admin: ReturnType<typeof createAdminClient>,
  pool: { id: string; scoring_rules: unknown },
  tournamentId: string
) {
  const rules = (pool.scoring_rules && typeof pool.scoring_rules === 'object' && 'roster_size' in (pool.scoring_rules as Record<string, unknown>))
    ? pool.scoring_rules as RosterScoringRules
    : DEFAULT_ROSTER_SCORING

  // Get all participants with current metadata
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name, metadata')
    .eq('tournament_id', tournamentId)

  if (!participants?.length) return

  // Get all entries for this pool
  const { data: entries } = await admin
    .from('event_entries')
    .select('id')
    .eq('pool_id', pool.id)

  if (!entries?.length) return

  for (const entry of entries) {
    const { data: picks } = await admin
      .from('event_picks')
      .select('id, participant_id')
      .eq('entry_id', entry.id)
      .is('game_id', null)
      .is('week_number', null)

    if (!picks?.length) continue

    // Cast to expected types — scoreRosterEntry only uses participant_id from picks
    // and id/name/metadata from participants
    const result = scoreRosterEntry(
      picks as unknown as Parameters<typeof scoreRosterEntry>[0],
      participants as unknown as Parameters<typeof scoreRosterEntry>[1],
      rules
    )

    // Update individual pick points
    for (const pickResult of result.results) {
      const pick = picks.find(p => p.participant_id === pickResult.participantId)
      if (pick) {
        await admin
          .from('event_picks')
          .update({ points_earned: pickResult.scoreToPar ?? 0 })
          .eq('id', pick.id)
      }
    }

    // Update entry total
    await admin
      .from('event_entries')
      .update({ total_points: result.totalPoints, updated_at: new Date().toISOString() })
      .eq('id', entry.id)
  }
}
