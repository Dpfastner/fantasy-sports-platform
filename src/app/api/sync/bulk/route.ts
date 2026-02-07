import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchScoreboard, ESPNGame, getTeamLogoUrl } from '@/lib/api/espn'

// Create admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

interface BulkSyncRequest {
  year?: number
  startWeek?: number
  endWeek?: number
  includePostseason?: boolean
}

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BulkSyncRequest = await request.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()
    const startWeek = body.startWeek || 0
    const endWeek = body.endWeek || 15
    const includePostseason = body.includePostseason !== false

    const supabase = getSupabaseAdmin()

    // Get season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: `Season ${year} not found` },
        { status: 404 }
      )
    }

    // Get school mappings
    const { data: schools } = await supabase
      .from('schools')
      .select('id, external_api_id')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
      }
    }

    const weekResults: Array<{
      week: number
      seasonType: string
      gamesFound: number
      gamesSynced: number
      gamesSkipped: number
    }> = []

    // Sync regular season weeks
    for (let week = startWeek; week <= endWeek; week++) {
      console.log(`Syncing week ${week}...`)

      try {
        const games = await fetchScoreboard(year, week, 2) // Regular season
        const result = await syncGames(supabase, games, season.id, week, schoolMap, false)
        weekResults.push({
          week,
          seasonType: 'regular',
          gamesFound: games.length,
          gamesSynced: result.synced,
          gamesSkipped: result.skipped,
        })
      } catch (error) {
        console.error(`Error syncing week ${week}:`, error)
        weekResults.push({
          week,
          seasonType: 'regular',
          gamesFound: 0,
          gamesSynced: 0,
          gamesSkipped: 0,
        })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Sync postseason if requested
    if (includePostseason) {
      console.log('Syncing postseason...')

      // Postseason weeks: 1 = bowl games, etc.
      for (let week = 1; week <= 5; week++) {
        try {
          const games = await fetchScoreboard(year, week, 3) // Postseason

          if (games.length > 0) {
            const result = await syncGames(supabase, games, season.id, 16 + week, schoolMap, true)
            weekResults.push({
              week: 16 + week,
              seasonType: 'postseason',
              gamesFound: games.length,
              gamesSynced: result.synced,
              gamesSkipped: result.skipped,
            })
          }
        } catch (error) {
          console.error(`Error syncing postseason week ${week}:`, error)
        }

        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const totalSynced = weekResults.reduce((sum, r) => sum + r.gamesSynced, 0)
    const totalSkipped = weekResults.reduce((sum, r) => sum + r.gamesSkipped, 0)
    const totalFound = weekResults.reduce((sum, r) => sum + r.gamesFound, 0)

    return NextResponse.json({
      success: true,
      summary: {
        year,
        weeksProcessed: weekResults.length,
        totalGamesFound: totalFound,
        totalGamesSynced: totalSynced,
        totalGamesSkipped: totalSkipped,
      },
      weekResults,
    })
  } catch (error) {
    console.error('Bulk sync error:', error)
    return NextResponse.json(
      { error: 'Bulk sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

async function syncGames(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  games: ESPNGame[],
  seasonId: string,
  weekNumber: number,
  schoolMap: Map<string, string>,
  isPlayoffGame: boolean
): Promise<{ synced: number; skipped: number }> {
  let synced = 0
  let skipped = 0

  for (const game of games) {
    const competition = game.competitions?.[0]
    if (!competition) {
      skipped++
      continue
    }

    const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
    const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

    if (!homeCompetitor || !awayCompetitor) {
      skipped++
      continue
    }

    const homeSchoolId = schoolMap.get(homeCompetitor.team.id)
    const awaySchoolId = schoolMap.get(awayCompetitor.team.id)

    // Skip only if NEITHER team is FBS (need at least one)
    if (!homeSchoolId && !awaySchoolId) {
      skipped++
      continue
    }

    // Always store both teams' display info for easy UI rendering
    const homeTeamName = homeCompetitor.team.displayName
    const homeTeamLogoUrl = getTeamLogoUrl(homeCompetitor.team)
    const awayTeamName = awayCompetitor.team.displayName
    const awayTeamLogoUrl = getTeamLogoUrl(awayCompetitor.team)

    let status = 'scheduled'
    if (competition.status.type.state === 'in') {
      status = 'live'
    } else if (competition.status.type.state === 'post') {
      status = 'completed'
    }

    const gameDate = new Date(game.date)
    const gameDateStr = gameDate.toISOString().split('T')[0]
    const gameTimeStr = gameDate.toTimeString().slice(0, 8)

    // Check if this is a bowl game based on the game name
    const gameName = game.name?.toLowerCase() || ''
    const isBowlGame = gameName.includes('bowl') || gameName.includes('championship')

    // Detect playoff round from game name
    let playoffRound: string | null = null
    if (gameName.includes('championship')) {
      playoffRound = 'championship'
    } else if (gameName.includes('semifinal') || gameName.includes('semi-final')) {
      playoffRound = 'semifinal'
    } else if (gameName.includes('quarterfinal') || gameName.includes('quarter-final')) {
      playoffRound = 'quarterfinal'
    } else if (gameName.includes('first round') || gameName.includes('playoff')) {
      playoffRound = 'first_round'
    }

    const { error: upsertError } = await supabase
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
          is_playoff_game: isPlayoffGame || playoffRound !== null,
          is_bowl_game: isBowlGame,
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
      skipped++
    } else {
      synced++
    }
  }

  return { synced, skipped }
}

export async function GET() {
  return NextResponse.json({
    message: 'Bulk game sync endpoint',
    usage: 'POST with { year, startWeek, endWeek, includePostseason } and Authorization: Bearer <SYNC_API_KEY>',
    example: { year: 2024, startWeek: 0, endWeek: 15, includePostseason: true },
  })
}
