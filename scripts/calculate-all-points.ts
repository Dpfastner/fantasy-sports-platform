import { createClient } from '@supabase/supabase-js'

// Use sandbox database
const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

interface Game {
  id: string
  season_id: string
  week_number: number
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  status: string
  is_conference_game: boolean
  is_bowl_game: boolean
  is_playoff_game: boolean
}

interface SchoolPointsBreakdown {
  schoolId: string
  gameId: string
  seasonId: string
  weekNumber: number
  basePoints: number
  conferenceBonus: number
  over50Bonus: number
  shutoutBonus: number
  ranked25Bonus: number
  ranked10Bonus: number
  totalPoints: number
}

/**
 * Calculate points for a single school in a single game
 * Uses the CORRECT scoring rules from ARCHITECTURE_REFERENCE.md
 */
function calculateSchoolGamePoints(
  game: Game,
  schoolId: string,
  opponentRank: number | null,
  isBowlGame: boolean = false
): SchoolPointsBreakdown {
  const isHome = game.home_school_id === schoolId
  const teamScore = isHome ? game.home_score! : game.away_score!
  const opponentScore = isHome ? game.away_score! : game.home_score!
  const isWin = teamScore > opponentScore

  let basePoints = 0
  let conferenceBonus = 0
  let over50Bonus = 0
  let shutoutBonus = 0
  let ranked25Bonus = 0
  let ranked10Bonus = 0

  if (isWin) {
    basePoints = 1  // Base win points

    // Conference bonus only applies to regular season games (not bowls or playoffs)
    if (game.is_conference_game && !isBowlGame && !game.is_playoff_game) {
      conferenceBonus = 1
    }

    // 50+ points bonus
    if (teamScore >= 50) {
      over50Bonus = 1
    }

    // Shutout bonus
    if (opponentScore === 0) {
      shutoutBonus = 1
    }

    // Ranked opponent bonus (for BEATING a ranked OPPONENT)
    // Bowls/Playoffs: beating ranks 1-12 gets +2 (12-team CFP)
    // Regular season: beating ranks 1-10 gets +2, 11-25 gets +1
    if (opponentRank) {
      if (isBowlGame || game.is_playoff_game) {
        // Bowls & Playoffs: only ranks 1-12 get the bonus
        if (opponentRank <= 12) {
          ranked10Bonus = 2
        }
      } else {
        // Regular season: 1-10 gets higher bonus, 11-25 gets lower bonus
        if (opponentRank <= 10) {
          ranked10Bonus = 2
        } else if (opponentRank <= 25) {
          ranked25Bonus = 1
        }
      }
    }
  }
  // Losses get 0 points (no negative points)

  const totalPoints = basePoints + conferenceBonus + over50Bonus + shutoutBonus + ranked25Bonus + ranked10Bonus

  return {
    schoolId,
    gameId: game.id,
    seasonId: game.season_id,
    weekNumber: game.week_number,
    basePoints,
    conferenceBonus,
    over50Bonus,
    shutoutBonus,
    ranked25Bonus,
    ranked10Bonus,
    totalPoints,
  }
}

async function fixUniqueConstraint() {
  console.log('\n=== Preparing school_weekly_points table ===')
  console.log('  NOTE: Run scripts/fix-school-points-constraint.sql in Supabase first!')
  console.log('  This changes the unique key to (school_id, game_id) to allow multiple games per week')

  // Clear existing data to allow fresh recalculation
  // This is the safest approach since we're recalculating everything
  const { error: deleteError } = await supabase
    .from('school_weekly_points')
    .delete()
    .gte('week_number', 0) // Delete all (using a filter that matches everything)

  if (deleteError) {
    console.log(`  Warning: Could not clear existing data: ${deleteError.message}`)
    console.log('  Will attempt to upsert - may fail if constraint not updated')
  } else {
    console.log('  Cleared existing points data for fresh recalculation')
  }
}

