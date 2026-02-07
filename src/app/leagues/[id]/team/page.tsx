import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DoublePointsPicker } from '@/components/DoublePointsPicker'

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
  base_points: number
  conference_bonus: number
  over_50_bonus: number
  shutout_bonus: number
  ranked_25_bonus: number
  ranked_10_bonus: number
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
    .select('*')
    .eq('season_id', league.season_id)
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const schoolPoints = schoolPointsData as SchoolPoints[] | null

  // Get this week's games for roster schools
  let gamesData: Game[] | null = null
  if (schoolIds.length > 0) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('season_id', league.season_id)
      .eq('week_number', currentWeek)
      .or(`home_school_id.in.(${schoolIds.join(',')}),away_school_id.in.(${schoolIds.join(',')})`)
    gamesData = data as Game[] | null
  }

  const games = gamesData as Game[] | null

  // Get team's weekly points
  const { data: teamWeeklyPoints } = await supabase
    .from('fantasy_team_weekly_points')
    .select('*')
    .eq('fantasy_team_id', team.id)
    .order('week_number', { ascending: true })

  // Calculate totals per school
  const schoolTotals = new Map<string, number>()
  for (const sp of schoolPoints || []) {
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
        {/* Team Header */}
        <div
          className="rounded-lg p-6 mb-8"
          style={{
            backgroundColor: team.primary_color || '#1f2937',
            borderLeft: `4px solid ${team.secondary_color || '#ffffff'}`
          }}
        >
          <div className="flex justify-between items-start">
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
                  className="flex items-center gap-6"
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
              Edit Team
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Roster */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">My Roster</h2>

              {roster && roster.length > 0 ? (
                <div className="space-y-3">
                  {roster.map((slot) => {
                    const school = slot.schools
                    const points = schoolTotals.get(slot.school_id) || 0
                    const thisWeekGame = games?.find(
                      g => g.home_school_id === slot.school_id || g.away_school_id === slot.school_id
                    )

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {school.logo_url ? (
                            <img
                              src={school.logo_url}
                              alt={school.name}
                              className="w-12 h-12 object-contain"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: school.primary_color }}
                            >
                              {school.abbreviation || school.name.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{school.name}</p>
                            <p className="text-gray-400 text-sm">{school.conference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{points} pts</p>
                          {thisWeekGame && (
                            <p className="text-gray-400 text-sm">
                              {thisWeekGame.status === 'completed' ? (
                                <span className="text-green-400">
                                  {thisWeekGame.home_school_id === slot.school_id
                                    ? `${(thisWeekGame.home_score || 0) > (thisWeekGame.away_score || 0) ? 'W' : 'L'} ${thisWeekGame.home_score}-${thisWeekGame.away_score}`
                                    : `${(thisWeekGame.away_score || 0) > (thisWeekGame.home_score || 0) ? 'W' : 'L'} ${thisWeekGame.away_score}-${thisWeekGame.home_score}`
                                  }
                                </span>
                              ) : thisWeekGame.status === 'live' ? (
                                <span className="text-yellow-400 animate-pulse">Live</span>
                              ) : (
                                <span>
                                  vs {thisWeekGame.home_school_id === slot.school_id
                                    ? thisWeekGame.away_team_name
                                    : thisWeekGame.home_team_name
                                  }
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500">No schools on roster yet. Complete the draft to build your team.</p>
              )}
            </div>

            {/* This Week's Games */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Week {currentWeek} Games</h2>

              {games && games.length > 0 ? (
                <div className="space-y-4">
                  {games.map((game) => {
                    const isHomeTeam = schoolIds.includes(game.home_school_id || '')
                    const mySchoolId = isHomeTeam ? game.home_school_id : game.away_school_id
                    const mySchool = roster?.find(r => r.school_id === mySchoolId)?.schools

                    return (
                      <div
                        key={game.id}
                        className="p-4 bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Away Team */}
                            <div className="flex items-center gap-2">
                              {game.away_team_logo_url ? (
                                <img src={game.away_team_logo_url} alt="" className="w-8 h-8 object-contain" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-600 rounded-full" />
                              )}
                              <span className={`${schoolIds.includes(game.away_school_id || '') ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                {game.away_rank && <span className="text-xs mr-1">#{game.away_rank}</span>}
                                {game.away_team_name}
                              </span>
                            </div>

                            <span className="text-gray-500">@</span>

                            {/* Home Team */}
                            <div className="flex items-center gap-2">
                              {game.home_team_logo_url ? (
                                <img src={game.home_team_logo_url} alt="" className="w-8 h-8 object-contain" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-600 rounded-full" />
                              )}
                              <span className={`${schoolIds.includes(game.home_school_id || '') ? 'text-white font-semibold' : 'text-gray-400'}`}>
                                {game.home_rank && <span className="text-xs mr-1">#{game.home_rank}</span>}
                                {game.home_team_name}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            {game.status === 'completed' ? (
                              <div className="text-white font-semibold">
                                {game.away_score} - {game.home_score}
                                <span className="text-green-400 text-sm ml-2">Final</span>
                              </div>
                            ) : game.status === 'live' ? (
                              <div>
                                <span className="text-white font-semibold">{game.away_score} - {game.home_score}</span>
                                <span className="text-yellow-400 text-sm ml-2 animate-pulse">
                                  Q{game.quarter} {game.clock}
                                </span>
                              </div>
                            ) : (
                              <div className="text-gray-400 text-sm">
                                {new Date(`${game.game_date}T${game.game_time || '12:00:00'}`).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500">No games this week for your schools.</p>
              )}
            </div>

            {/* Historical Roster (Dropped Schools) */}
            {droppedRoster && droppedRoster.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Points */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Weekly Points</h2>

              {teamWeeklyPoints && teamWeeklyPoints.length > 0 ? (
                <div className="space-y-2">
                  {teamWeeklyPoints.map((wp: { week_number: number; points: number; is_high_points_winner: boolean }) => (
                    <div
                      key={wp.week_number}
                      className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0"
                    >
                      <span className="text-gray-400">Week {wp.week_number}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{wp.points}</span>
                        {wp.is_high_points_winner && (
                          <span className="text-yellow-400 text-xs">HP</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No points calculated yet.</p>
              )}
            </div>

            {/* Double Points Picker */}
            {settings?.double_points_enabled && roster && roster.length > 0 && (
              <DoublePointsPicker
                teamId={team.id}
                leagueId={leagueId}
                currentWeek={currentWeek}
                roster={roster.map(r => ({
                  school_id: r.school_id,
                  schools: r.schools
                }))}
                maxPicksPerSeason={settings.max_double_picks_per_season || 0}
                seasonId={league.season_id}
              />
            )}

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                <Link
                  href={`/leagues/${leagueId}/transactions`}
                  className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Add/Drop School
                </Link>
                <Link
                  href={`/leagues/${leagueId}/leaderboard`}
                  className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  View Leaderboard
                </Link>
                <Link
                  href={`/leagues/${leagueId}/scores`}
                  className="block w-full text-center bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Live Scores
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
