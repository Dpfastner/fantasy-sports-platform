/**
 * Client-side aggregation helpers for per-hole golf data.
 * All functions are pure — given a list of participants with metadata.holes,
 * compute per-hole leaderboards, difficulty, and current-hole groupings.
 */

import type { GolfHole } from '@/components/GolfHoleGrid'

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
 * Excludes cut/WD/DQ golfers and golfers with no currentHole data.
 */
export function groupGolfersByCurrentHole(golfers: GolferLite[]): Map<number, GolferLite[]> {
  const map = new Map<number, GolferLite[]>()
  for (const g of golfers) {
    if (g.status === 'cut' || g.status === 'wd' || g.status === 'dq') continue
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
