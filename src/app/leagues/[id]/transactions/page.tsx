import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from '@/components/TransactionsClient'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { getCurrentWeek, getSimulatedDate } from '@/lib/week'
import { getEnvironment } from '@/lib/env'
import { getLeagueYear } from '@/lib/league-helpers'

// Force dynamic rendering to ensure fresh data from database
export const dynamic = 'force-dynamic'

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
  points_bowl_appearance?: number
  points_playoff_first_round?: number
  points_playoff_quarterfinal?: number
  points_playoff_semifinal?: number
  points_championship_win?: number
  points_championship_loss?: number
  points_conference_championship_win?: number
  points_conference_championship_loss?: number
  points_heisman_winner?: number
}

interface Game {
  id: string
  week_number: number
  status: string
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  game_date: string
  game_time: string | null
  is_conference_game: boolean
  is_bowl_game: boolean
  is_playoff_game: boolean
  playoff_round: string | null
}

interface SchoolGamePoints {
  game_id: string
  school_id: string
  total_points: number
}

export default async function TransactionsPage({ params }: PageProps) {
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
        max_add_drops_per_season,
        add_drop_deadline,
        max_school_selections_total,
        points_bowl_appearance,
        points_playoff_first_round,
        points_playoff_quarterfinal,
        points_playoff_semifinal,
        points_championship_win,
        points_championship_loss,
        points_conference_championship_win,
        points_conference_championship_loss,
        points_heisman_winner
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

  // Calculate current week (extends to week 20 for postseason/bowls) - supports sandbox override
  const year = getLeagueYear(league.seasons)
  const currentWeek = await getCurrentWeek(year)
  const simulatedDate = await getSimulatedDate(year)
  const environment = getEnvironment()

  // Get current roster (schools active at the simulated week)
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
    .lte('start_week', currentWeek)
    .or(`end_week.is.null,end_week.gt.${currentWeek}`)
    .order('slot_number', { ascending: true })

  const roster = rosterData as unknown as RosterSchool[] || []

  // Get all schools with their points
  const { data: schoolsData } = await supabase
    .from('schools')
    .select('id, name, abbreviation, logo_url, conference, primary_color')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const allSchools = schoolsData as School[] || []

  // Get all completed games for record calculation (only up to simulated week)
  const { data: gamesData } = await supabase
    .from('games')
    .select('home_school_id, away_school_id, home_score, away_score, is_conference_game, status, week_number')
    .eq('season_id', league.season_id)
    .eq('status', 'completed')
    .lte('week_number', currentWeek)

  // Calculate W-L records for each school (overall and conference)
  const schoolRecordsMap = new Map<string, { wins: number; losses: number; confWins: number; confLosses: number }>()
  for (const game of gamesData || []) {
    if (game.home_score === null || game.away_score === null) continue
    const homeWon = game.home_score > game.away_score

    // Home team
    const homeRecord = schoolRecordsMap.get(game.home_school_id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
    if (homeWon) {
      homeRecord.wins++
      if (game.is_conference_game) homeRecord.confWins++
    } else {
      homeRecord.losses++
      if (game.is_conference_game) homeRecord.confLosses++
    }
    schoolRecordsMap.set(game.home_school_id, homeRecord)

    // Away team
    const awayRecord = schoolRecordsMap.get(game.away_school_id) || { wins: 0, losses: 0, confWins: 0, confLosses: 0 }
    if (!homeWon) {
      awayRecord.wins++
      if (game.is_conference_game) awayRecord.confWins++
    } else {
      awayRecord.losses++
      if (game.is_conference_game) awayRecord.confLosses++
    }
    schoolRecordsMap.set(game.away_school_id, awayRecord)
  }

  // Get full game data for school schedule modal
  const { data: fullGamesData } = await supabase
    .from('games')
    .select('*')
    .eq('season_id', league.season_id)

  const games = (fullGamesData || []) as Game[]

  // Get school points for this season (only up to simulated week)
  // Note: Use .range() to bypass Supabase default 1000 row limit
  const { data: schoolPointsData } = await supabase
    .from('school_weekly_points')
    .select('school_id, total_points, game_id')
    .eq('season_id', league.season_id)
    .lte('week_number', currentWeek)
    .range(0, 2999)

  // Aggregate points per school (for display in add/drop list)
  const schoolPointsMap = new Map<string, number>()
  for (const sp of schoolPointsData || []) {
    const current = schoolPointsMap.get(sp.school_id) || 0
    schoolPointsMap.set(sp.school_id, current + Number(sp.total_points))
  }

  // Keep per-game points for modal display
  const schoolGamePoints = (schoolPointsData || []).map(sp => ({
    game_id: sp.game_id,
    school_id: sp.school_id,
    total_points: Number(sp.total_points)
  })) as SchoolGamePoints[]

  // Get event bonuses for this league (postseason bonuses like CFP, bowl, championship, etc.)
  const { data: eventBonusesData } = await supabase
    .from('league_school_event_bonuses')
    .select('school_id, week_number, bonus_type, points')
    .eq('league_id', leagueId)
    .eq('season_id', league.season_id)
    .lte('week_number', currentWeek)

  const eventBonuses = (eventBonusesData || []) as {
    school_id: string
    week_number: number
    bonus_type: string
    points: number
  }[]

  // Get current AP rankings
  // Get the most recent rankings - try current week first, then find latest available
  let { data: rankings } = await supabase
    .from('ap_rankings_history')
    .select('school_id, rank')
    .eq('season_id', league.season_id)
    .eq('week_number', currentWeek)

  // If no rankings for current week, get the most recent week with rankings (up to simulated week)
  if (!rankings || rankings.length === 0) {
    const { data: latestRankings } = await supabase
      .from('ap_rankings_history')
      .select('school_id, rank, week_number')
      .eq('season_id', league.season_id)
      .lte('week_number', currentWeek)
      .order('week_number', { ascending: false })
      .limit(25)

    rankings = latestRankings
  }

  const rankingsMap = new Map<string, number>()
  for (const r of rankings || []) {
    rankingsMap.set(r.school_id, r.rank)
  }

  // Get schools taken by teams in this league (at the simulated week)
  const { data: takenSchoolsData } = await supabase
    .from('roster_periods')
    .select(`
      school_id,
      fantasy_teams!inner (league_id)
    `)
    .eq('fantasy_teams.league_id', leagueId)
    .lte('start_week', currentWeek)
    .or(`end_week.is.null,end_week.gt.${currentWeek}`)

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

  // Get league-wide transaction history (only up to simulated week)
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
    .lte('week_number', currentWeek)
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

  // Check if transactions are locked - uses simulated date in sandbox
  const addDropDeadline = settings?.add_drop_deadline
    ? new Date(settings.add_drop_deadline)
    : null
  const isDeadlinePassed = addDropDeadline ? simulatedDate > addDropDeadline : false
  const hasRemainingTransactions = (team.add_drops_used || 0) < (settings?.max_add_drops_per_season || 50)

  return (
    <>
      <ErrorBoundary sectionName="transactions">
      <TransactionsClient
        leagueId={leagueId}
        leagueName={league.name}
        seasonId={league.season_id}
        teamId={team.id}
        teamName={team.name}
        currentWeek={currentWeek}
        roster={roster}
        allSchools={allSchools}
        games={games}
        schoolPointsMap={Object.fromEntries(schoolPointsMap)}
        rankingsMap={Object.fromEntries(rankingsMap)}
        schoolRecordsMap={Object.fromEntries(schoolRecordsMap)}
        schoolSelectionCounts={Object.fromEntries(schoolSelectionCounts)}
        schoolGamePoints={schoolGamePoints}
        transactionHistory={transactionHistory || []}
        addDropsUsed={team.add_drops_used || 0}
        maxAddDrops={settings?.max_add_drops_per_season || 50}
        maxSelectionsPerSchool={settings?.max_school_selections_total || 3}
        addDropDeadline={addDropDeadline?.toISOString() || null}
        isDeadlinePassed={isDeadlinePassed}
        canMakeTransactions={hasRemainingTransactions && !isDeadlinePassed}
        userName={profile?.display_name}
        userEmail={user.email}
        specialEventSettings={{
          bowlAppearance: settings?.points_bowl_appearance || 0,
          playoffFirstRound: settings?.points_playoff_first_round || 0,
          playoffQuarterfinal: settings?.points_playoff_quarterfinal || 0,
          playoffSemifinal: settings?.points_playoff_semifinal || 0,
          championshipWin: settings?.points_championship_win || 0,
          championshipLoss: settings?.points_championship_loss || 0,
          confChampWin: settings?.points_conference_championship_win || 0,
          confChampLoss: settings?.points_conference_championship_loss || 0,
          heismanWinner: settings?.points_heisman_winner || 0,
        }}
        eventBonuses={eventBonuses}
      />
      </ErrorBoundary>
      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </>
  )
}
