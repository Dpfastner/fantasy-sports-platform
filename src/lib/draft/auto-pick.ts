import { SupabaseClient } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────

export interface AutoPickContext {
  draftId: string
  leagueId: string
  teamId: string
  userId: string
  currentPick: number
  currentRound: number
  seasonId: string
  seasonYear: number
  schoolsPerTeam: number
  maxSelectionsTotal: number   // 0 = unlimited
  maxSelectionsPerTeam: number
}

export interface AutoPickResult {
  schoolId: string
  schoolName: string
  conference: string
  source: 'queue' | 'algorithm'
  compositeScore?: number
}

interface SchoolRow {
  id: string
  name: string
  conference: string
}

// ── Conference Tier Map ────────────────────────────────────

const POWER_4 = new Set(['SEC', 'Big Ten', 'Big 12', 'ACC'])
const GROUP_OF_5 = new Set(['AAC', 'Mountain West', 'Sun Belt', 'MAC', 'Conference USA'])

function getConferenceTierScore(conference: string): number {
  if (POWER_4.has(conference)) return 1.0
  if (conference === 'Independent') return 0.6
  if (GROUP_OF_5.has(conference)) return 0.4
  return 0.2
}

// ── Weights ────────────────────────────────────────────────

const W_RANK = 0.40
const W_CONF = 0.20
const W_SOS  = 0.15
const W_DIV  = 0.10
const W_HIST = 0.15

// ── Main Entry Point ───────────────────────────────────────

/**
 * Select the best school for auto-pick.
 * Priority: draft queue (ordered watchlist) → composite algorithm.
 */
export async function selectAutoPickSchool(
  supabase: SupabaseClient,
  ctx: AutoPickContext
): Promise<AutoPickResult | null> {
  // 1. Get all existing picks to determine availability
  const { data: existingPicks } = await supabase
    .from('draft_picks')
    .select('school_id, fantasy_team_id')
    .eq('draft_id', ctx.draftId)

  const picks = existingPicks || []

  // Count picks per school (global) and per this team
  const globalCounts = new Map<string, number>()
  const teamCounts = new Map<string, number>()
  const teamConferences = new Map<string, number>() // conference → count for this team

  for (const pick of picks) {
    globalCounts.set(pick.school_id, (globalCounts.get(pick.school_id) || 0) + 1)
    if (pick.fantasy_team_id === ctx.teamId) {
      teamCounts.set(pick.school_id, (teamCounts.get(pick.school_id) || 0) + 1)
    }
  }

  // 2. Get all active schools
  const { data: allSchools } = await supabase
    .from('schools')
    .select('id, name, conference')
    .eq('is_active', true)

  if (!allSchools || allSchools.length === 0) return null

  // Build team conference counts (need school conference info)
  const schoolConfMap = new Map<string, string>()
  for (const s of allSchools) {
    schoolConfMap.set(s.id, s.conference)
  }
  for (const pick of picks) {
    if (pick.fantasy_team_id === ctx.teamId) {
      const conf = schoolConfMap.get(pick.school_id)
      if (conf) {
        teamConferences.set(conf, (teamConferences.get(conf) || 0) + 1)
      }
    }
  }

  // 3. Filter to available schools
  const available = allSchools.filter(school => {
    const global = globalCounts.get(school.id) || 0
    const team = teamCounts.get(school.id) || 0
    const globalMaxed = ctx.maxSelectionsTotal > 0 && global >= ctx.maxSelectionsTotal
    const teamMaxed = team >= ctx.maxSelectionsPerTeam
    return !globalMaxed && !teamMaxed
  })

  if (available.length === 0) return null

  const availableIds = new Set(available.map(s => s.id))

  // 4. Check draft queue first (watchlist with priority ordering)
  const { data: queueItems } = await supabase
    .from('watchlists')
    .select('school_id')
    .eq('user_id', ctx.userId)
    .eq('league_id', ctx.leagueId)
    .not('priority', 'is', null)
    .order('priority', { ascending: true })

  if (queueItems) {
    for (const item of queueItems) {
      if (availableIds.has(item.school_id)) {
        const school = available.find(s => s.id === item.school_id)!
        return {
          schoolId: school.id,
          schoolName: school.name,
          conference: school.conference,
          source: 'queue',
        }
      }
    }
  }

  // 5. Fall back to composite algorithm
  const scores = await scoreAllSchools(supabase, ctx, available, teamConferences)

  if (scores.length === 0) return null

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  const best = scores[0]
  return {
    schoolId: best.schoolId,
    schoolName: best.schoolName,
    conference: best.conference,
    source: 'algorithm',
    compositeScore: best.score,
  }
}

// ── Composite Scoring ──────────────────────────────────────

interface ScoredSchool {
  schoolId: string
  schoolName: string
  conference: string
  score: number
}

