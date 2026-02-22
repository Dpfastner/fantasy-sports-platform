import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function check() {
  // Get all league settings
  const { data: settings, error } = await supabase
    .from('league_settings')
    .select('*')

  console.log('=== All League Settings ===')
  if (error) {
    console.log('Error:', error.message)
  } else if (settings && settings.length > 0) {
    // Show first settings row with all columns
    console.log('Columns:', Object.keys(settings[0]))
    console.log('\nSettings:')
    for (const s of settings) {
      console.log(JSON.stringify(s, null, 2))
    }
  } else {
    console.log('No settings found')
  }
}

check()
