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

// ============================================
// Roster engine — pure functions
// ============================================

/** Tier definition for roster-style pools */
export interface RosterTier {
  count: number       // how many picks from this tier
  owgr_min: number    // minimum OWGR rank (inclusive)
  owgr_max?: number   // maximum OWGR rank (inclusive), omit for "and above"
}

/** Roster scoring rules stored in pool.scoring_rules */
export type RosterDraftMode = 'open' | 'limited' | 'snake_draft' | 'linear_draft'

export interface RosterScoringRules {
  roster_size: number                      // total golfers picked (e.g., 7)
  count_best: number                       // how many of the best scores count (e.g., 5)
  tiers: Record<string, RosterTier>        // e.g., { A: { count: 2, owgr_min: 1, owgr_max: 15 }, ... }
  cut_penalty: 'highest_plus_one' | 'fixed' | 'none'
  cut_penalty_fixed?: number               // per-round penalty when cut_penalty === 'fixed'
  draft_mode?: RosterDraftMode             // how golfers are selected (default: 'open')
  selection_cap?: number                   // limited mode: max times a golfer can be picked across all entries
  draft_timer_seconds?: number             // snake/linear: seconds per pick (null = no timer)
  draft_order_type?: 'random' | 'manual'   // snake/linear: how pick order is determined
}

export const DEFAULT_ROSTER_SCORING: RosterScoringRules = {
  roster_size: 7,
  count_best: 5,
  tiers: {
    A: { count: 2, owgr_min: 1, owgr_max: 15 },
    B: { count: 2, owgr_min: 16, owgr_max: 30 },
    C: { count: 3, owgr_min: 31 },
  },
  cut_penalty: 'highest_plus_one',
}

/** Preset scoring configurations for roster pools */
export const ROSTER_SCORING_PRESETS: Record<string, { label: string; description: string; rules: RosterScoringRules }> = {
  standard: {
    label: 'Standard',
    description: 'Pick 7 golfers, best 5 count. Classic tier setup.',
    rules: DEFAULT_ROSTER_SCORING,
  },
  large_roster: {
    label: 'Large Roster',
    description: 'Pick 10 golfers, best 7 count. Wider tier ranges.',
    rules: {
      roster_size: 10,
      count_best: 7,
      tiers: {
        A: { count: 3, owgr_min: 1, owgr_max: 20 },
        B: { count: 3, owgr_min: 21, owgr_max: 50 },
        C: { count: 4, owgr_min: 51 },
      },
      cut_penalty: 'highest_plus_one',
    },
  },
  no_drops: {
    label: 'No Drops',
    description: 'Pick 5 golfers, all 5 count. Every pick matters.',
    rules: {
      roster_size: 5,
      count_best: 5,
      tiers: {
        A: { count: 1, owgr_min: 1, owgr_max: 15 },
        B: { count: 2, owgr_min: 16, owgr_max: 30 },
        C: { count: 2, owgr_min: 31 },
      },
      cut_penalty: 'highest_plus_one',
    },
  },
}

/** Get the effective draft mode from scoring rules (defaults to 'open') */
export function getDraftMode(scoringRules: Record<string, unknown> | null): RosterDraftMode {
  if (!scoringRules) return 'open'
  return (scoringRules.draft_mode as RosterDraftMode) || 'open'
}

/** Check if draft mode requires a live draft room */
export function isLiveDraftMode(mode: RosterDraftMode): boolean {
  return mode === 'snake_draft' || mode === 'linear_draft'
}

/**
 * Generate draft order for snake or linear draft.
 * @returns Array of { entryId, round, pickNumber, positionInRound }
 */
export function generateDraftOrder(
  entryIds: string[],
  totalRounds: number,
  mode: 'snake_draft' | 'linear_draft'
): Array<{ entryId: string; round: number; pickNumber: number; positionInRound: number }> {
  const order: Array<{ entryId: string; round: number; pickNumber: number; positionInRound: number }> = []
  let pickNumber = 1

  for (let round = 1; round <= totalRounds; round++) {
    // Snake: odd rounds go forward, even rounds go backward
    // Linear: always forward
    const isReversed = mode === 'snake_draft' && round % 2 === 0
    const roundOrder = isReversed ? [...entryIds].reverse() : [...entryIds]

    for (let pos = 0; pos < roundOrder.length; pos++) {
      order.push({
        entryId: roundOrder[pos],
        round,
        pickNumber,
        positionInRound: pos + 1,
      })
      pickNumber++
    }
  }

  return order
}

