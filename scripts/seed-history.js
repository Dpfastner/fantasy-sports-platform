/**
 * Seed script: Insert 2024-2025 historical season data into league_seasons
 *
 * Usage: node scripts/seed-history.js <league_id>
 *
 * Data source: FBS Fantasy Football 2025 spreadsheet (pre-platform season)
 * Uses v2 final_standings JSONB format with weekly points, rosters, high points, etc.
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://lpmbhutdaxmfjxacbusq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var first')
  process.exit(1)
}

const leagueId = process.argv[2]
if (!leagueId) {
  console.error('Usage: node scripts/seed-history.js <league_id>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SEASON_YEAR = 2026

// Week labels for the scoring periods
const WEEK_LABELS = [
  { week: 1, label: 'Week 1' },
  { week: 2, label: 'Week 2' },
  { week: 3, label: 'Week 3' },
  { week: 4, label: 'Week 4' },
  { week: 5, label: 'Week 5' },
  { week: 6, label: 'Week 6' },
  { week: 7, label: 'Week 7' },
  { week: 8, label: 'Week 8' },
  { week: 9, label: 'Week 9' },
  { week: 10, label: 'Week 10' },
  { week: 11, label: 'Week 11' },
  { week: 12, label: 'Week 12' },
  { week: 13, label: 'Week 13' },
  { week: 14, label: 'Week 14' },
  { week: 15, label: 'Conf Championships' },
  { week: 16, label: 'Week 16' },
  { week: 17, label: 'Bowl Appearance' },
  { week: 18, label: 'Heisman Winner' },
  { week: 19, label: 'Bowl Scores' },
  { week: 20, label: 'Playoff Appearance' },
  { week: 21, label: 'National Championship' },
]

// Full standings with weekly points, rosters, and winnings
const STANDINGS = [
  {
    rank: 1,
    teamName: 'MAS MAS MAS',
    userName: 'Mike',
    totalPoints: 340,
    winnings: 46.25,
    weeklyPointValues: [16, 10, 11, 12, 11, 10, 16, 14, 15, 10, 14, 20, 15, 21, 10, 0, 18, 10, 26, 49, 32],
    roster: [
      { school: 'Indiana', conference: 'Big Ten', record: '16-0', points: 91 },
      { school: 'Miami', conference: 'ACC', record: '13-3', points: 50 },
      { school: 'Ohio State', conference: 'Big Ten', record: '12-2', points: 37 },
      { school: 'Ole Miss', conference: 'SEC', record: '13-2', points: 31 },
      { school: 'Oklahoma', conference: 'SEC', record: '10-3', points: 21 },
      { school: 'Texas A&M', conference: 'SEC', record: '11-2', points: 19 },
      { school: 'BYU', conference: 'Big 12', record: '12-2', points: 16 },
      { school: 'Vanderbilt', conference: 'SEC', record: '10-3', points: 9 },
      { school: 'Virginia', conference: 'ACC', record: '11-3', points: 7 },
      { school: 'Notre Dame', conference: 'Independent', record: '10-2', points: 6 },
    ],
  },
  {
    rank: 2,
    teamName: 'Syndrome of The Down',
    userName: 'Mackenzie',
    totalPoints: 339,
    winnings: 36.25,
    weeklyPointValues: [23, 10, 3, 9, 17, 10, 16, 14, 15, 19, 12, 21, 8, 16, 30, 0, 20, 10, 16, 44, 26],
    roster: [
      { school: 'Indiana', conference: 'Big Ten', record: '16-0', points: 91 },
      { school: 'Ole Miss', conference: 'SEC', record: '13-2', points: 31 },
      { school: 'Texas Tech', conference: 'Big 12', record: '12-2', points: 40 },
      { school: 'James Madison', conference: 'Sun Belt', record: '12-2', points: 38 },
      { school: 'Ohio State', conference: 'Big Ten', record: '12-2', points: 37 },
      { school: 'Oklahoma', conference: 'SEC', record: '10-3', points: 21 },
      { school: 'Memphis', conference: 'AAC', record: '8-5', points: 16 },
      { school: 'Georgia Tech', conference: 'ACC', record: '9-4', points: 13 },
      { school: 'Western KY', conference: 'CUSA', record: '9-4', points: 9 },
      { school: 'San Diego St', conference: 'Mountain West', record: '9-4', points: 9 },
    ],
  },
  {
    rank: 3,
    teamName: 'Falckons Rise Up',
    userName: 'Andrew',
    totalPoints: 274,
    winnings: 21.25,
    weeklyPointValues: [14, 14, 9, 9, 14, 12, 18, 15, 15, 10, 11, 14, 18, 20, 0, 0, 20, 0, 24, 31, 6],
    roster: [
      { school: 'Miami', conference: 'ACC', record: '13-3', points: 50 },
      { school: 'Oregon', conference: 'Big Ten', record: '13-2', points: 47 },
      { school: 'Alabama', conference: 'SEC', record: '11-4', points: 27 },
      { school: 'Texas', conference: 'SEC', record: '10-3', points: 21 },
      { school: 'Utah', conference: 'Big 12', record: '11-2', points: 16 },
      { school: 'BYU', conference: 'Big 12', record: '12-2', points: 16 },
      { school: 'Louisville', conference: 'ACC', record: '9-4', points: 9 },
      { school: 'LSU', conference: 'SEC', record: '7-6', points: 7 },
      { school: 'Army', conference: 'AAC', record: '7-6', points: 7 },
      { school: 'Clemson', conference: 'ACC', record: '7-6', points: 1 },
    ],
  },
  {
    rank: 4,
    teamName: 'The Period Punchers',
    userName: 'Chris',
    totalPoints: 264,
    winnings: 8.75,
    weeklyPointValues: [16, 11, 10, 9, 10, 9, 17, 19, 15, 10, 15, 17, 15, 16, 30, 0, 18, 0, 4, 23, 0],
    roster: [
      { school: 'Georgia', conference: 'SEC', record: '12-2', points: 43 },
      { school: 'James Madison', conference: 'Sun Belt', record: '12-2', points: 38 },
      { school: 'Tulane', conference: 'AAC', record: '11-3', points: 33 },
      { school: 'Alabama', conference: 'SEC', record: '11-4', points: 27 },
      { school: 'South Florida', conference: 'AAC', record: '9-4', points: 24 },
      { school: 'Texas A&M', conference: 'SEC', record: '11-2', points: 17 },
      { school: 'Virginia', conference: 'ACC', record: '11-3', points: 12 },
      { school: 'Notre Dame', conference: 'Independent', record: '10-2', points: 6 },
      { school: 'Cincinnati', conference: 'Big 12', record: '7-6', points: 6 },
      { school: 'San Diego St', conference: 'Mountain West', record: '9-4', points: 6 },
    ],
  },
  {
    rank: 5,
    teamName: "The Dean's Blitz",
    userName: 'Dan',
    totalPoints: 261,
    winnings: 12.50,
    weeklyPointValues: [12, 10, 12, 8, 14, 10, 9, 11, 12, 11, 15, 13, 13, 16, 40, 0, 20, 0, 9, 26, 0],
    roster: [
      { school: 'Oregon', conference: 'Big Ten', record: '13-2', points: 47 },
      { school: 'Georgia', conference: 'SEC', record: '12-2', points: 43 },
      { school: 'Texas Tech', conference: 'Big 12', record: '12-2', points: 40 },
      { school: 'Kennesaw St', conference: 'CUSA', record: '10-4', points: 18 },
      { school: 'Memphis', conference: 'AAC', record: '8-5', points: 16 },
      { school: 'Boise St', conference: 'Mountain West', record: '9-5', points: 16 },
      { school: 'Georgia Tech', conference: 'ACC', record: '9-4', points: 13 },
      { school: 'North Texas', conference: 'AAC', record: '12-2', points: 12 },
      { school: 'Ohio', conference: 'MAC', record: '9-4', points: 9 },
      { school: 'Southern Miss', conference: 'Sun Belt', record: '7-6', points: 4 },
    ],
  },
]

// High points winners per week ($5/week, ties split)
const HIGH_POINTS_WINNERS = [
  { week: 1, label: 'Week 1', highPoints: 23, winners: ['Syndrome of The Down'] },
  { week: 2, label: 'Week 2', highPoints: 14, winners: ['Falckons Rise Up'] },
  { week: 3, label: 'Week 3', highPoints: 12, winners: ["The Dean's Blitz"] },
  { week: 4, label: 'Week 4', highPoints: 12, winners: ['MAS MAS MAS'] },
  { week: 5, label: 'Week 5', highPoints: 17, winners: ['Syndrome of The Down'] },
  { week: 6, label: 'Week 6', highPoints: 12, winners: ['Falckons Rise Up'] },
  { week: 7, label: 'Week 7', highPoints: 18, winners: ['Falckons Rise Up'] },
  { week: 8, label: 'Week 8', highPoints: 19, winners: ['The Period Punchers'] },
  { week: 9, label: 'Week 9', highPoints: 15, winners: ['MAS MAS MAS', 'Syndrome of The Down', 'Falckons Rise Up', 'The Period Punchers'] },
  { week: 10, label: 'Week 10', highPoints: 19, winners: ['Syndrome of The Down'] },
  { week: 11, label: 'Week 11', highPoints: 15, winners: ['The Period Punchers', "The Dean's Blitz"] },
  { week: 12, label: 'Week 12', highPoints: 21, winners: ['Syndrome of The Down'] },
  { week: 13, label: 'Week 13', highPoints: 18, winners: ['Falckons Rise Up'] },
  { week: 14, label: 'Week 14', highPoints: 21, winners: ['MAS MAS MAS'] },
  { week: 15, label: 'Conf Championships', highPoints: 40, winners: ["The Dean's Blitz"] },
]

const SEASON_NOTES = {
  entryFee: 25,
  totalPrizePool: 125,
  heismanWinner: 'Fernando Mendoza, Indiana, QB, Junior',
  nationalChampion: 'Indiana',
}

async function main() {
  console.log(`Seeding ${SEASON_YEAR - 1}-${SEASON_YEAR} season history (v2) for league ${leagueId}...`)

  // Try to match team names to actual platform users
  const { data: teams } = await supabase
    .from('fantasy_teams')
    .select('id, name, user_id, profiles!fantasy_teams_user_id_fkey(display_name, email)')
    .eq('league_id', leagueId)

  console.log(`Found ${teams?.length || 0} teams in league`)

  // Build v2 final_standings
  const standings = STANDINGS.map(entry => {
    const match = teams?.find(t => t.name.toLowerCase() === entry.teamName.toLowerCase())
    const weeklyPoints = entry.weeklyPointValues.map((points, i) => ({
      week: WEEK_LABELS[i].week,
      label: WEEK_LABELS[i].label,
      points,
    }))

    return {
      rank: entry.rank,
      teamName: entry.teamName,
      userName: entry.userName,
      totalPoints: entry.totalPoints,
      winnings: entry.winnings,
      teamId: match?.id || null,
      userId: match?.user_id || null,
      weeklyPoints,
      roster: entry.roster,
    }
  })

  const finalStandings = {
    version: 2,
    standings,
    highPointsWinners: HIGH_POINTS_WINNERS,
    seasonNotes: SEASON_NOTES,
  }

  console.log('\nStandings:')
  for (const s of standings) {
    console.log(`  #${s.rank} ${s.teamName} (${s.userName}) — ${s.totalPoints} pts — $${s.winnings} — ${s.roster.length} schools`)
  }

  // Find champion user_id (rank 1)
  const champion = standings.find(s => s.rank === 1)
  const championUserId = champion?.userId || null

  if (!championUserId) {
    console.log('\nNote: champion_user_id will be null (historical data, no platform user match)')
  }

  // Clean up old incorrect season_year=2025 row if it exists
  const { data: oldRow } = await supabase
    .from('league_seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('season_year', 2025)
    .single()

  if (oldRow) {
    console.log(`Deleting old season_year=2025 row (id: ${oldRow.id})...`)
    await supabase.from('league_seasons').delete().eq('id', oldRow.id)
  }

  // Check if season already exists
  const { data: existing } = await supabase
    .from('league_seasons')
    .select('id')
    .eq('league_id', leagueId)
    .eq('season_year', SEASON_YEAR)
    .single()

  if (existing) {
    console.log(`\nSeason ${SEASON_YEAR} already exists (id: ${existing.id}). Updating...`)
    const { error } = await supabase
      .from('league_seasons')
      .update({
        final_standings: finalStandings,
        champion_user_id: championUserId,
        archived_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Update failed:', error.message)
      process.exit(1)
    }
    console.log('Updated successfully!')
  } else {
    const { data, error } = await supabase
      .from('league_seasons')
      .insert({
        league_id: leagueId,
        season_year: SEASON_YEAR,
        final_standings: finalStandings,
        champion_user_id: championUserId,
        archived_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Insert failed:', error.message)
      process.exit(1)
    }
    console.log(`\nInserted successfully! Season ID: ${data.id}`)
  }

  console.log('\nDone! Check /leagues/<id>/history to see the archived season.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
