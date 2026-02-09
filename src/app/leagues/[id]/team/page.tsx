import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RosterList } from '@/components/RosterList'

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

  // Get league settings
  const { data: settings } = await supabase
    .from('league_settings')
    .select('max_add_drops_per_season, add_drop_deadline, double_points_enabled, max_double_picks_per_season')
    .eq('league_id', leagueId)
    .single()

  // Get current roster (active schools)
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
    .is('end_week', null)
    .order('slot_number', { ascending: true })

  const roster = rosterData as unknown as RosterSchool[] | null

  // Get historical roster (dropped schools)
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
    .order('end_week', { ascending: false })

  const droppedRoster = droppedRosterData as unknown as RosterSchool[] | null

  // Calculate current week
  const seasons = league.seasons as unknown as { year: number } | { year: number }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
  const seasonStart = new Date(year, 7, 24)
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = Math.max(0, Math.min(weeksDiff + 1, 15))

  // Get school IDs from roster
  const schoolIds = roster?.map(r => r.school_id) || []

  // Get weekly points for roster schools
  const { data: schoolPointsData } = await supabase
    .from('school_weekly_points')
    .select('school_id, week_number, total_points')
    .eq('season_id', league.season_id)
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const schoolPoints = (schoolPointsData || []) as SchoolPoints[]

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
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Fantasy Sports Platform
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/leagues/${leagueId}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {league.name}
            </Link>
          </div>
        </div>
      </header>

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
            />
          ) : (
            <p className="text-gray-500">No schools on roster yet. Complete the draft to build your team.</p>
          )}
        </div>

        {/* Historical Roster (Dropped Schools) */}
        {droppedRoster && droppedRoster.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Roster History</h2>
            <p className="text-gray-400 text-sm mb-4">Schools previously on your roster</p>

            <div className="space-y-3">
              {droppedRoster.map((slot) => {
                const school = slot.schools
                const points = schoolTotals.get(slot.school_id) || 0

                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      {school.logo_url ? (
                        <img
                          src={school.logo_url}
                          alt={school.name}
                          className="w-10 h-10 object-contain opacity-60"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold opacity-60"
                          style={{ backgroundColor: school.primary_color }}
                        >
                          {school.abbreviation || school.name.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="text-gray-300">{school.name}</p>
                        <p className="text-gray-500 text-sm">{school.conference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 text-sm">
                        Weeks {slot.start_week} - {slot.end_week}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Dropped Week {slot.end_week}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
