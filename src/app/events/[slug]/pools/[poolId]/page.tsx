import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { PoolDetailClient } from './PoolDetailClient'

interface PageProps {
  params: Promise<{ slug: string; poolId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, poolId } = await params
  const admin = createAdminClient()
  const { data: pool } = await admin
    .from('event_pools')
    .select('name, event_tournaments(name)')
    .eq('id', poolId)
    .single()

  if (!pool) return { title: 'Pool Not Found — Rivyls' }

  const tournament = pool.event_tournaments as unknown as { name: string }
  return {
    title: `${pool.name} — ${tournament.name} — Rivyls`,
  }
}

export default async function PoolDetailPage({ params }: PageProps) {
  const { slug, poolId } = await params
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

  const admin = createAdminClient()

  // Get pool with tournament
  const { data: pool } = await admin
    .from('event_pools')
    .select(`
      *,
      event_tournaments(
        id, name, slug, sport, format, status,
        starts_at, ends_at, bracket_size, total_weeks,
        config, rules_text
      )
    `)
    .eq('id', poolId)
    .single()

  if (!pool) notFound()

  const tournament = pool.event_tournaments as unknown as {
    id: string
    name: string
    slug: string
    sport: string
    format: string
    status: string
    starts_at: string
    ends_at: string | null
    bracket_size: number | null
    total_weeks: number | null
    config: Record<string, unknown> | null
    rules_text: string | null
  }

  if (tournament.slug !== slug) notFound()

  // Get participants
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name, short_name, seed, logo_url, metadata')
    .eq('tournament_id', tournament.id)
    .order('seed', { ascending: true })

  // Get games
  const { data: games } = await admin
    .from('event_games')
    .select('id, round, game_number, participant_1_id, participant_2_id, starts_at, status, result')
    .eq('tournament_id', tournament.id)
    .order('game_number', { ascending: true })

  // Get entries (members)
  const { data: entries } = await admin
    .from('event_entries')
    .select('id, user_id, display_name, is_active, submitted_at, score, rank, tiebreaker_prediction, profiles(display_name, email)')
    .eq('pool_id', poolId)
    .order('score', { ascending: false })

  // Get current user's entry
  const userEntry = user
    ? (entries || []).find(e => e.user_id === user.id)
    : null

  // Get current user's picks
  let userPicks: Array<{
    id: string
    game_id: string | null
    participant_id: string
    week_number: number | null
    picked_at: string
  }> = []
  if (userEntry) {
    const { data: picks } = await admin
      .from('event_picks')
      .select('id, game_id, participant_id, week_number, picked_at')
      .eq('entry_id', userEntry.id)
      .order('picked_at', { ascending: true })
    userPicks = picks || []
  }

  // Get pool weeks for survivor
  let poolWeeks: Array<{
    id: string
    week_number: number
    deadline: string
    resolution_status: string
  }> = []
  if (tournament.format === 'survivor') {
    const { data } = await admin
      .from('event_pool_weeks')
      .select('id, week_number, deadline, resolution_status')
      .eq('pool_id', poolId)
      .order('week_number', { ascending: true })
    poolWeeks = data || []
  }

  // Format entries for client
  const members = (entries || []).map(e => {
    const p = e.profiles as unknown as { display_name: string | null; email: string } | null
    return {
      id: e.id,
      userId: e.user_id,
      displayName: e.display_name || p?.display_name || p?.email?.split('@')[0] || 'Anonymous',
      isActive: e.is_active,
      submittedAt: e.submitted_at,
      score: e.score,
      rank: e.rank,
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header
        userName={profile?.display_name}
        userEmail={user?.email}
        userId={user?.id}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
          <Link href="/events" className="hover:text-text-secondary transition-colors">Events</Link>
          <span>/</span>
          <Link href={`/events/${slug}`} className="hover:text-text-secondary transition-colors">{tournament.name}</Link>
          <span>/</span>
          <span className="text-text-secondary">{pool.name}</span>
        </div>

        <PoolDetailClient
          pool={{
            id: pool.id,
            name: pool.name,
            inviteCode: pool.invite_code,
            visibility: pool.visibility,
            status: pool.status,
            tiebreaker: pool.tiebreaker,
            maxEntries: pool.max_entries,
            scoringRules: pool.scoring_rules,
            deadline: pool.deadline,
          }}
          tournament={{
            id: tournament.id,
            name: tournament.name,
            slug: tournament.slug,
            sport: tournament.sport,
            format: tournament.format,
            status: tournament.status,
            startsAt: tournament.starts_at,
            endsAt: tournament.ends_at,
            bracketSize: tournament.bracket_size,
            totalWeeks: tournament.total_weeks,
            config: tournament.config,
          }}
          participants={(participants || []).map(p => ({
            id: p.id,
            name: p.name,
            shortName: p.short_name,
            seed: p.seed,
            logoUrl: p.logo_url,
          }))}
          games={(games || []).map(g => ({
            id: g.id,
            round: g.round,
            gameNumber: g.game_number,
            participant1Id: g.participant_1_id,
            participant2Id: g.participant_2_id,
            startsAt: g.starts_at,
            status: g.status,
            result: g.result as Record<string, unknown> | null,
          }))}
          members={members}
          userEntry={userEntry ? {
            id: userEntry.id,
            isActive: userEntry.is_active,
            submittedAt: userEntry.submitted_at,
            score: userEntry.score,
            rank: userEntry.rank,
            tiebreakerPrediction: userEntry.tiebreaker_prediction as { team1_score: number; team2_score: number } | null,
          } : null}
          userPicks={userPicks.map(p => ({
            id: p.id,
            gameId: p.game_id,
            participantId: p.participant_id,
            weekNumber: p.week_number,
          }))}
          poolWeeks={poolWeeks}
          isLoggedIn={!!user}
        />
      </main>
    </div>
  )
}
