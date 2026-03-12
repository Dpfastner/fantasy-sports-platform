/**
 * Shared event game types and pure functions.
 * Safe to import from both server and client code.
 * No Supabase dependency.
 */

import type {
  EventTournament,
  EventParticipant,
  EventGame,
  EventPool,
  EventEntry,
  EventPick,
  EventPoolWeek,
} from '@/types/database'

// ============================================
// Scoring rule types per format
// ============================================

/** Bracket scoring: points per round for correct picks */
export interface BracketScoringRules {
  round_1?: number
  quarterfinal?: number
  semifinal?: number
  championship?: number
  third_place?: number
  consolation?: number
  [round: string]: number | undefined
}

/** Pick'em scoring: points for correct picks + bonuses */
export interface PickemScoringRules {
  correct_pick: number
  upset_bonus: number        // bonus if lower seed wins and you picked them
  confidence_points: boolean // allow confidence ranking on picks
}

/** Survivor scoring rules (mostly config, not point-based) */
export interface SurvivorScoringRules {
  strikes_allowed: number    // 0 = classic (one and done), 1+ = strikes
  draw_eliminates: boolean   // true = draws count as loss (rugby)
}

// ============================================
// Default scoring presets
// ============================================

export const DEFAULT_BRACKET_SCORING: BracketScoringRules = {
  round_1: 1,
  quarterfinal: 2,
  semifinal: 4,
  championship: 8,
  third_place: 2,
  consolation: 1,
}

export const DEFAULT_PICKEM_SCORING: PickemScoringRules = {
  correct_pick: 1,
  upset_bonus: 2,
  confidence_points: false,
}

export const DEFAULT_SURVIVOR_SCORING: SurvivorScoringRules = {
  strikes_allowed: 0,
  draw_eliminates: true,
}

// ============================================
// Bracket engine — pure functions
// ============================================

export interface BracketPickResult {
  gameId: string
  gameNumber: number
  round: string
  participantId: string
  participantName: string
  isCorrect: boolean | null  // null = unresolved
  pointsEarned: number
}

/**
 * Score a bracket entry against resolved games.
 * Pure function — no DB dependency.
 */
export function scoreBracketEntry(
  picks: EventPick[],
  games: EventGame[],
  participants: EventParticipant[],
  scoringRules: BracketScoringRules
): { totalPoints: number; results: BracketPickResult[] } {
  const participantMap = new Map(participants.map(p => [p.id, p]))
  const gameMap = new Map(games.map(g => [g.id, g]))

  let totalPoints = 0
  const results: BracketPickResult[] = []

  for (const pick of picks) {
    if (!pick.game_id) continue
    const game = gameMap.get(pick.game_id)
    if (!game) continue

    const participant = participantMap.get(pick.participant_id)
    const round = game.round || 'unknown'
    const roundPoints = scoringRules[round] ?? 0

    let isCorrect: boolean | null = null
    let pointsEarned = 0

    if (game.status === 'completed' && game.winner_id) {
      // Case-insensitive not needed: we match by UUID, not name
      isCorrect = pick.participant_id === game.winner_id
      pointsEarned = isCorrect ? roundPoints : 0
      totalPoints += pointsEarned
    }

    results.push({
      gameId: game.id,
      gameNumber: game.game_number,
      round,
      participantId: pick.participant_id,
      participantName: participant?.name ?? 'Unknown',
      isCorrect,
      pointsEarned,
    })
  }

  return { totalPoints, results }
}

/**
 * Validate a bracket is complete (all games have picks).
 * Returns missing game numbers.
 */
export function validateBracketCompleteness(
  picks: EventPick[],
  games: EventGame[]
): { isComplete: boolean; missingGameNumbers: number[] } {
  const pickedGameIds = new Set(picks.map(p => p.game_id).filter(Boolean))
  const missingGameNumbers: number[] = []

  for (const game of games) {
    if (!pickedGameIds.has(game.id)) {
      missingGameNumbers.push(game.game_number)
    }
  }

  return {
    isComplete: missingGameNumbers.length === 0,
    missingGameNumbers,
  }
}

/**
 * Validate bracket pick consistency (later round picks must follow earlier round winners).
 * e.g., if you pick Team A in SF, you must have picked Team A in one of the QF games feeding into that SF.
 *
 * bracketStructure maps game_number → { feeds_from: [game_number, game_number] }
 */
export function validateBracketConsistency(
  picks: EventPick[],
  games: EventGame[],
  bracketStructure: Record<number, { feeds_from: number[] }>
): { isConsistent: boolean; conflicts: string[] } {
  const pickByGame = new Map<number, string>() // game_number → participant_id
  const gameByNumber = new Map(games.map(g => [g.game_number, g]))

  for (const pick of picks) {
    if (!pick.game_id) continue
    const game = gameByNumber.get(
      games.find(g => g.id === pick.game_id)?.game_number ?? -1
    )
    if (game) {
      pickByGame.set(game.game_number, pick.participant_id)
    }
  }

  const conflicts: string[] = []

  for (const [gameNumber, structure] of Object.entries(bracketStructure)) {
    const gn = Number(gameNumber)
    const pickedParticipant = pickByGame.get(gn)
    if (!pickedParticipant) continue

    const { feeds_from } = structure
    if (feeds_from.length === 0) continue // first round, no feeder games

    // The picked participant must appear as a pick in one of the feeder games
    const feedsPicked = feeds_from.some(
      feederGn => pickByGame.get(feederGn) === pickedParticipant
    )

    if (!feedsPicked) {
      const game = gameByNumber.get(gn)
      conflicts.push(
        `Game ${gn} (${game?.round}): picked participant not available from feeder games ${feeds_from.join(', ')}`
      )
    }
  }

  return { isConsistent: conflicts.length === 0, conflicts }
}

