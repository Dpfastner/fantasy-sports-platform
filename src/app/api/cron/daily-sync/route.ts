import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchScoreboard, fetchRankings, getTeamLogoUrl } from '@/lib/api/espn'
import { calculateAllPoints } from '@/lib/points/calculator'
import { areCronsEnabled, getEnvironment } from '@/lib/env'
import { calculateCurrentWeek, getSeasonStartDate, WEEK_CHAMPIONSHIP } from '@/lib/constants/season'
import { archiveLeagueSeason } from '@/lib/archive-season'

// Verify the request is from Vercel Cron
function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Fail closed: reject if CRON_SECRET is not set or doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

    const supabase = createAdminClient()
    const now = new Date()
    const year = now.getFullYear()
    const results = {
      rankings: { success: false, error: null as string | null },
      currentWeekGames: { success: false, synced: 0, error: null as string | null },
      failsafe: { checked: false, weeksRecalculated: [] as number[], error: null as string | null },
      autoArchive: { checked: false, archived: [] as string[], error: null as string | null },
    }

    // Get current season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json({
        error: `Season ${year} not found`,
        results,
      })
    }

    // Get school mappings
    const { data: schools } = await supabase
      .from('schools')
      .select('id, external_api_id, name')
      .not('external_api_id', 'is', null)

    const schoolMap = new Map<string, string>()
    const schoolNameMap = new Map<string, string>()
    for (const school of schools || []) {
      if (school.external_api_id) {
        schoolMap.set(school.external_api_id, school.id)
        schoolNameMap.set(school.id, school.name)
      }
    }

    // Calculate current week
    const currentWeek = calculateCurrentWeek(year, now.getTime())

    // Sync Rankings
    try {
      const rankingsData = await fetchRankings(year)
      const apPoll = rankingsData.rankings?.find(
        r => r.name.toLowerCase().includes('ap') || r.type === 'ap'
      )

      if (apPoll && apPoll.ranks) {
        // Clear existing rankings for current week
        await supabase
          .from('ap_rankings_history')
          .delete()
          .eq('season_id', season.id)
          .eq('week_number', currentWeek)

        // Insert new rankings
        for (const rankedTeam of apPoll.ranks) {
          const espnId = rankedTeam.team?.id
          const schoolId = espnId ? schoolMap.get(espnId) : null

          if (schoolId) {
            await supabase
              .from('ap_rankings_history')
              .insert({
                season_id: season.id,
                week_number: currentWeek,
                school_id: schoolId,
                rank: rankedTeam.current,
              })
          }
        }
        results.rankings.success = true
      }
    } catch (error) {
      results.rankings.error = String(error)
    }

    // Sync Current Week Games
    try {
      const games = await fetchScoreboard(year, currentWeek, 2)
      let syncedCount = 0

      for (const game of games) {
        const competition = game.competitions?.[0]
        if (!competition) continue

        const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home')
        const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away')

        if (!homeCompetitor || !awayCompetitor) continue

        const homeSchoolId = schoolMap.get(homeCompetitor.team.id)
        const awaySchoolId = schoolMap.get(awayCompetitor.team.id)

        // Skip only if NEITHER team is FBS
        if (!homeSchoolId && !awaySchoolId) continue

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

        const { error: upsertError } = await supabase
          .from('games')
          .upsert(
            {
              external_game_id: game.id,
              season_id: season.id,
              week_number: currentWeek,
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
              home_team_name: homeTeamName,
              home_team_logo_url: homeTeamLogoUrl,
              away_team_name: awayTeamName,
              away_team_logo_url: awayTeamLogoUrl,
            },
            { onConflict: 'season_id,external_game_id' }
          )

        if (!upsertError) {
          syncedCount++
        }
      }

      results.currentWeekGames.success = true
      results.currentWeekGames.synced = syncedCount
    } catch (error) {
      results.currentWeekGames.error = String(error)
    }

    // FAILSAFE: Check for any completed games from recent days that might have missed points calculation
    // This catches any games that completed while gameday-sync was down or had errors
    try {
      // Get yesterday's date and 2 days ago
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(now)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

      // Find completed games from recent days
      const { data: recentCompletedGames } = await supabase
        .from('games')
        .select('week_number')
        .eq('season_id', season.id)
        .eq('status', 'completed')
        .gte('game_date', twoDaysAgoStr)
        .lte('game_date', yesterdayStr)

      if (recentCompletedGames && recentCompletedGames.length > 0) {
        // Get unique weeks that had completed games
        const weeksToRecalculate = [...new Set(recentCompletedGames.map(g => g.week_number))]

        for (const week of weeksToRecalculate) {
          await calculateAllPoints(season.id, week, supabase)
          results.failsafe.weeksRecalculated.push(week)
        }
      }
      results.failsafe.checked = true
    } catch (error) {
      results.failsafe.error = String(error)
    }

    // Calculate points for the current week
    let pointsResult = null
    if (results.currentWeekGames.success && results.currentWeekGames.synced > 0) {
      pointsResult = await calculateAllPoints(season.id, currentWeek, supabase)
    }

    // AUTO-ARCHIVE: 3 days after the National Championship (week 21),
    // automatically archive all leagues that haven't been archived yet
    try {
      const seasonStart = getSeasonStartDate(year)
      // Week 21 (Championship) starts at seasonStart + 21 weeks, ends +1 week later
      const championshipWeekEnd = new Date(seasonStart.getTime() + (WEEK_CHAMPIONSHIP + 1) * 7 * 24 * 60 * 60 * 1000)
      const autoArchiveDate = new Date(championshipWeekEnd.getTime() + 3 * 24 * 60 * 60 * 1000)

      if (now >= autoArchiveDate) {
        // Find all leagues in this season that haven't been archived yet
        const { data: leagues } = await supabase
          .from('leagues')
          .select('id, season_id')
          .eq('season_id', season.id)

        for (const league of leagues || []) {
          // Check if already archived
          const { data: existing } = await supabase
            .from('league_seasons')
            .select('id')
            .eq('league_id', league.id)
            .eq('season_year', year)
            .single()

          if (!existing) {
            try {
              await archiveLeagueSeason(supabase, league.id)
              results.autoArchive.archived.push(league.id)
            } catch (archiveErr) {
              const msg = archiveErr instanceof Error ? archiveErr.message : String(archiveErr)
              if (msg !== 'ALREADY_ARCHIVED') {
                console.error(`Auto-archive failed for league ${league.id}:`, msg)
              }
            }
          }
        }
        results.autoArchive.checked = true
      }
    } catch (error) {
      results.autoArchive.error = String(error)
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      year,
      currentWeek,
      results,
      pointsCalculation: pointsResult,
    })
  } catch (error) {
    console.error('Daily sync cron error:', error)
    Sentry.captureException(error, { tags: { cron: 'daily-sync' } })
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
