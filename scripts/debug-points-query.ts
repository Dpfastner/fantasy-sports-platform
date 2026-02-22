import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function debugPointsQuery() {
  // Get 2025 season
  const { data: season } = await supabase
    .from('seasons')
    .select('id, year')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.log('Season 2025 not found')
    return
  }

  console.log('Season:', season)

  // Get Alabama
  const { data: alabama } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', '%alabama%')
    .limit(1)
    .single()

  if (!alabama) {
    console.log('Alabama not found')
    return
  }

  // Test with different currentWeek values
  for (const testWeek of [9, 11, 14, 19, 21]) {
    const { data: schoolPointsData } = await supabase
      .from('school_weekly_points')
      .select('school_id, total_points, week_number')
      .eq('season_id', season.id)
      .eq('school_id', alabama.id)
      .lte('week_number', testWeek)

    const total = (schoolPointsData || []).reduce((sum, sp) => sum + sp.total_points, 0)
    console.log(`currentWeek=${testWeek}: Alabama has ${total} points (${schoolPointsData?.length || 0} entries)`)
  }

  // Also check - what does calculating currentWeek from real date give us?
  const seasonYear = 2025
  const seasonStart = new Date(seasonYear, 7, 24) // August 24
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const calculatedWeek = Math.max(0, Math.min(weeksDiff + 1, 21))

  console.log('')
  console.log('Date calculation debug:')
  console.log('  Season start:', seasonStart.toISOString())
  console.log('  Current time:', new Date().toISOString())
  console.log('  Weeks diff:', weeksDiff)
  console.log('  Calculated week:', calculatedWeek)
}

debugPointsQuery()
