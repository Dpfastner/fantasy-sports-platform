import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Create admin client for points calculations
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

export interface LeagueSettings {
  // Win scoring
  points_win: number
  points_conference_game: number
  points_over_50: number
  points_shutout: number
  points_ranked_25: number
  points_ranked_10: number
  // Loss scoring
  points_loss: number
  points_conference_game_loss: number
  points_over_50_loss: number
  points_shutout_loss: number
  points_ranked_25_loss: number
  points_ranked_10_loss: number
}

interface Game {
  id: string
  season_id: string
  week_number: number
  home_school_id: string | null
  away_school_id: string | null
  home_score: number
  away_score: number
  home_rank: number | null
  away_rank: number | null
  status: string
  is_conference_game: boolean
  is_bowl_game: boolean
  is_playoff_game: boolean
  playoff_round: string | null
}

interface SchoolPointsBreakdown {
  schoolId: string
  gameId: string
  seasonId: string
  weekNumber: number
  isWin: boolean
  basePoints: number
  conferenceBonus: number
  over50Bonus: number
  shutoutBonus: number
  ranked25Bonus: number
  ranked10Bonus: number
  totalPoints: number
}

// Default scoring rules (used for global school points)
export const DEFAULT_SCORING: LeagueSettings = {
  points_win: 1,
  points_conference_game: 1,
  points_over_50: 1,
  points_shutout: 1,
  points_ranked_25: 1,
  points_ranked_10: 2,
  points_loss: 0,
  points_conference_game_loss: 0,
  points_over_50_loss: 0,
  points_shutout_loss: 0,
  points_ranked_25_loss: 0,
  points_ranked_10_loss: 0,
}

/**
 * Calculate points for a single school in a single game
 * @param game - The game data
 * @param schoolId - The school we're calculating points for
 * @param opponentRank - The AP rank of the OPPONENT (not the school itself)
 * @param scoring - League scoring settings
 * @param isBowlGame - Whether this is a bowl game (no conference bonus, no ranked bonuses)
 *
 * Scoring rules by game type:
 * - Championship: NO regular scoring (all 0) - uses event bonus only
 * - Bowl games: Win + 50+ + shutout, NO conference, NO ranked bonuses
 * - Playoffs (R1, QF, SF): Win + 50+ + shutout, NO conference, ranked 1-12 only
 * - Regular season: Win + conf + 50+ + shutout + ranked bonuses (1-10: +2, 11-25: +1)
 */
