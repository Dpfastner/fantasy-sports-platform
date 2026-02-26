import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchScoreboard, ESPNGame, getTeamLogoUrl } from '@/lib/api/espn'
import { validateBody } from '@/lib/api/validation'
import { syncGamesSchema } from '@/lib/api/schemas'

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rawBody = await request.json().catch(() => ({}))
    const validation = validateBody(syncGamesSchema, rawBody)
    if (!validation.success) return validation.response

    const year = validation.data.year || new Date().getFullYear()
    const week = validation.data.week || 1
    const seasonType = validation.data.seasonType || 2
    const backfillAll = validation.data.backfillAll || false

    // Handle backfill all weeks
    if (backfillAll) {
      return await handleBackfillAllGames(year)
    }

    console.log(`Fetching games for ${year} week ${week}...`)

    // Fetch games from ESPN
    const games = await fetchScoreboard(year, week, seasonType)
    console.log(`Found ${games.length} games`)

    // Get season ID from our database
    const { data: season } = await createAdminClient()
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: `Season ${year} not found in database` },
        { status: 404 }
      )
    }

    // Get school mappings (ESPN ID -> our school ID), conference info, and logos
    const { data: schools } = await createAdminClient()
      .from('schools')
      .select('id, external_api_id, conference, logo_url')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    const schoolConferenceMap = new Map<string, string>()
    const schoolLogoMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
        if (school.id) {
          schoolConferenceMap.set(school.id, school.conference || '')
          if (school.logo_url) {
            schoolLogoMap.set(school.id, school.logo_url)
          }
        }
      }
    }

    const syncedGames: Array<{
      espnId: string
      name: string
      homeTeam: string
      awayTeam: string
      status: string
    }> = []
    const skippedGames: string[] = []
    let errorCount = 0

    for (const game of games) {
      const competition = game.competitions?.[0]
      if (!competition) continue

      const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
      const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

      if (!homeCompetitor || !awayCompetitor) continue

      const homeSchoolId = schoolMap.get(homeCompetitor.team.id)
      const awaySchoolId = schoolMap.get(awayCompetitor.team.id)

      // Skip games where NEITHER team is FBS (we need at least one)
      if (!homeSchoolId && !awaySchoolId) {
        skippedGames.push(
          `${awayCompetitor.team.displayName} @ ${homeCompetitor.team.displayName} (no FBS teams)`
        )
        continue
      }

      // Always store both teams' display info for easy UI rendering
      // Get logos from our schools table (ESPN scoreboard doesn't include logos)
      const homeTeamName = homeCompetitor.team.displayName
      const homeTeamLogoUrl = homeSchoolId ? schoolLogoMap.get(homeSchoolId) || null : null
      const awayTeamName = awayCompetitor.team.displayName
      const awayTeamLogoUrl = awaySchoolId ? schoolLogoMap.get(awaySchoolId) || null : null

      // Determine if this is a conference game
      const homeConference = homeSchoolId ? schoolConferenceMap.get(homeSchoolId) : null
      const awayConference = awaySchoolId ? schoolConferenceMap.get(awaySchoolId) : null
      const isConferenceGame = !!(homeConference && awayConference &&
        homeConference === awayConference &&
        homeConference !== 'Independent')

      // Determine game status
      let status = 'scheduled'
      if (competition.status.type.state === 'in') {
        status = 'live'
      } else if (competition.status.type.state === 'post') {
        status = 'completed'
      }

      // Parse game date
      const gameDate = new Date(game.date)
      const gameDateStr = gameDate.toISOString().split('T')[0]
      const gameTimeStr = gameDate.toTimeString().slice(0, 8)

      // Extract bowl name from ESPN notes (e.g., "College Football Playoff Quarterfinal at the Cotton Bowl")
      // Notes contain the actual bowl/game name, not game.name which is just the matchup
      const espnNotes = competition.notes as Array<{ headline?: string }> | undefined
      const bowlName = seasonType === 3 ? (espnNotes?.[0]?.headline || null) : null
      const playoffRound = seasonType === 3 ? determinePlayoffRound(bowlName || '') : null

      // Upsert the game (using correct column names from schema)
      const { error: upsertError } = await createAdminClient()
        .from('games')
        .upsert(
          {
            external_game_id: game.id,
            season_id: season.id,
            week_number: week,
            home_school_id: homeSchoolId || null,
            away_school_id: awaySchoolId || null,
            home_score: parseInt(homeCompetitor.score) || 0,
            away_score: parseInt(awayCompetitor.score) || 0,
            home_rank: homeCompetitor.curatedRank?.current || null,
            away_rank: awayCompetitor.curatedRank?.current || null,
            game_date: gameDateStr,
            game_time: gameTimeStr,
            status: status,
            quarter: status === 'live' ? String(competition.status.period) : null,
            clock: status === 'live' ? competition.status.displayClock : null,
            is_playoff_game: playoffRound !== null,
            is_conference_game: isConferenceGame,
            bowl_name: bowlName,
            playoff_round: playoffRound,
            home_team_name: homeTeamName,
            home_team_logo_url: homeTeamLogoUrl,
            away_team_name: awayTeamName,
            away_team_logo_url: awayTeamLogoUrl,
          },
          { onConflict: 'season_id,external_game_id' }
        )

      if (upsertError) {
        console.error(`Error upserting game ${game.id}:`, upsertError)
        errorCount++
      } else {
        syncedGames.push({
          espnId: game.id,
          name: game.name,
          homeTeam: homeCompetitor.team.displayName,
          awayTeam: awayCompetitor.team.displayName,
          status: status,
        })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        year,
        week,
        seasonType: seasonType === 2 ? 'regular' : 'postseason',
        totalGames: games.length,
        synced: syncedGames.length,
        skipped: skippedGames.length,
        errors: errorCount,
      },
      syncedGames,
      skippedGames,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Game sync endpoint',
    usage: 'POST with { year, week, seasonType?, backfillAll? } and Authorization: Bearer <SYNC_API_KEY>',
    examples: [
      { description: 'Single week', body: { year: 2025, week: 5 } },
      { description: 'Postseason', body: { year: 2025, week: 1, seasonType: 3 } },
      { description: 'Backfill entire season', body: { year: 2025, backfillAll: true } },
    ],
  })
}

