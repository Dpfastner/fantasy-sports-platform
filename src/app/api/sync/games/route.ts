import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchScoreboard, ESPNGame, getTeamLogoUrl } from '@/lib/api/espn'

// Create admin client lazily at runtime (not build time)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(url, key)
}

interface SyncGameRequest {
  year?: number
  week?: number
  seasonType?: number // 2 = regular, 3 = postseason
}

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: SyncGameRequest = await request.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()
    const week = body.week || 1
    const seasonType = body.seasonType || 2

    console.log(`Fetching games for ${year} week ${week}...`)

    // Fetch games from ESPN
    const games = await fetchScoreboard(year, week, seasonType)
    console.log(`Found ${games.length} games`)

    // Get season ID from our database
    const { data: season } = await getSupabaseAdmin()
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

    // Get school mappings (ESPN ID -> our school ID)
    const { data: schools } = await getSupabaseAdmin()
      .from('schools')
      .select('id, external_api_id')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
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
      const homeTeamName = homeCompetitor.team.displayName
      const homeTeamLogoUrl = getTeamLogoUrl(homeCompetitor.team)
      const awayTeamName = awayCompetitor.team.displayName
      const awayTeamLogoUrl = getTeamLogoUrl(awayCompetitor.team)

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

      // Upsert the game (using correct column names from schema)
      const { error: upsertError } = await getSupabaseAdmin()
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
            possession_team_id: competition.situation?.possession
              ? schoolMap.get(competition.situation.possession) || null
              : null,
            is_playoff_game: seasonType === 3,
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
    usage: 'POST with { year, week, seasonType } and Authorization: Bearer <SYNC_API_KEY>',
    example: { year: 2024, week: 1, seasonType: 2 },
  })
}