/** Result for a single golfer pick in a roster entry */
export interface RosterPickResult {
  participantId: string
  participantName: string
  tier: string
  roundScores: (number | null)[]    // [r1, r2, r3, r4]
  scoreToPar: number | null
  adjustedScore: number | null      // after cut penalty applied
  status: 'active' | 'cut' | 'wd' | 'dq'
  cutPenaltyApplied: boolean
  counted: boolean                  // true if this golfer is in the "best N"
}

/**
 * Compute the effective score-to-par for a golfer, applying cut penalty if needed.
 *
 * Cut penalty logic (highest_plus_one):
 *   - Find the highest score-to-par among all active (non-cut) participants
 *   - For each missed round (r3, r4), add (highest_active + 1) per round
 *   - The golfer's score = their actual 2-round score + penalty rounds
 */
function computeGolferScore(
  metadata: Record<string, unknown>,
  highestActiveScore: number,
  cutPenalty: RosterScoringRules['cut_penalty'],
  cutPenaltyFixed?: number
): { adjustedScore: number | null; cutPenaltyApplied: boolean } {
  const status = String(metadata.status || 'active')
  const scoreToPar = metadata.score_to_par as number | null

  // If no score data yet, can't compute
  if (scoreToPar == null) {
    return { adjustedScore: null, cutPenaltyApplied: false }
  }

  // Active golfers — no penalty needed
  if (status === 'active') {
    return { adjustedScore: scoreToPar, cutPenaltyApplied: false }
  }

  // Cut / WD / DQ golfers
  if (cutPenalty === 'none') {
    return { adjustedScore: scoreToPar, cutPenaltyApplied: false }
  }

  // Count how many rounds the golfer missed (rounds 3 and 4)
  const r3 = metadata.r3 as number | null
  const r4 = metadata.r4 as number | null
  const missedRounds = (r3 == null ? 1 : 0) + (r4 == null ? 1 : 0)

  if (missedRounds === 0) {
    // Played all rounds (WD after completing?) — no penalty
    return { adjustedScore: scoreToPar, cutPenaltyApplied: false }
  }

  if (cutPenalty === 'fixed') {
    const penaltyPerRound = cutPenaltyFixed ?? 10
    return {
      adjustedScore: scoreToPar + penaltyPerRound * missedRounds,
      cutPenaltyApplied: true,
    }
  }

  // 'highest_plus_one': add (highest active score + 1) per missed round
  // This means the penalty per missed round = highest_active_round_score + 1
  // Approximation: use (highestActiveScore / 4 rounds) as per-round, then +1
  // But the Google Sheet rule says "assigned the highest score from the field +1"
  // for EACH missed round's score. So penalty = (highest_score_from_field + 1) per missed round.
  // "highest score from the field" typically means the highest individual round score among those who made the cut.
  // However, since we track score_to_par not individual round scores for the penalty,
  // we interpret it as: each missed round scores as if they shot (highestActiveScore + 1) relative to that round.
  // Simpler approach: per missed round, add the penalty value.
  const penaltyPerRound = highestActiveScore + 1
  return {
    adjustedScore: scoreToPar + penaltyPerRound * missedRounds,
    cutPenaltyApplied: true,
  }
}

/**
 * Score a roster entry — aggregate best N of M golfer scores.
 * Pure function — no DB dependency.
 *
 * @param picks - The entry's picks (participant_id references)
 * @param allParticipants - All tournament participants (needed for cut penalty calculation)
 * @param rules - Scoring rules from pool.scoring_rules
 * @returns totalPoints (score to par, lower is better) and per-golfer results
 */
