import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function check() {
  // Get all bowl games (week >= 17)
  const { data: bowls } = await supabase
    .from('games')
    .select('bowl_name, is_playoff_game, playoff_round')
    .gte('week_number', 17)
    .order('is_playoff_game', { ascending: false })
    .order('bowl_name')

  console.log(`Total bowl/postseason games: ${bowls?.length}\n`)

  const cfp = bowls?.filter(g => g.is_playoff_game) || []
  const regular = bowls?.filter(g => !g.is_playoff_game) || []
  const wronglyMarked = bowls?.filter(g =>
    g.is_playoff_game && !g.bowl_name?.toLowerCase().includes('college football playoff')
  ) || []

  console.log(`CFP games (is_playoff_game=true): ${cfp.length}`)
  cfp.forEach(g => console.log(`  ✓ ${g.playoff_round}: ${g.bowl_name}`))

  console.log(`\nRegular bowls (is_playoff_game=false): ${regular.length}`)
  regular.slice(0, 5).forEach(g => console.log(`  - ${g.bowl_name}`))
  if (regular.length > 5) console.log(`  ... and ${regular.length - 5} more`)

  if (wronglyMarked.length > 0) {
    console.log(`\n⚠️  WRONGLY MARKED AS CFP: ${wronglyMarked.length}`)
    wronglyMarked.forEach(g => console.log(`  ! ${g.bowl_name}`))
  }
}

check()
