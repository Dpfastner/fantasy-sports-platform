import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DraftStatusSection from '@/components/DraftStatusSection'
import EmbeddedLeaderboard from '@/components/EmbeddedLeaderboard'

interface PageProps {
  params: Promise<{ id: string }>
}

interface LeagueData {
  id: string
  name: string
  description: string | null
  invite_code: string
  is_public: boolean
  max_teams: number
  season_id: string
  sports: { name: string; slug: string } | null
  seasons: { name: string; year: number } | null
  league_settings: {
    draft_date: string | null
    draft_type: string
    schools_per_team: number
    max_add_drops_per_season: number
    max_school_selections_total: number
    entry_fee: number
    prize_pool: number
    high_points_enabled: boolean
    high_points_weekly_amount: number
    double_points_enabled: boolean
    max_double_picks_per_season: number
  } | null
  drafts: {
    status: string
  }[] | { status: string } | null
}

interface TeamData {
  id: string
  name: string
  user_id: string
  total_points: number
  high_points_winnings: number
  add_drops_used: number
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

export default async function LeaguePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get league details
  const { data: leagueData, error: leagueError } = await supabase
    .from('leagues')
    .select(`
      *,
      sports (name, slug),
      seasons (name, year),
      league_settings (*),
      drafts (*)
    `)
    .eq('id', id)
    .single()

  if (leagueError || !leagueData) {
    notFound()
  }

  const league = leagueData as unknown as LeagueData

  // Check if user is a member
  const { data: membershipData } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .single()

  const membership = membershipData as { role: string } | null

  if (!membership && !league.is_public) {
    notFound()
  }

  const isCommissioner = membership?.role === 'commissioner'

  // Get all members count
  const { count: memberCount } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', id)

  // Get all teams in the league
  const { data: teamsData } = await supabase
    .from('fantasy_teams')
    .select(`
      id, name, user_id, total_points, high_points_winnings, add_drops_used,
      primary_color, secondary_color, image_url,
      profiles!fantasy_teams_user_id_fkey(display_name, email)
    `)
    .eq('league_id', id)
    .order('total_points', { ascending: false })

  const teams = teamsData as unknown as TeamData[] | null

  // Get user's team
  const userTeam = teams?.find(t => t.user_id === user.id)

  const settings = league.league_settings
  const draft = Array.isArray(league.drafts) ? league.drafts[0] : league.drafts
  const isDraftComplete = draft?.status === 'completed'

  // Calculate current week
  const seasons = league.seasons as unknown as { year: number; name: string } | null
  const year = seasons?.year || new Date().getFullYear()
  const seasonStart = new Date(year, 7, 24)
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = Math.max(1, Math.min(weeksDiff + 1, 15))

  // Get weekly points for leaderboard (only if draft complete)
  let weeklyPoints: WeeklyPoints[] = []
  if (isDraftComplete && teams && teams.length > 0) {
    const teamIds = teams.map(t => t.id)
    const { data: weeklyPointsData } = await supabase
      .from('fantasy_team_weekly_points')
      .select('*')
      .in('fantasy_team_id', teamIds)
      .order('week_number', { ascending: true })
    weeklyPoints = (weeklyPointsData || []) as WeeklyPoints[]
  }

