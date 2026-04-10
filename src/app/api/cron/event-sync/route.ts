import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { areCronsEnabled, getEnvironment } from '@/lib/env'
import {
  fetchRugbyMatches,
  fetchHockeyTournamentGames,
  fetchGolfLeaderboard,
  syncGameResults,
} from '@/lib/events/espn-adapters'
import { notifyPoolMembers, createNotification } from '@/lib/notifications'

// Verify the request is from Vercel Cron
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
    const results: Record<string, unknown> = {}

    // Get active/upcoming tournaments
    const { data: tournaments } = await admin
      .from('event_tournaments')
      .select('id, sport, format, status, config, starts_at, ends_at')
      .in('status', ['active', 'upcoming'])

    if (!tournaments?.length) {
      return NextResponse.json({ message: 'No active tournaments to sync', results })
    }

    for (const tournament of tournaments) {
      const tournamentId = tournament.id
      const sport = tournament.sport

      try {
        if (sport === 'rugby') {
          // Fetch Six Nations matches
          const config = (tournament.config || {}) as Record<string, unknown>
          const weekDeadlines = (config.week_deadlines || []) as string[]

          // Generate date range covering tournament period
          const start = new Date(tournament.starts_at)
          const end = tournament.ends_at ? new Date(tournament.ends_at) : new Date(start.getTime() + 60 * 24 * 60 * 60 * 1000)
          const dates: string[] = []
          const current = new Date(start)
          while (current <= end) {
            dates.push(current.toISOString().split('T')[0].replace(/-/g, ''))
            current.setDate(current.getDate() + 7) // Check weekly
          }

          const matches = await fetchRugbyMatches(dates, admin)
          if (matches.length > 0) {
            // Match ESPN results to event_games by matching participant short_names
            const syncResults = []
            for (const match of matches) {
              if (!match.isComplete) continue

              // Find participants by short_name
              const { data: homeP } = await admin
                .from('event_participants')
                .select('id')
                .eq('tournament_id', tournamentId)
                .eq('short_name', match.homeTeamCode)
                .single()

              const { data: awayP } = await admin
                .from('event_participants')
                .select('id')
                .eq('tournament_id', tournamentId)
                .eq('short_name', match.awayTeamCode)
                .single()

              if (!homeP || !awayP) continue

              // Find the game matching these two participants
              const { data: game } = await admin
                .from('event_games')
                .select('id, participant_1_id')
                .eq('tournament_id', tournamentId)
                .or(`and(participant_1_id.eq.${homeP.id},participant_2_id.eq.${awayP.id}),and(participant_1_id.eq.${awayP.id},participant_2_id.eq.${homeP.id})`)
                .single()

              if (!game) continue

              // Determine if our p1 is home or away to assign scores correctly
              const p1IsHome = game.participant_1_id === homeP.id

              const winnerId = match.winnerTeamCode === match.homeTeamCode
                ? homeP.id
                : match.winnerTeamCode === match.awayTeamCode
                ? awayP.id
                : null

              await admin
                .from('event_games')
                .update({
                  participant_1_score: p1IsHome ? match.homeScore : match.awayScore,
                  participant_2_score: p1IsHome ? match.awayScore : match.homeScore,
                  status: 'final',
                  winner_id: winnerId,
                  is_draw: match.isDraw,
                  result: {
                    home_score: match.homeScore,
                    away_score: match.awayScore,
                    winner_id: winnerId,
                    is_draw: match.isDraw,
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq('id', game.id)

              syncResults.push({ gameId: game.id, winner: match.winnerTeamCode })
            }

            results[`rugby_${tournamentId}`] = {
              matches_fetched: matches.length,
              games_updated: syncResults.length,
            }

            // Score survivor picks if games resolved
            if (syncResults.length > 0) {
              await scoreSurvivorPicks(admin, tournamentId, weekDeadlines)
            }
          }
        } else if (sport === 'hockey') {
          // Fetch NCAA hockey tournament games
          const hockeyGames = await fetchHockeyTournamentGames(undefined, admin)

          if (hockeyGames.length > 0) {
            // Get participants with external_id mapping
            const completedGames = hockeyGames.filter(g => g.isComplete)

            const syncData = completedGames.map(g => ({
              externalId: g.espnEventId,
              homeScore: g.homeScore,
              awayScore: g.awayScore,
              status: g.status as 'scheduled' | 'live' | 'completed',
              winnerId: g.winnerTeamId,
              isDraw: false,
            }))

            const updated = await syncGameResults(admin, tournamentId, syncData)

            // Also update result JSON for bracket scoring
            for (const game of completedGames) {
              const { data: dbGame } = await admin
                .from('event_games')
                .select('id')
                .eq('tournament_id', tournamentId)
                .eq('external_id', game.espnEventId)
                .single()

              if (dbGame) {
                // Find winner participant
                const { data: winnerP } = await admin
                  .from('event_participants')
                  .select('id')
                  .eq('tournament_id', tournamentId)
                  .eq('external_id', game.winnerTeamId)
                  .maybeSingle()

                if (winnerP) {
                  await admin
                    .from('event_games')
                    .update({
                      result: {
                        home_score: game.homeScore,
                        away_score: game.awayScore,
                        winner_id: winnerP.id,
                      },
                    })
                    .eq('id', dbGame.id)
                }
              }
            }

            results[`hockey_${tournamentId}`] = {
              games_fetched: hockeyGames.length,
              games_updated: updated,
            }

            // Score bracket picks
            if (updated > 0) {
              await scoreBracketPicks(admin, tournamentId)
            }
          }
        } else if (sport === 'golf') {
          // Fetch golf leaderboard
          const config = (tournament.config || {}) as Record<string, unknown>
          const espnTournamentId = config.espn_tournament_id as string | undefined

          const golfers = await fetchGolfLeaderboard(espnTournamentId, admin)

          if (golfers.length > 0) {
            // Update pick'em game results based on golfer positions
            // For each matchup game, determine winner by comparing positions
            const { data: games } = await admin
              .from('event_games')
              .select('id, participant_1_id, participant_2_id, status')
              .eq('tournament_id', tournamentId)

            if (games) {
              // Map participant external_id to golfer position
              const { data: participants } = await admin
                .from('event_participants')
                .select('id, external_id')
                .eq('tournament_id', tournamentId)

              const participantToPosition: Record<string, number> = {}
              const participantToStatus: Record<string, string> = {}

              for (const p of participants || []) {
                const golfer = golfers.find(g => g.espnPlayerId === p.external_id)
                if (golfer) {
                  participantToPosition[p.id] = golfer.position || 999
                  participantToStatus[p.id] = golfer.status
                }
              }

              let golfUpdated = 0
              for (const game of games) {
                if (game.status === 'final') continue
                if (!game.participant_1_id || !game.participant_2_id) continue

                const p1Pos = participantToPosition[game.participant_1_id]
                const p2Pos = participantToPosition[game.participant_2_id]
                if (p1Pos === undefined || p2Pos === undefined) continue

                // Only mark final if both golfers have finished (cut or completed all rounds)
                const p1Status = participantToStatus[game.participant_1_id]
                const p2Status = participantToStatus[game.participant_2_id]
                const bothDone = (p1Status === 'cut' || p1Status === 'wd' || p1Status === 'dq') ||
                                 (p2Status === 'cut' || p2Status === 'wd' || p2Status === 'dq') ||
                                 (p1Pos <= golfers.length && p2Pos <= golfers.length)

                // Determine round from game metadata
                const { data: gameData } = await admin
                  .from('event_games')
                  .select('round')
                  .eq('id', game.id)
                  .single()

                // For golf pick'em, games are resolved per round
                // Only mark final if the round is complete
                const winnerId = p1Pos < p2Pos ? game.participant_1_id
                  : p2Pos < p1Pos ? game.participant_2_id
                  : null // tie

                if (bothDone && winnerId) {
                  await admin
                    .from('event_games')
                    .update({
                      status: 'final',
                      winner_id: winnerId,
                      result: {
                        p1_position: p1Pos,
                        p2_position: p2Pos,
                        winner_id: winnerId,
                      },
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', game.id)
                  golfUpdated++
                }
              }

              results[`golf_${tournamentId}`] = {
                golfers_fetched: golfers.length,
                games_updated: golfUpdated,
              }

              if (golfUpdated > 0) {
                await scorePickemPicks(admin, tournamentId)
              }
            }
          }
        }
      } catch (err) {
        console.error(`[event-sync] Error syncing tournament ${tournamentId} (${sport}):`, err)
        Sentry.captureException(err, {
          tags: { cron: 'event-sync', sport, tournamentId },
        })
        results[`error_${tournamentId}`] = err instanceof Error ? err.message : String(err)
      }
    }

    // ── Failsafe: Re-score games completed in last 2 days ──
    // Ported from league daily-sync pattern: catch any scoring that was missed
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentlyCompleted } = await admin
      .from('event_games')
      .select('tournament_id')
      .in('status', ['final', 'completed'])
      .gte('updated_at', twoDaysAgo)

    if (recentlyCompleted?.length) {
      const failsafeTournamentIds = [...new Set(recentlyCompleted.map(g => g.tournament_id))]
      for (const tid of failsafeTournamentIds) {
        const tournament = tournaments?.find(t => t.id === tid)
        if (!tournament) continue
        try {
          if (tournament.format === 'bracket') await scoreBracketPicks(admin, tid)
          else if (tournament.format === 'pickem') await scorePickemPicks(admin, tid)
          // Survivor handled by its own weekly resolution
          results[`failsafe_${tid}`] = { re_scored: true }
        } catch (e) {
          results[`failsafe_${tid}`] = { error: String(e) }
        }
      }
    }

    // ── Game time sync: Update starts_at from ESPN if changed ──
    for (const tournament of (tournaments || [])) {
      try {
        if (tournament.sport === 'hockey') {
          const espnGames = await fetchHockeyTournamentGames(undefined, admin)
          for (const eg of espnGames) {
            if (!eg.date) continue
            await admin
              .from('event_games')
              .update({ starts_at: eg.date })
              .eq('tournament_id', tournament.id)
              .eq('external_id', eg.espnEventId)
              .neq('starts_at', eg.date)
          }
        }
      } catch {
        // Non-critical, don't fail the cron
      }
    }

    // ── Deadline reminders: notify pool members 24hrs before deadline ──
    try {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Find open pools with a deadline in the next 24 hours
      const { data: openPools } = await admin
        .from('event_pools')
        .select('id, name, deadline, tournament_id, event_tournaments(slug, starts_at)')
        .eq('status', 'open')

      for (const pool of openPools || []) {
        const t = pool.event_tournaments as unknown as { slug: string; starts_at: string }
        // Use pool deadline or tournament start as the effective deadline
        const effectiveDeadline = pool.deadline || t?.starts_at
        if (!effectiveDeadline) continue

        const deadlineDate = new Date(effectiveDeadline)
        // Only send if deadline is between now and 24hrs from now
        if (deadlineDate <= now || deadlineDate > tomorrow) continue

        // Find members who haven't submitted picks yet
        const { data: entries } = await admin
          .from('event_entries')
          .select('id, user_id, submitted_at')
          .eq('pool_id', pool.id)

        for (const entry of entries || []) {
          if (entry.submitted_at) continue // Already submitted
          createNotification({
            userId: entry.user_id,
            type: 'event_deadline',
            title: 'Picks deadline approaching',
            body: `${pool.name} locks in less than 24 hours. Submit your picks!`,
            data: { poolId: pool.id, tournamentSlug: t?.slug },
          })
        }
      }

      // Survivor week deadlines
      const { data: pendingWeeks } = await admin
        .from('event_pool_weeks')
        .select('id, pool_id, week_number, deadline')
        .eq('resolution_status', 'pending')

      for (const week of pendingWeeks || []) {
        const deadlineDate = new Date(week.deadline)
        if (deadlineDate <= now || deadlineDate > tomorrow) continue

        const { data: poolInfo } = await admin
          .from('event_pools')
          .select('name, event_tournaments(slug)')
          .eq('id', week.pool_id)
          .single()

        if (!poolInfo) continue
        const slug = (poolInfo.event_tournaments as unknown as { slug: string })?.slug

        // Find active entries without a pick for this week
        const { data: activeEntries } = await admin
          .from('event_entries')
          .select('id, user_id')
          .eq('pool_id', week.pool_id)
          .eq('is_active', true)

        for (const entry of activeEntries || []) {
          const { data: existingPick } = await admin
            .from('event_picks')
            .select('id')
            .eq('entry_id', entry.id)
            .eq('week_number', week.week_number)
            .maybeSingle()

          if (existingPick) continue // Already picked

          createNotification({
            userId: entry.user_id,
            type: 'event_deadline',
            title: `Round ${week.week_number} deadline approaching`,
            body: `Submit your survivor pick for ${poolInfo.name} before the deadline!`,
            data: { poolId: week.pool_id, tournamentSlug: slug },
          })
        }
      }
    } catch (err) {
      console.error('[event-sync] Deadline reminder error:', err)
      // Non-critical, don't fail the cron
    }

    // Check if any tournaments should transition status
    await updateTournamentStatuses(admin)

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('[event-sync] Fatal error:', err)
    Sentry.captureException(err, { tags: { cron: 'event-sync' } })
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

// ── Scoring helpers ──

async function scoreBracketPicks(admin: ReturnType<typeof createAdminClient>, tournamentId: string) {
  // Get all pools for this tournament
  const { data: pools } = await admin
    .from('event_pools')
    .select('id, scoring_rules')
    .eq('tournament_id', tournamentId)

  if (!pools?.length) return

  // Get all completed games with results
  const { data: games } = await admin
    .from('event_games')
    .select('id, round, winner_id, result')
    .eq('tournament_id', tournamentId)
    .eq('status', 'final')

  if (!games?.length) return

  // Build game results map
  const gameResults: Record<string, string> = {} // gameId -> winnerId
  for (const g of games) {
    if (g.winner_id) gameResults[g.id] = g.winner_id
  }

  // Default scoring by round
  const defaultScoring: Record<string, number> = {
    'Regional Semifinal': 1,
    'Regional Final': 2,
    'National Semifinal': 4,
    'Championship': 8,
  }

  for (const pool of pools) {
    const scoring = (pool.scoring_rules && Object.keys(pool.scoring_rules).length > 0)
      ? pool.scoring_rules as Record<string, number>
      : defaultScoring

    // Get all entries
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
          // Find the round for this game
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

    // Update ranks within pool
    await updatePoolRanks(admin, pool.id)
  }
}

async function scoreSurvivorPicks(
  admin: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  weekDeadlines: string[]
) {
  // Get pools for this tournament
  const { data: pools } = await admin
    .from('event_pools')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (!pools?.length) return

  for (const pool of pools) {
    // Get pool weeks that are past deadline
    const { data: weeks } = await admin
      .from('event_pool_weeks')
      .select('id, week_number, deadline, resolution_status')
      .eq('pool_id', pool.id)
      .eq('resolution_status', 'pending')

    if (!weeks?.length) continue

    for (const week of weeks) {
      if (new Date(week.deadline) > new Date()) continue // Not past deadline yet

      // Get completed games for this round
      const { data: roundGames } = await admin
        .from('event_games')
        .select('id, winner_id, participant_1_id, participant_2_id')
        .eq('tournament_id', tournamentId)
        .eq('round', `Round ${week.week_number}`)
        .eq('status', 'final')

      // Need all games in the round to be final before resolving
      const { data: allRoundGames } = await admin
        .from('event_games')
        .select('id, status')
        .eq('tournament_id', tournamentId)
        .eq('round', `Round ${week.week_number}`)

      const allFinal = allRoundGames?.every(g => g.status === 'final')
      if (!allFinal) continue

      // Build set of winning participant IDs
      const winnerIds = new Set<string>()
      for (const game of roundGames || []) {
        if (game.winner_id) winnerIds.add(game.winner_id)
      }

      // Get all entries for this pool
      const { data: entries } = await admin
        .from('event_entries')
        .select('id, is_active, total_points')
        .eq('pool_id', pool.id)
        .eq('is_active', true)

      if (!entries?.length) continue

      for (const entry of entries) {
        // Get pick for this week
        const { data: pick } = await admin
          .from('event_picks')
          .select('participant_id')
          .eq('entry_id', entry.id)
          .eq('week_number', week.week_number)
          .maybeSingle()

        if (!pick) {
          // Missed deadline — eliminate
          await admin
            .from('event_entries')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', entry.id)

          // Insert a missed-deadline pick record
          await admin
            .from('event_picks')
            .insert({
              entry_id: entry.id,
              week_number: week.week_number,
              participant_id: '00000000-0000-0000-0000-000000000000', // placeholder
              missed_deadline: true,
              picked_at: new Date().toISOString(),
            })
          continue
        }

        // Check if picked team won
        if (!winnerIds.has(pick.participant_id)) {
          // Picked team lost — eliminate
          await admin
            .from('event_entries')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', entry.id)
        } else {
          // Survived — increment total_points
          await admin
            .from('event_entries')
            .update({
              total_points: (Number((entry as unknown as { total_points: number }).total_points) || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id)
        }
      }

      // Mark week as resolved
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

  // Get all completed games
  const { data: games } = await admin
    .from('event_games')
    .select('id, winner_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'final')

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
        if (gameResults[pick.game_id] === pick.participant_id) {
          score++
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

// Rank is computed at read time from total_points ordering — no separate column needed
async function updatePoolRanks(_admin: ReturnType<typeof createAdminClient>, _poolId: string) {
  // no-op: rank is derived from total_points sort order on the client
}

async function updateTournamentStatuses(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date()

  // Upcoming → active (if starts_at has passed)
  await admin
    .from('event_tournaments')
    .update({ status: 'active' })
    .eq('status', 'upcoming')
    .lte('starts_at', now.toISOString())

  // Auto-lock pools when first game starts (or pool deadline passes)
  // For bracket/pickem: lock when tournament starts_at arrives
  // For survivor: individual week deadlines handle locking per-week (pool stays open)
  const { data: openPools } = await admin
    .from('event_pools')
    .select('id, tournament_id, deadline, event_tournaments(starts_at, format)')
    .eq('status', 'open')

  for (const pool of openPools || []) {
    const tournament = pool.event_tournaments as unknown as { starts_at: string; format: string }
    if (!tournament) continue

    // Survivor pools don't auto-lock — they use per-week deadlines
    if (tournament.format === 'survivor') continue

    // Lock if pool-specific deadline has passed, OR tournament first game has started
    const lockTime = pool.deadline || tournament.starts_at
    if (new Date(lockTime) <= now) {
      await admin
        .from('event_pools')
        .update({ status: 'locked' })
        .eq('id', pool.id)
    }
  }

  // Active → completed (if ends_at has passed AND all games are final)
  const { data: activeTournaments } = await admin
    .from('event_tournaments')
    .select('id, ends_at')
    .eq('status', 'active')

  for (const t of activeTournaments || []) {
    if (!t.ends_at || new Date(t.ends_at) > now) continue

    const { data: pendingGames } = await admin
      .from('event_games')
      .select('id')
      .eq('tournament_id', t.id)
      .neq('status', 'final')

    if (!pendingGames?.length) {
      await admin
        .from('event_tournaments')
        .update({ status: 'completed' })
        .eq('id', t.id)

      // Lock all pools
      await admin
        .from('event_pools')
        .update({ status: 'completed' })
        .eq('tournament_id', t.id)
    }
  }
}
