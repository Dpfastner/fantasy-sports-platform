import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function check() {
  // Get weekly points by week number
  const { data: weeklyPoints } = await supabase
    .from('fantasy_team_weekly_points')
    .select('week_number, points')
    .order('week_number')

  // Aggregate by week
  const weekSummary = new Map<number, { count: number, totalPoints: number }>()
  for (const wp of weeklyPoints || []) {
    const existing = weekSummary.get(wp.week_number) || { count: 0, totalPoints: 0 }
    weekSummary.set(wp.week_number, {
      count: existing.count + 1,
      totalPoints: existing.totalPoints + wp.points
    })
  }

  console.log('=== Weekly Points in SANDBOX Database ===\n')
  console.log('Week | Teams | Total Points')
  console.log('-----|-------|-------------')

  const sortedWeeks = [...weekSummary.keys()].sort((a, b) => a - b)
  for (const week of sortedWeeks) {
    const data = weekSummary.get(week)!
    console.log(`${String(week).padStart(4)} | ${String(data.count).padStart(5)} | ${data.totalPoints}`)
  }

  // Check for missing weeks
  const expectedWeeks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  const missingWeeks = expectedWeeks.filter(w => !weekSummary.has(w))

  if (missingWeeks.length > 0) {
    console.log('\n⚠️  Missing weeks:', missingWeeks.join(', '))
  }

  // Check school_weekly_points table too
  const { data: schoolPoints } = await supabase
    .from('school_weekly_points')
    .select('week_number')

  const schoolWeeks = new Set((schoolPoints || []).map(sp => sp.week_number))
  console.log('\n=== School Weekly Points ===')
  console.log('Weeks with school points:', [...schoolWeeks].sort((a, b) => a - b).join(', '))
}

check()
