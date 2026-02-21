import { createClient } from '@supabase/supabase-js'

// Use sandbox database
const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function spreadCFPGamesV2() {
  console.log('========================================')
  console.log('  SPREADING ALL CFP ROUNDS ACROSS WEEKS')
  console.log('========================================')
  console.log('')
  console.log('New schedule (matches real CFP timing):')
  console.log('  Week 18: First Round only')
  console.log('  Week 19: Quarterfinals')
  console.log('  Week 20: Semifinals')
  console.log('  Week 21: Championship')
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

  // Move Quarterfinal games to week 19
  console.log('\n=== Moving Quarterfinal games to Week 19 ===')
  const { data: quarters, error: qError } = await supabase
    .from('games')
    .update({ week_number: 19 })
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .eq('playoff_round', 'quarterfinal')
    .select('id, playoff_round')

  if (qError) {
    console.error(`  Error: ${qError.message}`)
  } else {
    console.log(`  Moved ${quarters?.length || 0} quarterfinal games to week 19`)
  }

  // Move Semifinal games to week 20
  console.log('\n=== Moving Semifinal games to Week 20 ===')
  const { data: semis, error: sError } = await supabase
    .from('games')
    .update({ week_number: 20 })
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .eq('playoff_round', 'semifinal')
    .select('id, playoff_round')

  if (sError) {
    console.error(`  Error: ${sError.message}`)
  } else {
    console.log(`  Moved ${semis?.length || 0} semifinal games to week 20`)
  }

  // Move Championship game to week 21
  console.log('\n=== Moving Championship game to Week 21 ===')
  const { data: champ, error: cError } = await supabase
    .from('games')
    .update({ week_number: 21 })
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .eq('playoff_round', 'championship')
    .select('id, playoff_round')

  if (cError) {
    console.error(`  Error: ${cError.message}`)
  } else {
    console.log(`  Moved ${champ?.length || 0} championship games to week 21`)
  }

  // Verify the changes
  const { data: updatedGames } = await supabase
    .from('games')
    .select('id, playoff_round, week_number')
    .eq('season_id', season.id)
    .eq('is_playoff_game', true)
    .order('week_number')

  console.log('\n=== Final CFP Game Distribution ===')
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

spreadCFPGamesV2()
