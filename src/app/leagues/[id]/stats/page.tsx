import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatsClient from './StatsClient'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}

interface SchoolRecord {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  wins: number
  losses: number
  confWins: number
  confLosses: number
}

interface ConferenceStanding {
  conference: string
  schools: SchoolRecord[]
  totalWins: number
  totalLosses: number
}

export default async function StatsPage({ params, searchParams }: PageProps) {
  const { id: leagueId } = await params
  const { week: weekParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get league with season
  const { data: league } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      season_id,
      seasons (year, name),
      league_settings (schools_per_team)
    `)
    .eq('id', leagueId)
    .single()

  if (!league) {
    notFound()
  }

  // Check membership
  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  const seasons = league.seasons as { year: number; name: string } | { year: number; name: string }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
  const seasonName = Array.isArray(seasons) ? seasons[0]?.name : seasons?.name || `${year} Season`
  const seasonStart = new Date(year, 7, 24)
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = Math.max(1, Math.min(weeksDiff + 1, 15))
  const selectedWeek = weekParam ? parseInt(weekParam) : currentWeek

  const settings = Array.isArray(league.league_settings)
    ? league.league_settings[0]
    : league.league_settings
  const schoolsPerTeam = settings?.schools_per_team || 12

  // Get all schools
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, abbreviation, logo_url, conference')
    .eq('is_active', true)

  // Get all completed games for record calculation
  const { data: games } = await supabase
    .from('games')
    .select('home_school_id, away_school_id, home_score, away_score, is_conference_game, status')
    .eq('season_id', league.season_id)
    .eq('status', 'completed')

  // Calculate W-L records for each school
  const schoolRecords = new Map<string, { wins: number; losses: number; confWins: number; confLosses: number }>()

  for (const game of games || []) {
    if (game.home_score === null || game.away_score === null) continue

    const homeWon = game.home_score > game.away_score

    // Home team
    const homeRecord = schoolRecords.get(game.home_school_id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
    if (homeWon) {
      homeRecord.wins++
      if (game.is_conference_game) homeRecord.confWins++
    } else {
      homeRecord.losses++
      if (game.is_conference_game) homeRecord.confLosses++
    }
    schoolRecords.set(game.home_school_id, homeRecord)

    // Away team
    const awayRecord = schoolRecords.get(game.away_school_id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
    if (!homeWon) {
      awayRecord.wins++
      if (game.is_conference_game) awayRecord.confWins++
    } else {
      awayRecord.losses++
      if (game.is_conference_game) awayRecord.confLosses++
    }
    schoolRecords.set(game.away_school_id, awayRecord)
  }

  // Build conference standings
  const conferenceMap = new Map<string, SchoolRecord[]>()

  for (const school of schools || []) {
    const record = schoolRecords.get(school.id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
    const schoolData: SchoolRecord = {
      id: school.id,
      name: school.name,
      abbreviation: school.abbreviation,
      logo_url: school.logo_url,
      conference: school.conference,
      wins: record.wins,
      losses: record.losses,
      confWins: record.confWins,
      confLosses: record.confLosses,
    }

    const conf = school.conference || 'Independent'
    if (!conferenceMap.has(conf)) {
      conferenceMap.set(conf, [])
    }
    conferenceMap.get(conf)!.push(schoolData)
  }

  // Sort schools within each conference by conference record, then overall record
  const conferenceStandings: ConferenceStanding[] = []
  for (const [conference, confSchools] of conferenceMap) {
    confSchools.sort((a, b) => {
      // Sort by conference win %, then overall win %
      const aConfPct = a.confWins + a.confLosses > 0 ? a.confWins / (a.confWins + a.confLosses) : 0
      const bConfPct = b.confWins + b.confLosses > 0 ? b.confWins / (b.confWins + b.confLosses) : 0
      if (bConfPct !== aConfPct) return bConfPct - aConfPct

      const aOverallPct = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0
      const bOverallPct = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0
      return bOverallPct - aOverallPct
    })

    conferenceStandings.push({
      conference,
      schools: confSchools,
      totalWins: confSchools.reduce((sum, s) => sum + s.wins, 0),
      totalLosses: confSchools.reduce((sum, s) => sum + s.losses, 0),
    })
  }

  // Sort conferences by total wins
  conferenceStandings.sort((a, b) => b.totalWins - a.totalWins)

  // Fetch AP Rankings for selected week
  const { data: apRankings } = await supabase
    .from('ap_rankings_history')
    .select(`
      school_id,
      week_number,
      rank,
      previous_rank,
      schools (name, logo_url, conference)
    `)
    .eq('season_id', league.season_id)
    .eq('week_number', selectedWeek)
    .order('rank', { ascending: true })
    .limit(25)

  // Get available weeks for AP rankings
  const { data: availableWeeks } = await supabase
    .from('ap_rankings_history')
    .select('week_number')
    .eq('season_id', league.season_id)
    .order('week_number', { ascending: true })

  const uniqueWeeks = [...new Set(availableWeeks?.map(w => w.week_number) || [])]

  // Fetch Heisman winner for this season
  const { data: heismanWinner } = await supabase
    .from('heisman_winners')
    .select(`
      id,
      school_id,
      player_name,
      awarded_at,
      schools (name, logo_url)
    `)
    .eq('season_id', league.season_id)
    .single()

  // Fetch school weekly points directly for ideal team calculation
  const { data: schoolPoints } = await supabase
    .from('school_weekly_points')
    .select('school_id, week_number, total_points')
    .eq('season_id', league.season_id)

  // Calculate total points per school
  const schoolTotals = new Map<string, { points: number; weeks: number }>()
  for (const sp of schoolPoints || []) {
    const current = schoolTotals.get(sp.school_id) || { points: 0, weeks: 0 }
    schoolTotals.set(sp.school_id, {
      points: current.points + Number(sp.total_points),
      weeks: current.weeks + 1,
    })
  }

  // Create schools map for lookup
  const schoolsMap = new Map(schools?.map(s => [s.id, s]) || [])

  // Build school stats array sorted by total points
  const schoolStats: Array<{
    id: string
    name: string
    abbreviation: string | null
    logo_url: string | null
    conference: string
    total_points: number
    weeks_with_points: number
  }> = []

  for (const [schoolId, stats] of schoolTotals) {
    const school = schoolsMap.get(schoolId)
    if (school) {
      schoolStats.push({
        id: schoolId,
        name: school.name,
        abbreviation: school.abbreviation,
        logo_url: school.logo_url,
        conference: school.conference,
        total_points: stats.points,
        weeks_with_points: stats.weeks,
      })
    }
  }
  schoolStats.sort((a, b) => b.total_points - a.total_points)

  // Ideal team is top N schools
  const idealTeam = schoolStats.slice(0, schoolsPerTeam)
  const idealTeamPoints = idealTeam.reduce((sum, s) => sum + s.total_points, 0)

  // Calculate weekly max points
  const weeklyMaxPoints: Array<{
    week: number
    maxPoints: number
    topSchools: Array<{ id: string; name: string; points: number }>
  }> = []

  const weeks = [...new Set(schoolPoints?.map(p => p.week_number) || [])].sort((a, b) => a - b)

  for (const week of weeks) {
    const weekPoints = new Map<string, number>()
    for (const sp of schoolPoints || []) {
      if (sp.week_number === week) {
        weekPoints.set(sp.school_id, Number(sp.total_points))
      }
    }

    const topSchools = [...weekPoints.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, schoolsPerTeam)
      .map(([id, points]) => ({
        id,
        name: schoolsMap.get(id)?.name || 'Unknown',
        points,
      }))

    weeklyMaxPoints.push({
      week,
      maxPoints: topSchools.reduce((sum, s) => sum + s.points, 0),
      topSchools,
    })
  }

  // Build statsData object
  const statsData = schoolPoints && schoolPoints.length > 0 ? {
    idealTeam: {
      schools: idealTeam,
      totalPoints: idealTeamPoints,
    },
    currentWeekMax: {
      week: currentWeek,
      maxPoints: weeklyMaxPoints.find(w => w.week === currentWeek)?.maxPoints || 0,
      topSchools: weeklyMaxPoints.find(w => w.week === currentWeek)?.topSchools || [],
    },
    weeklyMaxPoints,
  } : null

  return (
    <StatsClient
      leagueId={leagueId}
      leagueName={league.name}
      seasonName={seasonName}
      year={year}
      currentWeek={currentWeek}
      selectedWeek={selectedWeek}
      availableWeeks={uniqueWeeks}
      schoolsPerTeam={schoolsPerTeam}
      conferenceStandings={conferenceStandings}
      apRankings={apRankings}
      heismanWinner={heismanWinner}
      statsData={statsData}
    />
  )
}