async function scoreAllSchools(
  supabase: SupabaseClient,
  ctx: AutoPickContext,
  available: SchoolRow[],
  teamConferences: Map<string, number>
): Promise<ScoredSchool[]> {
  // Fetch AP preseason rankings (week 1)
  const apRanks = await fetchAPRankings(supabase, ctx.seasonId)

  // Fetch SOS data (ranked opponents from schedule)
  const sosScores = await fetchSOSScores(supabase, ctx.seasonId, available, apRanks)
  const hasSOS = sosScores.size > 0

  // Fetch historical points (prior season)
  const histScores = await fetchHistoricalScores(supabase, ctx.seasonYear - 1)
  const hasHist = histScores.size > 0

  // Adjust weights if SOS or historical data unavailable
  let wRank = W_RANK
  let wConf = W_CONF
  let wSos = W_SOS
  let wDiv = W_DIV
  let wHist = W_HIST

  if (!hasSOS && !hasHist) {
    // Redistribute both to ranking
    wRank += wSos + wHist
    wSos = 0
    wHist = 0
  } else if (!hasSOS) {
    wRank += wSos
    wSos = 0
  } else if (!hasHist) {
    wRank += wHist
    wHist = 0
  }

  return available.map(school => {
    // AP Ranking score (0-1)
    const rank = apRanks.get(school.id)
    const rankScore = rank ? Math.max(0, (26 - rank) / 25) : 0

    // Conference tier score (0-1)
    const confScore = getConferenceTierScore(school.conference)

    // SOS score (0-1)
    const sosScore = sosScores.get(school.id) || 0

    // Diversification penalty (0-1)
    const confCount = teamConferences.get(school.conference) || 0
    const divPenalty = confCount / ctx.schoolsPerTeam

    // Historical score (0-1)
    const histScore = histScores.get(school.id) || 0

    const score =
      (wRank * rankScore) +
      (wConf * confScore) +
      (wSos * sosScore) -
      (wDiv * divPenalty) +
      (wHist * histScore)

    return {
      schoolId: school.id,
      schoolName: school.name,
      conference: school.conference,
      score,
    }
  })
}

// ── Data Fetchers ──────────────────────────────────────────

/** Fetch AP preseason rankings. Returns school_id → rank (1-25). */
async function fetchAPRankings(
  supabase: SupabaseClient,
  seasonId: string
): Promise<Map<string, number>> {
  const rankings = new Map<string, number>()

  // Try week 1 first (preseason), fall back to week 0
  for (const week of [1, 0]) {
    const { data } = await supabase
      .from('ap_rankings_history')
      .select('school_id, rank')
      .eq('season_id', seasonId)
      .eq('week_number', week)

    if (data && data.length > 0) {
      for (const r of data) {
        rankings.set(r.school_id, r.rank)
      }
      break
    }
  }

  return rankings
}

/**
 * Derive SOS from scheduled games.
 * For each school, count how many opponents are AP-ranked.
 * Normalize by the max count across all schools.
 */
async function fetchSOSScores(
  supabase: SupabaseClient,
  seasonId: string,
  schools: SchoolRow[],
  apRanks: Map<string, number>
): Promise<Map<string, number>> {
  const scores = new Map<string, number>()

  if (apRanks.size === 0) return scores

  // Fetch all games for the season
  const { data: games } = await supabase
    .from('games')
    .select('home_school_id, away_school_id')
    .eq('season_id', seasonId)

  if (!games || games.length === 0) return scores

  // Count ranked opponents per school
  const rankedOpponentCounts = new Map<string, number>()
  const schoolIds = new Set(schools.map(s => s.id))

  for (const game of games) {
    const { home_school_id, away_school_id } = game

    // If home school is in our set, check if away opponent is ranked
    if (home_school_id && schoolIds.has(home_school_id) && away_school_id && apRanks.has(away_school_id)) {
      rankedOpponentCounts.set(home_school_id, (rankedOpponentCounts.get(home_school_id) || 0) + 1)
    }

    // If away school is in our set, check if home opponent is ranked
    if (away_school_id && schoolIds.has(away_school_id) && home_school_id && apRanks.has(home_school_id)) {
      rankedOpponentCounts.set(away_school_id, (rankedOpponentCounts.get(away_school_id) || 0) + 1)
    }
  }

  if (rankedOpponentCounts.size === 0) return scores

  // Normalize by max
  const maxCount = Math.max(...rankedOpponentCounts.values())
  if (maxCount === 0) return scores

  for (const [schoolId, count] of rankedOpponentCounts) {
    scores.set(schoolId, count / maxCount)
  }

  return scores
}

/** Fetch previous season total points per school. Returns normalized 0-1 scores. */
async function fetchHistoricalScores(
  supabase: SupabaseClient,
  priorYear: number
): Promise<Map<string, number>> {
  const scores = new Map<string, number>()

  // Get the prior season
  const { data: priorSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', priorYear)
    .single()

  if (!priorSeason) return scores

  // Sum total points per school from school_weekly_points
  const { data: weeklyPoints } = await supabase
    .from('school_weekly_points')
    .select('school_id, total')
    .eq('season_id', priorSeason.id)

  if (!weeklyPoints || weeklyPoints.length === 0) return scores

  // Aggregate total per school
  const totals = new Map<string, number>()
  for (const wp of weeklyPoints) {
    const current = totals.get(wp.school_id) || 0
    totals.set(wp.school_id, current + Number(wp.total))
  }

  if (totals.size === 0) return scores

  // Normalize by max
  const maxTotal = Math.max(...totals.values())
  if (maxTotal === 0) return scores

  for (const [schoolId, total] of totals) {
    scores.set(schoolId, total / maxTotal)
  }

  return scores
}
