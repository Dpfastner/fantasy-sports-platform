import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchScoreboard, fetchRankings, getTeamLogoUrl } from '@/lib/api/espn'
import { calculateAllPoints } from '@/lib/points/calculator'
import { areCronsEnabled, getEnvironment } from '@/lib/env'
import { calculateCurrentWeek, WEEK_CHAMPIONSHIP } from '@/lib/constants/season'
import { archiveLeagueSeason } from '@/lib/archive-season'
import { createNotification } from '@/lib/notifications'

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
      preSeasonReminder: { checked: false, notified: 0, error: null as string | null },
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

    // AUTO-ARCHIVE: 3 days after all National Championship games complete,
    // automatically archive all leagues that haven't been archived yet.
    // We check the actual games table instead of computing dates from week numbers,
    // because week numbers are scoring periods that don't map 1:1 to calendar weeks
    // (e.g. Heisman is week 22 but happens in December, before the January championship).
    try {
      // Check if all Championship week games are completed
      const { data: champGames } = await supabase
        .from('games')
        .select('status, game_date')
        .eq('season_id', season.id)
        .eq('week_number', WEEK_CHAMPIONSHIP)

      const hasChampGames = champGames && champGames.length > 0
      const allCompleted = hasChampGames && champGames.every(g => g.status === 'completed')

      if (allCompleted) {
        // Find the latest game date and add 3 days
        const latestGameDate = champGames.reduce((latest, g) => {
          const d = new Date(g.game_date)
          return d > latest ? d : latest
        }, new Date(0))
        const autoArchiveDate = new Date(latestGameDate.getTime() + 3 * 24 * 60 * 60 * 1000)

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
      }
    } catch (error) {
      results.autoArchive.error = String(error)
    }

    // PRE-SEASON REMINDER: Notify commissioners of dormant leagues
    // when the next season for their sport starts within 30 days.
    try {
      // Find all dormant leagues
      const { data: dormantLeagues } = await supabase
        .from('leagues')
        .select('id, name, sport_id')
        .eq('status', 'dormant')

      if (dormantLeagues && dormantLeagues.length > 0) {
        // Get all upcoming seasons that start within 30 days
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        const { data: upcomingSeasons } = await supabase
          .from('seasons')
          .select('id, sport_id, name, start_date')
          .gt('start_date', now.toISOString().split('T')[0])
          .lte('start_date', thirtyDaysFromNow.toISOString().split('T')[0])

        if (upcomingSeasons && upcomingSeasons.length > 0) {
          const seasonBySport = new Map<string, { name: string; start_date: string }>()
          for (const s of upcomingSeasons) {
            seasonBySport.set(s.sport_id, { name: s.name, start_date: s.start_date })
          }

          for (const league of dormantLeagues) {
            const upcoming = seasonBySport.get(league.sport_id)
            if (!upcoming) continue

            // Check if we already sent a reminder for this league (avoid spamming daily)
            const { data: existingNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('league_id', league.id)
              .eq('type', 'system')
              .like('title', 'New Season Approaching%')
              .limit(1)
              .single()

            if (existingNotification) continue

            // Get commissioners
            const { data: commissioners } = await supabase
              .from('league_members')
              .select('user_id')
              .eq('league_id', league.id)
              .in('role', ['commissioner', 'co_commissioner'])

            for (const commish of commissioners || []) {
              createNotification({
                userId: commish.user_id,
                leagueId: league.id,
                type: 'system',
                title: 'New Season Approaching',
                body: `Your league "${league.name}" is dormant. The ${upcoming.name} season starts on ${new Date(upcoming.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Reactivate now to get your draft set up!`,
                data: { leagueId: league.id },
              })
              results.preSeasonReminder.notified++
            }
          }
        }
      }
      results.preSeasonReminder.checked = true
    } catch (error) {
      results.preSeasonReminder.error = String(error)
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
