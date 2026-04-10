/**
 * Client-side aggregation helpers for per-hole golf data.
 * All functions are pure — given a list of participants with metadata.holes,
 * compute per-hole leaderboards, difficulty, and current-hole groupings.
 */

import type { GolfHole } from '@/components/GolfHoleGrid'

/**
 * Compute a golfer's to-par for a specific round from their metadata.
 * Completed rounds: rX - coursePar (only if rX is in the 64-100 sane range).
 * In-progress rounds: derived from live total minus completed rounds.
 * E.g. R2 running = score_to_par - (r1 - 72). Updates every minute.
 */
export function golferRoundToPar(
  meta: Record<string, unknown>,
  round: number,
  coursePar: number = 72
): number | null {
  const isValid = (s: unknown): s is number =>
    typeof s === 'number' && s >= 64 && s <= 100
  const total = typeof meta.score_to_par === 'number' ? meta.score_to_par as number : null
  const r1 = isValid(meta.r1) ? (meta.r1 as number) - coursePar : null
  const r2 = isValid(meta.r2) ? (meta.r2 as number) - coursePar : null
  const r3 = isValid(meta.r3) ? (meta.r3 as number) - coursePar : null
  const r4 = isValid(meta.r4) ? (meta.r4 as number) - coursePar : null

  const completed = round === 1 ? r1 : round === 2 ? r2 : round === 3 ? r3 : r4
  if (completed != null) return completed

  if (total == null) return null
  if (round === 1) return total
  if (round === 2 && r1 != null) return total - r1
  if (round === 3 && r1 != null && r2 != null) return total - r1 - r2
  if (round === 4 && r1 != null && r2 != null && r3 != null) return total - r1 - r2 - r3
  return null
}

export interface GolferLite {
  id: string
  name: string
  countryCode?: string | null
  position?: number | null
  scoreToPar?: number | null
  status?: string
  currentHole?: number | null
  thru?: number | null
  holes: GolfHole[]
  // Rolling snapshot from the gameday sync (Feature 4: Biggest Movers)
  prevScoreToPar?: number | null
  prevScoreAt?: string | null
  // Pairing: IDs of other golfers sharing the same teeTime + startHole (Feature 6)
  pairIds?: string[]
  teeTime?: string | null
  startHole?: number | null
  currentRound?: number | null
}

/**
 * Extract a lightweight golfer shape from raw participants array.
 */
export function extractGolfers(participants: Array<{ id: string; name: string; metadata?: Record<string, unknown> | null }>): GolferLite[] {
  return participants.map(p => {
    const meta = (p.metadata || {}) as Record<string, unknown>
    return {
      id: p.id,
      name: p.name,
      countryCode: meta.country_code as string | null | undefined,
      position: meta.position as number | null | undefined,
      scoreToPar: meta.score_to_par as number | null | undefined,
      status: meta.status as string | undefined,
      currentHole: meta.current_hole as number | null | undefined,
      thru: meta.thru as number | null | undefined,
      holes: (meta.holes as GolfHole[] | undefined) || [],
      prevScoreToPar: meta.prev_score_to_par as number | null | undefined,
      prevScoreAt: meta.prev_score_at as string | null | undefined,
      pairIds: (meta.pair_ids as string[] | undefined) || [],
      teeTime: meta.tee_time as string | null | undefined,
      startHole: meta.start_hole as number | null | undefined,
      currentRound: meta.current_round as number | null | undefined,
    }
  })
}

/**
 * Sort golfers by their score on a specific hole in a specific round.
 * Returns only golfers who played the hole. Lowest strokes first.
 */
