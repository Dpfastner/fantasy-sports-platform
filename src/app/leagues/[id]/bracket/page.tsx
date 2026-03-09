import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PlayoffBracket } from '@/components/PlayoffBracket'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ShareButton } from '@/components/ShareButton'
import { buildShareUrl } from '@/lib/share'
import { SITE_URL } from '@/lib/og/constants'
import { getLeagueYear } from '@/lib/league-helpers'
import { LeagueNav } from '@/components/LeagueNav'
import { Header } from '@/components/Header'

// Force dynamic rendering to ensure fresh data from database
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: leagueId } = await params
  const ogImageUrl = `${SITE_URL}/api/og/bracket?leagueId=${leagueId}`
  return {
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
    },
  }
}

export default async function BracketPage({ params }: PageProps) {
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
      <Header userName={profile?.display_name} userEmail={user.email} userId={user.id} />

      <LeagueNav leagueId={leagueId} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{year} College Football Playoff</h1>
            <p className="text-text-secondary mt-2">12-team bracket — top 4 seeds get a first-round bye. Schools on your roster are highlighted.</p>
          </div>
          <ShareButton
            shareData={{
              title: `${year} CFP Bracket — ${league.name}`,
              text: `Check out the ${year} College Football Playoff bracket on Rivyls!`,
              url: buildShareUrl(`/leagues/${leagueId}/bracket`, { source: 'bracket' }),
            }}
            ogImageUrl={`${SITE_URL}/api/og/bracket?leagueId=${leagueId}`}
            label="Share Bracket"
          />
        </div>

        <ErrorBoundary sectionName="playoff bracket">
          <PlayoffBracket
            seasonId={league.season_id}
            rosterSchoolIds={rosterSchoolIds}
            leagueId={leagueId}
          />
        </ErrorBoundary>

        {/* Bracket info */}
        <div className="mt-8 bg-surface rounded-lg p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-3">How Playoff Scoring Works</h2>
          <div className="text-text-secondary text-sm space-y-2">
            <p>Schools on your roster earn bonus points for each playoff round they play in. Points are awarded on top of regular game scoring.</p>
            <p>Schools from your roster are <span className="text-brand-text font-medium">highlighted in purple</span> on the bracket so you can track their progress.</p>
          </div>

          <h2 className="text-lg font-semibold text-text-primary mt-6 mb-3">How Teams Qualify</h2>
          <div className="text-text-secondary text-sm space-y-2">
            <p>The 12-team CFP field is selected by the College Football Playoff Committee based on regular season performance:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-text-primary font-medium">Seeds 1-4:</span> Conference champions from the top conferences, earning a first-round bye</li>
              <li><span className="text-text-primary font-medium">Seeds 5-12:</span> Remaining at-large selections based on strength of schedule, win-loss record, and committee rankings</li>
            </ul>
            <p>The bracket is automatically populated once the CFP Committee announces the final selections (typically the first Sunday in December).</p>
          </div>
        </div>
      </main>
    </div>
  )
}
