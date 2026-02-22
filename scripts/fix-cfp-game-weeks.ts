import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function fixCFPGameWeeks() {
  console.log('=== Fixing CFP Game Weeks ===\n')

  // Move semifinal games from week 19 to week 18 (so wins count in CFP column)
  const { data: sfGames, error: sfError } = await supabase
    .from('games')
    .update({ week_number: 18 })
    .eq('playoff_round', 'semifinal')
    .select('id, playoff_round, home_school_id, away_school_id')

  if (sfError) {
    console.error('Error moving semifinal games:', sfError)
  } else {
    console.log(`Moved ${sfGames?.length || 0} semifinal games to week 18`)
  }

  // Verify the structure now
  const { data: cfpGames } = await supabase
    .from('games')
    .select('week_number, playoff_round, status')
    .eq('is_playoff_game', true)
    .order('week_number')
    .order('playoff_round')

  const summary: Record<string, number> = {}
  for (const g of cfpGames || []) {
    const key = `Week ${g.week_number} - ${g.playoff_round}`
    summary[key] = (summary[key] || 0) + 1
  }

  console.log('\nCFP game structure:')
  Object.entries(summary).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`))

  console.log('\n=== DONE ===')
}

fixCFPGameWeeks()
