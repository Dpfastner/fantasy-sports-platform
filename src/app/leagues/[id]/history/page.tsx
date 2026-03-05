import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { SandboxWeekSelector } from '@/components/SandboxWeekSelector'
import { getCurrentWeek } from '@/lib/week'
import { getEnvironment } from '@/lib/env'
import { getLeagueYear } from '@/lib/league-helpers'
import { ArchiveSeasonButton } from './ArchiveSeasonButton'
import { HistorySeasonCard } from './HistorySeasonCard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
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

  // Fetch archived seasons
  const { data: seasonsData } = await supabase
    .from('league_seasons')
    .select('id, season_year, final_standings, champion_user_id, archived_at')
    .eq('league_id', leagueId)
    .order('season_year', { ascending: false })

  // Get champion names from profiles (for seasons with champion_user_id)
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

  // Build season data with champion name fallback
  const seasons = (seasonsData || []).map(s => {
    let championName: string | null = s.champion_user_id
      ? championProfiles[s.champion_user_id] || null
      : null

    // Fallback: read from final_standings if no profile match
    if (!championName && s.final_standings) {
      const fs = s.final_standings as Record<string, unknown>
      if (fs.version === 2) {
        const standings = fs.standings as { rank: number; teamName: string }[]
        championName = standings?.[0]?.teamName || null
      } else if (Array.isArray(s.final_standings)) {
        const arr = s.final_standings as { rank: number; teamName: string }[]
        championName = arr?.[0]?.teamName || null
      }
    }

    return {
      id: s.id,
      season_year: s.season_year,
      final_standings: s.final_standings,
      archived_at: s.archived_at || '',
      championName,
    }
  })

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
              <HistorySeasonCard
                key={season.id}
                seasonYear={season.season_year}
                finalStandings={season.final_standings}
                championName={season.championName}
                archivedAt={season.archived_at}
              />
            ))}
          </div>
        )}
      </main>

      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </div>
  )
}
