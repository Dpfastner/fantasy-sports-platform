import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from '@/components/LeaderboardClient'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { getCurrentWeek } from '@/lib/week'
import { getEnvironment } from '@/lib/env'

interface PageProps {
  params: Promise<{ id: string }>
}

interface TeamData {
  id: string
  name: string
  user_id: string
  total_points: number
  high_points_winnings: number
  primary_color: string
  secondary_color: string
  image_url: string | null
  profiles: { display_name: string | null; email: string } | null
}

interface WeeklyPoints {
  fantasy_team_id: string
  week_number: number
  points: number
  is_high_points_winner: boolean
  high_points_amount: number
}

interface LeagueSettings {
  high_points_enabled: boolean
  high_points_weekly_amount: number
  high_points_weeks: number
  high_points_allow_ties: boolean
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { id: leagueId } = await params
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

  // Get league info
  const { data: league } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      season_id,
      seasons (year, name),
      league_settings (
        high_points_enabled,
        high_points_weekly_amount,
        high_points_weeks,
        high_points_allow_ties
      )
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

  // Get all teams with profiles
  const { data: teamsData } = await supabase
    .from('fantasy_teams')
    .select(`
      id,
      name,
      user_id,
      total_points,
      high_points_winnings,
      primary_color,
      secondary_color,
      image_url,
      profiles!fantasy_teams_user_id_fkey(display_name, email)
    `)
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })

  const teams = teamsData as unknown as TeamData[] || []

  // Get all weekly points for all teams
  const teamIds = teams.map(t => t.id)
  const { data: weeklyPointsData } = await supabase
    .from('fantasy_team_weekly_points')
    .select('*')
    .in('fantasy_team_id', teamIds.length > 0 ? teamIds : ['none'])
    .order('week_number', { ascending: true })

  const weeklyPoints = weeklyPointsData as WeeklyPoints[] || []

  // Calculate current week (with sandbox override support)
  const seasons = league.seasons as unknown as { year: number; name: string } | { year: number; name: string }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
  const seasonName = Array.isArray(seasons) ? seasons[0]?.name : seasons?.name || `${year} Season`
  const currentWeek = await getCurrentWeek(year)
  const environment = getEnvironment()

  // Get league settings
  const settings = Array.isArray(league.league_settings)
    ? league.league_settings[0]
    : league.league_settings as LeagueSettings | null

  return (
    <>
      <LeaderboardClient
        leagueId={leagueId}
        leagueName={league.name}
        seasonName={seasonName}
        currentWeek={currentWeek}
        currentUserId={user.id}
        initialTeams={teams}
        initialWeeklyPoints={weeklyPoints}
        settings={settings ? {
          high_points_enabled: settings.high_points_enabled,
          high_points_weekly_amount: settings.high_points_weekly_amount,
        } : null}
        userName={profile?.display_name}
        userEmail={user.email}
      />
      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </>
  )
}
