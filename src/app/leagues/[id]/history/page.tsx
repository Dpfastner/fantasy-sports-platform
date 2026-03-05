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
  searchParams: Promise<{ season?: string }>
}

export default async function HistoryPage({ params, searchParams }: PageProps) {
  const { id: leagueId } = await params
  const { season: expandSeason } = await searchParams
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
    let championUserName: string | null = null

    // Fallback: read from final_standings if no profile match
    if (s.final_standings) {
      const fs = s.final_standings as Record<string, unknown>
      if (fs.version === 2) {
        const standings = fs.standings as { teamName: string; userName: string }[]
        if (!championName) championName = standings?.[0]?.teamName || null
        championUserName = standings?.[0]?.userName || null
      } else if (Array.isArray(s.final_standings)) {
        const arr = s.final_standings as { teamName: string; userName: string }[]
        if (!championName) championName = arr?.[0]?.teamName || null
        championUserName = arr?.[0]?.userName || null
      }
    }

    return {
      id: s.id,
      season_year: s.season_year,
      final_standings: s.final_standings,
      archived_at: s.archived_at || '',
      championName,
      championUserName,
    }
  })

  const currentSeasonArchived = seasons.some(s => s.season_year === year)

  // If only one season, default expand it. Otherwise expand from ?season= param
  const shouldExpandAll = seasons.length === 1

  // ── Compute league-wide stats from all v2 seasons ──
  interface SeasonSummary {
    year: number
    champion: string
    championUser: string
    championPoints: number
    runnerUp: string
    runnerUpUser: string
    runnerUpPoints: number
    margin: number
  }

  interface LeagueRecord {
    label: string
    value: string
    detail: string
  }

  const seasonSummaries: SeasonSummary[] = []
  const championCounts = new Map<string, number>()
  const allRecords: LeagueRecord[] = []

  let highestWeekScore = 0
  let highestWeekTeam = ''
  let highestWeekLabel = ''
  let highestWeekYear = 0
  let mostHPWins = 0
  let mostHPTeam = ''
  let closestMargin = Infinity
  let closestYear = 0
  let highestSeasonTotal = 0
  let highestSeasonTeam = ''
  let highestSeasonYear = 0

  for (const s of seasons) {
    if (!s.final_standings) continue
    const fs = s.final_standings as Record<string, unknown>
    if (fs.version !== 2) continue

    const standings = fs.standings as {
      teamName: string; userName: string; totalPoints: number;
      weeklyPoints?: { week: number; label: string; points: number }[];
      roster?: { school: string; points: number }[]
    }[]
    const hpWinners = (fs.highPointsWinners || []) as { winners: string[] }[]

    if (standings.length >= 2) {
      const champ = standings[0]
      const runner = standings[1]
      const margin = champ.totalPoints - runner.totalPoints

      seasonSummaries.push({
        year: s.season_year,
        champion: champ.teamName,
        championUser: champ.userName,
        championPoints: champ.totalPoints,
        runnerUp: runner.teamName,
        runnerUpUser: runner.userName,
        runnerUpPoints: runner.totalPoints,
        margin,
      })

      // Dynasty tracker
      const key = champ.userName || champ.teamName
      championCounts.set(key, (championCounts.get(key) || 0) + 1)

      // Closest race
      if (margin < closestMargin) {
        closestMargin = margin
        closestYear = s.season_year
      }
    }

    // Highest season total
    if (standings.length > 0 && standings[0].totalPoints > highestSeasonTotal) {
      highestSeasonTotal = standings[0].totalPoints
      highestSeasonTeam = standings[0].teamName
      highestSeasonYear = s.season_year
    }

    // Highest single-week score
    for (const team of standings) {
      for (const wp of team.weeklyPoints || []) {
        if (wp.points > highestWeekScore) {
          highestWeekScore = wp.points
          highestWeekTeam = team.teamName
          highestWeekLabel = wp.label
          highestWeekYear = s.season_year
        }
      }
    }

    // Most high points wins in a season
    const hpCountBySeason = new Map<string, number>()
    for (const hp of hpWinners) {
      for (const winner of hp.winners) {
        hpCountBySeason.set(winner, (hpCountBySeason.get(winner) || 0) + 1)
      }
    }
    for (const [team, count] of hpCountBySeason) {
      if (count > mostHPWins) {
        mostHPWins = count
        mostHPTeam = team
      }
    }
  }

  // Build records array
  if (highestWeekScore > 0) {
    allRecords.push({
      label: 'Highest Single-Week Score',
      value: `${highestWeekScore} pts`,
      detail: `${highestWeekTeam} — ${highestWeekLabel} (${highestWeekYear - 1}-${highestWeekYear})`,
    })
  }
  if (highestSeasonTotal > 0) {
    allRecords.push({
      label: 'Highest Season Total',
      value: `${highestSeasonTotal} pts`,
      detail: `${highestSeasonTeam} (${highestSeasonYear - 1}-${highestSeasonYear})`,
    })
  }
  if (closestMargin < Infinity) {
    allRecords.push({
      label: 'Closest Championship Race',
      value: `${closestMargin} pt${closestMargin !== 1 ? 's' : ''}`,
      detail: `${closestYear - 1}-${closestYear} Season`,
    })
  }
  if (mostHPWins > 0) {
    allRecords.push({
      label: 'Most High Points Wins (Season)',
      value: `${mostHPWins} wins`,
      detail: mostHPTeam,
    })
  }

  // Dynasty info
  const dynastyEntries = [...championCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)

  // Back-to-back detection
  const sortedSummaries = [...seasonSummaries].sort((a, b) => a.year - b.year)
  const backToBackChamps: string[] = []
  for (let i = 1; i < sortedSummaries.length; i++) {
    if (sortedSummaries[i].championUser === sortedSummaries[i - 1].championUser) {
      if (!backToBackChamps.includes(sortedSummaries[i].championUser)) {
        backToBackChamps.push(sortedSummaries[i].championUser)
      }
    }
  }

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
          <div className="space-y-4">
            {/* Seasons at a Glance */}
            {seasonSummaries.length > 0 && (
              <div className="bg-surface rounded-lg overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Seasons at a Glance</h2>
                </div>
                <div className="px-4 md:px-6 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-muted text-xs uppercase">
                        <th className="text-left py-1.5">Season</th>
                        <th className="text-left py-1.5">Champion</th>
                        <th className="text-right py-1.5 hidden sm:table-cell">Pts</th>
                        <th className="text-left py-1.5 hidden md:table-cell">Runner-Up</th>
                        <th className="text-right py-1.5 hidden md:table-cell">Pts</th>
                        <th className="text-right py-1.5">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonSummaries.map(s => (
                        <tr key={s.year} className="border-t border-border/30">
                          <td className="py-2 text-text-primary font-medium">{s.year - 1}-{s.year}</td>
                          <td className="py-2">
                            <span className="text-warning-text font-medium">{s.championUser}</span>
                            <span className="text-text-muted text-xs ml-1 hidden sm:inline">({s.champion})</span>
                          </td>
                          <td className="py-2 text-right font-mono text-text-primary hidden sm:table-cell">{s.championPoints}</td>
                          <td className="py-2 text-text-secondary hidden md:table-cell">
                            {s.runnerUpUser}
                            <span className="text-text-muted text-xs ml-1">({s.runnerUp})</span>
                          </td>
                          <td className="py-2 text-right font-mono text-text-secondary hidden md:table-cell">{s.runnerUpPoints}</td>
                          <td className="py-2 text-right font-mono text-text-primary">{s.margin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dynasty Tracker + League Records */}
            {(dynastyEntries.length > 0 || backToBackChamps.length > 0 || allRecords.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dynasty Tracker */}
                {(dynastyEntries.length > 0 || backToBackChamps.length > 0) && (
                  <div className="bg-surface rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Dynasty Tracker</h2>
                    <div className="space-y-2">
                      {dynastyEntries.map(([name, count]) => (
                        <div key={name} className="flex items-center gap-2 text-sm">
                          <span className="text-warning-text">👑</span>
                          <span className="text-text-primary font-medium">{name}</span>
                          <span className="text-brand-text font-semibold">{count}x Champion</span>
                        </div>
                      ))}
                      {backToBackChamps.map(name => (
                        <div key={`b2b-${name}`} className="flex items-center gap-2 text-sm">
                          <span className="text-warning-text">🔥</span>
                          <span className="text-text-primary font-medium">{name}</span>
                          <span className="text-text-secondary">Back-to-Back</span>
                        </div>
                      ))}
                      {dynastyEntries.length === 0 && backToBackChamps.length === 0 && (
                        <p className="text-text-muted text-xs">No dynasties yet — keep playing!</p>
                      )}
                    </div>
                  </div>
                )}

                {/* League Records */}
                {allRecords.length > 0 && (
                  <div className="bg-surface rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">League Records</h2>
                    <div className="space-y-3">
                      {allRecords.map((record) => (
                        <div key={record.label}>
                          <div className="flex items-baseline justify-between">
                            <span className="text-text-secondary text-xs">{record.label}</span>
                            <span className="text-text-primary font-mono font-semibold text-sm">{record.value}</span>
                          </div>
                          <p className="text-text-muted text-xs mt-0.5">{record.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Season Cards */}
            {seasons.map(season => (
              <HistorySeasonCard
                key={season.id}
                seasonYear={season.season_year}
                finalStandings={season.final_standings}
                championName={season.championName}
                championUserName={season.championUserName}
                archivedAt={season.archived_at}
                defaultExpanded={shouldExpandAll || expandSeason === String(season.season_year)}
              />
            ))}
          </div>
        )}
      </main>

      <SandboxWeekSelector currentWeek={currentWeek} environment={environment} />
    </div>
  )
}
