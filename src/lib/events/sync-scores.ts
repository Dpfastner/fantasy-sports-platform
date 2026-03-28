/**
 * Shared live score sync logic for event tournaments (hockey, rugby, golf).
 * Used by both the cron (event-gameday-sync) and the live-scores API endpoint.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchHockeyTournamentGames,
  fetchRugbyMatches,
  fetchRugbyMatchesSportsDb,
  fetchGolfLeaderboard,
  type ESPNRugbyMatch,
} from './espn-adapters'

export interface SyncResult {
  gamesUpdated: number
  live: number
  completed: number
  newCompletions: boolean
  participantsUpdated?: number
}

/**
 * Sync hockey scores from ESPN for a specific tournament.
 */
export async function syncHockeyScores(
  admin: SupabaseClient,
  tournamentId: string
): Promise<SyncResult> {
  const espnGames = await fetchHockeyTournamentGames(new Date().getFullYear(), admin)

  const { data: ourGames } = await admin
    .from('event_games')
    .select('id, external_id, participant_1_id, participant_2_id, status')
    .eq('tournament_id', tournamentId)

  const { data: participants } = await admin
    .from('event_participants')
    .select('id, external_id, metadata')
    .eq('tournament_id', tournamentId)

  let updated = 0
  let live = 0
  let completed = 0
  let newCompletions = false
  const prevStatuses = new Map(ourGames?.map(g => [g.id, g.status]) || [])
  const now = new Date().toISOString()

  for (const espnGame of espnGames) {
    let ourGame = ourGames?.find(g => g.external_id === espnGame.espnEventId)

    if (!ourGame && participants?.length) {
      const homeP = participants.find(p =>
        p.external_id === espnGame.homeTeamId ||
        (p.metadata as Record<string, unknown>)?.espn_team_id === espnGame.homeTeamId
      )
      const awayP = participants.find(p =>
        p.external_id === espnGame.awayTeamId ||
        (p.metadata as Record<string, unknown>)?.espn_team_id === espnGame.awayTeamId
      )

      if (homeP && awayP) {
        ourGame = ourGames?.find(g =>
          (g.participant_1_id === homeP.id && g.participant_2_id === awayP.id) ||
          (g.participant_1_id === awayP.id && g.participant_2_id === homeP.id)
        )
        if (ourGame) {
          await admin.from('event_games')
            .update({ external_id: espnGame.espnEventId })
            .eq('id', ourGame.id)
        }
      }
    }

    if (!ourGame) continue
    if (espnGame.status === 'scheduled') continue

    if (espnGame.status === 'live') live++
    if (espnGame.status === 'completed') completed++

    const updateData: Record<string, unknown> = {
      participant_1_score: espnGame.homeScore,
      participant_2_score: espnGame.awayScore,
      status: espnGame.status === 'completed' ? 'completed' : 'live',
      period: espnGame.period,
      clock: espnGame.clock,
      // Sync start time from ESPN (fixes placeholder times from seeding)
      starts_at: espnGame.date || undefined,
      updated_at: now,
    }

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
      if (espnGame.status === 'completed' && prevStatuses.get(ourGame.id) !== 'completed') {
        newCompletions = true
      }
    }
  }

  return { gamesUpdated: updated, live, completed, newCompletions }
}

/**
 * Sync rugby scores from ESPN (or TheSportsDB) for a specific tournament.
 */
