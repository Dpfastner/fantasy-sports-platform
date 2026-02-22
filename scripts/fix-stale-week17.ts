import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function fix() {
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.error('No season found')
    return
  }

  // Get bowl game schools (regular bowls)
  const { data: bowlGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id')
    .eq('season_id', season.id)
    .eq('week_number', 17)
    .eq('is_playoff_game', false)

  // Get CFP schools (CFP games also count as bowl appearances)
  const { data: cfpGames } = await supabase
    .from('games')
    .select('home_school_id, away_school_id')
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)

  const bowlSchoolIds = new Set<string>()
  for (const g of bowlGames || []) {
    if (g.home_school_id) bowlSchoolIds.add(g.home_school_id)
    if (g.away_school_id) bowlSchoolIds.add(g.away_school_id)
  }
  // Add CFP teams as bowl appearances
  for (const g of cfpGames || []) {
    if (g.home_school_id) bowlSchoolIds.add(g.home_school_id)
    if (g.away_school_id) bowlSchoolIds.add(g.away_school_id)
  }

  console.log('Bowl schools (including CFP):', bowlSchoolIds.size)

  // Get all week 17 points
  const { data: week17Points } = await supabase
    .from('school_weekly_points')
    .select('id, school_id, total_points, schools(name)')
    .eq('season_id', season.id)
    .eq('week_number', 17)

  // Find stale records (schools not in bowls but have week 17 points)
  const toDelete: string[] = []
  for (const sp of week17Points || []) {
    if (!bowlSchoolIds.has(sp.school_id)) {
      const schoolName = (sp as any).schools?.name || sp.school_id
      console.log(`Deleting stale week 17 data for ${schoolName}: ${sp.total_points} pts`)
      toDelete.push(sp.id)
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('school_weekly_points')
      .delete()
      .in('id', toDelete)

    if (error) console.error('Delete error:', error)
    else console.log(`\nDeleted ${toDelete.length} stale week 17 records`)
  } else {
    console.log('No stale records to delete')
  }

  // Verify Indiana now
  const { data: indianaPoints } = await supabase
    .from('school_weekly_points')
    .select('week_number, total_points')
    .eq('school_id', '102cd2a6-c109-42f6-88c8-e58be6225c12')
    .gte('week_number', 17)
    .order('week_number')

  console.log('\nIndiana special weeks now:', indianaPoints)
}

fix()