export function scoreRosterEntry(
  picks: EventPick[],
  allParticipants: EventParticipant[],
  rules: RosterScoringRules
): { totalPoints: number | null; results: RosterPickResult[] } {
  const participantMap = new Map(allParticipants.map(p => [p.id, p]))

  // Find highest score-to-par among active (non-cut) golfers for cut penalty
  const activeScores = allParticipants
    .filter(p => {
      const meta = (p.metadata || {}) as Record<string, unknown>
      return String(meta.status || 'active') === 'active' && meta.score_to_par != null
    })
    .map(p => ((p.metadata || {}) as Record<string, unknown>).score_to_par as number)

  const highestActiveScore = activeScores.length > 0
    ? Math.max(...activeScores)
    : 10 // fallback if no active scores yet

  // Score each picked golfer
  const golferResults: RosterPickResult[] = []
  let hasAnyScore = false

  for (const pick of picks) {
    const participant = participantMap.get(pick.participant_id)
    if (!participant) continue

    const meta = (participant.metadata || {}) as Record<string, unknown>
    const tier = String(meta.tier || '?')
    const status = String(meta.status || 'active') as RosterPickResult['status']
    const scoreToPar = meta.score_to_par as number | null
    const roundScores = [
      meta.r1 as number | null ?? null,
      meta.r2 as number | null ?? null,
      meta.r3 as number | null ?? null,
      meta.r4 as number | null ?? null,
    ]

    if (scoreToPar != null) hasAnyScore = true

    const { adjustedScore, cutPenaltyApplied } = computeGolferScore(
      meta, highestActiveScore, rules.cut_penalty, rules.cut_penalty_fixed
    )

    golferResults.push({
      participantId: participant.id,
      participantName: participant.name,
      tier,
      roundScores,
      scoreToPar,
      adjustedScore,
      status,
      cutPenaltyApplied,
      counted: false, // will be set below
    })
  }

  // If no scores yet, return null totalPoints
  if (!hasAnyScore) {
    return { totalPoints: null, results: golferResults }
  }

  // Sort by adjusted score ascending (best/lowest first)
  // Golfers with null adjusted score go to the end
  const sorted = [...golferResults].sort((a, b) => {
    if (a.adjustedScore == null && b.adjustedScore == null) return 0
    if (a.adjustedScore == null) return 1
    if (b.adjustedScore == null) return -1
    return a.adjustedScore - b.adjustedScore
  })

  // Mark the best N as "counted"
  let totalPoints = 0
  const countBest = Math.min(rules.count_best, sorted.length)

  for (let i = 0; i < sorted.length; i++) {
    if (i < countBest && sorted[i].adjustedScore != null) {
      sorted[i].counted = true
      totalPoints += sorted[i].adjustedScore!
    }
  }

  // Update the counted flag in the original results array
  const countedIds = new Set(sorted.filter(r => r.counted).map(r => r.participantId))
  for (const result of golferResults) {
    result.counted = countedIds.has(result.participantId)
  }

  return { totalPoints, results: golferResults }
}

/**
 * Validate that a roster pick set follows tier constraints.
 * @returns isValid and any error messages
 */
export function validateRosterCompleteness(
  pickParticipantIds: string[],
  participants: EventParticipant[],
  rules: RosterScoringRules
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const participantMap = new Map(participants.map(p => [p.id, p]))

  // Check total count
  if (pickParticipantIds.length !== rules.roster_size) {
    errors.push(`Expected ${rules.roster_size} picks, got ${pickParticipantIds.length}`)
    return { isValid: false, errors }
  }

  // Check for duplicates
  const uniqueIds = new Set(pickParticipantIds)
  if (uniqueIds.size !== pickParticipantIds.length) {
    errors.push('Duplicate golfer picks are not allowed')
    return { isValid: false, errors }
  }

  // Group picks by tier
  const tierCounts: Record<string, number> = {}
  for (const [tierName] of Object.entries(rules.tiers)) {
    tierCounts[tierName] = 0
  }

  for (const participantId of pickParticipantIds) {
    const participant = participantMap.get(participantId)
    if (!participant) {
      errors.push(`Participant ${participantId} not found in tournament`)
      continue
    }

    const meta = (participant.metadata || {}) as Record<string, unknown>
    const owgr = (meta.owgr as number | undefined) ?? (participant.seed as number | undefined)

    if (owgr == null) {
      errors.push(`Participant ${participant.name} has no ranking`)
      continue
    }

    // Find which tier this participant belongs to
    let foundTier: string | null = null
    for (const [tierName, tierDef] of Object.entries(rules.tiers)) {
      const inMin = owgr >= tierDef.owgr_min
      const inMax = tierDef.owgr_max == null || owgr <= tierDef.owgr_max
      if (inMin && inMax) {
        foundTier = tierName
        break
      }
    }

    if (!foundTier) {
      errors.push(`${participant.name} (OWGR ${owgr}) does not fit any tier`)
      continue
    }

    tierCounts[foundTier] = (tierCounts[foundTier] || 0) + 1
  }

  // Verify each tier has the correct count
  for (const [tierName, tierDef] of Object.entries(rules.tiers)) {
    const actual = tierCounts[tierName] || 0
    if (actual !== tierDef.count) {
      errors.push(`Tier ${tierName} requires ${tierDef.count} picks, got ${actual}`)
    }
  }

  return { isValid: errors.length === 0, errors }
}

/**
 * Format a score-to-par value as golf notation.
 * e.g., -5 → "-5", 0 → "E", 3 → "+3", null → "—"
 */
export function formatGolfScore(scoreToPar: number | null): string {
  if (scoreToPar == null) return '—'
  if (scoreToPar === 0) return 'E'
  if (scoreToPar > 0) return `+${scoreToPar}`
  return String(scoreToPar)
}
