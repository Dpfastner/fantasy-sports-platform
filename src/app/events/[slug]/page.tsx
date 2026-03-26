import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { EventPoolsClient } from './EventPoolsClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: tournament } = await supabase
    .from('event_tournaments')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!tournament) return { title: 'Event Not Found — Rivyls' }

  return {
    title: `${tournament.name} — Rivyls`,
    description: tournament.description,
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params
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

  // Get tournament
  const { data: tournament } = await supabase
    .from('event_tournaments')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tournament) notFound()

  // Get participants (sort client-side to guarantee seed order)
  const { data: rawParticipants } = await supabase
    .from('event_participants')
    .select('id, name, short_name, seed, logo_url, metadata')
    .eq('tournament_id', tournament.id)

  const participants = (rawParticipants || []).sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed
    if (a.seed != null) return -1
    if (b.seed != null) return 1
    // Unseeded: sort by win count descending (from season_record like "29-7-1")
    const aRecord = (a.metadata as Record<string, unknown>)?.season_record
    const bRecord = (b.metadata as Record<string, unknown>)?.season_record
    const aWins = typeof aRecord === 'string' ? parseInt(aRecord.split('-')[0], 10) || 0 : 0
    const bWins = typeof bRecord === 'string' ? parseInt(bRecord.split('-')[0], 10) || 0 : 0
    if (bWins !== aWins) return bWins - aWins
    return a.name.localeCompare(b.name)
  })

  // Get pools (public + user's) with entry counts
  const admin = createAdminClient()
  const { data: allPools } = await admin
    .from('event_pools')
    .select('id, name, created_by, visibility, status, tiebreaker, max_entries, max_entries_per_user, invite_code, scoring_rules, game_type, created_at')
    .eq('tournament_id', tournament.id)
    .order('created_at', { ascending: false })

  // Get entry counts
  const poolIds = (allPools || []).map(p => p.id)
  let entryCounts: Record<string, number> = {}
  let userPoolIds = new Set<string>()

  if (poolIds.length > 0) {
    const { data: entries } = await admin
      .from('event_entries')
      .select('pool_id, user_id')
      .in('pool_id', poolIds)

    for (const entry of entries || []) {
      entryCounts[entry.pool_id] = (entryCounts[entry.pool_id] || 0) + 1
      if (user && entry.user_id === user.id) {
        userPoolIds.add(entry.pool_id)
      }
    }
  }

  // Filter pools: public + user's pools + pools user created
  const pools = (allPools || [])
    .filter(p =>
      p.visibility === 'public' ||
      (user && p.created_by === user.id) ||
      userPoolIds.has(p.id)
    )
    .map(p => ({
      ...p,
      entry_count: entryCounts[p.id] || 0,
      is_member: userPoolIds.has(p.id),
    }))

  // Format dates
  const startsAt = new Date(tournament.starts_at)
  const endsAt = tournament.ends_at ? new Date(tournament.ends_at) : null
  const now = new Date()
  const daysUntil = Math.ceil((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const formatLabel: Record<string, string> = {
    bracket: 'Bracket Prediction',
    pickem: "Pick'em",
    survivor: 'Survivor League',
    roster: 'Roster Pool',
    multi: 'Multi-format',
  }

  const config = (tournament.config || {}) as Record<string, unknown>
  const allowedGameTypes = config.allowed_game_types as string[] | undefined

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header
        userName={profile?.display_name}
        userEmail={user?.email}
        userId={user?.id}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <div className="bg-surface rounded-lg border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="brand-h2 text-2xl sm:text-3xl text-text-primary">{tournament.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  tournament.status === 'active' ? 'bg-success/20 text-success-text' :
                  tournament.status === 'upcoming' ? 'bg-brand/20 text-brand' :
                  'bg-surface-inset text-text-muted'
                }`}>
                  {tournament.status === 'upcoming' && daysUntil > 0
                    ? `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                    : tournament.status}
                </span>
              </div>
              <p className="text-text-secondary mb-3">{tournament.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                <span className="capitalize">{formatLabel[tournament.format] || tournament.format}</span>
                <span>
                  {startsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {endsAt && <> &ndash; {endsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</>}
                </span>
                {tournament.bracket_size && <span>{tournament.bracket_size} teams</span>}
                {tournament.total_weeks && <span>{tournament.total_weeks} rounds</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Pools */}
          <div className="lg:col-span-2">
            <EventPoolsClient
              tournamentId={tournament.id}
              tournamentSlug={tournament.slug}
              tournamentFormat={tournament.format}
              allowedGameTypes={allowedGameTypes}
              pools={pools}
              isLoggedIn={!!user}
            />
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Rules (collapsible, starts collapsed) */}
            {tournament.rules_text && (
              <details className="bg-surface rounded-lg border border-border p-5 group">
                <summary className="brand-h3 text-lg text-text-primary cursor-pointer list-none flex items-center justify-between">
                  Rules
                  <svg className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="text-text-secondary text-sm prose-sm prose-invert max-w-none space-y-2 mt-3 [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1">
                  {(() => {
                    const lines = tournament.rules_text.split('\n')
                    const elements: React.ReactNode[] = []
                    let listItems: React.ReactNode[] = []
                    let listType: 'ul' | 'ol' | null = null

                    const flushList = () => {
                      if (listItems.length > 0) {
                        const key = `list-${elements.length}`
                        if (listType === 'ol') {
                          elements.push(<ol key={key} className="list-decimal pl-6 space-y-1">{listItems}</ol>)
                        } else {
                          elements.push(<ul key={key} className="list-disc pl-6 space-y-1">{listItems}</ul>)
                        }
                        listItems = []
                        listType = null
                      }
                    }

                    lines.forEach((line: string, i: number) => {
                      if (line.startsWith('## ')) { flushList(); elements.push(<h2 key={i}>{line.replace('## ', '')}</h2>) }
                      else if (line.startsWith('### ')) { flushList(); elements.push(<h3 key={i}>{line.replace('### ', '')}</h3>) }
                      else if (line.startsWith('- ')) { listType = listType || 'ul'; listItems.push(<li key={i}>{line.replace('- ', '')}</li>) }
                      else if (line.match(/^\d+\./)) { listType = listType || 'ol'; listItems.push(<li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>) }
                      else if (line.trim() === '') { flushList() }
                      else { flushList(); elements.push(<p key={i}>{line}</p>) }
                    })
                    flushList()
                    return elements
                  })()}
                </div>
              </details>
            )}

            {/* Participants */}
            {participants && participants.length > 0 && (
              <div className="bg-surface rounded-lg border border-border p-5">
                <h3 className="brand-h3 text-lg text-text-primary mb-3">
                  {tournament.format === 'bracket' ? 'Teams' :
                   tournament.format === 'survivor' ? 'Teams' :
                   tournament.sport === 'golf' ? 'Field' : 'Participants'}
                  <span className="text-text-muted font-normal text-sm ml-2">({participants.length})</span>
                </h3>
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {participants.map((p) => {
                    const meta = (p.metadata || {}) as Record<string, unknown>
                    const countryCode = typeof meta.country_code === 'string' ? meta.country_code : null
                    const country = typeof meta.country === 'string' ? meta.country : undefined
                    const tier = typeof meta.tier === 'string' ? meta.tier : null
                    const seasonRecord = typeof meta.season_record === 'string' ? meta.season_record : null
                    return (
                      <div key={p.id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          {p.seed ? (
                            <span className="text-text-muted w-5 text-right text-xs">{p.seed}</span>
                          ) : null}
                          {p.logo_url && (
                            <img src={p.logo_url} alt="" className="w-5 h-5 object-contain shrink-0" />
                          )}
                          {!p.logo_url && countryCode && (
                            <img
                              src={`https://flagcdn.com/24x18/${countryCode}.png`}
                              alt={country || ''}
                              title={country || ''}
                              width={18}
                              height={14}
                              className="inline-block shrink-0 rounded-[2px]"
                              loading="lazy"
                            />
                          )}
                          <span className="text-text-primary">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {tier && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              tier === 'A' ? 'bg-brand/15 text-brand' :
                              tier === 'B' ? 'bg-warning/15 text-warning-text' :
                              'bg-surface-inset text-text-muted'
                            }`}>
                              {tier}
                            </span>
                          )}
                          {seasonRecord && (
                            <span className="text-text-muted text-xs">{seasonRecord}</span>
                          )}
                          {p.short_name && (
                            <span className="text-text-muted text-xs">{p.short_name}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