export function calculateSchoolGamePoints(
  game: Game,
  schoolId: string,
  opponentRank: number | null,
  scoring: LeagueSettings = DEFAULT_SCORING,
  isBowlGame: boolean = false
): SchoolPointsBreakdown {
  const isHome = game.home_school_id === schoolId
  const teamScore = isHome ? game.home_score : game.away_score
  const opponentScore = isHome ? game.away_score : game.home_score
  const isWin = teamScore > opponentScore

  // Championship game: NO regular scoring - only championship_win/loss bonus from event system
  const isChampionship = game.playoff_round === 'championship'
  if (isChampionship) {
    return {
      schoolId,
      gameId: game.id,
      seasonId: game.season_id,
      weekNumber: game.week_number,
      isWin,
      basePoints: 0,
      conferenceBonus: 0,
      over50Bonus: 0,
      shutoutBonus: 0,
      ranked25Bonus: 0,
      ranked10Bonus: 0,
      totalPoints: 0,
    }
  }

  // Calculate bonuses based on win/loss
  let basePoints = 0
  let conferenceBonus = 0
  let over50Bonus = 0
  let shutoutBonus = 0
  let ranked25Bonus = 0
  let ranked10Bonus = 0

  if (isWin) {
    basePoints = scoring.points_win
    // Conference bonus only applies to regular season games (not bowls or playoffs)
    if (game.is_conference_game && !isBowlGame && !game.is_playoff_game) {
      conferenceBonus = scoring.points_conference_game
    }
    if (teamScore >= 50) over50Bonus = scoring.points_over_50
    if (opponentScore === 0) shutoutBonus = scoring.points_shutout

    // Ranked bonuses based on game type:
    // - Bowl games: NO ranked bonuses at all
    // - Playoffs (non-championship): Only ranks 1-12 get +2, no 11-25 bonus
    // - Regular season: 1-10 gets +2, 11-25 gets +1
    if (opponentRank) {
      if (isBowlGame) {
        // Bowl games: NO ranked bonuses
        // (intentionally empty - no ranked bonus for bowls)
      } else if (game.is_playoff_game) {
        // Playoffs (R1, QF, SF): only ranks 1-12 get the bonus, no 11-25
        if (opponentRank <= 12) ranked10Bonus = scoring.points_ranked_10
      } else {
        // Regular season: 1-10 gets higher bonus, 11-25 gets lower bonus
        if (opponentRank <= 10) {
          ranked10Bonus = scoring.points_ranked_10
        } else if (opponentRank <= 25) {
          ranked25Bonus = scoring.points_ranked_25
        }
      }
    }
  } else {
    basePoints = scoring.points_loss
    // Conference bonus only applies to regular season games (not bowls or playoffs)
    if (game.is_conference_game && !isBowlGame && !game.is_playoff_game) {
      conferenceBonus = scoring.points_conference_game_loss
    }
    if (teamScore >= 50) over50Bonus = scoring.points_over_50_loss
    if (opponentScore === 0) shutoutBonus = scoring.points_shutout_loss

    // Ranked bonuses for losses based on game type:
    // - Bowl games: NO ranked bonuses at all
    // - Playoffs (non-championship): Only ranks 1-12 get the bonus, no 11-25
    // - Regular season: 1-10 gets higher bonus, 11-25 gets lower bonus
    if (opponentRank) {
      if (isBowlGame) {
        // Bowl games: NO ranked bonuses
        // (intentionally empty - no ranked bonus for bowls)
      } else if (game.is_playoff_game) {
        // Playoffs (R1, QF, SF): only ranks 1-12 get the bonus
        if (opponentRank <= 12) ranked10Bonus = scoring.points_ranked_10_loss
      } else {
        // Regular season: 1-10 gets higher bonus, 11-25 gets lower bonus
        if (opponentRank <= 10) {
          ranked10Bonus = scoring.points_ranked_10_loss
        } else if (opponentRank <= 25) {
          ranked25Bonus = scoring.points_ranked_25_loss
        }
      }
    }
  }

  const totalPoints = basePoints + conferenceBonus + over50Bonus + shutoutBonus + ranked25Bonus + ranked10Bonus

  return {
    schoolId,
    gameId: game.id,
    seasonId: game.season_id,
    weekNumber: game.week_number,
    isWin,
    basePoints,
    conferenceBonus,
    over50Bonus,
    shutoutBonus,
    ranked25Bonus,
    ranked10Bonus,
    totalPoints,
  }
}

/**
 * Calculate and store points for all completed games in a given week
 * This populates the school_weekly_points table
 */