async function calculateSchoolWeeklyPoints(seasonId: string, weekNumber: number) {
  console.log(`\n=== Week ${weekNumber} ===`)

  // Get completed games for this week
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .eq('status', 'completed')

  if (gamesError) {
    console.error(`  Error fetching games: ${gamesError.message}`)
    return
  }

  if (!games || games.length === 0) {
    console.log(`  No completed games`)
    return
  }

  console.log(`  Found ${games.length} completed games`)

  // Delete existing points for this week before inserting
  const { error: deleteError } = await supabase
    .from('school_weekly_points')
    .delete()
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)

  if (deleteError) {
    console.log(`  Warning: Could not delete existing week ${weekNumber} data: ${deleteError.message}`)
  }

  // Get AP rankings for this week to determine ranked bonuses
  const { data: rankings } = await supabase
    .from('ap_rankings_history')
    .select('school_id, rank')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)

  const rankingsMap = new Map<string, number>()
  for (const ranking of rankings || []) {
    rankingsMap.set(ranking.school_id, ranking.rank)
  }
  console.log(`  Loaded ${rankingsMap.size} rankings`)

  // Get school conferences for determining conference games
  const schoolIds = new Set<string>()
  for (const game of games) {
    if (game.home_school_id) schoolIds.add(game.home_school_id)
    if (game.away_school_id) schoolIds.add(game.away_school_id)
  }

  const { data: schools } = await supabase
    .from('schools')
    .select('id, conference')
    .in('id', Array.from(schoolIds))

  const conferenceMap = new Map<string, string>()
  for (const school of schools || []) {
    conferenceMap.set(school.id, school.conference)
  }

  // Collect all points per school per game first
  // Then insert them properly (handling schools with multiple games per week)
  const allPoints: SchoolPointsBreakdown[] = []

  // Process each game
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
    }

    const isBowlGame = game.is_bowl_game || false

    // Calculate points for home team
    if (game.home_school_id && game.home_score !== null && game.away_score !== null) {
      // Use the game's away_rank field first, fall back to ap_rankings_history
      // This is important for CFP games which have ranks stored on the game itself
      const awayTeamRank = game.away_rank || (game.away_school_id ? rankingsMap.get(game.away_school_id) || null : null)
      const homePoints = calculateSchoolGamePoints(gameWithConf, game.home_school_id, awayTeamRank, isBowlGame)
      allPoints.push(homePoints)
    }

    // Calculate points for away team
    if (game.away_school_id && game.home_score !== null && game.away_score !== null) {
      // Use the game's home_rank field first, fall back to ap_rankings_history
      // This is important for CFP games which have ranks stored on the game itself
      const homeTeamRank = game.home_rank || (game.home_school_id ? rankingsMap.get(game.home_school_id) || null : null)
      const awayPoints = calculateSchoolGamePoints(gameWithConf, game.away_school_id, homeTeamRank, isBowlGame)
      allPoints.push(awayPoints)
    }
  }

  // Group points by school to handle multiple games per week
  const pointsBySchool = new Map<string, SchoolPointsBreakdown[]>()
  for (const pts of allPoints) {
    const existing = pointsBySchool.get(pts.schoolId) || []
    existing.push(pts)
    pointsBySchool.set(pts.schoolId, existing)
  }

  let insertCount = 0
  let errorCount = 0

  // Insert points - for schools with multiple games, insert the first one normally,
  // then try to insert subsequent ones (which may fail if constraint not updated)
  for (const [schoolId, schoolPoints] of pointsBySchool) {
    for (let i = 0; i < schoolPoints.length; i++) {
      const pts = schoolPoints[i]
      const { error } = await supabase
        .from('school_weekly_points')
        .insert({
          school_id: pts.schoolId,
          season_id: pts.seasonId,
          week_number: pts.weekNumber,
          game_id: pts.gameId,
          base_points: pts.basePoints,
          conference_bonus: pts.conferenceBonus,
          over_50_bonus: pts.over50Bonus,
          shutout_bonus: pts.shutoutBonus,
          ranked_25_bonus: pts.ranked25Bonus,
          ranked_10_bonus: pts.ranked10Bonus,
          total_points: pts.totalPoints,
        })

      if (error) {
        if (error.message.includes('duplicate key')) {
          // Expected for multiple games per week until constraint is fixed
          // Update the existing record to aggregate points instead
          const { error: updateError } = await supabase.rpc('increment_school_weekly_points', {
            p_school_id: pts.schoolId,
            p_season_id: pts.seasonId,
            p_week_number: pts.weekNumber,
            p_base_points: pts.basePoints,
            p_conference_bonus: pts.conferenceBonus,
            p_over_50_bonus: pts.over50Bonus,
            p_shutout_bonus: pts.shutoutBonus,
            p_ranked_25_bonus: pts.ranked25Bonus,
            p_ranked_10_bonus: pts.ranked10Bonus,
            p_total_points: pts.totalPoints,
          })

          if (updateError) {
            // RPC not available, use raw update
            const { data: existing } = await supabase
              .from('school_weekly_points')
              .select('*')
              .eq('school_id', pts.schoolId)
              .eq('season_id', pts.seasonId)
              .eq('week_number', pts.weekNumber)
              .single()

            if (existing) {
              const { error: rawUpdateError } = await supabase
                .from('school_weekly_points')
                .update({
                  base_points: existing.base_points + pts.basePoints,
                  conference_bonus: existing.conference_bonus + pts.conferenceBonus,
                  over_50_bonus: existing.over_50_bonus + pts.over50Bonus,
                  shutout_bonus: existing.shutout_bonus + pts.shutoutBonus,
                  ranked_25_bonus: existing.ranked_25_bonus + pts.ranked25Bonus,
                  ranked_10_bonus: existing.ranked_10_bonus + pts.ranked10Bonus,
                  total_points: existing.total_points + pts.totalPoints,
                  // Note: game_id will point to first game only (limitation of current constraint)
                })
                .eq('school_id', pts.schoolId)
                .eq('season_id', pts.seasonId)
                .eq('week_number', pts.weekNumber)

              if (rawUpdateError) {
                console.error(`  Error aggregating points for ${schoolId} game ${i + 1}: ${rawUpdateError.message}`)
                errorCount++
              } else {
                console.log(`  Aggregated points for ${schoolId} (game ${i + 1} of ${schoolPoints.length})`)
                insertCount++
              }
            } else {
              errorCount++
            }
          } else {
            insertCount++
          }
        } else {
          console.error(`  Error inserting ${schoolId}: ${error.message}`)
          errorCount++
        }
      } else {
        insertCount++
      }
    }
  }

  console.log(`  Inserted/updated ${insertCount} school points records (${errorCount} errors)`)
}

