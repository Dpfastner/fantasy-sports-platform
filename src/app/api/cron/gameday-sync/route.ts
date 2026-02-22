import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchScoreboard } from '@/lib/api/espn'
import { calculateAllPoints } from '@/lib/points/calculator'
import { areCronsEnabled, getEnvironment } from '@/lib/env'

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

    // Skip cron jobs in non-production environments
    if (!areCronsEnabled()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Crons disabled in ${getEnvironment()} environment`,
        timestamp: new Date().toISOString(),
      })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()
    const year = now.getFullYear()

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

    // Check if there are any games today and if we're within the game window
    const today = now.toISOString().split('T')[0]
    const { data: todaysGames } = await supabase
      .from('games')
      .select('id, status, game_time')
      .eq('season_id', season.id)
      .eq('game_date', today)
      .order('game_time', { ascending: true })

    // Hawaii exception: check for games from yesterday still in progress
    // (late games like Hawaii 8pm ET can end after midnight)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const { data: lateGames } = await supabase
      .from('games')
      .select('id, status, game_time')
      .eq('season_id', season.id)
      .eq('game_date', yesterdayStr)
      .eq('status', 'live')

    const allRelevantGames = [
      ...(todaysGames || []),
      ...(lateGames || []),
    ]

    // No games today and no carryover live games - skip
    if (allRelevantGames.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No games scheduled for today',
        timestamp: now.toISOString(),
      })
    }

    // All games complete - skip
    const hasActiveGames = allRelevantGames.some(
      g => g.status === 'live' || g.status === 'scheduled'
    )

    if (!hasActiveGames) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'All games for today are complete',
        timestamp: now.toISOString(),
      })
    }

    // If there are carryover live games from yesterday, skip the window check
    // (we need to keep fetching until they complete)
    const hasLateGames = (lateGames?.length || 0) > 0

    // Check if we're within the game window
    // Window: 30 min before first game to 4 hours after last game starts
    const gameTimes = (todaysGames || [])
      .filter(g => g.game_time)
      .map(g => g.game_time as string)
      .sort()

    if (gameTimes.length > 0 && !hasLateGames) {
      const firstGameTime = gameTimes[0]
      const lastGameTime = gameTimes[gameTimes.length - 1]

      // Parse times (format: HH:MM:SS)
      const [firstHour, firstMin] = firstGameTime.split(':').map(Number)
      const [lastHour, lastMin] = lastGameTime.split(':').map(Number)

      // Create date objects for comparison (using today's date)
      const windowStart = new Date(now)
      windowStart.setHours(firstHour, firstMin - 30, 0, 0) // 30 min before first game

      const windowEnd = new Date(now)
      windowEnd.setHours(lastHour + 4, lastMin, 0, 0) // 4 hours after last game starts

      // Check if current time is outside the window
      if (now < windowStart || now > windowEnd) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: `Outside game window (${windowStart.toLocaleTimeString()} - ${windowEnd.toLocaleTimeString()})`,
          nextCheck: now < windowStart ? windowStart.toISOString() : 'tomorrow',
          timestamp: now.toISOString(),
        })
      }
    }

    // We're in the game window - proceed with sync
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

    // Calculate current week (extends to week 20 for postseason/bowls)
    const seasonStart = new Date(Date.UTC(year, 7, 24)) // August 24 UTC
    const weeksDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const currentWeek = Math.max(0, Math.min(weeksDiff + 1, 22)) // Week 0-22 (through Heisman)

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
          updated_at: now.toISOString(),
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

    // Calculate points for completed games
    let pointsResult = null
    if (completedCount > 0) {
      pointsResult = await calculateAllPoints(season.id, currentWeek, supabase)
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      year,
      currentWeek,
      summary: {
        gamesChecked: games.length,
        gamesUpdated: updatedCount,
        inProgress: inProgressCount,
        completed: completedCount,
      },
      scoreUpdates,
      pointsCalculation: pointsResult,
    })
  } catch (error) {
    console.error('Gameday sync cron error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