// ============================================
// Pick'em engine — pure functions
// ============================================

export interface PickemResult {
  gameId: string
  gameNumber: number
  participantId: string
  participantName: string
  isCorrect: boolean | null
  pointsEarned: number
  wasUpset: boolean
}

/**
 * Score a pick'em entry.
 */
export function scorePickemEntry(
  picks: EventPick[],
  games: EventGame[],
  participants: EventParticipant[],
  scoringRules: PickemScoringRules
): { totalPoints: number; results: PickemResult[] } {
  const participantMap = new Map(participants.map(p => [p.id, p]))
  const gameMap = new Map(games.map(g => [g.id, g]))

  let totalPoints = 0
  const results: PickemResult[] = []

  for (const pick of picks) {
    if (!pick.game_id) continue
    const game = gameMap.get(pick.game_id)
    if (!game) continue

    const participant = participantMap.get(pick.participant_id)
    let isCorrect: boolean | null = null
    let pointsEarned = 0
    let wasUpset = false

    if (game.status === 'completed' && game.winner_id) {
      isCorrect = pick.participant_id === game.winner_id

      if (isCorrect) {
        pointsEarned = scoringRules.correct_pick

        // Upset bonus: if the winner had a higher seed number (lower rank)
        const winner = participantMap.get(game.winner_id)
        const loser = participantMap.get(
          game.winner_id === game.participant_1_id
            ? game.participant_2_id!
            : game.participant_1_id!
        )
        if (winner?.seed && loser?.seed && winner.seed > loser.seed) {
          wasUpset = true
          pointsEarned += scoringRules.upset_bonus
        }
      }

      totalPoints += pointsEarned
    }

    results.push({
      gameId: game.id,
      gameNumber: game.game_number,
      participantId: pick.participant_id,
      participantName: participant?.name ?? 'Unknown',
      isCorrect,
      pointsEarned,
      wasUpset,
    })
  }

  return { totalPoints, results }
}

// ============================================
// Survivor engine — pure functions
// ============================================

export interface SurvivorWeekResult {
  weekNumber: number
  participantId: string | null
  participantName: string | null
  missedDeadline: boolean
  isCorrect: boolean | null     // null = unresolved, true = survived, false = eliminated
  eliminationReason: 'loss' | 'draw' | 'missed_deadline' | null
}

/**
 * Evaluate a survivor entry for a single week.
 * Returns null if the week hasn't been resolved yet.
 *
 * IMPORTANT: This only evaluates AFTER all matches in the week are completed
 * (week-level resolution, not per-match). The caller must check
 * EventPoolWeek.resolution_status === 'resolved' before calling.
 */
export function evaluateSurvivorWeek(
  pick: EventPick | null,
  weekGames: EventGame[],
  participants: EventParticipant[],
  rules: SurvivorScoringRules
): SurvivorWeekResult {
  // No pick = missed deadline
  if (!pick || pick.missed_deadline) {
    return {
      weekNumber: pick?.week_number ?? 0,
      participantId: null,
      participantName: null,
      missedDeadline: true,
      isCorrect: false,
      eliminationReason: 'missed_deadline',
    }
  }

  const participant = participants.find(p => p.id === pick.participant_id)

  // Find the game this participant played in this week
  const game = weekGames.find(
    g => g.participant_1_id === pick.participant_id ||
         g.participant_2_id === pick.participant_id
  )

  // If no game found or game not completed, can't resolve
  if (!game || game.status !== 'completed') {
    return {
      weekNumber: pick.week_number ?? 0,
      participantId: pick.participant_id,
      participantName: participant?.name ?? 'Unknown',
      missedDeadline: false,
      isCorrect: null,
      eliminationReason: null,
    }
  }

  // Check for draw
  if (game.is_draw) {
    return {
      weekNumber: pick.week_number ?? 0,
      participantId: pick.participant_id,
      participantName: participant?.name ?? 'Unknown',
      missedDeadline: false,
      isCorrect: rules.draw_eliminates ? false : true,
      eliminationReason: rules.draw_eliminates ? 'draw' : null,
    }
  }

  // Check win/loss
  const survived = game.winner_id === pick.participant_id

  return {
    weekNumber: pick.week_number ?? 0,
    participantId: pick.participant_id,
    participantName: participant?.name ?? 'Unknown',
    missedDeadline: false,
    isCorrect: survived,
    eliminationReason: survived ? null : 'loss',
  }
}

