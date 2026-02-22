import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

// Default bonus values (from league settings)
const BONUS_POINTS = {
  bowl_appearance: 5,
  playoff_first_round: 5,
  playoff_quarterfinal: 5,
  playoff_semifinal: 5,
  championship_win: 20,
  championship_loss: 5,
  heisman_winner: 10,
}

async function updateSchoolSpecialEvents() {
  console.log('=== Updating School Weekly Points for Special Events ===\n')

  // Get 2025 season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.error('Season not found')
    return
  }

  // Get all schools
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name')

  const schoolMap = new Map(schools?.map(s => [s.id, s.name]) || [])

  // Get Heisman winner
  const { data: heismanWinners } = await supabase
    .from('heisman_winners')
    .select('school_id')
    .eq('season_id', season.id)

  const heismanSchoolId = heismanWinners?.[0]?.school_id
  console.log(`Heisman school: ${heismanSchoolId ? schoolMap.get(heismanSchoolId) : 'None'}`)

  // Get bowl games (week 17, non-CFP)
  const { data: bowlGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id')
    .eq('season_id', season.id)
    .eq('week_number', 17)
    .eq('status', 'completed')
    .eq('is_playoff_game', false)

  // Get CFP games
  const { data: cfpGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id, home_score, away_score, playoff_round, week_number')
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .eq('status', 'completed')
    .order('week_number')

  // Build sets for each category
  const bowlSchools = new Set<string>()
  for (const game of bowlGames || []) {
    if (game.home_school_id) bowlSchools.add(game.home_school_id)
    if (game.away_school_id) bowlSchools.add(game.away_school_id)
  }
  // CFP teams also count as bowl appearances (CFP games are bowl games)
  for (const game of cfpGames || []) {
    if (game.home_school_id) bowlSchools.add(game.home_school_id)
    if (game.away_school_id) bowlSchools.add(game.away_school_id)
  }
  console.log(`Bowl schools (including CFP): ${bowlSchools.size}`)

  const firstRoundSchools = new Set<string>()
  const quarterfinalSchools = new Set<string>()
  const semifinalSchools = new Set<string>()
  let championshipWinnerId: string | null = null
  let championshipLoserId: string | null = null

  for (const game of cfpGames || []) {
    if (game.playoff_round === 'first_round') {
      if (game.home_school_id) firstRoundSchools.add(game.home_school_id)
      if (game.away_school_id) firstRoundSchools.add(game.away_school_id)
    } else if (game.playoff_round === 'quarterfinal') {
      if (game.home_school_id) quarterfinalSchools.add(game.home_school_id)
      if (game.away_school_id) quarterfinalSchools.add(game.away_school_id)
    } else if (game.playoff_round === 'semifinal') {
      if (game.home_school_id) semifinalSchools.add(game.home_school_id)
      if (game.away_school_id) semifinalSchools.add(game.away_school_id)
    } else if (game.playoff_round === 'championship') {
      const homeWon = (game.home_score || 0) > (game.away_score || 0)
      if (homeWon) {
        championshipWinnerId = game.home_school_id
        championshipLoserId = game.away_school_id
      } else {
        championshipWinnerId = game.away_school_id
        championshipLoserId = game.home_school_id
      }
    }
  }

  // Top 4 seeds get a first round bye - they should get first round points too
  // Bye schools = schools in quarterfinals that are NOT in first round
  const byeSchools = new Set<string>()
  for (const schoolId of quarterfinalSchools) {
    if (!firstRoundSchools.has(schoolId)) {
      byeSchools.add(schoolId)
    }
  }

  console.log(`First Round schools: ${firstRoundSchools.size}`)
  console.log(`Bye schools (top 4 seeds): ${byeSchools.size}`)
  for (const schoolId of byeSchools) {
    console.log(`  - ${schoolMap.get(schoolId)} (bye)`)
  }
  console.log(`Quarterfinal schools: ${quarterfinalSchools.size}`)
  console.log(`Semifinal schools: ${semifinalSchools.size}`)
  console.log(`Championship Winner: ${championshipWinnerId ? schoolMap.get(championshipWinnerId) : 'None'}`)
  console.log(`Championship Loser: ${championshipLoserId ? schoolMap.get(championshipLoserId) : 'None'}`)

  // Update school_weekly_points for each category
  const updates: Array<{ school_id: string; week_number: number; total_points: number }> = []

  // Week 17: Bowl appearances
  for (const schoolId of bowlSchools) {
    updates.push({
      school_id: schoolId,
      week_number: 17,
      total_points: BONUS_POINTS.bowl_appearance,
    })
  }

  // Week 18: CFP (R1 + QF + SF combined)
  // Schools get points for each round they participate in
  // Bye schools (top 4 seeds) also get first round points for "winning" by having the bye
  const week18Schools = new Map<string, number>()
  // First Round participants
  for (const schoolId of firstRoundSchools) {
    week18Schools.set(schoolId, (week18Schools.get(schoolId) || 0) + BONUS_POINTS.playoff_first_round)
  }
  // Bye schools get first round points too (earned by being top 4 seed)
  for (const schoolId of byeSchools) {
    week18Schools.set(schoolId, (week18Schools.get(schoolId) || 0) + BONUS_POINTS.playoff_first_round)
  }
  // Quarterfinal participants
  for (const schoolId of quarterfinalSchools) {
    week18Schools.set(schoolId, (week18Schools.get(schoolId) || 0) + BONUS_POINTS.playoff_quarterfinal)
  }
  // Semifinal participants (now part of CFP column, not separate)
  for (const schoolId of semifinalSchools) {
    week18Schools.set(schoolId, (week18Schools.get(schoolId) || 0) + BONUS_POINTS.playoff_semifinal)
  }
  for (const [schoolId, points] of week18Schools) {
    updates.push({
      school_id: schoolId,
      week_number: 18,
      total_points: points,
    })
  }

  // Week 19: Natty (Championship only - win or loss)
  const week19Schools = new Map<string, number>()
  if (championshipWinnerId) {
    week19Schools.set(championshipWinnerId, BONUS_POINTS.championship_win)
  }
  if (championshipLoserId) {
    week19Schools.set(championshipLoserId, BONUS_POINTS.championship_loss)
  }
  for (const [schoolId, points] of week19Schools) {
    updates.push({
      school_id: schoolId,
      week_number: 19,
      total_points: points,
    })
  }

  // Week 20: Heisman
  if (heismanSchoolId) {
    updates.push({
      school_id: heismanSchoolId,
      week_number: 20,
      total_points: BONUS_POINTS.heisman_winner,
    })
  }

  console.log(`\nTotal updates to make: ${updates.length}`)

  // First, get existing school_weekly_points for weeks 17-20 so we can ADD bonus to wins
  const { data: existingPoints } = await supabase
    .from('school_weekly_points')
    .select('school_id, week_number, total_points')
    .eq('season_id', season.id)
    .gte('week_number', 17)
    .lte('week_number', 20)

  // Build map of existing points: school_id -> week -> points
  const existingMap = new Map<string, Map<number, number>>()
  for (const ep of existingPoints || []) {
    if (!existingMap.has(ep.school_id)) {
      existingMap.set(ep.school_id, new Map())
    }
    existingMap.get(ep.school_id)!.set(ep.week_number, ep.total_points)
  }

  // Upsert all the updates, ADDING bonus to existing win points (except for NC which is bonus only)
  for (const update of updates) {
    let totalPoints = update.total_points

    // For weeks 17 and 18, add existing win points to the bonus
    // For week 19 (NC), it's ONLY the championship bonus - no regular win points
    // For week 20 (Heisman), it's ONLY the Heisman bonus
    if (update.week_number === 17 || update.week_number === 18) {
      const existingWinPoints = existingMap.get(update.school_id)?.get(update.week_number) || 0
      // Only add existing points if they're small (win points are 1-2), not if they're already bonus points
      const baseWinPoints = existingWinPoints <= 2 ? existingWinPoints : 0
      totalPoints = update.total_points + baseWinPoints
    }
    // Week 19 (NC) and Week 20 (Heisman) are bonus only - no win points added

    const { error } = await supabase
      .from('school_weekly_points')
      .upsert({
        school_id: update.school_id,
        season_id: season.id,
        week_number: update.week_number,
        total_points: totalPoints,
      }, { onConflict: 'school_id,season_id,week_number' })

    if (error) {
      console.error(`Error updating ${schoolMap.get(update.school_id)} week ${update.week_number}:`, error)
    }
  }

  // Print summary
  console.log('\n=== Summary ===')
  console.log('Week 17 (Bowls):', bowlSchools.size, 'schools getting', BONUS_POINTS.bowl_appearance, 'pts each')
  console.log('Week 18 (CFP):', week18Schools.size, 'schools')
  console.log('Week 19 (Natty):', week19Schools.size, 'schools')
  console.log('Week 20 (Heisman):', heismanSchoolId ? '1 school getting ' + BONUS_POINTS.heisman_winner + ' pts' : 'None')

  // Verify Indiana specifically
  const { data: indianaPoints } = await supabase
    .from('school_weekly_points')
    .select('week_number, total_points')
    .eq('school_id', '102cd2a6-c109-42f6-88c8-e58be6225c12')
    .gte('week_number', 17)
    .order('week_number')

  console.log('\n=== Indiana Verification ===')
  console.log('Indiana special week points:', indianaPoints)

  console.log('\n=== DONE ===')
}

updateSchoolSpecialEvents()
