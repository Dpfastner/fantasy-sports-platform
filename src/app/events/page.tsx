import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'

// Sport metadata (matches Locker Room dashboard)
const sportMeta: Record<string, { icon: string; label: string; borderColor: string; gradient: string }> = {
  college_football: { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500', gradient: 'from-orange-900/20 to-orange-800/5' },
  hockey: { icon: '\uD83C\uDFD2', label: 'Hockey', borderColor: 'border-l-blue-500', gradient: 'from-blue-900/20 to-blue-800/5' },
  golf: { icon: '\u26F3', label: 'Golf', borderColor: 'border-l-green-500', gradient: 'from-green-900/20 to-green-800/5' },
  rugby: { icon: '\uD83C\uDFC9', label: 'Rugby', borderColor: 'border-l-red-500', gradient: 'from-red-900/20 to-red-800/5' },
  football: { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500', gradient: 'from-orange-900/20 to-orange-800/5' },
  basketball: { icon: '\uD83C\uDFC0', label: 'Basketball', borderColor: 'border-l-amber-500', gradient: 'from-amber-900/20 to-amber-800/5' },
  baseball: { icon: '\u26BE', label: 'Baseball', borderColor: 'border-l-red-500', gradient: 'from-red-900/20 to-red-800/5' },
  soccer: { icon: '\u26BD', label: 'Soccer', borderColor: 'border-l-green-500', gradient: 'from-green-900/20 to-green-800/5' },
}
const defaultSportMeta = { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500', gradient: 'from-orange-900/20 to-orange-800/5' }

const formatLabel: Record<string, string> = {
  bracket: 'Bracket',
  pickem: "Pick'em",
  survivor: 'Survivor',
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/20 text-success-text',
  upcoming: 'bg-brand/20 text-brand',
  completed: 'bg-surface-inset text-text-muted',
  cancelled: 'bg-danger/20 text-danger-text',
}

export const metadata = {
  title: 'Browse Competitions — Rivyls',
  description: 'Season leagues, brackets, pick\'em, and survivor competitions across every sport.',
}

// Map sport config IDs to DB sport slugs
const sportSlugMap: Record<string, string> = {
  cfb: 'college_football',
  hockey: 'hockey',
  golf: 'golf',
  rugby: 'rugby',
  football: 'college_football',
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const params = await searchParams
  const sportFilter = params.sport ? sportSlugMap[params.sport] || params.sport : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile for header
  let profile: { display_name: string | null; email: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Get all tournaments (public read), optionally filtered by sport
  let tournamentsQuery = supabase
    .from('event_tournaments')
    .select('*')
    .in('status', ['upcoming', 'active'])
  if (sportFilter) {
    tournamentsQuery = tournamentsQuery.eq('sport', sportFilter)
  }
  const { data: tournaments } = await tournamentsQuery.order('starts_at', { ascending: true })

  // Get pool counts per tournament
  const tournamentIds = (tournaments || []).map(t => t.id)
  let poolCounts: Record<string, number> = {}
  if (tournamentIds.length > 0) {
    const { data: pools } = await supabase
      .from('event_pools')
      .select('tournament_id')
      .in('tournament_id', tournamentIds)

    for (const pool of pools || []) {
      poolCounts[pool.tournament_id] = (poolCounts[pool.tournament_id] || 0) + 1
    }
  }

  // Get user's entry counts (which tournaments they've joined)
  let userTournamentIds = new Set<string>()
  if (user && tournamentIds.length > 0) {
    const { data: entries } = await supabase
      .from('event_entries')
      .select('pool_id, event_pools(tournament_id)')
      .eq('user_id', user.id)

    for (const entry of entries || []) {
      const pool = entry.event_pools as unknown as { tournament_id: string } | null
      if (pool) userTournamentIds.add(pool.tournament_id)
    }
  }

  // Fetch public leagues (all sports, or filtered)
  const admin = createAdminClient()
  let publicLeagues: Array<{ id: string; name: string; invite_code: string; max_teams: number; memberCount: number; sport_name: string }> = []
  {
    let query = admin
      .from('leagues')
      .select('id, name, invite_code, max_teams, sports(name, slug)')
      .eq('is_public', true)
    if (sportFilter) {
      query = query.eq('sports.slug', sportFilter).not('sports', 'is', null)
    }
    const { data: leagues } = await query

    if (leagues) {
      // Get member counts
      for (const league of leagues) {
        const { count } = await admin
          .from('league_members')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.id)
        const sport = league.sports as unknown as { name: string; slug: string } | null
        const memberCount = count || 0
        if (memberCount < league.max_teams) {
          publicLeagues.push({
            id: league.id,
            name: league.name,
            invite_code: league.invite_code,
            max_teams: league.max_teams,
            memberCount,
            sport_name: sport?.name || 'Football',
          })
        }
      }
    }
  }

  const now = new Date()
  const sportParam = params.sport || ''
  const sportLabel = sportFilter ? (sportMeta[sportFilter] || defaultSportMeta).label : 'All Sports'
  const hasContent = (tournaments?.length || 0) > 0 || publicLeagues.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header
        userName={profile?.display_name}
        userEmail={user?.email}
        userId={user?.id}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="brand-h1 text-3xl sm:text-4xl text-text-primary mb-2">
              {sportFilter ? `${sportLabel} Competitions` : 'Browse Competitions'}
            </h1>
            <p className="text-text-secondary text-lg">
              {sportFilter
                ? `Season leagues, brackets, pick'em, and survivor competitions for ${sportLabel}.`
                : "Season leagues, brackets, pick'em, and survivor competitions across every sport."
              }
            </p>
          </div>
          <Link
            href={sportParam ? `/leagues/create?sport=${sportParam}` : '/leagues/create'}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-text-primary text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            Create New
          </Link>
        </div>

        {/* Competitions Grid */}
        {!hasContent ? (
          <div className="bg-surface rounded-lg p-12 text-center border border-border">
            <p className="text-text-secondary text-lg mb-2">No competitions available yet</p>
            <p className="text-text-muted mb-4">Be the first to create one!</p>
            <Link
              href={sportParam ? `/leagues/create?sport=${sportParam}` : '/leagues/create'}
              className="inline-block px-6 py-2.5 bg-brand hover:bg-brand-hover text-text-primary text-sm font-semibold rounded-lg transition-colors"
            >
              Create Competition
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Public League Cards */}
            {publicLeagues.map((league) => {
              const leagueMeta = sportMeta[sportFilter || 'college_football'] || defaultSportMeta
              return (
                <Link
                  key={`league-${league.id}`}
                  href={`/leagues/${league.id}`}
                  className={`rounded-xl border-l-4 ${leagueMeta.borderColor} bg-gradient-to-br ${leagueMeta.gradient} border border-border hover:border-brand/40 hover:shadow-lg transition-all group overflow-hidden`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{leagueMeta.icon}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand/15 text-brand-text">
                        Open
                      </span>
                    </div>
                    <h2 className="text-text-primary font-bold text-lg mb-1 group-hover:text-brand transition-colors truncate">
                      {league.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <span>{league.sport_name}</span>
                      <span className="w-1 h-1 rounded-full bg-text-muted" />
                      <span>Season League</span>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      {league.memberCount}/{league.max_teams} teams
                    </p>
                  </div>
                </Link>
              )
            })}

            {/* Tournament Cards */}
            {[...(tournaments || [])]
              .sort((a, b) => {
                // Group by sport, then by start date
                if (a.sport !== b.sport) {
                  const labelA = (sportMeta[a.sport] || defaultSportMeta).label
                  const labelB = (sportMeta[b.sport] || defaultSportMeta).label
                  return labelA.localeCompare(labelB)
                }
                return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
              })
              .map((tournament) => {
              const startsAt = new Date(tournament.starts_at)
              const daysUntil = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isJoined = userTournamentIds.has(tournament.id)
              const pools = poolCounts[tournament.id] || 0
              const meta = sportMeta[tournament.sport] || defaultSportMeta
              const isLive = tournament.status === 'active'

              return (
                <Link
                  key={tournament.id}
                  href={`/events/${tournament.slug}`}
                  className={`rounded-xl border-l-4 ${meta.borderColor} bg-gradient-to-br ${meta.gradient} border border-border hover:border-brand/40 hover:shadow-lg transition-all group overflow-hidden`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isLive ? 'bg-success/20 text-success-text' : statusStyles[tournament.status] || 'bg-brand/15 text-brand-text'
                        }`}>
                          {tournament.status === 'upcoming' && daysUntil > 0
                            ? `Starts in ${daysUntil}d`
                            : isLive
                            ? 'Live'
                            : tournament.status}
                        </span>
                        {isJoined && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success/20 text-success-text">
                            Joined
                          </span>
                        )}
                      </div>
                    </div>
                    <h2 className="text-text-primary font-bold text-lg mb-1 group-hover:text-brand transition-colors truncate">
                      {tournament.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <span>{meta.label}</span>
                      <span className="w-1 h-1 rounded-full bg-text-muted" />
                      <span>{formatLabel[tournament.format] || tournament.format}</span>
                    </div>
                    {pools > 0 && (
                      <p className="text-xs text-text-muted mt-2">{pools} pool{pools !== 1 ? 's' : ''} active</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
