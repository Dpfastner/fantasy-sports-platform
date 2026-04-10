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
 * Requires at least (countBest - 1) counting golfers to have data, so a single
 * missing golfer doesn't block the entire award from showing.
 */
export function determineRoundAwards(
  scores: EntryRoundScore[],
  countBest: number,
): RoundAwards {
  const minRequired = Math.max(1, countBest - 1)
  const complete = scores.filter(s => s.golferCount >= minRequired)
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
 * Check if a round is fully complete — at least 70% of active participants
 * have their rN field explicitly set (not derived from live score_to_par).
 */
function isRoundComplete(participants: Participant[], roundNumber: number): boolean {
  const key = `r${roundNumber}`
  let withScore = 0
  let active = 0
  for (const p of participants) {
    const meta = (p.metadata || {}) as Record<string, unknown>
    if (meta.status === 'cut' || meta.status === 'wd' || meta.status === 'dq') continue
    active++
    const val = meta[key]
    if (typeof val === 'number' && val >= 60 && val <= 100) withScore++
  }
  if (active === 0) return false
  // Require 90%+ to have explicit round score — prevents awarding in-progress rounds
  return withScore / active >= 0.9
}

/** Detect the highest round currently in progress from participant metadata. */
function detectCurrentRound(participants: Participant[]): number {
  let maxRound = 0
  for (const p of participants) {
    const meta = (p.metadata || {}) as Record<string, unknown>
    const cr = meta.current_round as number | undefined
    if (cr && cr > maxRound) maxRound = cr
  }
  return maxRound || 1
}

/**
 * Compute all awards across completed rounds only.
 * In-progress rounds are skipped to avoid premature awards.
 */
export function computeAllMastersAwards(
  entries: EntryInfo[],
  allRosterPicks: Record<string, string[]>,
  participants: Participant[],
  countBest: number,
): MastersAwardsResult {
  const pimentoWinners = new Map<string, number[]>()
  let crowsNestHolder: { entryId: string; rounds: number[] } | null = null

  const currentRound = detectCurrentRound(participants)

  for (const round of [1, 2, 3, 4] as const) {
    // Only award rounds that are BEFORE the current round (fully completed)
    // or the current round IF it passes the completion threshold
    if (round > currentRound) continue
    if (round === currentRound && !isRoundComplete(participants, round)) continue
    if (round < currentRound && !isRoundComplete(participants, round)) continue

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
