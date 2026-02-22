import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function calculateSpecialEvents() {
  console.log('=== Calculating Special Event Bonuses ===\n')

  // Get season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.error('Season not found')
    return
  }

  // Get all leagues and their settings
  const { data: leagues } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      season_id,
      league_settings (
        points_heisman_winner,
        points_bowl_appearance,
        points_playoff_first_round,
        points_playoff_quarterfinal,
        points_playoff_semifinal,
        points_championship_win,
        points_championship_loss
      )
    `)
    .eq('season_id', season.id)

  // Get Heisman winner
  const { data: heismanWinners } = await supabase
    .from('heisman_winners')
    .select('school_id')
    .eq('season_id', season.id)

  const heismanSchoolId = heismanWinners?.[0]?.school_id

  // Get bowl games (week 17, not CFP)
  const { data: bowlGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id')
    .eq('season_id', season.id)
    .eq('week_number', 17)
    .eq('status', 'completed')
    .eq('is_playoff_game', false)

  // Get CFP first round/quarterfinal games (week 18)
  const { data: cfpGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id, home_score, away_score, playoff_round')
    .eq('season_id', season.id)
    .eq('week_number', 18)
    .eq('status', 'completed')

  // Get semifinal/championship games (week 19)
  const { data: finalGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id, home_score, away_score, playoff_round')
    .eq('season_id', season.id)
    .eq('week_number', 19)
    .eq('status', 'completed')

  // Build sets of schools in each category
  const bowlSchools = new Set<string>()
  for (const game of bowlGames || []) {
    if (game.home_school_id) bowlSchools.add(game.home_school_id)
    if (game.away_school_id) bowlSchools.add(game.away_school_id)
  }

  const cfpFirstRoundSchools = new Set<string>()
  const cfpQuarterfinalSchools = new Set<string>()
  for (const game of cfpGames || []) {
    if (game.playoff_round === 'first_round') {
      if (game.home_school_id) cfpFirstRoundSchools.add(game.home_school_id)
      if (game.away_school_id) cfpFirstRoundSchools.add(game.away_school_id)
    } else if (game.playoff_round === 'quarterfinal') {
      if (game.home_school_id) cfpQuarterfinalSchools.add(game.home_school_id)
      if (game.away_school_id) cfpQuarterfinalSchools.add(game.away_school_id)
    }
  }

  const cfpSemifinalSchools = new Set<string>()
  const championshipWinner = new Set<string>()
  const championshipLoser = new Set<string>()
  for (const game of finalGames || []) {
    if (game.playoff_round === 'semifinal') {
      if (game.home_school_id) cfpSemifinalSchools.add(game.home_school_id)
      if (game.away_school_id) cfpSemifinalSchools.add(game.away_school_id)
    } else if (game.playoff_round === 'championship') {
      const homeWon = (game.home_score || 0) > (game.away_score || 0)
      if (homeWon) {
        if (game.home_school_id) championshipWinner.add(game.home_school_id)
        if (game.away_school_id) championshipLoser.add(game.away_school_id)
      } else {
        if (game.away_school_id) championshipWinner.add(game.away_school_id)
        if (game.home_school_id) championshipLoser.add(game.home_school_id)
      }
    }
  }

  console.log(`Bowl schools: ${bowlSchools.size}`)
  console.log(`CFP First Round schools: ${cfpFirstRoundSchools.size}`)
  console.log(`CFP Quarterfinal schools: ${cfpQuarterfinalSchools.size}`)
  console.log(`CFP Semifinal schools: ${cfpSemifinalSchools.size}`)
  console.log(`Championship Winner: ${championshipWinner.size}`)
  console.log(`Championship Loser: ${championshipLoser.size}`)
  console.log(`Heisman school: ${heismanSchoolId ? 'Yes' : 'No'}`)

  // Process each league
  for (const league of leagues || []) {
    console.log(`\nProcessing league: ${league.name}`)
    const settings = Array.isArray(league.league_settings)
      ? league.league_settings[0]
      : league.league_settings

    if (!settings) {
      console.log('  No settings found, skipping')
      continue
    }

    // Get all teams
    const { data: teams } = await supabase
      .from('fantasy_teams')
      .select('id, name')
      .eq('league_id', league.id)

    for (const team of teams || []) {
      // Get roster schools (active at end of season)
      const { data: roster } = await supabase
        .from('roster_periods')
        .select('school_id')
        .eq('fantasy_team_id', team.id)
        .is('end_week', null)

      const rosterSchoolIds = new Set((roster || []).map(r => r.school_id))

      let heismanPoints = 0
      let bowlPoints = 0
      let cfpPoints = 0
      let championshipPoints = 0

      // Heisman bonus (week 20)
      if (heismanSchoolId && rosterSchoolIds.has(heismanSchoolId)) {
        heismanPoints = settings.points_heisman_winner || 0
      }

      // Bowl appearance bonus (week 17)
      for (const schoolId of rosterSchoolIds) {
        if (bowlSchools.has(schoolId)) {
          bowlPoints += settings.points_bowl_appearance || 0
        }
      }

      // CFP bonuses (week 18)
      for (const schoolId of rosterSchoolIds) {
        if (cfpFirstRoundSchools.has(schoolId)) {
          cfpPoints += settings.points_playoff_first_round || 0
        }
        if (cfpQuarterfinalSchools.has(schoolId)) {
          cfpPoints += settings.points_playoff_quarterfinal || 0
        }
      }

      // Semifinal and Championship bonuses (week 19)
      for (const schoolId of rosterSchoolIds) {
        if (cfpSemifinalSchools.has(schoolId)) {
          cfpPoints += settings.points_playoff_semifinal || 0
        }
        if (championshipWinner.has(schoolId)) {
          championshipPoints += settings.points_championship_win || 0
        }
        if (championshipLoser.has(schoolId)) {
          championshipPoints += settings.points_championship_loss || 0
        }
      }

      console.log(`  ${team.name}: Heisman=${heismanPoints}, Bowl=${bowlPoints}, CFP=${cfpPoints}, Champ=${championshipPoints}`)

      // Update weekly points for special events
      // Week 17 (Bowls) - add bowl appearance bonus
      if (bowlPoints > 0) {
        const { data: existing } = await supabase
          .from('fantasy_team_weekly_points')
          .select('points')
          .eq('fantasy_team_id', team.id)
          .eq('week_number', 17)
          .single()

        const currentPoints = existing?.points || 0
        await supabase
          .from('fantasy_team_weekly_points')
          .upsert({
            fantasy_team_id: team.id,
            week_number: 17,
            points: currentPoints + bowlPoints,
            is_high_points_winner: false,
            high_points_amount: 0,
          }, { onConflict: 'fantasy_team_id,week_number' })
      }

      // Week 18 (CFP First Round/QF)
      if (cfpPoints > 0) {
        const { data: existing } = await supabase
          .from('fantasy_team_weekly_points')
          .select('points')
          .eq('fantasy_team_id', team.id)
          .eq('week_number', 18)
          .single()

        const currentPoints = existing?.points || 0
        await supabase
          .from('fantasy_team_weekly_points')
          .upsert({
            fantasy_team_id: team.id,
            week_number: 18,
            points: currentPoints + cfpPoints,
            is_high_points_winner: false,
            high_points_amount: 0,
          }, { onConflict: 'fantasy_team_id,week_number' })
      }

      // Week 19 (Semis/Championship)
      const week19Total = cfpSemifinalSchools.size > 0 || championshipPoints > 0
        ? (settings.points_playoff_semifinal || 0) * [...rosterSchoolIds].filter(id => cfpSemifinalSchools.has(id)).length + championshipPoints
        : 0

      if (week19Total > 0 || championshipPoints > 0) {
        const { data: existing } = await supabase
          .from('fantasy_team_weekly_points')
          .select('points')
          .eq('fantasy_team_id', team.id)
          .eq('week_number', 19)
          .single()

        const currentPoints = existing?.points || 0
        // Only add championship points (semifinal already counted in cfpPoints)
        await supabase
          .from('fantasy_team_weekly_points')
          .upsert({
            fantasy_team_id: team.id,
            week_number: 19,
            points: currentPoints + championshipPoints,
            is_high_points_winner: false,
            high_points_amount: 0,
          }, { onConflict: 'fantasy_team_id,week_number' })
      }

      // Week 20 (Heisman)
      if (heismanPoints > 0) {
        await supabase
          .from('fantasy_team_weekly_points')
          .upsert({
            fantasy_team_id: team.id,
            week_number: 20,
            points: heismanPoints,
            is_high_points_winner: false,
            high_points_amount: 0,
          }, { onConflict: 'fantasy_team_id,week_number' })
      }
    }
  }

  // Update total points for all teams
  console.log('\nUpdating team totals...')
  const { data: allTeams } = await supabase
    .from('fantasy_teams')
    .select('id')

  for (const team of allTeams || []) {
    const { data: weeklyPoints } = await supabase
      .from('fantasy_team_weekly_points')
      .select('points')
      .eq('fantasy_team_id', team.id)

    const total = (weeklyPoints || []).reduce((sum, wp) => sum + (wp.points || 0), 0)

    await supabase
      .from('fantasy_teams')
      .update({ total_points: total })
      .eq('id', team.id)
  }

  console.log('\n=== DONE ===')
}

calculateSpecialEvents()
