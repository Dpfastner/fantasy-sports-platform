import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function verify() {
  const { data } = await supabase
    .from('games')
    .select('bowl_name, is_playoff_game, playoff_round')
    .gte('week_number', 17)
    .order('is_playoff_game', { ascending: false })

  console.log('=== SANDBOX DATABASE VERIFICATION ===\n')

  const cfpGames = data?.filter(g => g.is_playoff_game) || []
  const regularBowls = data?.filter(g => !g.is_playoff_game) || []

  console.log(`CFP Games (is_playoff_game=true): ${cfpGames.length}`)
  cfpGames.forEach(g => console.log(`  - ${g.playoff_round}: ${g.bowl_name}`))

  console.log(`\nRegular Bowl Games (is_playoff_game=false): ${regularBowls.length}`)
  regularBowls.slice(0, 5).forEach(g => console.log(`  - ${g.bowl_name}`))
  if (regularBowls.length > 5) console.log(`  ... and ${regularBowls.length - 5} more`)
}

verify()