export async function calculateWeeklySchoolPoints(
  seasonId: string,
  weekNumber: number,
  supabase?: SupabaseClient
): Promise<{ calculated: number; errors: string[] }> {
  const client = supabase || getSupabaseAdmin()
  const errors: string[] = []
  let calculated = 0

  // Get all completed games for this week
  const { data: games, error: gamesError } = await client
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .eq('status', 'completed')

  if (gamesError) {
    errors.push(`Failed to fetch games: ${gamesError.message}`)
    return { calculated, errors }
  }

  if (!games || games.length === 0) {
    return { calculated, errors }
  }

  // Get AP rankings for this week to determine ranked bonuses
  // For playoff weeks (18-21), fall back to most recent available rankings
  let { data: rankings } = await client
    .from('ap_rankings_history')
    .select('school_id, rank')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)

  // If no rankings for this week (common for playoff weeks), get most recent rankings
  if (!rankings || rankings.length === 0) {
    const { data: latestRankings } = await client
      .from('ap_rankings_history')
      .select('school_id, rank, week_number')
      .eq('season_id', seasonId)
      .lt('week_number', weekNumber)
      .order('week_number', { ascending: false })
      .limit(100)

    // Get unique schools from the most recent week that has rankings
    if (latestRankings && latestRankings.length > 0) {
      const maxWeek = Math.max(...latestRankings.map(r => r.week_number))
      rankings = latestRankings.filter(r => r.week_number === maxWeek)
    }
  }

  const rankingsMap = new Map<string, number>()
  for (const ranking of rankings || []) {
    rankingsMap.set(ranking.school_id, ranking.rank)
  }

  // Get school conferences for determining conference games
  const schoolIds = new Set<string>()
  for (const game of games) {
    if (game.home_school_id) schoolIds.add(game.home_school_id)
    if (game.away_school_id) schoolIds.add(game.away_school_id)
  }

  const { data: schools } = await client
    .from('schools')
    .select('id, conference')
    .in('id', Array.from(schoolIds))

  const conferenceMap = new Map<string, string>()
  for (const school of schools || []) {
    conferenceMap.set(school.id, school.conference)
  }

  // Delete existing points for this week before inserting fresh calculations
  const { error: deleteError } = await client
    .from('school_weekly_points')
    .delete()
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)

  if (deleteError) {
    errors.push(`Failed to clear existing points for week ${weekNumber}: ${deleteError.message}`)
    return { calculated, errors }
  }

  // Process each game and calculate points for each FBS team
  for (const game of games) {
    // Determine if it's a conference game
    const homeConf = game.home_school_id ? conferenceMap.get(game.home_school_id) : null
    const awayConf = game.away_school_id ? conferenceMap.get(game.away_school_id) : null
    const isConferenceGame = !!(homeConf && awayConf && homeConf === awayConf)

    const gameWithConf: Game = {
      ...game,
      is_conference_game: isConferenceGame,
      is_bowl_game: game.is_bowl_game || false,
      is_playoff_game: game.is_playoff_game || false,
      playoff_round: game.playoff_round || null,
    }

    // Determine if this is a bowl game (for excluding conference bonus)
    const isBowlGame = game.is_bowl_game || false

    // Calculate points for home team if FBS
    if (game.home_school_id) {
      // Get OPPONENT's rank (away team's rank) for the ranked bonus
      const awayTeamRank = game.away_school_id
        ? (rankingsMap.get(game.away_school_id) ?? (game.away_rank != null && game.away_rank < 99 ? game.away_rank : null))
        : null
      const homePoints = calculateSchoolGamePoints(gameWithConf, game.home_school_id, awayTeamRank, DEFAULT_SCORING, isBowlGame)

      const { error: insertError } = await client
        .from('school_weekly_points')
        .insert({
          school_id: homePoints.schoolId,
          season_id: homePoints.seasonId,
          week_number: homePoints.weekNumber,
          game_id: homePoints.gameId,
          base_points: homePoints.basePoints,
          conference_bonus: homePoints.conferenceBonus,
          over_50_bonus: homePoints.over50Bonus,
          shutout_bonus: homePoints.shutoutBonus,
          ranked_25_bonus: homePoints.ranked25Bonus,
          ranked_10_bonus: homePoints.ranked10Bonus,
          total_points: homePoints.totalPoints,
        })

      if (insertError) {
        errors.push(`Failed to insert home team points for game ${game.id}: ${insertError.message}`)
      } else {
        calculated++
      }
    }

    // Calculate points for away team if FBS
    if (game.away_school_id) {
      // Get OPPONENT's rank (home team's rank) for the ranked bonus
      const homeTeamRank = game.home_school_id
        ? (rankingsMap.get(game.home_school_id) ?? (game.home_rank != null && game.home_rank < 99 ? game.home_rank : null))
        : null
      const awayPoints = calculateSchoolGamePoints(gameWithConf, game.away_school_id, homeTeamRank, DEFAULT_SCORING, isBowlGame)

      const { error: insertError } = await client
        .from('school_weekly_points')
        .insert({
          school_id: awayPoints.schoolId,
          season_id: awayPoints.seasonId,
          week_number: awayPoints.weekNumber,
          game_id: awayPoints.gameId,
          base_points: awayPoints.basePoints,
          conference_bonus: awayPoints.conferenceBonus,
          over_50_bonus: awayPoints.over50Bonus,
          shutout_bonus: awayPoints.shutoutBonus,
          ranked_25_bonus: awayPoints.ranked25Bonus,
          ranked_10_bonus: awayPoints.ranked10Bonus,
          total_points: awayPoints.totalPoints,
        })

      if (insertError) {
        errors.push(`Failed to insert away team points for game ${game.id}: ${insertError.message}`)
      } else {
        calculated++
      }
    }
  }

  return { calculated, errors }
}

