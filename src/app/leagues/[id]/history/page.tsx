import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { getCurrentWeek } from '@/lib/week'
import { getEnvironment } from '@/lib/env'
import { getLeagueYear } from '@/lib/league-helpers'
import { ArchiveSeasonButton } from './ArchiveSeasonButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

interface Standing {
  rank: number
  teamName: string
  userName: string
  totalPoints: number
  teamId: string
  userId: string
}

interface ArchivedSeason {
  id: string
  season_year: number
  final_standings: Standing[]
  champion_user_id: string | null
  archived_at: string
  championName: string | null
}

export default async function HistoryPage({ params }: PageProps) {
  const { id: leagueId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, season_id, seasons(year, name)')
    .eq('id', leagueId)
    .single()

  if (!league) {
    notFound()
  }

  const { data: membership } = await supabase
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    redirect('/dashboard')
  }

  const isCommissioner = membership.role === 'commissioner' || membership.role === 'co-commissioner'
  const year = getLeagueYear(league.seasons)
  const currentWeek = await getCurrentWeek(year)
  const environment = getEnvironment()

  // Fetch archived seasons via the API helper logic (direct query for server component)
  const { data: seasonsData } = await supabase
    .from('league_seasons')
    .select('id, season_year, final_standings, champion_user_id, archived_at')
    .eq('league_id', leagueId)
    .order('season_year', { ascending: false })

  // Get champion names
  const championIds = (seasonsData || [])
    .map(s => s.champion_user_id)
    .filter((id): id is string => !!id)

  let championProfiles: Record<string, string> = {}
  if (championIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', championIds)

    championProfiles = Object.fromEntries(
      (profiles || []).map(p => [p.id, p.display_name || p.email?.split('@')[0] || 'Unknown'])
    )
  }

  const seasons: ArchivedSeason[] = (seasonsData || []).map(s => ({
    id: s.id,
    season_year: s.season_year,
    final_standings: (s.final_standings || []) as Standing[],
    champion_user_id: s.champion_user_id,
    archived_at: s.archived_at || '',
    championName: s.champion_user_id ? championProfiles[s.champion_user_id] || 'Unknown' : null,
  }))

  const currentSeasonArchived = seasons.some(s => s.season_year === year)

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={profile?.display_name}
        userEmail={user.email}
        userId={user.id}
      >
        <Link
          href={`/leagues/${leagueId}`}
          className="text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          ← {league.name}
        </Link>
      </Header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">League History</h1>
          {isCommissioner && !currentSeasonArchived && (
            <ArchiveSeasonButton leagueId={leagueId} seasonYear={year} />
          )}
        </div>

        {seasons.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center">
            <p className="text-text-muted text-lg mb-2">No past seasons yet</p>
            <p className="text-text-secondary text-sm">
              {isCommissioner
                ? 'Archive the current season when it\'s complete to start building your league\'s history.'
                : 'Past season results will appear here once the commissioner archives a season.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {seasons.map(season => (
              <div key={season.id} className="bg-surface rounded-lg overflow-hidden">
                {/* Season Header */}
                <div className="px-4 md:px-6 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {season.season_year - 1}-{season.season_year} Season
                    </h2>
                    {season.championName && (
                      <div className="flex items-center gap-2 bg-warning/10 px-3 py-1.5 rounded-full">
                        <span className="text-base">🏆</span>
                        <span className="text-sm font-semibold text-warning-text">
                          {season.championName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Standings Table */}
                <div className="px-4 md:px-6 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-secondary text-xs uppercase">
                        <th className="text-left py-2 w-12">#</th>
                        <th className="text-left py-2">Team</th>
                        <th className="text-left py-2">Owner</th>
                        <th className="text-right py-2">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {season.final_standings.map((team, idx) => (
                        <tr
                          key={team.teamId || idx}
                          className={`border-t border-border/50 ${idx === 0 ? 'bg-warning/5' : ''}`}
                        >
                          <td className="py-2.5 text-text-secondary">
                            {idx === 0 ? '🏆' : team.rank}
                          </td>
                          <td className="py-2.5 text-text-primary font-medium">
                            {team.teamName}
                          </td>
                          <td className="py-2.5 text-text-secondary">
                            {team.userName}
                          </td>
                          <td className="py-2.5 text-text-primary text-right font-mono">
                            {team.totalPoints.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-4 md:px-6 py-3 border-t border-border bg-surface-subtle">
                  <p className="text-text-muted text-xs">
                    Archived on {new Date(season.archived_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </div>
  )
}
