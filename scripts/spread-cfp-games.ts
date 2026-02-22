import { createClient } from '@supabase/supabase-js'

// Use sandbox database
const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function spreadCFPGames() {
  console.log('========================================')
  console.log('  SPREADING CFP GAMES ACROSS WEEKS')
  console.log('========================================')
  console.log('')
  console.log('Current schedule:')
  console.log('  Week 18: First Round + Quarterfinals + Semifinals + Championship')
  console.log('')
  console.log('New schedule:')
  console.log('  Week 18: First Round + Quarterfinals')
  console.log('  Week 19: Semifinals')
  console.log('  Week 20: Championship')
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

  // Show current state
  const { data: currentGames } = await supabase
    .from('games')
    .select('id, playoff_round, week_number, home_school_id, away_school_id')
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .order('week_number')

  console.log('\n=== Current CFP Game Distribution ===')
  for (const game of currentGames || []) {
    console.log(`  Week ${game.week_number}: ${game.playoff_round}`)
  }

  // Move Semifinal games to week 19
  console.log('\n=== Moving Semifinal games to Week 19 ===')
  const { data: semiFinals, error: semiError } = await supabase
    .from('games')
    .update({ week_number: 19 })
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .eq('playoff_round', 'semifinal')
    .select('id, playoff_round')

  if (semiError) {
    console.error(`  Error: ${semiError.message}`)
  } else {
    console.log(`  Moved ${semiFinals?.length || 0} semifinal games to week 19`)
  }

  // Move Championship game to week 20
  console.log('\n=== Moving Championship game to Week 20 ===')
  const { data: championship, error: champError } = await supabase
    .from('games')
    .update({ week_number: 20 })
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .eq('playoff_round', 'championship')
    .select('id, playoff_round')

  if (champError) {
    console.error(`  Error: ${champError.message}`)
  } else {
    console.log(`  Moved ${championship?.length || 0} championship games to week 20`)
  }

  // Verify the changes
  const { data: updatedGames } = await supabase
    .from('games')
    .select('id, playoff_round, week_number, home_school_id, away_school_id')
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .order('week_number')

  console.log('\n=== New CFP Game Distribution ===')
  const weekCounts = new Map<number, string[]>()
  for (const game of updatedGames || []) {
    const existing = weekCounts.get(game.week_number) || []
    existing.push(game.playoff_round)
    weekCounts.set(game.week_number, existing)
  }

  for (const [week, rounds] of weekCounts) {
    console.log(`  Week ${week}: ${rounds.join(', ')}`)
  }

  console.log('\n========================================')
  console.log('  DONE! Now run: npx tsx scripts/calculate-all-points.ts')
  console.log('========================================')
}

spreadCFPGames()
