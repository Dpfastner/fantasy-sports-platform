import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'

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

  // Calculate current week
  const seasonStart = new Date(year, 7, 24)
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = Math.max(1, Math.min(weeksDiff + 1, 15))
  const selectedWeek = weekParam ? parseInt(weekParam) : currentWeek

  // Get games for selected week
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', league.season_id)
    .eq('week_number', selectedWeek)
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })

  return (
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
    />
  )
}
