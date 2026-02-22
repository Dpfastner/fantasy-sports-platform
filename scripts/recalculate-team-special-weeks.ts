import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function recalculateTeamSpecialWeeks() {
  console.log('=== Recalculating Fantasy Team Points for Weeks 17-20 ===\n')

  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.error('Season not found')
    return
  }

  // Get all leagues
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('season_id', season.id)

  for (const league of leagues || []) {
    console.log(`\nProcessing league: ${league.name}`)

    // Get all teams in this league
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

      const schoolIds = (roster || []).map(r => r.school_id)

      if (schoolIds.length === 0) {
        console.log(`  ${team.name}: No active roster`)
        continue
      }

      // Calculate points for weeks 17-20
      for (const weekNumber of [17, 18, 19, 20]) {
        // Get school points for this week for roster schools
        const { data: schoolPoints } = await supabase
          .from('school_weekly_points')
          .select('total_points')
          .eq('season_id', season.id)
          .eq('week_number', weekNumber)
          .in('school_id', schoolIds)

        const totalPoints = (schoolPoints || []).reduce((sum, sp) => sum + (sp.total_points || 0), 0)

        if (totalPoints > 0) {
          await supabase
            .from('fantasy_team_weekly_points')
            .upsert({
              fantasy_team_id: team.id,
              week_number: weekNumber,
              points: totalPoints,
              is_high_points_winner: false,
              high_points_amount: 0,
            }, { onConflict: 'fantasy_team_id,week_number' })

          console.log(`  ${team.name} Week ${weekNumber}: ${totalPoints} pts`)
        }
      }
    }
  }

  // Update team totals
  console.log('\nUpdating team totals...')
  const { data: allTeams } = await supabase
    .from('fantasy_teams')
    .select('id, name')

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

    console.log(`  ${team.name}: ${total} total points`)
  }

  console.log('\n=== DONE ===')
}

recalculateTeamSpecialWeeks()
