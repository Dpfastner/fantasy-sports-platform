import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function check() {
  // Check heisman winners
  const { data: heisman } = await supabase
    .from('heisman_winners')
    .select('*, schools(name)')

  console.log('=== Heisman Winners in Sandbox ===')
  console.log(heisman || 'None found')

  // Check league settings for special events
  const { data: settings } = await supabase
    .from('league_settings')
    .select(`
      league_id,
      points_heisman,
      points_bowl_appearance,
      points_playoff_first_round,
      points_playoff_quarterfinal,
      points_playoff_semifinal,
      points_championship_win,
      points_championship_loss,
      points_conf_championship_win
    `)

  console.log('\n=== League Settings (Special Events) ===')
  console.log(settings || 'None found')
}

check()
