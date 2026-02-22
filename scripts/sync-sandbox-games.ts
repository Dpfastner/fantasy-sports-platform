import { createClient } from '@supabase/supabase-js'

// Sandbox/Preview Supabase credentials
const SUPABASE_URL = 'https://lpmbhutdaxmfjxacbusq.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ESPNGame {
  id: string
  date: string
  name: string
  competitions: Array<{
    competitors: Array<{
      homeAway: string
      team: {
        id: string
        displayName: string
      }
      score: string
      curatedRank?: { current: number }
    }>
    status: {
      type: { state: string }
      period: number
      displayClock: string
    }
    notes?: Array<{ headline?: string }>
  }>
}

async function fetchScoreboard(year: number, week: number, seasonType: number): Promise<ESPNGame[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=${year}&seasontype=${seasonType}&week=${week}&limit=100`
  console.log(`Fetching: ${url}`)
  const response = await fetch(url)
  const data = await response.json()
  return data.events || []
}

function determinePlayoffRound(notesHeadline: string): string | null {
  const name = notesHeadline.toLowerCase()

  if (!name.includes('college football playoff')) {
    return null
  }

  if (name.includes('national championship')) return 'championship'
  if (name.includes('semifinal')) return 'semifinal'
  if (name.includes('quarterfinal')) return 'quarterfinal'
  if (name.includes('first round')) return 'first_round'

  return null
}

async function syncGames(year: number) {
  console.log(`\n=== Syncing ${year} games to SANDBOX database ===\n`)

  // Get season ID
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', year)
    .single()

  if (seasonError || !season) {
    console.error(`Season ${year} not found:`, seasonError)
    return
  }
  console.log(`Found season ID: ${season.id}`)

  // Get school mappings
  const { data: schools } = await supabase
    .from('schools')
    .select('id, external_api_id, conference, logo_url')
    .not('external_api_id', 'is', null)

  const schoolMap = new Map<string, string>()
  const schoolConferenceMap = new Map<string, string>()
  const schoolLogoMap = new Map<string, string>()

  for (const school of schools || []) {
    if (school.external_api_id) {
      schoolMap.set(school.external_api_id, school.id)
      schoolConferenceMap.set(school.id, school.conference || '')
      if (school.logo_url) {
        schoolLogoMap.set(school.id, school.logo_url)
      }
    }
  }
  console.log(`Loaded ${schoolMap.size} school mappings`)

  let totalSynced = 0
  let totalSkipped = 0

  // Sync regular season weeks 0-16
  for (let week = 0; week <= 16; week++) {
    try {
      const games = await fetchScoreboard(year, week, 2)
      const result = await syncWeekGames(season.id, week, games, schoolMap, schoolConferenceMap, schoolLogoMap, 2)
      totalSynced += result.synced
      totalSkipped += result.skipped
      console.log(`Week ${week}: ${result.synced} synced, ${result.skipped} skipped`)
      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.warn(`Week ${week} error:`, err)
    }
  }

  // Sync postseason weeks 1-5
  for (let week = 1; week <= 5; week++) {
    try {
      const games = await fetchScoreboard(year, week, 3)
      const targetWeek = 16 + week
      const result = await syncWeekGames(season.id, targetWeek, games, schoolMap, schoolConferenceMap, schoolLogoMap, 3)
      totalSynced += result.synced
      totalSkipped += result.skipped
      console.log(`Postseason week ${week} (week ${targetWeek}): ${result.synced} synced, ${result.skipped} skipped`)
      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.warn(`Postseason week ${week} error:`, err)
    }
  }

  console.log(`\n=== DONE: ${totalSynced} games synced, ${totalSkipped} skipped ===\n`)
}

async function syncWeekGames(
  seasonId: string,
  weekNumber: number,
  games: ESPNGame[],
  schoolMap: Map<string, string>,
  schoolConferenceMap: Map<string, string>,
  schoolLogoMap: Map<string, string>,
  seasonType: number
): Promise<{ synced: number; skipped: number }> {
  let synced = 0
  let skipped = 0

  for (const game of games) {
    const competition = game.competitions?.[0]
    if (!competition) continue

    const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
    const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

    if (!homeCompetitor || !awayCompetitor) continue

    const homeSchoolId = schoolMap.get(homeCompetitor.team.id)
    const awaySchoolId = schoolMap.get(awayCompetitor.team.id)

    if (!homeSchoolId && !awaySchoolId) {
      skipped++
      continue
    }

    const homeConference = homeSchoolId ? schoolConferenceMap.get(homeSchoolId) : null
    const awayConference = awaySchoolId ? schoolConferenceMap.get(awaySchoolId) : null
    const isConferenceGame = !!(homeConference && awayConference &&
      homeConference === awayConference && homeConference !== 'Independent')

    let status = 'scheduled'
    if (competition.status.type.state === 'in') status = 'live'
    else if (competition.status.type.state === 'post') status = 'completed'

    const gameDate = new Date(game.date)
    const gameDateStr = gameDate.toISOString().split('T')[0]
    const gameTimeStr = gameDate.toTimeString().slice(0, 8)

    const espnNotes = competition.notes as Array<{ headline?: string }> | undefined
    const bowlName = seasonType === 3 ? (espnNotes?.[0]?.headline || null) : null
    const playoffRound = seasonType === 3 ? determinePlayoffRound(bowlName || '') : null

    const { error } = await supabase
      .from('games')
      .upsert({
        external_game_id: game.id,
        season_id: seasonId,
        week_number: weekNumber,
        home_school_id: homeSchoolId || null,
        away_school_id: awaySchoolId || null,
        home_score: parseInt(homeCompetitor.score) || 0,
        away_score: parseInt(awayCompetitor.score) || 0,
        home_rank: homeCompetitor.curatedRank?.current || null,
        away_rank: awayCompetitor.curatedRank?.current || null,
        game_date: gameDateStr,
        game_time: gameTimeStr,
        status: status,
        is_playoff_game: playoffRound !== null,
        is_conference_game: isConferenceGame,
        bowl_name: bowlName,
        playoff_round: playoffRound,
        home_team_name: homeCompetitor.team.displayName,
        home_team_logo_url: homeSchoolId ? schoolLogoMap.get(homeSchoolId) || null : null,
        away_team_name: awayCompetitor.team.displayName,
        away_team_logo_url: awaySchoolId ? schoolLogoMap.get(awaySchoolId) || null : null,
      }, { onConflict: 'season_id,external_game_id' })

    if (error) {
      skipped++
    } else {
      synced++
    }
  }

  return { synced, skipped }
}

// Run the sync
syncGames(2025)