async function calculateFantasyTeamWeeklyPoints(seasonId: string, weekNumber: number) {
  // Get all leagues for this season
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id')
    .eq('season_id', seasonId)

  if (!leagues || leagues.length === 0) return

  for (const league of leagues) {
    // Get all teams in this league
    const { data: teams } = await supabase
      .from('fantasy_teams')
      .select('id')
      .eq('league_id', league.id)

    if (!teams || teams.length === 0) continue

    for (const team of teams) {
      // Get roster schools active during this week
      const { data: roster } = await supabase
        .from('roster_periods')
        .select('school_id')
        .eq('fantasy_team_id', team.id)
        .lte('start_week', weekNumber)
        .or(`end_week.is.null,end_week.gte.${weekNumber}`)

      if (!roster || roster.length === 0) continue

      const schoolIds = roster.map(r => r.school_id)

      // Get school points for this week
      const { data: schoolPoints } = await supabase
        .from('school_weekly_points')
        .select('total_points')
        .eq('season_id', seasonId)
        .eq('week_number', weekNumber)
        .in('school_id', schoolIds)

      const totalPoints = (schoolPoints || []).reduce((sum, sp) => sum + (sp.total_points || 0), 0)

      // Upsert fantasy team weekly points
      await supabase
        .from('fantasy_team_weekly_points')
        .upsert({
          fantasy_team_id: team.id,
          week_number: weekNumber,
          points: totalPoints,
          is_high_points_winner: false,
          high_points_amount: 0,
        }, { onConflict: 'fantasy_team_id,week_number' })
    }
  }
}

async function calculateAllPoints() {
  console.log('========================================')
  console.log('  RECALCULATING ALL POINTS (SANDBOX)')
  console.log('========================================')
  console.log('')
  console.log('Scoring Rules:')
  console.log('  Win: +1')
  console.log('  Conference Game Win: +1 (regular season only)')
  console.log('  50+ Points: +1')
  console.log('  Shutout: +1')
  console.log('  Beat Ranked #1-10 (regular): +2')
  console.log('  Beat Ranked #11-25 (regular): +1')
  console.log('  Beat Ranked #1-12 (bowl/playoff): +2')
  console.log('')

  // Get 2025 season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.error('Season 2025 not found')
    return
  }

  console.log(`Season ID: ${season.id}`)

  // First, fix the unique constraint to allow multiple games per week
  await fixUniqueConstraint()

  // Calculate for all weeks 0-21 (includes CFP championship in week 21)
  for (let week = 0; week <= 21; week++) {
    await calculateSchoolWeeklyPoints(season.id, week)
    await calculateFantasyTeamWeeklyPoints(season.id, week)
  }

  // Update team total points
  console.log('\n========================================')
  console.log('  Updating team total points...')

  const { data: allWeeklyPoints } = await supabase
    .from('fantasy_team_weekly_points')
    .select('fantasy_team_id, points')

  const teamTotals = new Map<string, number>()
  for (const wp of allWeeklyPoints || []) {
    teamTotals.set(wp.fantasy_team_id, (teamTotals.get(wp.fantasy_team_id) || 0) + wp.points)
  }

  for (const [teamId, total] of teamTotals) {
    await supabase
      .from('fantasy_teams')
      .update({ total_points: total })
      .eq('id', teamId)
  }

  console.log(`  Updated ${teamTotals.size} team totals`)
  console.log('========================================')
  console.log('  DONE!')
  console.log('========================================')
}

calculateAllPoints()
