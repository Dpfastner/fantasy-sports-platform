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
  fetchGolfFieldFromCore,
  fetchCourseData,
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

    // Also check yesterday's games (UTC) — US evening games are "yesterday" in UTC
    // Include both live and scheduled since the sync may not have marked them live yet
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: liveGames } = await admin
      .from('event_games')
      .select('id, tournament_id, starts_at, status')
      .gte('starts_at', `${yesterdayStr}T00:00:00Z`)
      .lte('starts_at', `${yesterdayStr}T23:59:59Z`)
      .in('status', ['live', 'scheduled'])

    const allRelevantGames = [
      ...(todaysGames || []),
      ...(liveGames || []),
    ]

    // ── Step 1b: Find roster/multi tournaments active today (no games needed) ──
    // Trust `status` as authoritative — tournaments that have fully concluded
    // are moved to status='completed' by the event-sync daily cron. Don't use
    // ends_at as a secondary filter because it's a hint and can drift: an
    // 'active' tournament should always be synced even if ends_at has already
    // passed (e.g. a Sunday round running into overtime or a rain delay).
    const { data: rosterTournaments } = await admin
      .from('event_tournaments')
      .select('id, sport, format, status, config, course_data')
      .in('format', ['roster', 'multi'])
      .in('status', ['active', 'upcoming'])
      .lte('starts_at', now.toISOString())

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
    let tournaments: { id: string; sport: string; format: string; status: string; config: unknown; course_data?: unknown }[] = []

    if (gameTournamentIds.length > 0) {
      const { data: gameTournaments } = await admin
        .from('event_tournaments')
        .select('id, sport, format, status, config, course_data')
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

          // Fetch participants once for winner matching + fallback game matching
          const { data: participants } = await admin
            .from('event_participants')
            .select('id, external_id, metadata')
            .eq('tournament_id', tournamentId)

          let updated = 0
          let live = 0
          let completed = 0
          const prevStatuses = new Map(ourGames?.map(g => [g.id, g.status]) || [])

          for (const espnGame of espnGames) {
            // Match by external_id first
            let ourGame = ourGames?.find(g => g.external_id === espnGame.espnEventId)

            // Fallback: match by participant ESPN team IDs on both sides
            if (!ourGame && participants?.length) {
              const homeParticipant = participants.find(p =>
                p.external_id === espnGame.homeTeamId ||
                (p.metadata as Record<string, unknown>)?.espn_team_id === espnGame.homeTeamId
              )
              const awayParticipant = participants.find(p =>
                p.external_id === espnGame.awayTeamId ||
                (p.metadata as Record<string, unknown>)?.espn_team_id === espnGame.awayTeamId
              )

              if (homeParticipant && awayParticipant) {
                ourGame = ourGames?.find(g =>
                  (g.participant_1_id === homeParticipant.id && g.participant_2_id === awayParticipant.id) ||
                  (g.participant_1_id === awayParticipant.id && g.participant_2_id === homeParticipant.id)
                )
                // Write back external_id for fast future matching
                if (ourGame) {
                  await admin.from('event_games')
                    .update({ external_id: espnGame.espnEventId })
                    .eq('id', ourGame.id)
                }
              }
            }

            if (!ourGame) continue

            // Only update live or completed games
            if (espnGame.status === 'scheduled') continue

            if (espnGame.status === 'live') live++
            if (espnGame.status === 'completed') completed++

            // Match scores to participants by ESPN team ID (not by positional home/away)
            // Our participant_1 may be home OR away — must check.
            const p1 = participants?.find(p => p.id === ourGame!.participant_1_id)
            const p1EspnId = p1?.external_id || (p1?.metadata as Record<string, unknown>)?.espn_team_id
            const p1IsHome = String(p1EspnId) === String(espnGame.homeTeamId)

            const updateData: Record<string, unknown> = {
              participant_1_score: p1IsHome ? espnGame.homeScore : espnGame.awayScore,
              participant_2_score: p1IsHome ? espnGame.awayScore : espnGame.homeScore,
              status: espnGame.status === 'completed' ? 'completed' : 'live',
              period: espnGame.period,
              clock: espnGame.clock,
              updated_at: now.toISOString(),
            }

            // Set winner if completed
            if (espnGame.isComplete && espnGame.winnerTeamId) {
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

                // Advance winner to next round game
                if (updateData.winner_id && tournament.format === 'bracket') {
                  await advanceBracketWinner(admin, tournamentId, ourGame!.id, updateData.winner_id as string)
                }
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

            // Match scores to participants by short_name (not by positional home/away)
            const rugbyP1 = participants?.find(p => p.id === ourGame!.participant_1_id)
            const rugbyP1IsHome = rugbyP1?.short_name === match.homeTeamCode

            const updateData: Record<string, unknown> = {
              participant_1_score: rugbyP1IsHome ? match.homeScore : match.awayScore,
              participant_2_score: rugbyP1IsHome ? match.awayScore : match.homeScore,
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
          const useCoreApi = config.use_core_api === true

          // Get participants with external IDs
          const { data: participants } = await admin
            .from('event_participants')
            .select('id, external_id, metadata')
            .eq('tournament_id', tournamentId)

          // ── Apps Script freshness check ──
          // If Apps Script updated any participant within the last 10 min,
          // it's healthy and GHA should skip the golf sync (backup only).
          // Check via prev_score_at which Apps Script writes every cycle.
          const APPS_SCRIPT_HEALTHY_MS = 10 * 60 * 1000
          const recentSync = (participants || []).find(p => {
            const meta = (p.metadata || {}) as Record<string, unknown>
            const prevAt = meta.prev_score_at as string | undefined
            if (!prevAt) return false
            return (now.getTime() - new Date(prevAt).getTime()) < APPS_SCRIPT_HEALTHY_MS
          })
          if (recentSync) {
            results[`golf_${tournamentId}`] = {
              skipped: true,
              reason: 'Apps Script is healthy (last sync within 10 min)',
            }
            // Still run roster scoring in case Apps Script wrote new score_to_par
            // that needs to be rolled into entry totals
            const { data: rosterPools } = await admin
              .from('event_pools')
              .select('id, scoring_rules')
              .eq('tournament_id', tournamentId)
              .eq('game_type', 'roster')
            for (const pool of rosterPools || []) {
              try { await scoreRosterPoolLive(admin, pool, tournamentId) } catch {}
            }
            continue
          }

          const golfers = await fetchGolfLeaderboard(espnTournamentId, admin)

          const golferById = new Map(golfers.map(g => [g.espnPlayerId, g]))

          // ── Core API: fetch per-hole + current-hole data for active golfers ──
          // Feature-flagged via tournament.config.use_core_api = true
          type CoreLive = Awaited<ReturnType<typeof fetchGolfFieldFromCore>>
          let coreData: CoreLive | null = null
          if (useCoreApi && espnTournamentId) {
            const activeAthleteIds = (participants || [])
              .filter(p => p.external_id)
              .filter(p => {
                const m = (p.metadata || {}) as Record<string, unknown>
                const s = String(m.status || 'active')
                return s !== 'cut' && s !== 'wd' && s !== 'dq'
              })
              .map(p => p.external_id as string)

            try {
              coreData = await fetchGolfFieldFromCore(espnTournamentId, activeAthleteIds, { concurrency: 10 })
            } catch (err) {
              console.error(`[event-gameday-sync] Core API fetch failed for tournament ${tournamentId}:`, err)
              Sentry.captureException(err, { tags: { cron: 'event-gameday-sync', sport: 'golf', api: 'core' } })
              coreData = null
            }

            // Populate course_data on tournament if missing and we can pick a courseId from any golfer
            if (coreData && !(tournament as Record<string, unknown>).course_data) {
              let courseId: string | null = null
              for (const v of coreData.values()) {
                if (v?.courseId) { courseId = v.courseId; break }
              }
              if (courseId) {
                const courseData = await fetchCourseData(espnTournamentId, courseId)
                if (courseData) {
                  await admin
                    .from('event_tournaments')
                    .update({ course_data: courseData })
                    .eq('id', tournamentId)
                }
              }
            }
          }

          // ── Update participant metadata with live scores (for roster pools) ──
          // Rolling snapshot window for Biggest Movers (Feature 4): every 30 min
          // each golfer's prev_score_to_par advances to their current value.
          const SNAPSHOT_TTL_MS = 30 * 60 * 1000
          const syncRunAt = now.toISOString()

          // Collect updated metadata for each participant so we can do a
          // second pass for pairing derivation before writing.
          const pendingUpdates = new Map<string, Record<string, unknown>>()

          let participantsUpdated = 0
          for (const participant of participants || []) {
            if (!participant.external_id) continue
            const golfer = golferById.get(participant.external_id)
            const live = coreData?.get(participant.external_id) ?? null

            // Require either legacy scoreboard entry OR core live data to update
            if (!golfer && !live) continue

            const existingMeta = (participant.metadata || {}) as Record<string, unknown>

            // Core API status is authoritative when available; else fall back to scoreboard.
            // GUARD: never overwrite 'cut' status — once a golfer is cut, they stay cut.
            // ESPN sometimes returns 'active' for cut golfers, which would undo the cut.
            const rawStatus = live?.status ?? golfer?.status ?? existingMeta.status ?? 'active'
            const newStatus = existingMeta.status === 'cut' ? 'cut' : rawStatus
            const newPosition = live?.position ?? golfer?.position ?? existingMeta.position ?? null

            // Round scores: compute from core holes if present, else fallback to scoreboard.
            // CRITICAL: only treat a round as complete if all 18 holes are present in
            // the per-hole data. ESPN sometimes returns partial in-progress rounds
            // (e.g. 7 holes summing to 28) which would be wildly wrong if stored as
            // a round total.
            let r1 = existingMeta.r1 ?? null
            let r2 = existingMeta.r2 ?? null
            let r3 = existingMeta.r3 ?? null
            let r4 = existingMeta.r4 ?? null

            // Sanity range for a real golf round at a tour-level course
            const isValidRoundScore = (s: unknown): s is number =>
              typeof s === 'number' && s >= 64 && s <= 100

            if (live?.holes && live.holes.length > 0) {
              // Group hole strokes by round number; only set rX if 18 holes present
              const roundsByNum: Record<number, number[]> = {}
              for (const h of live.holes) {
                if (!roundsByNum[h.round]) roundsByNum[h.round] = []
                roundsByNum[h.round].push(h.strokes)
              }
              if (roundsByNum[1]?.length === 18) r1 = roundsByNum[1].reduce((a, b) => a + b, 0)
              if (roundsByNum[2]?.length === 18) r2 = roundsByNum[2].reduce((a, b) => a + b, 0)
              if (roundsByNum[3]?.length === 18) r3 = roundsByNum[3].reduce((a, b) => a + b, 0)
              if (roundsByNum[4]?.length === 18) r4 = roundsByNum[4].reduce((a, b) => a + b, 0)
            }
            // Legacy Site API fallback intentionally does NOT write r1-r4.
            // Only the Core API 18-hole-complete path above sets round scores.
            // The Site API reports partial mid-round running totals (28, 60, 68)
            // that are indistinguishable from final round scores and have caused
            // cascading display bugs every time we tried to use them.

            // Compute score_to_par from raw round strokes — ESPN's
            // golfer.score displayValue is unreliable (it sometimes reports
            // "E" for transitional states or shows "today's relative score"
            // instead of tournament total). Recomputing from strokes is the
            // source of truth.
            // Course par lives in tournament.course_data.totalPar; default
            // to 72 (Augusta) since this is the only golf event right now.
            const tCourseData = (tournament as Record<string, unknown>).course_data as
              { totalPar?: number } | null | undefined
            const COURSE_PAR = (tCourseData?.totalPar as number) || 72
            const completedRoundStrokes = [r1, r2, r3, r4].filter(
              (s): s is number => typeof s === 'number' && s > 0
            )
            const computedScoreToPar = completedRoundStrokes.length > 0
              ? completedRoundStrokes.reduce((a, b) => a + b, 0) -
                (COURSE_PAR * completedRoundStrokes.length)
              : null

            // Rolling snapshot: if prev_score_at is null or stale, advance it
            const prevScoreAtStr = existingMeta.prev_score_at as string | undefined | null
            const prevScoreAtMs = prevScoreAtStr ? new Date(prevScoreAtStr).getTime() : 0
            const snapshotStale = !prevScoreAtStr || (now.getTime() - prevScoreAtMs) > SNAPSHOT_TTL_MS
            const newPrevScore = snapshotStale
              ? (existingMeta.score_to_par ?? null)
              : (existingMeta.prev_score_to_par ?? null)
            const newPrevAt = snapshotStale ? syncRunAt : prevScoreAtStr

            // Cut golfers still need their score_to_par and position updated
            // (ESPN continues reporting their 2-round total and position).
            // Only skip Core API per-hole enrichment (holes[], current_hole, thru)
            // since they're not playing R3/R4.
            const isCutGolfer = existingMeta.status === 'cut' || existingMeta.status === 'wd' || existingMeta.status === 'dq'

            const updatedMeta = {
              ...existingMeta,
              r1, r2, r3, r4,
              total_strokes: [r1, r2, r3, r4]
                .filter((s): s is number => typeof s === 'number')
                .reduce((a, b) => a + b, 0) || existingMeta.total_strokes || null,
              // ESPN's golfer.score is the LIVE running tournament total — what
              // users see on the actual Masters leaderboard. Use it as primary
              // source so the Total column updates every sync cycle during live
              // play. computedScoreToPar (from completed round strokes) is a
              // fallback for when ESPN's display value is null (pre-tournament,
              // transitional states, etc.).
              score_to_par: golfer?.scoreToPar ?? computedScoreToPar ?? existingMeta.score_to_par ?? null,
              status: newStatus,
              position: newPosition,
              score_display: golfer?.score || existingMeta.score_display || null,
              country: golfer?.country || existingMeta.country || null,
              country_code: golfer?.countryCode || existingMeta.country_code || null,
              // Core API hole-level fields — skip for cut golfers (not playing).
              // For active golfers: trust live verbatim including nulls (clears
              // between rounds). For cut: preserve existing values.
              current_hole: isCutGolfer ? (existingMeta.current_hole ?? null) : live ? (live.currentHole ?? null) : (existingMeta.current_hole ?? null),
              thru: isCutGolfer ? (existingMeta.thru ?? null) : live ? (live.thru ?? null) : (existingMeta.thru ?? null),
              start_hole: isCutGolfer ? (existingMeta.start_hole ?? null) : (live?.startHole ?? existingMeta.start_hole ?? null),
              tee_time: isCutGolfer ? (existingMeta.tee_time ?? null) : (live?.teeTime ?? existingMeta.tee_time ?? null),
              current_round: isCutGolfer ? (existingMeta.current_round ?? null) : (live?.currentRound ?? existingMeta.current_round ?? null),
              holes: isCutGolfer ? (existingMeta.holes ?? []) : (live?.holes ?? existingMeta.holes ?? []),
              // Feature 4: rolling snapshot for Biggest Movers
              prev_score_to_par: newPrevScore,
              prev_score_at: newPrevAt,
            }

            pendingUpdates.set(participant.id, updatedMeta)
          }

          // ── Feature 6: derive pairings (pair_ids) before writing ──
          // Golfers with the same tee_time + start_hole are in the same group.
          const groupKeys = new Map<string, string[]>()
          for (const [pid, meta] of pendingUpdates.entries()) {
            const teeTime = meta.tee_time as string | null | undefined
            const startHole = meta.start_hole as number | null | undefined
            if (!teeTime) continue
            const key = `${teeTime}|${startHole ?? 1}`
            if (!groupKeys.has(key)) groupKeys.set(key, [])
            groupKeys.get(key)!.push(pid)
          }
          for (const [pid, meta] of pendingUpdates.entries()) {
            const teeTime = meta.tee_time as string | null | undefined
            const startHole = meta.start_hole as number | null | undefined
            if (!teeTime) {
              meta.pair_ids = []
              continue
            }
            const key = `${teeTime}|${startHole ?? 1}`
            const groupMembers = groupKeys.get(key) ?? []
            meta.pair_ids = groupMembers.filter(id => id !== pid)
          }

          // Write the final merged metadata for each participant
          for (const [pid, meta] of pendingUpdates.entries()) {
            const { error } = await admin
              .from('event_participants')
              .update({ metadata: meta })
              .eq('id', pid)
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
    // Also re-score any tournament that has completed games (safety net for missed scoring)
    const scoredTournaments = new Set<string>()
    // Track which tournaments had genuinely new completions (for notifications)
    const trulyNewCompletions = new Set(newlyCompleted.map(nc => nc.tournamentId))

    // Add tournaments with any completed games to ensure scoring runs even if
    // the newlyCompleted tracking missed a transition (e.g. cron failure, race condition)
    // This is a safety net — re-scoring is idempotent but we skip notifications for these
    for (const tournament of tournaments) {
      const { count } = await admin.from('event_games')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id)
        .eq('status', 'completed')
      if (count && count > 0) {
        const alreadyTracked = newlyCompleted.some(nc => nc.tournamentId === tournament.id)
        if (!alreadyTracked) {
          newlyCompleted.push({ tournamentId: tournament.id, format: tournament.format, config: tournament.config })
        }
      }
    }

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

        // Check if ALL games in tournament are completed — if so, award champion badges
        const { count: totalGames } = await admin.from('event_games')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
        const { count: completedGames } = await admin.from('event_games')
          .select('id', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId)
          .eq('status', 'completed')

        if (totalGames && completedGames && totalGames === completedGames) {
          try {
            const { autoGrantChampionBadges } = await import('@/lib/badges-auto')
            await autoGrantChampionBadges(tournamentId)
            results[`champion_badges_${tournamentId}`] = { triggered: true }
          } catch (badgeErr) {
            console.error(`[event-gameday-sync] Champion badge error for ${tournamentId}:`, badgeErr)
          }
        }

        // Only notify on genuinely new completions (not safety-net re-scores)
        if (trulyNewCompletions.has(tournamentId)) {
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

// ── Bracket advancement ──
// When a bracket game completes, advance the winner to the next round's game.
// Bracket structure: games are ordered by game_number. Two consecutive games feed into one next-round game.
// Games 1+2 → next, 3+4 → next, etc.
async function advanceBracketWinner(
  admin: ReturnType<typeof createAdminClient>,
  tournamentId: string,
  completedGameId: string,
  winnerId: string,
) {
  // Get all games ordered by game_number
  const { data: allGames } = await admin
    .from('event_games')
    .select('id, game_number, round, participant_1_id, participant_2_id')
    .eq('tournament_id', tournamentId)
    .order('game_number')

  if (!allGames?.length) return

  const completedGame = allGames.find(g => g.id === completedGameId)
  if (!completedGame) return

  // Group games by round to find which rounds feed into which
  const rounds = [...new Set(allGames.map(g => g.round))]
  const roundIdx = rounds.indexOf(completedGame.round)
  if (roundIdx < 0 || roundIdx >= rounds.length - 1) return // Already the final round

  const nextRound = rounds[roundIdx + 1]
  const currentRoundGames = allGames.filter(g => g.round === completedGame.round)
  const nextRoundGames = allGames.filter(g => g.round === nextRound)

  // Find position of completed game within its round
  const posInRound = currentRoundGames.findIndex(g => g.id === completedGameId)
  if (posInRound < 0) return

  // Two games feed into one next-round game: games at positions 0,1 → next[0], 2,3 → next[1], etc.
  const nextGameIdx = Math.floor(posInRound / 2)
  const nextGame = nextRoundGames[nextGameIdx]
  if (!nextGame) return

  // Slot: even position → participant_1, odd → participant_2
  const slot = posInRound % 2 === 0 ? 'participant_1_id' : 'participant_2_id'

  // Only update if the slot is empty (don't overwrite if already set)
  if (nextGame[slot]) return

  await admin.from('event_games').update({ [slot]: winnerId }).eq('id', nextGame.id)
  console.log(`[bracket-advance] G${completedGame.game_number} winner → G${nextGame.game_number} ${slot}`)
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
        .select('id, game_id, participant_id')
        .eq('entry_id', entry.id)

      if (!picks?.length) continue

      let score = 0
      const now = new Date().toISOString()

      for (const pick of picks) {
        if (!pick.game_id) continue
        const correctWinner = gameResults[pick.game_id]
        const game = games.find(g => g.id === pick.game_id)

        if (correctWinner) {
          const isCorrect = correctWinner === pick.participant_id
          const roundPoints = game ? (scoring[game.round] || 1) : 1
          const pointsEarned = isCorrect ? roundPoints : 0
          if (isCorrect) score += roundPoints

          // Update individual pick record
          await admin
            .from('event_picks')
            .update({ is_correct: isCorrect, points_earned: pointsEarned, resolved_at: now })
            .eq('id', pick.id)
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