/**
 * Determine the playoff round from the ESPN notes headline
 * ESPN format examples:
 * - "College Football Playoff First Round Game"
 * - "College Football Playoff Quarterfinal at the Goodyear Cotton Bowl Classic"
 * - "College Football Playoff Semifinal at the Vrbo Fiesta Bowl"
 * - "College Football Playoff National Championship Presented by AT&T"
 */
function determinePlayoffRound(notesHeadline: string): string | null {
  const name = notesHeadline.toLowerCase()

  // Must contain "college football playoff" - just "cfp" alone is too ambiguous
  // as some bowl names might include "cfp" for promotional reasons
  if (!name.includes('college football playoff')) {
    return null
  }

  // Check for specific round keywords in order of specificity
  if (name.includes('national championship')) {
    return 'championship'
  }
  if (name.includes('semifinal')) {
    return 'semifinal'
  }
  if (name.includes('quarterfinal')) {
    return 'quarterfinal'
  }
  if (name.includes('first round')) {
    return 'first_round'
  }

  // If it has "college football playoff" but no specific round, it's not a real CFP game
  // This catches cases like promotional text in regular bowl names
  return null
}

/**
 * Handle backfilling all games for a season (weeks 0-16 regular + postseason)
 */
async function handleBackfillAllGames(year: number) {
  console.log(`Starting full game backfill for ${year} season...`)

  const supabase = createAdminClient()

  // Get season ID
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('year', year)
    .single()

  if (!season) {
    return NextResponse.json(
      { error: `Season ${year} not found in database` },
      { status: 404 }
    )
  }

  // Get school mappings with conference info and logos
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
      if (school.id) {
        schoolConferenceMap.set(school.id, school.conference || '')
        if (school.logo_url) {
          schoolLogoMap.set(school.id, school.logo_url)
        }
      }
    }
  }

  const results: Array<{
    week: number
    seasonType: number
    synced: number
    skipped: number
  }> = []

  // Sync regular season weeks 0-16
  for (let week = 0; week <= 16; week++) {
    try {
      console.log(`Fetching week ${week} games...`)
      const games = await fetchScoreboard(year, week, 2)
      const weekResult = await syncWeekGames(
        supabase, season.id, week, games, schoolMap, schoolConferenceMap, schoolLogoMap, 2
      )
      results.push({ week, seasonType: 2, ...weekResult })

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.warn(`Week ${week} games not available:`, err)
    }
  }

  // Sync postseason (bowl games, CFP)
  // ESPN postseason weeks: 1 = early bowls, 2-3 = bowl season + CFP first round, 4 = CFP QF/SF, 5 = Championship
  // We map to: week 17 = Bowls, week 18 = CFP Quarterfinals, week 19 = CFP Semifinals, week 20 = Championship
  for (let week = 1; week <= 5; week++) {
    try {
      console.log(`Fetching postseason week ${week} games...`)
      const games = await fetchScoreboard(year, week, 3)
      // Map postseason week 1 to our week 17 (Bowls), etc.
      const targetWeek = 16 + week
      const weekResult = await syncWeekGames(
        supabase, season.id, targetWeek, games, schoolMap, schoolConferenceMap, schoolLogoMap, 3
      )
      results.push({ week: targetWeek, seasonType: 3, ...weekResult })

      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.warn(`Postseason week ${week} games not available:`, err)
    }
  }

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0)
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

  return NextResponse.json({
    success: true,
    summary: {
      year,
      weeksProcessed: results.length,
      totalSynced,
      totalSkipped,
    },
    weeklyResults: results,
  })
}

