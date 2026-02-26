import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PlayoffBracket } from '@/components/PlayoffBracket'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { getLeagueYear } from '@/lib/league-helpers'

// Force dynamic rendering to ensure fresh data from database
export const dynamic = 'force-dynamic'

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

  const year = getLeagueYear(league.seasons)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      {/* Header */}
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/leagues/${leagueId}`}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              {league.name}
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-surface/30 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">
            <Link
              href={`/leagues/${leagueId}`}
              className="py-3 px-4 text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            >
              Overview
            </Link>
            <Link
              href={`/leagues/${leagueId}/team`}
              className="py-3 px-4 text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            >
              My Team
            </Link>
            <Link
              href={`/leagues/${leagueId}/bracket`}
              className="py-3 px-4 text-text-primary border-b-2 border-brand whitespace-nowrap"
            >
              Playoff Bracket
            </Link>
            <Link
              href={`/leagues/${leagueId}/transactions`}
              className="py-3 px-4 text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
            >
              Add/Drop
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">{year} College Football Playoff</h1>
          <p className="text-text-secondary mt-2">12-team bracket with schools from your roster highlighted</p>
        </div>

        <ErrorBoundary sectionName="playoff bracket">
          <PlayoffBracket
            seasonId={league.season_id}
            rosterSchoolIds={rosterSchoolIds}
            leagueId={leagueId}
          />
        </ErrorBoundary>

        {/* Roster schools in playoffs */}
        {rosterSchoolIds.length > 0 && (
          <div className="mt-8 bg-surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Your Playoff Teams</h2>
            <p className="text-text-secondary text-sm mb-4">
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
