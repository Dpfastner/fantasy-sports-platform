import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'

// Sport emoji map
const sportIcon: Record<string, string> = {
  hockey: '\uD83C\uDFD2',
  golf: '\u26F3',
  rugby: '\uD83C\uDFC9',
  football: '\uD83C\uDFC8',
  basketball: '\uD83C\uDFC0',
  baseball: '\u26BE',
  soccer: '\u26BD',
}

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
  title: 'Events — Rivyls',
  description: 'Browse and join bracket predictions, survivor leagues, and pick\'em competitions across multiple sports.',
}

export default async function EventsPage() {
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

  // Get all tournaments (public read)
  const { data: tournaments } = await supabase
    .from('event_tournaments')
    .select('*')
    .in('status', ['upcoming', 'active'])
    .order('starts_at', { ascending: true })

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

  const now = new Date()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header
        userName={profile?.display_name}
        userEmail={user?.email}
        userId={user?.id}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="brand-h1 text-3xl sm:text-4xl text-text-primary mb-2">Events</h1>
          <p className="text-text-secondary text-lg">
            Brackets, survivor leagues, and pick&apos;em competitions across every sport.
          </p>
        </div>

        {/* Tournament Grid */}
        {!tournaments?.length ? (
          <div className="bg-surface rounded-lg p-12 text-center border border-border">
            <p className="text-text-secondary text-lg mb-2">No events available yet</p>
            <p className="text-text-muted">Check back soon for upcoming tournaments and competitions.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => {
              const startsAt = new Date(tournament.starts_at)
              const daysUntil = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              const isJoined = userTournamentIds.has(tournament.id)
              const pools = poolCounts[tournament.id] || 0
              const icon = sportIcon[tournament.sport] || '\uD83C\uDFC6'

              return (
                <Link
                  key={tournament.id}
                  href={`/events/${tournament.slug}`}
                  className="bg-surface rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all group"
                >
                  {/* Card Header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[tournament.status] || ''}`}>
                          {tournament.status === 'upcoming' && daysUntil > 0
                            ? `Starts in ${daysUntil}d`
                            : tournament.status === 'active'
                            ? 'Live'
                            : tournament.status}
                        </span>
                      </div>
                      {isJoined && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/20 text-success-text">
                          Joined
                        </span>
                      )}
                    </div>

                    <h2 className="brand-h3 text-lg text-text-primary group-hover:text-brand transition-colors mb-1">
                      {tournament.name}
                    </h2>
                    <p className="text-text-muted text-sm line-clamp-2">
                      {tournament.description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-text-secondary">
                      <span className="capitalize">{formatLabel[tournament.format] || tournament.format}</span>
                      <span>{pools} pool{pools !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-text-muted text-xs">
                      {startsAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {tournament.ends_at && (
                        <> &ndash; {new Date(tournament.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                      )}
                    </span>
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
