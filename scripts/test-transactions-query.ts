import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function testTransactionsQuery() {
  const seasonId = 'c1892780-5010-4978-be3c-a60a8d60b0c3'
  const currentWeek = 21

  console.log('Testing the EXACT query from transactions page:')
  console.log(`season_id: ${seasonId}`)
  console.log(`currentWeek: ${currentWeek}`)
  console.log('')

  // This is the exact query from transactions/page.tsx lines 233-237
  const { data: schoolPointsData, error } = await supabase
    .from('school_weekly_points')
    .select('school_id, total_points, game_id')
    .eq('season_id', seasonId)
    .lte('week_number', currentWeek)

  if (error) {
    console.log('ERROR:', error)
    return
  }

  console.log(`Total records returned: ${schoolPointsData?.length || 0}`)

  // Aggregate like the page does
  const schoolPointsMap = new Map<string, number>()
  for (const sp of schoolPointsData || []) {
    const current = schoolPointsMap.get(sp.school_id) || 0
    schoolPointsMap.set(sp.school_id, current + Number(sp.total_points))
  }

  console.log(`Unique schools with points: ${schoolPointsMap.size}`)

  // Find Alabama
  const alabamaId = 'dc4a0227-4c6c-48e9-b171-7cba2d944731'
  console.log(`\nAlabama total points: ${schoolPointsMap.get(alabamaId) || 0}`)

  // Check distribution of returned weeks
  const weekCounts = new Map<number, number>()
  const { data: weekData } = await supabase
    .from('school_weekly_points')
    .select('week_number')
    .eq('season_id', seasonId)
    .lte('week_number', currentWeek)

  for (const w of weekData || []) {
    weekCounts.set(w.week_number, (weekCounts.get(w.week_number) || 0) + 1)
  }

  console.log('\nWeek distribution in query results:')
  const sorted = Array.from(weekCounts.entries()).sort((a, b) => a[0] - b[0])
  for (const [week, count] of sorted) {
    console.log(`  Week ${week}: ${count} records`)
  }
}

testTransactionsQuery()
