import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function checkAlabamaPoints() {
  // Get Alabama school
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

  console.log('Alabama ID:', alabama.id)
  console.log('Alabama Name:', alabama.name)
  console.log('')

  // Get 2025 season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', 2025)
    .single()

  if (!season) {
    console.log('Season not found')
    return
  }

  // Get all Alabama games
  console.log('=== ALABAMA GAMES ===')
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', season.id)
    .or(`home_school_id.eq.${alabama.id},away_school_id.eq.${alabama.id}`)
    .order('week_number')

  for (const game of games || []) {
    const isHome = game.home_school_id === alabama.id
    const myScore = isHome ? game.home_score : game.away_score
    const oppScore = isHome ? game.away_score : game.home_score
    const result = myScore !== null && oppScore !== null ? (myScore > oppScore ? 'W' : 'L') : '?'
    const playoffInfo = game.playoff_round || (game.is_bowl_game ? 'Bowl' : 'N/A')
    console.log(`Week ${game.week_number}: ${result} ${myScore}-${oppScore} | Status: ${game.status} | Type: ${playoffInfo}`)
  }

  // Get Alabama weekly points
  console.log('')
  console.log('=== ALABAMA WEEKLY POINTS ===')
  const { data: points } = await supabase
    .from('school_weekly_points')
    .select('*')
    .eq('school_id', alabama.id)
    .eq('season_id', season.id)
    .order('week_number')

  let totalPoints = 0
  for (const pt of points || []) {
    console.log(`Week ${pt.week_number}: ${pt.total_points} pts (base: ${pt.base_points}, conf: ${pt.conference_bonus}, 50+: ${pt.over_50_bonus}, shutout: ${pt.shutout_bonus}, rank25: ${pt.ranked_25_bonus}, rank10: ${pt.ranked_10_bonus})`)
    totalPoints += pt.total_points
  }
  console.log('')
  console.log('Total points in school_weekly_points:', totalPoints)
  console.log('Number of entries:', points?.length || 0)
}

checkAlabamaPoints()
