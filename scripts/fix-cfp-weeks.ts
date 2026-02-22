import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function fixCFPWeeks() {
  console.log('=== Moving CFP games to correct weeks ===\n')

  // Move CFP first round and quarterfinals to week 18
  const { data: qfGames, error: qfError } = await supabase
    .from('games')
    .update({ week_number: 18 })
    .or('playoff_round.eq.first_round,playoff_round.eq.quarterfinal')
    .select('id, playoff_round')

  if (qfError) {
    console.error('Error moving QF games:', qfError)
  } else {
    console.log(`Moved ${qfGames?.length || 0} first round/quarterfinal games to week 18`)
  }

  // Move CFP semifinals and championship to week 19
  const { data: sfGames, error: sfError } = await supabase
    .from('games')
    .update({ week_number: 19 })
    .or('playoff_round.eq.semifinal,playoff_round.eq.championship')
    .select('id, playoff_round')

  if (sfError) {
    console.error('Error moving SF/Championship games:', sfError)
  } else {
    console.log(`Moved ${sfGames?.length || 0} semifinal/championship games to week 19`)
  }

  // Verify the changes
  const { data: verification } = await supabase
    .from('games')
    .select('week_number, playoff_round, status')
    .gte('week_number', 17)
    .order('week_number')

  const summary: Record<string, number> = {}
  for (const g of verification || []) {
    const key = `Week ${g.week_number} ${g.playoff_round || 'bowl'} (${g.status})`
    summary[key] = (summary[key] || 0) + 1
  }

  console.log('\nUpdated postseason structure:')
  Object.entries(summary).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`))
}

fixCFPWeeks()
