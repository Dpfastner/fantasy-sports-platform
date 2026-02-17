import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { getCurrentWeek } from '@/lib/week'
import { getEnvironment } from '@/lib/env'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}

export default async function SchedulePage({ params, searchParams }: PageProps) {
  const { id: leagueId } = await params
  const { week: weekParam } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for header
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Get league with season
  const { data: league } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      season_id,
      seasons (year, name)
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

  // Get user's roster school IDs
  const { data: userTeam } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  let rosterSchoolIds: string[] = []
  if (userTeam) {
    const { data: rosterData } = await supabase
      .from('roster_periods')
      .select('school_id')
      .eq('fantasy_team_id', userTeam.id)
      .is('end_week', null)

    rosterSchoolIds = rosterData?.map(r => r.school_id) || []
  }

  const seasons = league.seasons as { year: number; name: string } | { year: number; name: string }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
  const seasonName = Array.isArray(seasons) ? seasons[0]?.name : seasons?.name || `${year} Season`

  // Calculate current week (with sandbox override support)
  const currentWeek = await getCurrentWeek(year)
  const environment = getEnvironment()

  // Determine if selection is a category or week number
  const isCategory = weekParam && ['bowls', 'cfp', 'natty'].includes(weekParam)
  const selectedWeek = isCategory ? weekParam : (weekParam ? parseInt(weekParam) : currentWeek)

  // Get weeks that have games
  const { data: weeksWithGamesData } = await supabase
    .from('games')
    .select('week_number')
    .eq('season_id', league.season_id)

  const weeksWithGames = [...new Set(weeksWithGamesData?.map(g => g.week_number) || [])].sort((a, b) => a - b)

  // Get games based on selection (week number or category)
  let gamesQuery = supabase
    .from('games')
    .select('*')
    .eq('season_id', league.season_id)

  if (isCategory) {
    if (weekParam === 'bowls') {
      // All postseason games (week 17+)
      gamesQuery = gamesQuery.gte('week_number', 17)
    } else if (weekParam === 'cfp') {
      // Only CFP games (where is_playoff_game is true)
      gamesQuery = gamesQuery.eq('is_playoff_game', true)
    } else if (weekParam === 'natty') {
      // Only championship game
      gamesQuery = gamesQuery.eq('playoff_round', 'championship')
    }
  } else {
    // Regular week selection
    gamesQuery = gamesQuery.eq('week_number', selectedWeek)
  }

  const { data: games } = await gamesQuery
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })

  return (
    <>
      <ScheduleClient
        leagueId={leagueId}
        leagueName={league.name}
        seasonId={league.season_id}
        seasonName={seasonName}
        year={year}
        currentWeek={currentWeek}
        selectedWeek={selectedWeek}
        initialGames={games || []}
        rosterSchoolIds={rosterSchoolIds}
        weeksWithGames={weeksWithGames}
        userName={profile?.display_name}
        userEmail={user.email}
      />
      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </>
  )
}
