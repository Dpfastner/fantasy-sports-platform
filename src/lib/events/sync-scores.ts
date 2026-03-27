/**
 * Shared live score sync logic for hockey tournaments.
 * Used by both the cron (event-gameday-sync) and the live-scores API endpoint.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { fetchHockeyTournamentGames } from './espn-adapters'

interface SyncResult {
  gamesUpdated: number
  live: number
  completed: number
  newCompletions: boolean
}

interface GameRow {
  id: string
  external_id: string | null
  participant_1_id: string | null
  participant_2_id: string | null
  status: string
}

interface ParticipantRow {
  id: string
  external_id: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Sync hockey scores from ESPN for a specific tournament.
 * Returns sync stats including whether any games newly completed.
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
    // Match by external_id first
    let ourGame = ourGames?.find(g => g.external_id === espnGame.espnEventId)

    // Fallback: match by participant ESPN team IDs
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
