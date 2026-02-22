import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function check() {
  // Find Indiana
  const { data: indiana } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', '%indiana%')
    .not('name', 'ilike', '%indiana state%')
    .limit(1)
    .single()

  if (!indiana) {
    console.log('Indiana not found')
    return
  }

  console.log('Indiana ID:', indiana.id)
  console.log('Indiana Name:', indiana.name)

  // Get Indiana's games in weeks 15-21 (postseason)
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .or(`home_school_id.eq.${indiana.id},away_school_id.eq.${indiana.id}`)
    .gte('week_number', 15)
    .order('week_number')

  console.log('\nIndiana Postseason Games:')
  for (const g of games || []) {
    const isHome = g.home_school_id === indiana.id
    const myScore = isHome ? g.home_score : g.away_score
    const oppScore = isHome ? g.away_score : g.home_score
    const result = myScore !== null && oppScore !== null ? (myScore > oppScore ? 'W' : 'L') : '?'
    console.log(`Week ${g.week_number}: ${result} ${myScore}-${oppScore} | ${g.playoff_round || (g.is_bowl_game ? 'Bowl' : 'Regular')} | Status: ${g.status}`)
  }

  // Get Indiana's weekly points
  const { data: points } = await supabase
    .from('school_weekly_points')
    .select('*')
    .eq('school_id', indiana.id)
    .order('week_number')

  console.log('\nIndiana Weekly Points:')
  let total = 0
  for (const p of points || []) {
    total += p.total_points
    console.log(`Week ${p.week_number}: ${p.total_points} pts (base:${p.base_points} conf:${p.conference_bonus} 50+:${p.over_50_bonus} shutout:${p.shutout_bonus} r25:${p.ranked_25_bonus} r10:${p.ranked_10_bonus})`)
  }
  console.log('Total:', total)
}

check()
