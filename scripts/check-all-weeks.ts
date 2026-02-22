import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function checkAllWeeks() {
  const seasonId = 'c1892780-5010-4978-be3c-a60a8d60b0c3'

  console.log('=== RECORDS PER WEEK (0-21) ===')

  for (let week = 0; week <= 21; week++) {
    const { count } = await supabase
      .from('school_weekly_points')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
      .eq('week_number', week)

    console.log(`Week ${week.toString().padStart(2)}: ${count || 0} records`)
  }

  // Also check the week_number column type
  console.log('\n=== CHECKING WEEK_NUMBER DATA TYPE ===')
  const { data: sample } = await supabase
    .from('school_weekly_points')
    .select('week_number')
    .limit(1)

  if (sample && sample.length > 0) {
    console.log('Sample week_number:', sample[0].week_number, 'Type:', typeof sample[0].week_number)
  }

  // Check if there are any records with week >= 10
  const { data: week10Plus, count: week10Count } = await supabase
    .from('school_weekly_points')
    .select('week_number', { count: 'exact' })
    .eq('season_id', seasonId)
    .gte('week_number', 10)
    .limit(5)

  console.log(`\nRecords with week >= 10: ${week10Count}`)
  if (week10Plus) {
    console.log('Sample weeks >= 10:', week10Plus.map(w => w.week_number))
  }
}

checkAllWeeks()
