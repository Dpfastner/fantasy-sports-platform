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
        // Use cumulative score through THIS round (not live total which changes during later rounds).
        // For R1 awards: use r1 only. For R2: r1+r2. This prevents R3 score changes from
        // shifting which golfers "count" for historical round awards.
        let cumulativeToPar = 0
        const coursePar = 72
        for (let r = 1; r <= roundNumber; r++) {
          const rVal = meta[`r${r}`]
          if (typeof rVal === 'number' && rVal >= 60 && rVal <= 100) {
            cumulativeToPar += (rVal as number) - coursePar
          } else {
            // If a round score is missing, fall back to live total
            cumulativeToPar = typeof meta.score_to_par === 'number' ? (meta.score_to_par as number) : 999
            break
          }
        }
        return {
          roundToPar: golferRoundToPar(meta, roundNumber),
          totalToPar: cumulativeToPar,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    if (pickDetails.length === 0) continue

    // Sort by cumulative score through this round (best first) then take counting golfers
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
  /** Pimento Cheese: ALL entries tied for best (lowest) round score */
  pimentoWinners: EntryRoundScore[]
  /** Crow's Nest: ALL entries tied for worst (highest) round score */
  crowsNestHolders: EntryRoundScore[]
}

/**
 * Determine the pimento cheese winners and crow's nest holders for a round.
 * Ties result in ALL tied entries receiving the award.
 */
export function determineRoundAwards(
  scores: EntryRoundScore[],
  countBest: number,
): RoundAwards {
  const minRequired = Math.max(1, countBest - 1)
  const complete = scores.filter(s => s.golferCount >= minRequired)
  if (complete.length === 0) return { pimentoWinners: [], crowsNestHolders: [] }

  const sorted = [...complete].sort((a, b) => a.roundToPar - b.roundToPar)

  // Pimento: all entries tied with the best (lowest) round score
  const bestScore = sorted[0].roundToPar
  const pimentoWinners = sorted.filter(s => s.roundToPar === bestScore)

  // Crow's nest: all entries tied with the worst (highest) round score
  const worstScore = sorted[sorted.length - 1].roundToPar
  const crowsNestHolders = sorted.filter(s => s.roundToPar === worstScore)

  return { pimentoWinners, crowsNestHolders }
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
  let active = 0
  for (const p of participants) {
    const meta = (p.metadata || {}) as Record<string, unknown>
    if (meta.status === 'cut' || meta.status === 'wd' || meta.status === 'dq') continue
    active++
    const val = meta[key]
    // Every active golfer must have an explicit round score
    if (typeof val !== 'number' || val < 60 || val > 100) return false
  }
  return active > 0
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

    // Pimento: all tied winners get the award
    for (const winner of awards.pimentoWinners) {
      const existing = pimentoWinners.get(winner.entryId) || []
      existing.push(round)
      pimentoWinners.set(winner.entryId, existing)
    }

    // Crow's nest: rotates each round, but ties all share it
    if (awards.crowsNestHolders.length > 0) {
      // For simplicity, if there are ties for worst, the first one holds it
      // (crow's nest is singular shame — ties share the attic)
      const holder = awards.crowsNestHolders[0]
      if (crowsNestHolder && crowsNestHolder.entryId === holder.entryId) {
        crowsNestHolder.rounds.push(round)
      } else {
        crowsNestHolder = { entryId: holder.entryId, rounds: [round] }
      }
    }
  }

  return { pimentoWinners, crowsNestHolder }
}
