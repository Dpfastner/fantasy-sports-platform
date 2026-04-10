/**
 * Masters-specific round award computation.
 *
 * Pimento Cheese Award — best combined round performance (permanent per round).
 * Crow's Nest Badge — worst combined round performance (rotates each round).
 *
 * All functions are pure — no DB calls. Compute client-side from live data.
 */

import { golferRoundToPar } from '@/lib/events/golf-aggregations'

export interface EntryRoundScore {
  entryId: string
  entryName: string
  roundNumber: number
  /** Sum of counting golfers' round-to-par */
  roundToPar: number
  /** How many counting golfers had data for this round */
  golferCount: number
  /** Entry's total tournament score (for tiebreaking) */
  totalScore: number
}

interface EntryInfo {
  id: string
  displayName: string
  entryName?: string | null
  score: number
}

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

/**
 * Compute per-round aggregate score for each entry.
 * For each entry: get their picked golfers, compute each golfer's round-to-par,
 * sort by total score, take the best `countBest`, sum their round scores.
 */
export function computeEntryRoundScores(
  entries: EntryInfo[],
  allRosterPicks: Record<string, string[]>,
  participants: Participant[],
  countBest: number,
  roundNumber: 1 | 2 | 3 | 4,
): EntryRoundScore[] {
  const participantMap = new Map<string, Participant>()
  for (const p of participants) participantMap.set(p.id, p)

  const results: EntryRoundScore[] = []

  for (const entry of entries) {
    const pickIds = allRosterPicks[entry.id]
    if (!pickIds || pickIds.length === 0) continue

    const pickDetails = pickIds
      .map(id => {
        const p = participantMap.get(id)
        if (!p) return null
        const meta = (p.metadata || {}) as Record<string, unknown>
        return {
          roundToPar: golferRoundToPar(meta, roundNumber),
          totalToPar: typeof meta.score_to_par === 'number' ? (meta.score_to_par as number) : 999,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (pickDetails.length === 0) continue

    // Sort by total score (best golfers first) then take counting golfers
    pickDetails.sort((a, b) => a.totalToPar - b.totalToPar)
    const counting = pickDetails.slice(0, countBest)

    let sum = 0
    let count = 0
    for (const c of counting) {
      if (c.roundToPar != null) {
        sum += c.roundToPar
        count++
      }
    }

    // Only include if at least some counting golfers have round data
    if (count > 0) {
      results.push({
        entryId: entry.id,
        entryName: entry.entryName || entry.displayName,
        roundNumber,
        roundToPar: sum,
        golferCount: count,
        totalScore: entry.score,
      })
    }
  }

  return results
}

export interface RoundAwards {
  /** Pimento Cheese: best (lowest) round score */
  pimentoWinner: EntryRoundScore | null
  /** Crow's Nest: worst (highest) round score */
  crowsNestHolder: EntryRoundScore | null
}

/**
 * Determine the pimento cheese winner and crow's nest holder for a round.
 * Requires all counting golfers to have completed the round (golferCount >= countBest).
 */
export function determineRoundAwards(
  scores: EntryRoundScore[],
  countBest: number,
): RoundAwards {
  // Only consider entries where all counting golfers have round data
  const complete = scores.filter(s => s.golferCount >= countBest)
  if (complete.length === 0) return { pimentoWinner: null, crowsNestHolder: null }

  // Sort ascending by roundToPar, then by totalScore for tiebreak
  const sorted = [...complete].sort((a, b) => {
    if (a.roundToPar !== b.roundToPar) return a.roundToPar - b.roundToPar
    return a.totalScore - b.totalScore
  })

  return {
    pimentoWinner: sorted[0],
    crowsNestHolder: sorted[sorted.length - 1],
  }
}

export interface MastersAwardsResult {
  /** Map of entryId → array of round numbers they won pimento cheese for */
  pimentoWinners: Map<string, number[]>
  /** Current crow's nest holder (most recent round only, but tracks consecutive) */
  crowsNestHolder: { entryId: string; rounds: number[] } | null
}

/**
 * Compute all awards across rounds 1-4.
 * Call this once with all data to get the full awards state.
 */
export function computeAllMastersAwards(
  entries: EntryInfo[],
  allRosterPicks: Record<string, string[]>,
  participants: Participant[],
  countBest: number,
): MastersAwardsResult {
  const pimentoWinners = new Map<string, number[]>()
  let crowsNestHolder: { entryId: string; rounds: number[] } | null = null

  for (const round of [1, 2, 3, 4] as const) {
    const scores = computeEntryRoundScores(entries, allRosterPicks, participants, countBest, round)
    const awards = determineRoundAwards(scores, countBest)

    if (awards.pimentoWinner) {
      const existing = pimentoWinners.get(awards.pimentoWinner.entryId) || []
      existing.push(round)
      pimentoWinners.set(awards.pimentoWinner.entryId, existing)
    }

    if (awards.crowsNestHolder) {
      // Crow's nest rotates — only latest round holder matters, but track consecutive
      if (crowsNestHolder && crowsNestHolder.entryId === awards.crowsNestHolder.entryId) {
        crowsNestHolder.rounds.push(round)
      } else {
        crowsNestHolder = { entryId: awards.crowsNestHolder.entryId, rounds: [round] }
      }
    }
  }

  return { pimentoWinners, crowsNestHolder }
}
