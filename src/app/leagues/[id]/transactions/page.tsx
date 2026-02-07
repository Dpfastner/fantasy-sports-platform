import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from '@/components/TransactionsClient'

interface PageProps {
  params: Promise<{ id: string }>
}

interface RosterSchool {
  id: string
  school_id: string
  slot_number: number
  start_week: number
  schools: {
    id: string
    name: string
    abbreviation: string | null
    logo_url: string | null
    conference: string
  }
}

interface School {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  primary_color: string
}

interface LeagueSettings {
  max_add_drops_per_season: number
  add_drop_deadline: string | null
  max_school_selections_total: number
}

export default async function TransactionsPage({ params }: PageProps) {
  const { id: leagueId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get league info
  const { data: league } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      season_id,
      seasons (year, name),
      league_settings (
        max_add_drops_per_season,
        add_drop_deadline,
        max_school_selections_total
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

  // Get user's team
  const { data: team } = await supabase
    .from('fantasy_teams')
    .select('id, name, add_drops_used')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!team) {
    redirect(`/leagues/${leagueId}`)
  }

  // Get current roster
  const { data: rosterData } = await supabase
    .from('roster_periods')
    .select(`
      id,
      school_id,
      slot_number,
      start_week,
      schools (
        id,
        name,
        abbreviation,
        logo_url,
        conference
      )
    `)
    .eq('fantasy_team_id', team.id)
    .is('end_week', null)
    .order('slot_number', { ascending: true })

  const roster = rosterData as unknown as RosterSchool[] || []

  // Get all schools with their points
  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, name, abbreviation, logo_url, conference, primary_color')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const allSchools = schoolsData as School[] || []

  // Get school points for this season
  const { data: schoolPointsData } = await supabase
    .from('school_weekly_points')
    .select('school_id, total_points')
    .eq('season_id', league.season_id)

  // Aggregate points per school
  const schoolPointsMap = new Map<string, number>()
  for (const sp of schoolPointsData || []) {
    const current = schoolPointsMap.get(sp.school_id) || 0
    schoolPointsMap.set(sp.school_id, current + Number(sp.total_points))
  }

  // Get current AP rankings
  const seasons = league.seasons as unknown as { year: number } | { year: number }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
  const seasonStart = new Date(year, 7, 24)
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = Math.max(1, Math.min(weeksDiff + 1, 15))

  // Get the most recent rankings - try current week first, then find latest available
  let { data: rankings } = await supabase
    .from('ap_rankings_history')
    .select('school_id, rank')
    .eq('season_id', league.season_id)
    .eq('week_number', currentWeek)

  // If no rankings for current week, get the most recent week with rankings
  if (!rankings || rankings.length === 0) {
    const { data: latestRankings } = await supabase
      .from('ap_rankings_history')
      .select('school_id, rank, week_number')
      .eq('season_id', league.season_id)
      .order('week_number', { ascending: false })
      .limit(25)

    rankings = latestRankings
  }

  const rankingsMap = new Map<string, number>()
  for (const r of rankings || []) {
    rankingsMap.set(r.school_id, r.rank)
  }

  // Get schools already taken by other teams in this league
  const { data: takenSchoolsData } = await supabase
    .from('roster_periods')
    .select(`
      school_id,
      fantasy_teams!inner (league_id)
    `)
    .eq('fantasy_teams.league_id', leagueId)
    .is('end_week', null)

  // Count how many times each school is taken
  const schoolSelectionCounts = new Map<string, number>()
  for (const ts of takenSchoolsData || []) {
    const count = schoolSelectionCounts.get(ts.school_id) || 0
    schoolSelectionCounts.set(ts.school_id, count + 1)
  }

  // Get all teams in the league for league-wide transaction history
  const { data: leagueTeams } = await supabase
    .from('fantasy_teams')
    .select('id, name')
    .eq('league_id', leagueId)

  const leagueTeamIds = leagueTeams?.map(t => t.id) || []
  const teamNamesMap = new Map(leagueTeams?.map(t => [t.id, t.name]) || [])

  // Get league-wide transaction history
  const { data: transactionHistoryRaw } = await supabase
    .from('transactions')
    .select(`
      id,
      fantasy_team_id,
      week_number,
      slot_number,
      created_at,
      dropped_school:schools!transactions_dropped_school_id_fkey (
        id, name, abbreviation, logo_url
      ),
      added_school:schools!transactions_added_school_id_fkey (
        id, name, abbreviation, logo_url
      )
    `)
    .in('fantasy_team_id', leagueTeamIds.length > 0 ? leagueTeamIds : ['none'])
    .order('created_at', { ascending: false })

  // Transform transaction history to expected format
  const transactionHistory = (transactionHistoryRaw || []).map((tx: {
    id: string
    fantasy_team_id: string
    week_number: number
    slot_number: number
    created_at: string
    dropped_school: { id: string; name: string; abbreviation: string | null; logo_url: string | null } | { id: string; name: string; abbreviation: string | null; logo_url: string | null }[] | null
    added_school: { id: string; name: string; abbreviation: string | null; logo_url: string | null } | { id: string; name: string; abbreviation: string | null; logo_url: string | null }[] | null
  }) => ({
    id: tx.id,
    fantasy_team_id: tx.fantasy_team_id,
    team_name: teamNamesMap.get(tx.fantasy_team_id) || 'Unknown Team',
    week_number: tx.week_number,
    slot_number: tx.slot_number,
    created_at: tx.created_at,
    dropped_school: Array.isArray(tx.dropped_school) ? tx.dropped_school[0] : tx.dropped_school,
    added_school: Array.isArray(tx.added_school) ? tx.added_school[0] : tx.added_school,
  }))

  // Get league settings
  const settings = Array.isArray(league.league_settings)
    ? league.league_settings[0]
    : league.league_settings as LeagueSettings | null

  // Check if transactions are locked
  const addDropDeadline = settings?.add_drop_deadline
    ? new Date(settings.add_drop_deadline)
    : null
  const isDeadlinePassed = addDropDeadline ? new Date() > addDropDeadline : false
  const hasRemainingTransactions = (team.add_drops_used || 0) < (settings?.max_add_drops_per_season || 50)

  return (
    <TransactionsClient
      leagueId={leagueId}
      leagueName={league.name}
      seasonId={league.season_id}
      teamId={team.id}
      teamName={team.name}
      currentWeek={currentWeek}
      roster={roster}
      allSchools={allSchools}
      schoolPointsMap={Object.fromEntries(schoolPointsMap)}
      rankingsMap={Object.fromEntries(rankingsMap)}
      schoolSelectionCounts={Object.fromEntries(schoolSelectionCounts)}
      transactionHistory={transactionHistory || []}
      addDropsUsed={team.add_drops_used || 0}
      maxAddDrops={settings?.max_add_drops_per_season || 50}
      maxSelectionsPerSchool={settings?.max_school_selections_total || 3}
      addDropDeadline={addDropDeadline?.toISOString() || null}
      isDeadlinePassed={isDeadlinePassed}
      canMakeTransactions={hasRemainingTransactions && !isDeadlinePassed}
    />
  )
}
