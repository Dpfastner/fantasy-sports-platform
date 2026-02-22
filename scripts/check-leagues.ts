import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function checkLeagues() {
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, name')

  if (error) {
    console.log('Error:', error.message)
    return
  }

  console.log('Leagues in database:')
  for (const league of leagues || []) {
    console.log(`  ${league.id} - ${league.name}`)
  }
}

checkLeagues()
