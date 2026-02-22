import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function checkLeagueSeason() {
  // Get all seasons
  console.log('=== ALL SEASONS ===')
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('year')

  for (const s of seasons || []) {
    console.log(`Season: ${s.year} - ID: ${s.id} - Name: ${s.name}`)
  }

  // Get all leagues
  console.log('\n=== ALL LEAGUES ===')
  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, season_id')

  for (const l of leagues || []) {
    const season = seasons?.find(s => s.id === l.season_id)
    console.log(`League: ${l.name} - Season ID: ${l.season_id} - Season Year: ${season?.year || 'NOT FOUND'}`)
  }

  // Check school_weekly_points by season
  console.log('\n=== POINTS BY SEASON ===')
  for (const s of seasons || []) {
    const { data: points, count } = await supabase
      .from('school_weekly_points')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', s.id)

    const { data: maxWeekData } = await supabase
      .from('school_weekly_points')
      .select('week_number')
      .eq('season_id', s.id)
      .order('week_number', { ascending: false })
      .limit(1)

    const maxWeek = maxWeekData?.[0]?.week_number ?? 'N/A'
    console.log(`Season ${s.year} (${s.id}): ${count} point records, max week: ${maxWeek}`)
  }

  // Check what data exists for the league's season specifically
  console.log('\n=== DETAILED CHECK FOR FIRST LEAGUE ===')
  if (leagues && leagues.length > 0) {
    const league = leagues[0]
    console.log(`Checking league: ${league.name}`)
    console.log(`Season ID: ${league.season_id}`)

    // Get week distribution
    const { data: weekDist } = await supabase
      .from('school_weekly_points')
      .select('week_number')
      .eq('season_id', league.season_id)

    const weekCounts = new Map<number, number>()
    for (const w of weekDist || []) {
      weekCounts.set(w.week_number, (weekCounts.get(w.week_number) || 0) + 1)
    }

    console.log('Points records per week:')
    const sortedWeeks = Array.from(weekCounts.entries()).sort((a, b) => a[0] - b[0])
    for (const [week, count] of sortedWeeks) {
      console.log(`  Week ${week}: ${count} records`)
    }
  }
}

checkLeagueSeason()
