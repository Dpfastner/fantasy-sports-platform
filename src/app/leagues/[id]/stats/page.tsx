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
    .eq('status', 'final')

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

  // Fetch stats from API for ideal team
  let statsData = null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/leagues/${leagueId}/stats`, {
      cache: 'no-store',
    })
    if (response.ok) {
      statsData = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }

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