/**
 * Check if a participant has already been used in previous weeks.
 */
export function isParticipantUsed(
  participantId: string,
  existingPicks: EventPick[],
  currentWeek: number
): boolean {
  return existingPicks.some(
    p => p.participant_id === participantId &&
         p.week_number !== currentWeek &&
         !p.missed_deadline
  )
}

/**
 * Get available participants for a survivor week (not yet used).
 */
export function getAvailableParticipants(
  allParticipants: EventParticipant[],
  existingPicks: EventPick[],
  currentWeek: number
): EventParticipant[] {
  const usedIds = new Set(
    existingPicks
      .filter(p => p.week_number !== currentWeek && !p.missed_deadline)
      .map(p => p.participant_id)
  )
  return allParticipants.filter(p => !usedIds.has(p.id))
}

// ============================================
// Tiebreaker resolution
// ============================================

export interface TiebreakerInput {
  entryId: string
  prediction: Record<string, unknown> | null
  totalPoints: number
}

/**
 * Resolve tiebreaker for championship_score type.
 * Prediction: { team1_score: number, team2_score: number }
 * Actual: the real championship game final score.
 */
export function resolveTiebreaker(
  entries: TiebreakerInput[],
  tiebreaker: string,
  actualResult?: { team1_score: number; team2_score: number }
): { entryId: string; difference: number | null }[] {
  if (tiebreaker === 'none' || tiebreaker === 'random') {
    return entries.map(e => ({ entryId: e.entryId, difference: null }))
  }

  if (
    (tiebreaker === 'championship_score' || tiebreaker === 'first_match_score') &&
    actualResult
  ) {
    return entries.map(e => {
      if (!e.prediction) return { entryId: e.entryId, difference: null }

      const predTeam1 = Number(e.prediction.team1_score ?? 0)
      const predTeam2 = Number(e.prediction.team2_score ?? 0)
      const diff1 = Math.abs(predTeam1 - actualResult.team1_score)
      const diff2 = Math.abs(predTeam2 - actualResult.team2_score)

      // Primary: total score difference. Secondary: combined score difference.
      const totalDiff = diff1 + diff2
      const combinedPred = predTeam1 + predTeam2
      const combinedActual = actualResult.team1_score + actualResult.team2_score
      const combinedDiff = Math.abs(combinedPred - combinedActual)

      // Use total diff as primary, combined diff as decimal tiebreaker
      return {
        entryId: e.entryId,
        difference: totalDiff + combinedDiff * 0.001,
      }
    })
  }

  return entries.map(e => ({ entryId: e.entryId, difference: null }))
}

// ============================================
// Bracket structure generators
// ============================================

/**
 * Generate bracket structure for standard single-elimination tournament.
 * Returns game_number → { feeds_from: [game_numbers] } mapping.
 */
export function generateBracketStructure(
  bracketSize: number
): Record<number, { feeds_from: number[]; round: string }> {
  const structure: Record<number, { feeds_from: number[]; round: string }> = {}

  if (bracketSize === 4) {
    // 2 semis + championship
    structure[1] = { feeds_from: [], round: 'semifinal' }
    structure[2] = { feeds_from: [], round: 'semifinal' }
    structure[3] = { feeds_from: [1, 2], round: 'championship' }
    return structure
  }

  if (bracketSize === 8) {
    // 4 QF + 2 SF + championship + third place
    for (let i = 1; i <= 4; i++) {
      structure[i] = { feeds_from: [], round: 'quarterfinal' }
    }
    structure[5] = { feeds_from: [1, 2], round: 'semifinal' }
    structure[6] = { feeds_from: [3, 4], round: 'semifinal' }
    structure[7] = { feeds_from: [5, 6], round: 'championship' }
    return structure
  }

  if (bracketSize === 16) {
    // 8 R1 + 4 QF + 2 SF + championship
    for (let i = 1; i <= 8; i++) {
      structure[i] = { feeds_from: [], round: 'round_1' }
    }
    structure[9] = { feeds_from: [1, 2], round: 'quarterfinal' }
    structure[10] = { feeds_from: [3, 4], round: 'quarterfinal' }
    structure[11] = { feeds_from: [5, 6], round: 'quarterfinal' }
    structure[12] = { feeds_from: [7, 8], round: 'quarterfinal' }
    structure[13] = { feeds_from: [9, 10], round: 'semifinal' }
    structure[14] = { feeds_from: [11, 12], round: 'semifinal' }
    structure[15] = { feeds_from: [13, 14], round: 'championship' }
    return structure
  }

  return structure
}

/**
 * Get standard bracket seedings for a given size.
 * Returns array of [seed1, seed2] matchups for first round.
 */
export function getBracketMatchups(bracketSize: number): [number, number][] {
  if (bracketSize === 4) return [[1, 4], [2, 3]]
  if (bracketSize === 8) return [[1, 8], [4, 5], [2, 7], [3, 6]]
  if (bracketSize === 16) {
    return [
      [1, 16], [8, 9], [4, 13], [5, 12],
      [2, 15], [7, 10], [3, 14], [6, 11],
    ]
  }
  return []
}