export async function syncRugbyScores(
  admin: SupabaseClient,
  tournamentId: string,
  config: Record<string, unknown> | null
): Promise<SyncResult> {
  const tConfig = (config || {}) as Record<string, unknown>
  let espnMatches: ESPNRugbyMatch[]

  if (tConfig.score_source === 'sportsdb') {
    const leagueId = String(tConfig.sportsdb_league_id || '5563')
    espnMatches = await fetchRugbyMatchesSportsDb(leagueId)
  } else {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
    espnMatches = await fetchRugbyMatches([dateStr], admin)
  }

  const { data: ourGames } = await admin
    .from('event_games')
    .select('id, external_id, participant_1_id, participant_2_id, status')
    .eq('tournament_id', tournamentId)

  const { data: participants } = await admin
    .from('event_participants')
    .select('id, short_name, external_id')
    .eq('tournament_id', tournamentId)

  const participantByCode = new Map(participants?.map(p => [p.short_name, p]) || [])

  let updated = 0
  let live = 0
  let completed = 0
  let newCompletions = false
  const prevStatuses = new Map(ourGames?.map(g => [g.id, g.status]) || [])
  const now = new Date().toISOString()

  for (const match of espnMatches) {
    if (match.status === 'scheduled') continue

    let ourGame = ourGames?.find(g => g.external_id === match.espnEventId)
    if (!ourGame) {
      const homeP = participantByCode.get(match.homeTeamCode)
      const awayP = participantByCode.get(match.awayTeamCode)
      if (homeP && awayP) {
        ourGame = ourGames?.find(g =>
          (g.participant_1_id === homeP.id && g.participant_2_id === awayP.id) ||
          (g.participant_1_id === awayP.id && g.participant_2_id === homeP.id)
        )
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
      starts_at: match.date || undefined,
      updated_at: now,
    }

    if (match.isComplete && match.winnerTeamCode) {
      const winnerP = participantByCode.get(match.winnerTeamCode)
      if (winnerP) updateData.winner_id = winnerP.id
    }

    const { error } = await admin
      .from('event_games')
      .update(updateData)
      .eq('id', ourGame.id)

    if (!error) {
      updated++
      if (match.status === 'completed' && prevStatuses.get(ourGame.id) !== 'completed') {
        newCompletions = true
      }
    }
  }

  return { gamesUpdated: updated, live, completed, newCompletions }
}

/**
 * Sync golf scores from ESPN for a specific tournament.
 * Updates participant metadata (leaderboard) and matchup games.
 */
export async function syncGolfScores(
  admin: SupabaseClient,
  tournamentId: string,
  config: Record<string, unknown> | null
): Promise<SyncResult> {
  const tConfig = (config || {}) as Record<string, unknown>
  const espnTournamentId = tConfig.espn_tournament_id as string | undefined
  const golfers = await fetchGolfLeaderboard(espnTournamentId, admin)

  const { data: participants } = await admin
    .from('event_participants')
    .select('id, external_id, metadata')
    .eq('tournament_id', tournamentId)

  const golferById = new Map(golfers.map(g => [g.espnPlayerId, g]))
  const now = new Date().toISOString()

  // Update participant metadata with live scores
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
      .update({ metadata: updatedMeta, updated_at: now })
      .eq('id', participant.id)

    if (!error) participantsUpdated++
  }

  // Update matchup games
  const { data: ourGames } = await admin
    .from('event_games')
    .select('id, participant_1_id, participant_2_id, status')
    .eq('tournament_id', tournamentId)

  let updated = 0
  let completed = 0
  let newCompletions = false

  for (const game of ourGames || []) {
    const p1 = participants?.find(p => p.id === game.participant_1_id)
    const p2 = participants?.find(p => p.id === game.participant_2_id)
    if (!p1?.external_id || !p2?.external_id) continue

    const g1 = golferById.get(p1.external_id)
    const g2 = golferById.get(p2.external_id)
    if (!g1 || !g2) continue

    const liveStatus = `${g1.name}: ${g1.score || 'E'} | ${g2.name}: ${g2.score || 'E'}`
    const bothDone = (g1.status !== 'active') && (g2.status !== 'active')
    const updateData: Record<string, unknown> = {
      live_status: liveStatus,
      updated_at: now,
    }

    if (bothDone && game.status !== 'completed') {
      const p1Pos = g1.position || 999
      const p2Pos = g2.position || 999
      if (p1Pos < p2Pos) updateData.winner_id = p1.id
      else if (p2Pos < p1Pos) updateData.winner_id = p2.id
      updateData.status = 'completed'
      completed++
      newCompletions = true
    }

    const { error } = await admin
      .from('event_games')
      .update(updateData)
      .eq('id', game.id)

    if (!error) updated++
  }

  return { gamesUpdated: updated, live: 0, completed, newCompletions, participantsUpdated }
}
