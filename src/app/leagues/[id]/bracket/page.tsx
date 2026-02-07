import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PlayoffBracket } from '@/components/PlayoffBracket'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BracketPage({ params }: PageProps) {
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

  // Check if user is a member
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  // Get user's team and roster
  const { data: team } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  let rosterSchoolIds: string[] = []
  if (team) {
    const { data: roster } = await supabase
      .from('roster_periods')
      .select('school_id')
      .eq('fantasy_team_id', team.id)
      .is('end_week', null)

    rosterSchoolIds = roster?.map(r => r.school_id) || []
  }

  const seasons = league.seasons as unknown as { year: number } | { year: number }[] | null
  const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()

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

      {/* Navigation */}
      <nav className="bg-gray-800/30 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">
            <Link
              href={`/leagues/${leagueId}`}
              className="py-3 px-4 text-gray-400 hover:text-white transition-colors whitespace-nowrap"
            >
              Overview
            </Link>
            <Link
              href={`/leagues/${leagueId}/team`}
              className="py-3 px-4 text-gray-400 hover:text-white transition-colors whitespace-nowrap"
            >
              My Team
            </Link>
            <Link
              href={`/leagues/${leagueId}/leaderboard`}
              className="py-3 px-4 text-gray-400 hover:text-white transition-colors whitespace-nowrap"
            >
              Leaderboard
            </Link>
            <Link
              href={`/leagues/${leagueId}/bracket`}
              className="py-3 px-4 text-white border-b-2 border-blue-500 whitespace-nowrap"
            >
              Playoff Bracket
            </Link>
            <Link
              href={`/leagues/${leagueId}/transactions`}
              className="py-3 px-4 text-gray-400 hover:text-white transition-colors whitespace-nowrap"
            >
              Transactions
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">{year} College Football Playoff</h1>
          <p className="text-gray-400 mt-2">12-team bracket with schools from your roster highlighted</p>
        </div>

        <PlayoffBracket
          seasonId={league.season_id}
          rosterSchoolIds={rosterSchoolIds}
          leagueId={leagueId}
        />

        {/* Roster schools in playoffs */}
        {rosterSchoolIds.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Playoff Teams</h2>
            <p className="text-gray-400 text-sm mb-4">
              Schools from your roster that are in the playoffs will be highlighted in purple on the bracket.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* This could show roster schools that made playoffs - would need to join with games */}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