/**
 * Calculate fantasy team weekly points by aggregating their roster's school points
 * This populates fantasy_team_weekly_points and updates fantasy_teams.total_points
 */
export async function calculateFantasyTeamPoints(
  leagueId: string,
  weekNumber: number,
  supabase?: SupabaseClient
): Promise<{ teamsUpdated: number; highPointsWinner: string | null; errors: string[] }> {
  const client = supabase || getSupabaseAdmin()
  const errors: string[] = []
  let teamsUpdated = 0

  // Get league with season info
  const { data: league, error: leagueError } = await client
    .from('leagues')
    .select('id, season_id')
    .eq('id', leagueId)
    .single()

  if (leagueError || !league) {
    errors.push(`Failed to fetch league: ${leagueError?.message || 'Not found'}`)
    return { teamsUpdated, highPointsWinner: null, errors }
  }

  // Get all fantasy teams in this league
  const { data: teams, error: teamsError } = await client
    .from('fantasy_teams')
    .select('id, name')
    .eq('league_id', leagueId)

  if (teamsError) {
    errors.push(`Failed to fetch teams: ${teamsError.message}`)
    return { teamsUpdated, highPointsWinner: null, errors }
  }

  if (!teams || teams.length === 0) {
    return { teamsUpdated, highPointsWinner: null, errors }
  }

  // Get league settings for scoring, high points, and double points configuration
  const { data: settings } = await client
    .from('league_settings')
    .select(`
      points_win, points_conference_game, points_over_50, points_shutout, points_ranked_25, points_ranked_10,
      points_loss, points_conference_game_loss, points_over_50_loss, points_shutout_loss, points_ranked_25_loss, points_ranked_10_loss,
      high_points_enabled, high_points_weekly_amount, high_points_allow_ties, double_points_enabled
    `)
    .eq('league_id', leagueId)
    .single()

  // Build league-specific scoring (falls back to DEFAULT_SCORING if no settings)
  const leagueScoring: LeagueSettings = settings ? {
    points_win: Number(settings.points_win),
    points_conference_game: Number(settings.points_conference_game),
    points_over_50: Number(settings.points_over_50),
    points_shutout: Number(settings.points_shutout),
    points_ranked_25: Number(settings.points_ranked_25),
    points_ranked_10: Number(settings.points_ranked_10),
    points_loss: Number(settings.points_loss),
    points_conference_game_loss: Number(settings.points_conference_game_loss),
    points_over_50_loss: Number(settings.points_over_50_loss),
    points_shutout_loss: Number(settings.points_shutout_loss),
    points_ranked_25_loss: Number(settings.points_ranked_25_loss),
    points_ranked_10_loss: Number(settings.points_ranked_10_loss),
  } : DEFAULT_SCORING

  // Fetch completed games for this week (needed for league-specific scoring)
  const { data: weekGames } = await client
    .from('games')
    .select('*')
    .eq('season_id', league.season_id)
    .eq('week_number', weekNumber)
    .eq('status', 'completed')

  // Pre-calculate league-specific points per school for this week
  const leagueSchoolPoints = new Map<string, number>()
  if (weekGames) {
    // Get AP rankings for opponent rank bonuses
    let { data: rankings } = await client
      .from('ap_rankings_history')
      .select('school_id, rank')
      .eq('season_id', league.season_id)
      .eq('week_number', weekNumber)

    // Fallback to most recent rankings if none for this week
    if (!rankings || rankings.length === 0) {
      const { data: latestRankings } = await client
        .from('ap_rankings_history')
        .select('school_id, rank, week_number')
        .eq('season_id', league.season_id)
        .lt('week_number', weekNumber)
        .order('week_number', { ascending: false })
        .limit(100)

      if (latestRankings && latestRankings.length > 0) {
        const maxWeek = Math.max(...latestRankings.map(r => r.week_number))
        rankings = latestRankings.filter(r => r.week_number === maxWeek)
      }
    }

    const rankingsMap = new Map<string, number>()
    for (const r of rankings || []) {
      rankingsMap.set(r.school_id, r.rank)
    }

    // Get conferences for conference game detection
    const allSchoolIds = new Set<string>()
    for (const g of weekGames) {
      if (g.home_school_id) allSchoolIds.add(g.home_school_id)
      if (g.away_school_id) allSchoolIds.add(g.away_school_id)
    }

    const { data: schools } = await client
      .from('schools')
      .select('id, conference')
      .in('id', Array.from(allSchoolIds))

    const conferenceMap = new Map<string, string>()
    for (const s of schools || []) {
      conferenceMap.set(s.id, s.conference)
    }

    // Calculate points for each school using league-specific settings
    for (const game of weekGames) {
      const homeConf = game.home_school_id ? conferenceMap.get(game.home_school_id) : null
      const awayConf = game.away_school_id ? conferenceMap.get(game.away_school_id) : null
      const isConferenceGame = !!(homeConf && awayConf && homeConf === awayConf)
      const isBowlGame = game.is_bowl_game || false

      const gameWithConf: Game = {
        ...game,
        is_conference_game: isConferenceGame,
        is_bowl_game: isBowlGame,
        is_playoff_game: game.is_playoff_game || false,
        playoff_round: game.playoff_round || null,
      }

      if (game.home_school_id) {
        const opponentRank = game.away_school_id
          ? (rankingsMap.get(game.away_school_id) ?? (game.away_rank != null && game.away_rank < 99 ? game.away_rank : null))
          : null
        const pts = calculateSchoolGamePoints(gameWithConf, game.home_school_id, opponentRank, leagueScoring, isBowlGame)
        leagueSchoolPoints.set(game.home_school_id, pts.totalPoints)
      }
      if (game.away_school_id) {
        const opponentRank = game.home_school_id
          ? (rankingsMap.get(game.home_school_id) ?? (game.home_rank != null && game.home_rank < 99 ? game.home_rank : null))
          : null
        const pts = calculateSchoolGamePoints(gameWithConf, game.away_school_id, opponentRank, leagueScoring, isBowlGame)
        leagueSchoolPoints.set(game.away_school_id, pts.totalPoints)
      }
    }
  }

  // Get all double picks for this week if enabled
  const doublePicksMap = new Map<string, string>() // teamId -> schoolId
  if (settings?.double_points_enabled) {
    const teamIds = teams.map(t => t.id)
    const { data: doublePicks } = await client
      .from('weekly_double_picks')
      .select('fantasy_team_id, school_id')
      .in('fantasy_team_id', teamIds)
      .eq('week_number', weekNumber)

    for (const pick of doublePicks || []) {
      doublePicksMap.set(pick.fantasy_team_id, pick.school_id)
    }
  }

  const teamPoints: Array<{ teamId: string; points: number; bonusPoints: number }> = []

  // For each team, get their roster for this week and sum school points
  for (const team of teams) {
    // Get schools on this team's roster for this week
    const { data: rosterPeriods, error: rosterError } = await client
      .from('roster_periods')
      .select('school_id')
      .eq('fantasy_team_id', team.id)
      .lte('start_week', weekNumber)
      .or(`end_week.is.null,end_week.gt.${weekNumber}`)

    if (rosterError) {
      errors.push(`Failed to fetch roster for team ${team.id}: ${rosterError.message}`)
      continue
    }

    if (!rosterPeriods || rosterPeriods.length === 0) {
      // Team has no roster, set points to 0
      teamPoints.push({ teamId: team.id, points: 0, bonusPoints: 0 })
      continue
    }

    const schoolIds = rosterPeriods.map(r => r.school_id)
    const doublePickSchoolId = doublePicksMap.get(team.id)

    // Get event bonuses for these schools (CFP, Bowl, Championship, Heisman, etc.)
    const { data: eventBonuses, error: eventError } = await client
      .from('league_school_event_bonuses')
      .select('school_id, points')
      .eq('league_id', leagueId)
      .eq('season_id', league.season_id)
      .eq('week_number', weekNumber)
      .in('school_id', schoolIds)

    if (eventError) {
      errors.push(`Failed to fetch event bonuses for team ${team.id}: ${eventError.message}`)
      // Continue with just game points, don't skip the team entirely
    }

    // Sum event bonuses per school
    const eventBonusMap = new Map<string, number>()
    for (const eb of eventBonuses || []) {
      const current = eventBonusMap.get(eb.school_id) || 0
      eventBonusMap.set(eb.school_id, current + Number(eb.points))
    }

    // Calculate total using league-specific scoring (not global school_weekly_points)
    let weeklyTotal = 0
    let bonusPoints = 0
    for (const schoolId of schoolIds) {
      const points = leagueSchoolPoints.get(schoolId) || 0
      if (doublePickSchoolId && schoolId === doublePickSchoolId) {
        // Apply 2x multiplier - add the original points again as bonus
        weeklyTotal += points * 2
        bonusPoints = points
      } else {
        weeklyTotal += points
      }
    }

    // Add event bonuses (these are NOT doubled by double pick)
    for (const [, eventPoints] of eventBonusMap) {
      weeklyTotal += eventPoints
    }

    // Update the weekly_double_picks record with the points earned
    if (doublePickSchoolId && bonusPoints > 0) {
      await client
        .from('weekly_double_picks')
        .update({
          points_earned: leagueSchoolPoints.get(doublePickSchoolId) || 0,
          bonus_points: bonusPoints
        })
        .eq('fantasy_team_id', team.id)
        .eq('week_number', weekNumber)
    }

    teamPoints.push({ teamId: team.id, points: weeklyTotal, bonusPoints })
  }

  // Determine high points winner
  let highPointsWinner: string | null = null
  let highPointsAmount = 0
  const highScorers: string[] = []

  if (settings?.high_points_enabled && teamPoints.length > 0) {
    const maxPoints = Math.max(...teamPoints.map(t => t.points))
    const winners = teamPoints.filter(t => t.points === maxPoints)

    if (winners.length === 1 || settings.high_points_allow_ties) {
      highScorers.push(...winners.map(w => w.teamId))
      highPointsAmount = settings.high_points_weekly_amount / winners.length
      highPointsWinner = winners[0].teamId
    }
  }

  // Delete existing fantasy team weekly points for this week, then insert fresh
  const teamIds = teams.map(t => t.id)
  const { error: deleteTeamPtsError } = await client
    .from('fantasy_team_weekly_points')
    .delete()
    .in('fantasy_team_id', teamIds)
    .eq('week_number', weekNumber)

  if (deleteTeamPtsError) {
    errors.push(`Failed to clear existing team points for week ${weekNumber}: ${deleteTeamPtsError.message}`)
  }

  // Insert fantasy_team_weekly_points for each team
  for (const tp of teamPoints) {
    const isWinner = highScorers.includes(tp.teamId)

    const { error: insertError } = await client
      .from('fantasy_team_weekly_points')
      .insert({
        fantasy_team_id: tp.teamId,
        week_number: weekNumber,
        points: tp.points,
        is_high_points_winner: isWinner,
        high_points_amount: isWinner ? highPointsAmount : 0,
      })

    if (insertError) {
      errors.push(`Failed to insert weekly points for team ${tp.teamId}: ${insertError.message}`)
    } else {
      teamsUpdated++
    }
  }

  // Update fantasy_teams.total_points for all teams
  for (const team of teams) {
    const { data: allWeeklyPoints } = await client
      .from('fantasy_team_weekly_points')
      .select('points, high_points_amount')
      .eq('fantasy_team_id', team.id)

    const totalPoints = (allWeeklyPoints || []).reduce((sum, wp) => sum + Number(wp.points), 0)
    const highPointsWinnings = (allWeeklyPoints || []).reduce((sum, wp) => sum + Number(wp.high_points_amount), 0)

    await client
      .from('fantasy_teams')
      .update({
        total_points: totalPoints,
        high_points_winnings: highPointsWinnings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', team.id)
  }

  return { teamsUpdated, highPointsWinner, errors }
}

/**
 * Run full points calculation for a season/week
 * 1. Calculate school_weekly_points from completed games
 * 2. For each league in that season, calculate fantasy_team_weekly_points
 */
export async function calculateAllPoints(
  seasonId: string,
  weekNumber: number,
  supabase?: SupabaseClient
): Promise<{
  schoolPointsCalculated: number
  leaguesProcessed: number
  teamsUpdated: number
  errors: string[]
}> {
  const client = supabase || getSupabaseAdmin()
  const errors: string[] = []

  // Step 1: Calculate school weekly points
  const schoolResult = await calculateWeeklySchoolPoints(seasonId, weekNumber, client)
  errors.push(...schoolResult.errors)

  // Step 2: Get all leagues for this season
  const { data: leagues, error: leaguesError } = await client
    .from('leagues')
    .select('id')
    .eq('season_id', seasonId)

  if (leaguesError) {
    errors.push(`Failed to fetch leagues: ${leaguesError.message}`)
    return {
      schoolPointsCalculated: schoolResult.calculated,
      leaguesProcessed: 0,
      teamsUpdated: 0,
      errors,
    }
  }

  // Step 3: Calculate fantasy team points for each league
  let leaguesProcessed = 0
  let totalTeamsUpdated = 0

  for (const league of leagues || []) {
    const teamResult = await calculateFantasyTeamPoints(league.id, weekNumber, client)
    errors.push(...teamResult.errors)
    leaguesProcessed++
    totalTeamsUpdated += teamResult.teamsUpdated
  }

  return {
    schoolPointsCalculated: schoolResult.calculated,
    leaguesProcessed,
    teamsUpdated: totalTeamsUpdated,
    errors,
  }
}

/**
 * Calculate points for all completed weeks in a season
 * Useful for backfilling historical data
 */
export async function calculateSeasonPoints(
  seasonId: string,
  startWeek: number = 0,
  endWeek: number = 22,
  supabase?: SupabaseClient
): Promise<{
  weeksProcessed: number
  totalSchoolPoints: number
  totalTeamsUpdated: number
  errors: string[]
}> {
  const client = supabase || getSupabaseAdmin()
  let weeksProcessed = 0
  let totalSchoolPoints = 0
  let totalTeamsUpdated = 0
  const errors: string[] = []

  for (let week = startWeek; week <= endWeek; week++) {
    const result = await calculateAllPoints(seasonId, week, client)
    weeksProcessed++
    totalSchoolPoints += result.schoolPointsCalculated
    totalTeamsUpdated += result.teamsUpdated
    errors.push(...result.errors)
  }

  return {
    weeksProcessed,
    totalSchoolPoints,
    totalTeamsUpdated,
    errors,
  }
}