  // Get double picks count for user's team
  let doublePicksUsed = 0
  if (userTeam && settings?.double_points_enabled) {
    const { count } = await supabase
      .from('weekly_double_picks')
      .select('*', { count: 'exact', head: true })
      .eq('fantasy_team_id', userTeam.id)
    doublePicksUsed = count || 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Fantasy Sports Platform
          </Link>
          <div className="flex items-center gap-4">
            {isDraftComplete && userTeam && (
              <Link
                href={`/leagues/${id}/team`}
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                My Roster
              </Link>
            )}
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              My Leagues
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* League Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{league.name}</h1>
              {isCommissioner && (
                <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                  Commissioner
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              {league.sports?.name} &bull; {league.seasons?.name} &bull; Week {currentWeek}
            </p>
          </div>

          {/* Commissioner Tools */}
          {isCommissioner && (
            <Link
              href={`/leagues/${id}/settings`}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Commissioner Tools
            </Link>
          )}
        </div>

        {/* Quick Navigation Bar */}
        {isDraftComplete && (
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-700">
            <Link
              href={`/leagues/${id}/transactions`}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
            >
              Transactions
            </Link>
            <Link
              href={`/leagues/${id}/bracket`}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
            >
              Playoff Bracket
            </Link>
            <Link
              href={`/leagues/${id}/stats`}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
            >
              League Stats
            </Link>
          </div>
        )}

        {/* Invite Code (Commissioner only) */}
        {isCommissioner && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mb-6 flex items-center gap-3">
            <span className="text-blue-300 text-sm">Invite Code:</span>
            <code className="text-lg font-mono text-white tracking-wider">
              {league.invite_code}
            </code>
          </div>
        )}

        {/* Main Grid - Wider leaderboard, narrower sidebar */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Draft Status (only when NOT completed) */}
            {!isDraftComplete && (
              <DraftStatusSection
                leagueId={id}
                initialStatus={draft?.status || 'not_started'}
                isCommissioner={isCommissioner}
                teamCount={teams?.length || 0}
                memberCount={memberCount || 0}
                draftDate={settings?.draft_date || null}
              />
            )}

            {/* Leaderboard (only when draft IS completed) */}
            {isDraftComplete && teams && teams.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 md:p-6">
                <EmbeddedLeaderboard
                  leagueId={id}
                  currentWeek={currentWeek}
                  currentUserId={user.id}
                  initialTeams={teams}
                  initialWeeklyPoints={weeklyPoints}
                  settings={settings ? {
                    high_points_enabled: settings.high_points_enabled || false,
                    high_points_weekly_amount: settings.high_points_weekly_amount || 0,
                  } : null}
                />
              </div>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4">
            {/* Your Team Summary - Compact */}
            {userTeam && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Your Team</h2>
                  {isDraftComplete && (
                    <Link
                      href={`/leagues/${id}/team`}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      View Roster →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  {userTeam.image_url ? (
                    <img src={userTeam.image_url} alt={userTeam.name} className="w-8 h-8 object-contain rounded" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: userTeam.primary_color || '#374151',
                        color: userTeam.secondary_color || '#ffffff',
                      }}
                    >
                      {userTeam.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium text-sm">{userTeam.name}</p>
                    <p className="text-gray-500 text-xs">
                      Rank #{(teams?.findIndex(t => t.id === userTeam.id) || 0) + 1} of {teams?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-700/50 rounded p-2">
                    <p className="text-lg font-bold text-white">{userTeam.total_points}</p>
                    <p className="text-gray-400 text-[10px] uppercase">Points</p>
                  </div>
                  <div className="bg-gray-700/50 rounded p-2">
                    <p className="text-lg font-bold text-white">{userTeam.add_drops_used}/{settings?.max_add_drops_per_season || 50}</p>
                    <p className="text-gray-400 text-[10px] uppercase">Add/Drops</p>
                  </div>
                  {settings?.double_points_enabled && (
                    <div className="bg-gray-700/50 rounded p-2">
                      <p className="text-lg font-bold text-purple-400">
                        {doublePicksUsed}/{settings.max_double_picks_per_season > 0 ? settings.max_double_picks_per_season : '∞'}
                      </p>
                      <p className="text-gray-400 text-[10px] uppercase">2x Picks</p>
                    </div>
                  )}
                  {settings?.high_points_enabled && (
                    <div className="bg-gray-700/50 rounded p-2">
                      <p className="text-lg font-bold text-yellow-400">
                        ${userTeam.high_points_winnings || 0}
                      </p>
                      <p className="text-gray-400 text-[10px] uppercase">HP Won</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* League Info - Compact */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">League Info</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Teams</span>
                  <span className="text-white">{teams?.length || 0} / {league.max_teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Schools per Team</span>
                  <span className="text-white">{settings?.schools_per_team || 12}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">School Limit (League)</span>
                  <span className="text-white">{settings?.max_school_selections_total || 3}x max</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Draft Type</span>
                  <span className="text-white capitalize">{settings?.draft_type || 'Snake'}</span>
                </div>
                {settings?.entry_fee && settings.entry_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Entry Fee</span>
                    <span className="text-white">${settings.entry_fee}</span>
                  </div>
                )}
                {settings?.prize_pool && settings.prize_pool > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prize Pool</span>
                    <span className="text-green-400 font-medium">${settings.prize_pool}</span>
                  </div>
                )}
                {settings?.high_points_enabled && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">High Points</span>
                    <span className="text-yellow-400">${settings.high_points_weekly_amount}/wk</span>
                  </div>
                )}
                {settings?.double_points_enabled && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Double Points</span>
                    <span className="text-purple-400">Enabled</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Key Dates</h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-white font-medium">Heisman Trophy</p>
                    <p className="text-gray-400">Dec 14, {year}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-white font-medium">CFP Quarterfinals</p>
                    <p className="text-gray-400">Dec 31, {year} - Jan 1, {year + 1}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-white font-medium">CFP Semifinals</p>
                    <p className="text-gray-400">Jan 9-10, {year + 1}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1 bg-red-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <p className="text-white font-medium">National Championship</p>
                    <p className="text-gray-400">Jan 20, {year + 1} @ 7:30 PM ET</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
