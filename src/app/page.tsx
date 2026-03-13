import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

const sportMeta: Record<string, { icon: string; label: string; borderColor: string }> = {
  college_football: { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500' },
  hockey: { icon: '\uD83C\uDFD2', label: 'Hockey', borderColor: 'border-l-blue-500' },
  golf: { icon: '\u26F3', label: 'Golf', borderColor: 'border-l-green-500' },
  rugby: { icon: '\uD83C\uDFC9', label: 'Rugby', borderColor: 'border-l-red-500' },
  football: { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500' },
  basketball: { icon: '\uD83C\uDFC0', label: 'Basketball', borderColor: 'border-l-amber-500' },
}
const defaultSportMeta = { icon: '\uD83C\uDFC8', label: 'Football', borderColor: 'border-l-orange-500' }

const formatLabel: Record<string, string> = {
  bracket: 'Bracket',
  pickem: "Pick'em",
  survivor: 'Survivor',
  roster: 'Roster',
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/20 text-success-text',
  upcoming: 'bg-brand/20 text-brand',
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect('/dashboard')
  }

  // Fetch live/upcoming events for the landing page
  const { data: tournaments } = await supabase
    .from('event_tournaments')
    .select('id, name, slug, sport, format, status, description, starts_at, ends_at')
    .in('status', ['upcoming', 'active'])
    .order('starts_at', { ascending: true })
    .limit(3)

  // Pool counts
  const tournamentIds = (tournaments || []).map(t => t.id)
  let poolCounts: Record<string, number> = {}
  if (tournamentIds.length > 0) {
    const { data: pools } = await supabase
      .from('event_pools')
      .select('tournament_id')
      .in('tournament_id', tournamentIds)
    for (const p of pools || []) {
      poolCounts[p.tournament_id] = (poolCounts[p.tournament_id] || 0) + 1
    }
  }

  const now = new Date()
  const hasEvents = tournaments && tournaments.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to text-text-primary">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Rivyls
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            Brackets, survivor leagues, and fantasy rosters across every sport.
            Compete with friends &mdash; it&apos;s free.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Live & Upcoming Events */}
        <div className="bg-surface rounded-xl p-6 mb-16 border border-border/50 shadow-lg shadow-black/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Live &amp; Upcoming</h2>
            <Link href="/events" className="text-sm text-brand hover:text-brand-hover transition-colors">
              Browse all &rarr;
            </Link>
          </div>
          {hasEvents ? (
            <div className="grid md:grid-cols-3 gap-4">
              {tournaments.map((tournament) => {
                const meta = sportMeta[tournament.sport] || defaultSportMeta
                const startsAt = new Date(tournament.starts_at)
                const daysUntil = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                const pools = poolCounts[tournament.id] || 0
                return (
                  <Link
                    key={tournament.id}
                    href={`/events/${tournament.slug}`}
                    className={`bg-surface-subtle rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all group border-l-4 ${meta.borderColor}`}
                  >
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="text-2xl shrink-0">{meta.icon}</span>
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-text-primary group-hover:text-brand transition-colors truncate">
                              {tournament.name}
                            </h3>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusStyles[tournament.status] || ''}`}>
                          {tournament.status === 'upcoming' && daysUntil > 0
                            ? `Starts in ${daysUntil}d`
                            : tournament.status === 'active'
                            ? 'Live'
                            : tournament.status}
                        </span>
                      </div>
                      {tournament.description && (
                        <p className="text-text-muted text-sm line-clamp-2 ml-9">{tournament.description}</p>
                      )}
                    </div>
                    <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4 text-text-secondary">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent-text">
                          {formatLabel[tournament.format] || tournament.format}
                        </span>
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
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-subtle p-5 rounded-lg border-l-4 border-l-orange-500">
                <span className="text-2xl">🏈</span>
                <h3 className="text-lg font-semibold mt-2">Football</h3>
                <p className="text-text-secondary text-sm mt-1">Fantasy leagues with college football programs</p>
              </div>
              <div className="bg-surface-subtle p-5 rounded-lg border-l-4 border-l-blue-500">
                <span className="text-2xl">🏒</span>
                <h3 className="text-lg font-semibold mt-2">Hockey</h3>
                <p className="text-text-secondary text-sm mt-1">Bracket predictions for NCAA hockey tournaments</p>
              </div>
              <div className="bg-surface-subtle p-5 rounded-lg border-l-4 border-l-green-500">
                <span className="text-2xl">⛳</span>
                <h3 className="text-lg font-semibold mt-2">Golf</h3>
                <p className="text-text-secondary text-sm mt-1">Roster competitions for major golf tournaments</p>
              </div>
              <div className="bg-surface-subtle p-5 rounded-lg border-l-4 border-l-red-500">
                <span className="text-2xl">🏉</span>
                <h3 className="text-lg font-semibold mt-2">Rugby</h3>
                <p className="text-text-secondary text-sm mt-1">Survivor and pick'em for the Six Nations</p>
              </div>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Pick Your Game</h4>
              <p className="text-text-secondary text-sm">
                Choose a bracket, survivor league, roster competition, or fantasy league
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Make Your Picks</h4>
              <p className="text-text-secondary text-sm">
                Fill your bracket, pick survivors, draft your roster, or set your lineup
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Compete &amp; Win</h4>
              <p className="text-text-secondary text-sm">
                Track live scores, climb the leaderboard, and talk trash with your rivals
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-highlight-row rounded-xl p-8 text-center border border-border/50 shadow-lg shadow-black/10">
          <h2 className="text-2xl font-bold mb-4">
            Jump into the action
          </h2>
          <p className="text-text-secondary mb-6">
            Free to play. Pick an event and start competing.
          </p>
          <Link
            href="/events"
            className="inline-block bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  )
}
