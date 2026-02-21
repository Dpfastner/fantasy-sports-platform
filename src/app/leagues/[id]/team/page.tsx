import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { RosterList } from '@/components/RosterList'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { getCurrentWeek, getSimulatedDate } from '@/lib/week'
import { getEnvironment } from '@/lib/env'

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
  end_week: number | null
  schools: {
    id: string
    name: string
    abbreviation: string | null
    logo_url: string | null
    conference: string
    primary_color: string
    secondary_color: string
  }
}

interface SchoolPoints {
  school_id: string
  week_number: number
  total_points: number
}

interface Game {
  id: string
  week_number: number
  game_date: string
  game_time: string | null
  status: string
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  home_team_name: string | null
  away_team_name: string | null
  home_team_logo_url: string | null
  away_team_logo_url: string | null
  quarter: string | null
  clock: string | null
}

export default async function TeamPage({ params }: PageProps) {
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
    .select('id, name, season_id, seasons(year)')
    .eq('id', leagueId)
    .single()

  if (!league) {
    notFound()
  }

  // Get user's team
  const { data: team } = await supabase
    .from('fantasy_teams')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!team) {
    redirect(`/leagues/${leagueId}`)
  }

  // Get league settings (including special event bonuses)
  const { data: settings } = await supabase
    .from('league_settings')
    .select(`
      max_add_drops_per_season,
      add_drop_deadline,
      double_points_enabled,
      max_double_picks_per_season,
      points_bowl_appearance,
      points_playoff_first_round,
      points_playoff_quarterfinal,
      points_playoff_semifinal,
      points_championship_win,
      points_championship_loss,
      points_conference_championship_win,
      points_conference_championship_loss,
      points_heisman_winner
    `)
    .eq('league_id', leagueId)
    .single()

  // Calculate current week (with sandbox override support) - must be before roster queries
  const seasons = league.seasons as unknown as { year: number } | { year: number }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
  const currentWeek = await getCurrentWeek(year)
  const simulatedDate = await getSimulatedDate(year)
  const environment = getEnvironment()

  // Get current roster (schools active at the simulated week)
  // Filter: start_week <= currentWeek AND (end_week IS NULL OR end_week > currentWeek)
  const { data: rosterData } = await supabase
    .from('roster_periods')
    .select(`
      id,
      school_id,
      slot_number,
      start_week,
      end_week,
      schools (
        id,
        name,
        abbreviation,
        logo_url,
        conference,
        primary_color,
        secondary_color
      )
    `)
    .eq('fantasy_team_id', team.id)
    .lte('start_week', currentWeek)
    .or(`end_week.is.null,end_week.gt.${currentWeek}`)
    .order('slot_number', { ascending: true })

  const roster = rosterData as unknown as RosterSchool[] | null

  // Get historical roster (schools dropped before or during the simulated week)
  // Filter: end_week IS NOT NULL AND end_week <= currentWeek
  const { data: droppedRosterData } = await supabase
    .from('roster_periods')
    .select(`
      id,
      school_id,
      slot_number,
      start_week,
      end_week,
      schools (
        id,
        name,
        abbreviation,
        logo_url,
        conference,
        primary_color,
        secondary_color
      )
    `)
    .eq('fantasy_team_id', team.id)
    .not('end_week', 'is', null)
    .lte('end_week', currentWeek)
    .order('end_week', { ascending: false })

  const droppedRoster = droppedRosterData as unknown as RosterSchool[] | null

  // Get ALL roster periods to find replacements
  const { data: allRosterPeriodsData } = await supabase
    .from('roster_periods')
    .select(`
      id,
      school_id,
      slot_number,
      start_week,
      end_week,
      schools (
        id,
        name,
        abbreviation
      )
    `)
    .eq('fantasy_team_id', team.id)
    .order('start_week', { ascending: true })

  const allRosterPeriods = allRosterPeriodsData as unknown as RosterSchool[] | null

  // Get school IDs from roster
  const schoolIds = roster?.map(r => r.school_id) || []

  // Get weekly points for roster schools (only up to simulated week)
  const { data: schoolPointsData } = await supabase
    .from('school_weekly_points')
    .select('school_id, week_number, total_points')
    .eq('season_id', league.season_id)
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])
    .lte('week_number', currentWeek)

  const schoolPoints = (schoolPointsData || []) as SchoolPoints[]

  // Get weekly points for dropped schools too (only up to simulated week)
  const droppedSchoolIds = droppedRoster?.map(r => r.school_id) || []
  let droppedSchoolPoints: SchoolPoints[] = []
  if (droppedSchoolIds.length > 0) {
    const { data: droppedPointsData } = await supabase
      .from('school_weekly_points')
      .select('school_id, week_number, total_points')
      .eq('season_id', league.season_id)
      .in('school_id', droppedSchoolIds)
      .lte('week_number', currentWeek)
    droppedSchoolPoints = (droppedPointsData || []) as SchoolPoints[]
  }

  // Get all games for roster schools (for the season)
  let gamesData: Game[] = []
  if (schoolIds.length > 0) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('season_id', league.season_id)
      .or(`home_school_id.in.(${schoolIds.join(',')}),away_school_id.in.(${schoolIds.join(',')})`)
    gamesData = (data || []) as Game[]
  }

  // Calculate W-L records for roster schools from completed games
  const schoolRecordsMap = new Map<string, { wins: number; losses: number }>()
  for (const game of gamesData) {
    if (game.status !== 'completed' || game.home_score === null || game.away_score === null) continue
    const homeWon = game.home_score > game.away_score

    // Home team
    if (game.home_school_id && schoolIds.includes(game.home_school_id)) {
      const homeRecord = schoolRecordsMap.get(game.home_school_id) || { wins: 0, losses: 0 }
      if (homeWon) {
        homeRecord.wins++
      } else {
        homeRecord.losses++
      }
      schoolRecordsMap.set(game.home_school_id, homeRecord)
    }

    // Away team
    if (game.away_school_id && schoolIds.includes(game.away_school_id)) {
      const awayRecord = schoolRecordsMap.get(game.away_school_id) || { wins: 0, losses: 0 }
      if (!homeWon) {
        awayRecord.wins++
      } else {
        awayRecord.losses++
      }
      schoolRecordsMap.set(game.away_school_id, awayRecord)
    }
  }

  // Get all opponent school IDs from games
  const opponentSchoolIds = new Set<string>()
  for (const game of gamesData) {
    if (game.home_school_id && !schoolIds.includes(game.home_school_id)) {
      opponentSchoolIds.add(game.home_school_id)
    }
    if (game.away_school_id && !schoolIds.includes(game.away_school_id)) {
      opponentSchoolIds.add(game.away_school_id)
    }
  }

  // Fetch opponent schools data
  let opponentSchools: { id: string; name: string; abbreviation: string | null; logo_url: string | null; conference: string }[] = []
  if (opponentSchoolIds.size > 0) {
    const { data: oppData } = await supabase
      .from('schools')
      .select('id, name, abbreviation, logo_url, conference')
      .in('id', Array.from(opponentSchoolIds))
    opponentSchools = oppData || []
  }

  // Fetch double picks history for this team
  const { data: doublePicksData } = await supabase
    .from('weekly_double_picks')
    .select('week_number, school_id')
    .eq('fantasy_team_id', team.id)

  const doublePicks = (doublePicksData || []) as { week_number: number; school_id: string }[]

  // Calculate totals per school
  const schoolTotals = new Map<string, number>()
  for (const sp of schoolPoints) {
    const current = schoolTotals.get(sp.school_id) || 0
    schoolTotals.set(sp.school_id, current + Number(sp.total_points))
  }

  // Get team's standing in league
  const { data: allTeams } = await supabase
    .from('fantasy_teams')
    .select('id, total_points')
    .eq('league_id', leagueId)
    .order('total_points', { ascending: false })

  const standing = (allTeams?.findIndex(t => t.id === team.id) || 0) + 1
  const totalTeams = allTeams?.length || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Header userName={profile?.display_name} userEmail={user.email}>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {league.name}
        </Link>
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Nav */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-700">
          <Link
            href={`/leagues/${leagueId}`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Home
          </Link>
          <Link
            href={`/leagues/${leagueId}/schedule`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Schedule
          </Link>
          <Link
            href={`/leagues/${leagueId}/transactions`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Add/Drop
          </Link>
          <Link
            href={`/leagues/${leagueId}/stats`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Stats
          </Link>
        </div>

        {/* Team Header */}
        <div
          className="rounded-lg p-6 mb-8"
          style={{
            backgroundColor: team.primary_color || '#1f2937',
            borderLeft: `4px solid ${team.secondary_color || '#ffffff'}`
          }}
        >
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {team.image_url ? (
                <img
                  src={team.image_url}
                  alt={team.name}
                  className="w-16 h-16 object-contain rounded-lg bg-white/10 p-1"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: team.secondary_color || '#ffffff',
                    color: team.primary_color || '#1a1a1a'
                  }}
                >
                  {team.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ color: team.secondary_color || '#ffffff' }}
                >
                  {team.name}
                </h1>
                <div
                  className="flex items-center gap-6 flex-wrap"
                  style={{ color: `${team.secondary_color || '#ffffff'}cc` }}
                >
                  <span>Standing: <span className="font-semibold" style={{ color: team.secondary_color || '#ffffff' }}>{standing} of {totalTeams}</span></span>
                  <span>Total Points: <span className="font-semibold" style={{ color: team.secondary_color || '#ffffff' }}>{team.total_points}</span></span>
                  <span>Add/Drops: <span className="font-semibold" style={{ color: team.secondary_color || '#ffffff' }}>{team.add_drops_used} / {settings?.max_add_drops_per_season || 50}</span></span>
                </div>
              </div>
            </div>
            <Link
              href={`/leagues/${leagueId}/team/edit`}
              className="px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{
                backgroundColor: team.secondary_color || '#ffffff',
                color: team.primary_color || '#1a1a1a'
              }}
            >
              Team Settings
            </Link>
          </div>
        </div>

        {/* Roster Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">My Roster</h2>
            <span className="text-gray-400 text-sm">Week {currentWeek}</span>
          </div>

          {roster && roster.length > 0 ? (
            <RosterList
              roster={roster.map(r => ({
                id: r.id,
                school_id: r.school_id,
                slot_number: r.slot_number,
                start_week: r.start_week,
                schools: r.schools
              }))}
              games={gamesData}
              schoolPoints={schoolPoints}
              schoolRecordsMap={Object.fromEntries(schoolRecordsMap)}
              currentWeek={currentWeek}
              teamId={team.id}
              seasonId={league.season_id}
              doublePointsEnabled={settings?.double_points_enabled || false}
              maxDoublePicksPerSeason={settings?.max_double_picks_per_season || 0}
              opponentSchools={opponentSchools}
              doublePicks={doublePicks}
              environment={environment}
              simulatedDateISO={simulatedDate.toISOString()}
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
            />
          ) : (
            <p className="text-gray-500">No schools on roster yet. Complete the draft to build your team.</p>
          )}
        </div>

        {/* Roster History (Dropped Schools) - styled like current roster */}
        {droppedRoster && droppedRoster.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-400">Roster History</h2>
                <p className="text-gray-500 text-sm">Schools previously on your roster and points earned while rostered</p>
              </div>
            </div>

            {/* Roster container with fixed left + scrollable right - matching RosterList */}
            <div className="flex">
              {/* Fixed left section */}
              <div className="flex-shrink-0">
                {/* Header row */}
                <div className="flex items-center h-8 px-3 text-xs text-gray-600 uppercase tracking-wide border-b border-gray-700">
                  <span className="w-6 text-center">#</span>
                  <span className="w-10"></span>
                  <span className="w-32">School</span>
                  <span className="w-px mx-1 h-5 bg-gray-700"></span>
                  <span className="w-24">Tenure</span>
                  <span className="w-px mx-1 h-5 bg-gray-700"></span>
                  <span className="w-16 text-right">Earned</span>
                </div>

                {/* Data rows - fixed section */}
                {droppedRoster.map((slot, index) => {
                  const school = slot.schools
                  const pointsDuringTenure = droppedSchoolPoints
                    .filter(p =>
                      p.school_id === slot.school_id &&
                      p.week_number >= slot.start_week &&
                      p.week_number < (slot.end_week || currentWeek + 1)
                    )
                  const totalPointsEarned = pointsDuringTenure.reduce((sum, p) => sum + Number(p.total_points), 0)

                  return (
                    <div key={slot.id} className="flex items-center h-14 px-3 bg-gray-700/30 border-b border-gray-800">
                      {/* Number */}
                      <div className="w-6 flex-shrink-0 text-center">
                        <span className="text-gray-600 font-medium text-sm">{index + 1}</span>
                      </div>

                      {/* School Logo - faded */}
                      <div className="w-10 flex-shrink-0 flex justify-center">
                        {school.logo_url ? (
                          <img src={school.logo_url} alt={school.name} className="w-8 h-8 object-contain opacity-40 grayscale" />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs opacity-40 grayscale"
                            style={{ backgroundColor: school.primary_color }}
                          >
                            {school.abbreviation || school.name.substring(0, 2)}
                          </div>
                        )}
                      </div>

                      {/* School Name */}
                      <div className="w-32 flex-shrink-0 overflow-hidden">
                        <p className="text-gray-400 font-medium text-sm truncate">{school.name}</p>
                        <p className="text-gray-600 text-xs truncate">{school.conference}</p>
                      </div>

                      <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

                      {/* Tenure */}
                      <div className="w-24 flex-shrink-0 text-center">
                        <span className="text-gray-500 text-xs">W{slot.start_week} - W{slot.end_week}</span>
                      </div>

                      <div className="w-px h-10 bg-gray-600 flex-shrink-0 mx-1" />

                      {/* Total Points Earned */}
                      <div className="w-16 flex-shrink-0 text-right">
                        <p className="text-gray-400 font-semibold text-sm">{totalPointsEarned} pts</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Scrollable right section - Weekly Points */}
              <div className="flex-1 overflow-x-auto border-l border-gray-600">
                {/* Header row for weeks */}
                <div className="flex items-center h-8 text-xs text-gray-600 uppercase tracking-wide border-b border-gray-700 min-w-max">
                  {Array.from({ length: 17 }, (_, i) => i).map(week => (
                    <div key={week} className="w-9 flex-shrink-0 text-center">
                      W{week}
                    </div>
                  ))}
                </div>

                {/* Data rows - weekly points */}
                {droppedRoster.map((slot) => {
                  const pointsDuringTenure = droppedSchoolPoints
                    .filter(p => p.school_id === slot.school_id)

                  return (
                    <div key={slot.id} className="flex items-center h-14 bg-gray-700/30 border-b border-gray-800 min-w-max">
                      {Array.from({ length: 17 }, (_, i) => i).map(week => {
                        const wasOnRoster = week >= slot.start_week && week < (slot.end_week || currentWeek + 1)
                        const weekPoints = pointsDuringTenure.find(p => p.week_number === week)
                        const pts = weekPoints ? Number(weekPoints.total_points) : 0

                        return (
                          <div
                            key={week}
                            className={`w-9 flex-shrink-0 py-1 text-center ${wasOnRoster ? 'bg-gray-600/20' : ''}`}
                          >
                            {wasOnRoster ? (
                              <span className={`text-xs ${pts > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                                {pts}
                              </span>
                            ) : (
                              <span className="text-gray-700 text-xs">-</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Transaction History - at the bottom */}
        {droppedRoster && droppedRoster.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Transaction History</h2>
              <span className="text-gray-400 text-sm">
                {droppedRoster.length} / {settings?.max_add_drops_per_season || 50} transactions used
              </span>
            </div>
            <div className="space-y-2">
              {droppedRoster.map((slot) => {
                const droppedSchool = slot.schools
                // Find who replaced this school (same slot, started when this one ended)
                const replacement = allRosterPeriods?.find(
                  r => r.slot_number === slot.slot_number &&
                       r.start_week === slot.end_week &&
                       r.school_id !== slot.school_id
                )

                return (
                  <div
                    key={slot.id}
                    className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg text-sm"
                  >
                    <span className="text-gray-500 w-16 flex-shrink-0">Week {slot.end_week}</span>
                    <span className="text-red-400">Dropped</span>
                    <span className="text-gray-300 font-medium">{droppedSchool.name}</span>
                    {replacement && (
                      <>
                        <span className="text-gray-500">→</span>
                        <span className="text-green-400">Added</span>
                        <span className="text-gray-300 font-medium">{replacement.schools?.name || 'Unknown'}</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>

      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </div>
  )
}
