import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchScoreboard } from '@/lib/api/espn'

// Create admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

// Verify the request is from Vercel Cron
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false
  }

  return true
}

export async function GET(request: Request) {
  try {
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const year = new Date().getFullYear()

    // Get current season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json({
        error: `Season ${year} not found`,
        skipped: true,
      })
    }

    // Check if there are any games currently in progress or scheduled for today
    const today = new Date().toISOString().split('T')[0]
    const { data: todaysGames } = await supabase
      .from('games')
      .select('id, status')
      .eq('season_id', season.id)
      .eq('game_date', today)

    const hasActiveGames = todaysGames?.some(
      g => g.status === 'live' || g.status === 'scheduled'
    )

    if (!hasActiveGames && todaysGames && todaysGames.length > 0) {
      // All games for today are complete, skip sync
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'All games for today are complete',
        timestamp: new Date().toISOString(),
      })
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

    // Calculate current week
    const currentDate = new Date()
    const seasonStart = new Date(year, 7, 24)
    const weeksDiff = Math.floor((currentDate.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const currentWeek = Math.max(0, Math.min(weeksDiff + 1, 15))

    // Fetch live scores from ESPN
    const games = await fetchScoreboard(year, currentWeek, 2)

    let updatedCount = 0
    let inProgressCount = 0
    let completedCount = 0
    const scoreUpdates: Array<{
      game: string
      homeScore: number
      awayScore: number
      status: string
      quarter?: string
      clock?: string
    }> = []

    for (const game of games) {
      const competition = game.competitions?.[0]
      if (!competition) continue

      const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
      const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

      if (!homeCompetitor || !awayCompetitor) continue

      const homeSchoolId = schoolMap.get(homeCompetitor.team.id)
      const awaySchoolId = schoolMap.get(awayCompetitor.team.id)

      // Skip only if NEITHER team is FBS (need at least one to update)
      if (!homeSchoolId && !awaySchoolId) continue

      let status = 'scheduled'
      if (competition.status.type.state === 'in') {
        status = 'live'
        inProgressCount++
      } else if (competition.status.type.state === 'post') {
        status = 'completed'
        completedCount++
      }

      // Only update games that are in progress or just completed
      if (status === 'scheduled') continue

      const homeScore = parseInt(homeCompetitor.score) || 0
      const awayScore = parseInt(awayCompetitor.score) || 0

      const { error: updateError } = await supabase
        .from('games')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: status,
          quarter: status === 'live' ? String(competition.status.period) : null,
          clock: status === 'live' ? competition.status.displayClock : null,
          possession_team_id: competition.situation?.possession
            ? schoolMap.get(competition.situation.possession) || null
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('external_game_id', game.id)
        .eq('season_id', season.id)

      if (!updateError) {
        updatedCount++
        scoreUpdates.push({
          game: game.shortName,
          homeScore,
          awayScore,
          status,
          quarter: competition.status.period?.toString(),
          clock: competition.status.displayClock,
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      year,
      currentWeek,
      summary: {
        gamesChecked: games.length,
        gamesUpdated: updatedCount,
        inProgress: inProgressCount,
        completed: completedCount,
      },
      scoreUpdates,
    })
  } catch (error) {
    console.error('Gameday sync cron error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
