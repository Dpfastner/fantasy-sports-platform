import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DraftStatusChecker from '@/components/DraftStatusChecker'

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
  sports: { name: string; slug: string } | null
  seasons: { name: string; year: number } | null
  league_settings: {
    draft_date: string | null
    draft_type: string
    schools_per_team: number
    max_add_drops_per_season: number
    entry_fee: number
    prize_pool: number
  } | null
  drafts: {
    status: string
  } | null
}

interface TeamData {
  id: string
  name: string
  user_id: string
  total_points: number
  add_drops_used: number
  profiles: { display_name: string | null; email: string } | null
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

  // Get all teams in the league
  const { data: teamsData } = await supabase
    .from('fantasy_teams')
    .select(`
      *,
      profiles (display_name, email)
    `)
    .eq('league_id', id)
    .order('total_points', { ascending: false })

  const teams = teamsData as unknown as TeamData[] | null

  // Get user's team
  const userTeam = teams?.find(t => t.user_id === user.id)

  const settings = league.league_settings
  const draft = league.drafts

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Fantasy Sports Platform
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            My Leagues
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* League Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{league.name}</h1>
              {isCommissioner && (
                <span className="bg-yellow-500/20 text-yellow-400 text-sm px-3 py-1 rounded">
                  Commissioner
                </span>
              )}
            </div>
            <p className="text-gray-400">
              {league.sports?.name} &bull; {league.seasons?.name}
            </p>
            {league.description && (
              <p className="text-gray-500 mt-2">{league.description}</p>
            )}
          </div>

          {isCommissioner && (
            <Link
              href={`/leagues/${id}/settings`}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              League Settings
            </Link>
          )}
        </div>

        {/* Invite Code (Commissioner only) */}
        {isCommissioner && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-8">
            <p className="text-blue-300 mb-2">Invite Code (share with friends):</p>
            <code className="text-2xl font-mono text-white tracking-wider">
              {league.invite_code}
            </code>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Draft Status Checker - polls for updates */}
            <DraftStatusChecker leagueId={id} initialStatus={draft?.status || 'not_started'} />

            {/* Draft Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Draft Status</h2>

              {draft?.status === 'not_started' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    <span className="text-yellow-400">Draft Not Started</span>
                  </div>
                  {settings?.draft_date && (
                    <p className="text-gray-400 mb-4">
                      Scheduled: {new Date(settings.draft_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                  {isCommissioner && (teams?.length || 0) >= 2 && (
                    <Link
                      href={`/leagues/${id}/draft`}
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Start Draft
                    </Link>
                  )}
                  {isCommissioner && (teams?.length || 0) < 2 && (
                    <p className="text-gray-500">
                      Need at least 2 teams to start the draft
                    </p>
                  )}
                </div>
              )}

              {draft?.status === 'in_progress' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400">Draft In Progress</span>
                  </div>
                  <Link
                    href={`/leagues/${id}/draft`}
                    className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Go to Draft Room
                  </Link>
                </div>
              )}

              {draft?.status === 'completed' && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-400">Draft Completed</span>
                  </div>
                  <p className="text-gray-400">
                    The draft has been completed. Good luck this season!
                  </p>
                </div>
              )}
            </div>

            {/* Standings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Standings</h2>

              {teams && teams.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-gray-400 text-left border-b border-gray-700">
                        <th className="pb-3 pr-4">#</th>
                        <th className="pb-3 pr-4">Team</th>
                        <th className="pb-3 pr-4">Owner</th>
                        <th className="pb-3 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => (
                        <tr
                          key={team.id}
                          className={`border-b border-gray-700/50 ${
                            team.user_id === user.id ? 'bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="py-3 pr-4 text-gray-400">{index + 1}</td>
                          <td className="py-3 pr-4">
                            <span className="text-white font-medium">{team.name}</span>
                          </td>
                          <td className="py-3 pr-4 text-gray-400">
                            {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                          </td>
                          <td className="py-3 text-right text-white font-semibold">
                            {team.total_points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No teams have joined yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Your Team */}
            {userTeam && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Your Team</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Team Name</p>
                    <p className="text-white font-medium">{userTeam.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Points</p>
                    <p className="text-2xl font-bold text-white">{userTeam.total_points}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Add/Drops Used</p>
                    <p className="text-white">
                      {userTeam.add_drops_used} / {settings?.max_add_drops_per_season || 50}
                    </p>
                  </div>
                </div>
                {draft?.status === 'completed' && (
                  <Link
                    href={`/leagues/${id}/team`}
                    className="block mt-4 text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    View My Roster
                  </Link>
                )}
              </div>
            )}

            {/* League Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">League Info</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Teams</span>
                  <span className="text-white">{teams?.length || 0} / {league.max_teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Draft Type</span>
                  <span className="text-white capitalize">{settings?.draft_type || 'Snake'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Schools per Team</span>
                  <span className="text-white">{settings?.schools_per_team || 12}</span>
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
                    <span className="text-white">${settings.prize_pool}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
              <div className="space-y-2">
                <Link
                  href={`/leagues/${id}/leaderboard`}
                  className="block text-gray-400 hover:text-white transition-colors"
                >
                  Full Leaderboard
                </Link>
                {draft?.status === 'completed' && (
                  <>
                    <Link
                      href={`/leagues/${id}/transactions`}
                      className="block text-gray-400 hover:text-white transition-colors"
                    >
                      Transaction Log
                    </Link>
                    <Link
                      href={`/leagues/${id}/scores`}
                      className="block text-gray-400 hover:text-white transition-colors"
                    >
                      Live Scores
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