/**
 * Sync games for a single week
 */
async function syncWeekGames(
  supabase: ReturnType<typeof createAdminClient>,
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

    // Skip games where NEITHER team is FBS
    if (!homeSchoolId && !awaySchoolId) {
      skipped++
      continue
    }

    // Determine if this is a conference game
    const homeConference = homeSchoolId ? schoolConferenceMap.get(homeSchoolId) : null
    const awayConference = awaySchoolId ? schoolConferenceMap.get(awaySchoolId) : null
    const isConferenceGame = !!(homeConference && awayConference &&
      homeConference === awayConference &&
      homeConference !== 'Independent')

    // Determine game status
    let status = 'scheduled'
    if (competition.status.type.state === 'in') {
      status = 'live'
    } else if (competition.status.type.state === 'post') {
      status = 'completed'
    }

    // Parse game date
    const gameDate = new Date(game.date)
    const gameDateStr = gameDate.toISOString().split('T')[0]
    const gameTimeStr = gameDate.toTimeString().slice(0, 8)

    // Extract bowl name from ESPN notes (actual bowl/game name)
    const espnNotes = competition.notes as Array<{ headline?: string }> | undefined
    const bowlName = seasonType === 3 ? (espnNotes?.[0]?.headline || null) : null
    const playoffRound = seasonType === 3 ? determinePlayoffRound(bowlName || '') : null

    const { error } = await supabase
      .from('games')
      .upsert(
        {
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
          quarter: status === 'live' ? String(competition.status.period) : null,
          clock: status === 'live' ? competition.status.displayClock : null,
          is_playoff_game: playoffRound !== null,
          is_conference_game: isConferenceGame,
          bowl_name: bowlName,
          playoff_round: playoffRound,
          home_team_name: homeCompetitor.team.displayName,
          home_team_logo_url: homeSchoolId ? schoolLogoMap.get(homeSchoolId) || null : null,
          away_team_name: awayCompetitor.team.displayName,
          away_team_logo_url: awaySchoolId ? schoolLogoMap.get(awaySchoolId) || null : null,
        },
        { onConflict: 'season_id,external_game_id' }
      )

    if (error) {
      skipped++
    } else {
      synced++
    }
  }

  return { synced, skipped }
}