export function computeHoleLeaderboard(
  golfers: GolferLite[],
  holeNumber: number,
  round: number
): Array<GolferLite & { holeStrokes: number; holePar: number; holeScoreType: string }> {
  const result = golfers
    .map(g => {
      const h = g.holes.find(x => x.hole === holeNumber && x.round === round)
      if (!h) return null
      return {
        ...g,
        holeStrokes: h.strokes,
        holePar: h.par,
        holeScoreType: h.scoreType,
      }
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)

  result.sort((a, b) => a.holeStrokes - b.holeStrokes || a.name.localeCompare(b.name))
  return result
}

/**
 * Compute average score (vs par) on a specific hole across the field.
 * Positive = plays harder than par, negative = plays easier.
 */
export function computeHoleDifficulty(
  golfers: GolferLite[],
  holeNumber: number,
  round: number
): { avgScore: number | null; avgVsPar: number | null; playersFinished: number } {
  const scores: number[] = []
  let par = 0
  for (const g of golfers) {
    const h = g.holes.find(x => x.hole === holeNumber && x.round === round)
    if (h) {
      scores.push(h.strokes)
      par = h.par
    }
  }
  if (scores.length === 0) return { avgScore: null, avgVsPar: null, playersFinished: 0 }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return {
    avgScore: avg,
    avgVsPar: avg - par,
    playersFinished: scores.length,
  }
}

/**
 * Group golfers by the hole they are currently playing.
 * Excludes cut/WD/DQ golfers, golfers with no currentHole data, AND
 * golfers who have completed their round (thru >= 18). Without the
 * thru filter, finished golfers stay pinned to hole 18 between rounds
 * because the sync may preserve their last known current_hole value.
 */
export function groupGolfersByCurrentHole(golfers: GolferLite[]): Map<number, GolferLite[]> {
  const map = new Map<number, GolferLite[]>()
  for (const g of golfers) {
    if (g.status === 'cut' || g.status === 'wd' || g.status === 'dq') continue
    if (typeof g.thru === 'number' && g.thru >= 18) continue
    if (typeof g.currentHole !== 'number' || g.currentHole < 1 || g.currentHole > 18) continue
    if (!map.has(g.currentHole)) map.set(g.currentHole, [])
    map.get(g.currentHole)!.push(g)
  }
  return map
}

/**
 * Return the latest round number for which any golfer has hole data.
 * Defaults to 1 if no data exists.
 */
export function getLatestRound(golfers: GolferLite[]): number {
  let max = 1
  for (const g of golfers) {
    for (const h of g.holes) {
      if (h.round > max) max = h.round
    }
  }
  return max
}

/**
 * Compute the scoring distribution across the field for a specific hole in a specific round.
 * Buckets every golfer who finished the hole into eagle/birdie/par/bogey/double+ using the
 * same classification rules as the GolfHoleGrid pill coloring.
 */
export interface HoleScoringDistribution {
  eagles: number      // -2 or better
  birdies: number     // -1
  pars: number        // E
  bogeys: number      // +1
  doublesPlus: number // +2 or worse
  total: number
  avgVsPar: number | null
  par: number | null
}

export function computeHoleScoringDistribution(
  golfers: GolferLite[],
  holeNumber: number,
  round: number
): HoleScoringDistribution {
  let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doublesPlus = 0
  let sumVsPar = 0
  let par: number | null = null
  for (const g of golfers) {
    const h = g.holes.find(x => x.hole === holeNumber && x.round === round)
    if (!h) continue
    par = h.par
    const diff = h.strokes - h.par
    sumVsPar += diff
    if (diff <= -2) eagles++
    else if (diff === -1) birdies++
    else if (diff === 0) pars++
    else if (diff === 1) bogeys++
    else doublesPlus++
  }
  const total = eagles + birdies + pars + bogeys + doublesPlus
  return {
    eagles, birdies, pars, bogeys, doublesPlus, total,
    avgVsPar: total > 0 ? sumVsPar / total : null,
    par,
  }
}

/**
 * Find the hardest and easiest holes on the course for a given round.
 */
export function findExtremeHoles(golfers: GolferLite[], round: number): {
  hardest: { hole: number; avgVsPar: number } | null
  easiest: { hole: number; avgVsPar: number } | null
} {
  let hardest: { hole: number; avgVsPar: number } | null = null
  let easiest: { hole: number; avgVsPar: number } | null = null
  for (let hole = 1; hole <= 18; hole++) {
    const d = computeHoleDifficulty(golfers, hole, round)
    if (d.avgVsPar == null || d.playersFinished < 3) continue
    if (!hardest || d.avgVsPar > hardest.avgVsPar) hardest = { hole, avgVsPar: d.avgVsPar }
    if (!easiest || d.avgVsPar < easiest.avgVsPar) easiest = { hole, avgVsPar: d.avgVsPar }
  }
  return { hardest, easiest }
}

// ============================================================
// Feature 4 — Biggest Movers (climbers / droppers)
// ============================================================

export interface GolferMove {
  id: string
  name: string
  countryCode?: string | null
  currentScoreToPar: number
  prevScoreToPar: number
  delta: number           // negative = climbed (score improved)
  position: number | null
}

/**
 * Compute biggest climbers and droppers over the rolling snapshot window.
 * Requires participants with `prevScoreToPar` populated by the gameday sync.
 * Returns the top 3 by |delta| on each side.
 */
export function computeMovers(golfers: GolferLite[]): {
  climbers: GolferMove[]
  droppers: GolferMove[]
} {
  const moves: GolferMove[] = []
  for (const g of golfers) {
    if (g.status === 'cut' || g.status === 'wd' || g.status === 'dq') continue
    if (typeof g.scoreToPar !== 'number' || typeof g.prevScoreToPar !== 'number') continue
    const delta = g.scoreToPar - g.prevScoreToPar
    if (delta === 0) continue
    moves.push({
      id: g.id,
      name: g.name,
      countryCode: g.countryCode,
      currentScoreToPar: g.scoreToPar,
      prevScoreToPar: g.prevScoreToPar,
      delta,
      position: g.position ?? null,
    })
  }
  const climbers = [...moves].filter(m => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)
  const droppers = [...moves].filter(m => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3)
  return { climbers, droppers }
}

// ============================================================
// Feature 6 — Tee Times & Pairings
// ============================================================

export interface TeeTimeRow {
  id: string
  name: string
  countryCode?: string | null
  teeTime: string           // ISO string
  startHole: number
  pairIds: string[]
  status: 'upcoming' | 'on_course' | 'finished'
  position: number | null
  scoreToPar: number | null
  thru: number | null
}

function deriveTeeStatus(g: GolferLite, now: number): 'upcoming' | 'on_course' | 'finished' {
  // Finished if they've played 18 in the current round
  if (typeof g.thru === 'number' && g.thru >= 18) return 'finished'
  // On course if they have a currentHole, thru > 0, or tee time is in the past
  if (typeof g.currentHole === 'number' && g.currentHole > 0) return 'on_course'
  if (typeof g.thru === 'number' && g.thru > 0) return 'on_course'
  if (g.teeTime) {
    const t = new Date(g.teeTime).getTime()
    if (!isNaN(t) && t <= now) return 'on_course'
  }
  return 'upcoming'
}

/**
 * Today's tee times — sorted by tee time ascending.
 * If `filterIds` is provided, only returns golfers in that set (e.g. a user's roster).
 */
export function getTodaysTeeTimes(golfers: GolferLite[], filterIds?: string[] | null): TeeTimeRow[] {
  const now = Date.now()
  const ids = filterIds ? new Set(filterIds) : null
  const rows: TeeTimeRow[] = []
  for (const g of golfers) {
    if (ids && !ids.has(g.id)) continue
    if (g.status === 'cut' || g.status === 'wd' || g.status === 'dq') continue
    if (!g.teeTime) continue
    rows.push({
      id: g.id,
      name: g.name,
      countryCode: g.countryCode,
      teeTime: g.teeTime,
      startHole: g.startHole ?? 1,
      pairIds: g.pairIds ?? [],
      status: deriveTeeStatus(g, now),
      position: g.position ?? null,
      scoreToPar: g.scoreToPar ?? null,
      thru: g.thru ?? null,
    })
  }
  rows.sort((a, b) => new Date(a.teeTime).getTime() - new Date(b.teeTime).getTime())
  return rows
}

/**
 * Derive featured groups from the field by picking the top-N ranked golfers
 * and returning whichever groups (by teeTime+startHole key) contain them.
 * De-duplicated — each group is only returned once.
 */
export function getFeaturedGroups(
  golfers: GolferLite[],
  topN: number = 6
): Array<{ teeTime: string; startHole: number; golfers: GolferLite[] }> {
  // Pick the top N golfers by position (lower is better)
  const topGolfers = [...golfers]
    .filter(g => g.status !== 'cut' && g.status !== 'wd' && g.status !== 'dq')
    .filter(g => g.position != null && g.teeTime)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .slice(0, topN)

  // Group by teeTime|startHole
  const groupKey = (g: GolferLite) => `${g.teeTime}|${g.startHole ?? 1}`
  const seen = new Set<string>()
  const out: Array<{ teeTime: string; startHole: number; golfers: GolferLite[] }> = []

  for (const top of topGolfers) {
    const key = groupKey(top)
    if (seen.has(key)) continue
    seen.add(key)
    const members = golfers.filter(g => groupKey(g) === key && g.teeTime)
    if (members.length === 0) continue
    out.push({
      teeTime: top.teeTime!,
      startHole: top.startHole ?? 1,
      golfers: members.sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    })
  }

  out.sort((a, b) => new Date(a.teeTime).getTime() - new Date(b.teeTime).getTime())
  return out
}

// ============================================================
// Feature 5 — Projected Cut Tracker
// ============================================================

export type CutRule =
  | { type: 'top_n_and_ties'; n: number }
  | { type: 'stroke_limit'; strokes: number }
  | null

export interface CutProjection {
  cutLine: number | null       // score-to-par required to make the cut
  fieldSize: number            // total golfers with a scoreToPar
  insideCount: number          // number of golfers at or inside the line
  bubble: GolferLite[]         // within ±2 of the line (excluding inside/outside)
  inside: GolferLite[]         // comfortably inside (> 2 strokes ahead of line)
  outside: GolferLite[]        // currently missing the cut
}

/**
 * Compute the projected cut line and bubble players based on current
 * score-to-par and the tournament's cut rule. Returns null if no rule
 * or not enough field data.
 */
export function computeProjectedCut(
  golfers: GolferLite[],
  cutRule: CutRule
): CutProjection | null {
  if (!cutRule) return null

  const active = golfers.filter(g =>
    g.status !== 'wd' && g.status !== 'dq' && typeof g.scoreToPar === 'number'
  )
  if (active.length < 10) return null

  // Sort ascending (lowest/best first)
  const sorted = [...active].sort((a, b) => (a.scoreToPar ?? 999) - (b.scoreToPar ?? 999))

  let cutLine: number | null = null

  if (cutRule.type === 'top_n_and_ties') {
    if (sorted.length <= cutRule.n) {
      cutLine = sorted[sorted.length - 1].scoreToPar ?? null
    } else {
      // The score at index n-1 is the worst score that still makes the cut
      cutLine = sorted[cutRule.n - 1].scoreToPar ?? null
    }
  } else if (cutRule.type === 'stroke_limit') {
    cutLine = cutRule.strokes
  }

  if (cutLine == null) return null

  const inside: GolferLite[] = []
  const bubble: GolferLite[] = []
  const outside: GolferLite[] = []

  for (const g of sorted) {
    const s = g.scoreToPar as number
    if (s <= cutLine - 2) inside.push(g)
    else if (s <= cutLine + 2) bubble.push(g)
    else outside.push(g)
  }

  const insideCount = sorted.filter(g => (g.scoreToPar as number) <= cutLine!).length

  return {
    cutLine,
    fieldSize: active.length,
    insideCount,
    inside,
    bubble,
    outside,
  }
}
