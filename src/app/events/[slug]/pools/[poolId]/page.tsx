import { notFound, redirect } from 'next/navigation'
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
    .select('name, event_tournaments(name, format)')
    .eq('id', poolId)
    .single()

  if (!pool) return { title: 'Pool Not Found — Rivyls' }

  const tournament = pool.event_tournaments as unknown as { name: string; format: string }
  const title = `${pool.name} — ${tournament.name} — Rivyls`
  const description = `Join the ${tournament.format} pool "${pool.name}" for ${tournament.name} on Rivyls!`
  const ogImageUrl = `https://rivyls.com/api/og/pool?poolId=${poolId}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function PoolDetailPage({ params }: PageProps) {
  const { slug, poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login with return URL
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/events/${slug}/pools/${poolId}`)}`)
  }

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

  // Get games (include live score data)
  const { data: games } = await admin
    .from('event_games')
    .select('id, round, game_number, participant_1_id, participant_2_id, participant_1_score, participant_2_score, starts_at, status, result, period, clock, live_status, winner_id')
    .eq('tournament_id', tournament.id)
    .order('game_number', { ascending: true })

  // Get entries (members) — no FK join on user_id since it's nullable after soft-delete
  const { data: entries } = await admin
    .from('event_entries')
    .select('id, user_id, display_name, is_active, submitted_at, total_points, tiebreaker_prediction, primary_color, secondary_color, image_url')
    .eq('pool_id', poolId)
    .order('total_points', { ascending: pool.game_type === 'roster' })

  // Fetch profiles separately for entries that have a user_id
  const entryUserIds = (entries || []).map(e => e.user_id).filter(Boolean) as string[]
  let profileMap: Record<string, { display_name: string | null; email: string }> = {}
  if (entryUserIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, email')
      .in('id', entryUserIds)
    for (const p of (profiles || [])) {
      profileMap[p.id] = { display_name: p.display_name, email: p.email }
    }
  }

  // Get current user's entries — auto-join if creator without entry
  const userEntries = user
    ? (entries || []).filter(e => e.user_id === user.id)
    : []

  if (user && userEntries.length === 0 && pool.created_by === user.id) {
    // Creator should always be a member — auto-fix if entry is missing
    // Use a direct existence check to prevent duplicate inserts from redirect loops
    const { count } = await admin
      .from('event_entries')
      .select('id', { count: 'exact', head: true })
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
    if (count === 0) {
      await admin
        .from('event_entries')
        .insert({ pool_id: poolId, user_id: user.id })
      redirect(`/events/${slug}/pools/${poolId}`)
    }
  }

  // Get current user's picks (for all their entries)
  let userPicksByEntry: Record<string, Array<{
    id: string
    game_id: string | null
    participant_id: string
    week_number: number | null
    picked_at: string
  }>> = {}
  if (userEntries.length > 0) {
    const userEntryIds = userEntries.map(e => e.id)
    const { data: picks } = await admin
      .from('event_picks')
      .select('id, entry_id, game_id, participant_id, week_number, picked_at')
      .in('entry_id', userEntryIds)
      .order('picked_at', { ascending: true })
    for (const p of (picks || [])) {
      if (!userPicksByEntry[p.entry_id]) userPicksByEntry[p.entry_id] = []
      userPicksByEntry[p.entry_id].push(p)
    }
  }

  // Get pool weeks for survivor
  let poolWeeks: Array<{
    id: string
    week_number: number
    deadline: string
    resolution_status: string
  }> = []
  if (pool.game_type === 'survivor' || (tournament.format === 'survivor' && !pool.game_type)) {
    const { data } = await admin
      .from('event_pool_weeks')
      .select('id, week_number, deadline, resolution_status')
      .eq('pool_id', poolId)
      .order('week_number', { ascending: true })
    poolWeeks = data || []
  }

  // For bracket format, fetch all picks to compute leaderboard stats
  let allEntryPicks: Record<string, Array<{ game_id: string; participant_id: string; is_correct: boolean | null; points_earned: number | null }>> = {}
  if ((pool.game_type === 'bracket' || (tournament.format === 'bracket' && !pool.game_type)) && entries?.length) {
    const entryIds = entries.map(e => e.id)
    const { data: allPicks } = await admin
      .from('event_picks')
      .select('entry_id, game_id, participant_id, is_correct, points_earned')
      .in('entry_id', entryIds)

    if (allPicks) {
      for (const pick of allPicks) {
        if (!allEntryPicks[pick.entry_id]) allEntryPicks[pick.entry_id] = []
        allEntryPicks[pick.entry_id].push(pick)
      }
    }
  }

  // For roster pools, fetch all submitted entries' picks for the leaderboard
  let allRosterPicks: Record<string, string[]> = {} // entryId → participantIds
  const effectiveFormatForQuery = pool.game_type || tournament.format
  if (effectiveFormatForQuery === 'roster' && entries?.length) {
    const submittedEntryIds = entries.filter(e => e.submitted_at).map(e => e.id)
    if (submittedEntryIds.length > 0) {
      const { data: rosterPicks } = await admin
        .from('event_picks')
        .select('entry_id, participant_id')
        .in('entry_id', submittedEntryIds)
        .is('game_id', null)
        .is('week_number', null)
      if (rosterPicks) {
        for (const pick of rosterPicks) {
          if (!allRosterPicks[pick.entry_id]) allRosterPicks[pick.entry_id] = []
          allRosterPicks[pick.entry_id].push(pick.participant_id)
        }
      }
    }
  }

  // For limited-mode roster pools, compute selection counts per participant
  let rosterSelectionCounts: Record<string, number> = {}
  const poolScoringRules = (pool.scoring_rules || {}) as Record<string, unknown>
  if (poolScoringRules.draft_mode === 'limited' && poolScoringRules.selection_cap) {
    const { data: limitedPicks } = await admin
      .from('event_picks')
      .select('participant_id, entry_id')
      .in('entry_id', (entries || []).map(e => e.id))
      .is('game_id', null)
      .is('week_number', null)

    if (limitedPicks) {
      for (const pick of limitedPicks) {
        rosterSelectionCounts[pick.participant_id] = (rosterSelectionCounts[pick.participant_id] || 0) + 1
      }
    }
  }

  // For survivor format, count picks per entry (= rounds survived)
  let survivorPickCounts: Record<string, number> = {}
  if ((effectiveFormatForQuery === 'survivor') && entries?.length) {
    const entryIds = entries.map(e => e.id)
    const { data: survivorPicks } = await admin
      .from('event_picks')
      .select('entry_id')
      .in('entry_id', entryIds)
    if (survivorPicks) {
      for (const pick of survivorPicks) {
        survivorPickCounts[pick.entry_id] = (survivorPickCounts[pick.entry_id] || 0) + 1
      }
    }
  }

  // Build scoring rules and game lookup for max-possible calculation
  const scoringRules = (pool.scoring_rules && typeof pool.scoring_rules === 'object' && Object.keys(pool.scoring_rules).length > 0)
    ? pool.scoring_rules as Record<string, number>
    : { regional_quarterfinal: 2, regional_final: 4, semifinal: 8, championship: 16 }

  const gameById: Record<string, { round: string; status: string; winnerId: string | null }> = {}
  for (const g of (games || [])) {
    gameById[g.id] = { round: g.round, status: g.status, winnerId: g.winner_id }
  }

  // Format entries for client (compute rank from sorted total_points)
  const members = (entries || []).map((e, idx) => {
    const p = e.user_id ? profileMap[e.user_id] : null

    // Calculate max possible points for this entry
    let maxPossible = Number(e.total_points) || 0
    const entryPicks = allEntryPicks[e.id] || []

    const effectiveFormat = pool.game_type || tournament.format
    if (effectiveFormat === 'bracket') {
      for (const pick of entryPicks) {
        if (!pick.game_id) continue
        const game = gameById[pick.game_id]
        if (!game) continue
        const roundPts = (scoringRules as Record<string, number>)[game.round] || 0
        const isResolved = game.status === 'completed' || game.status === 'final'

        if (!isResolved) {
          // Game not resolved yet — pick could still be correct
          maxPossible += roundPts
        }
      }

      // Also add points for games the user hasn't picked yet (still possible)
      const pickedGameIds = new Set(entryPicks.map(p => p.game_id))
      for (const g of (games || [])) {
        if (!pickedGameIds.has(g.id) && g.status !== 'completed' && g.status !== 'final') {
          maxPossible += (scoringRules as Record<string, number>)[g.round] || 0
        }
      }
    }

    return {
      id: e.id,
      userId: e.user_id,
      entryName: e.display_name || null,
      userName: p?.display_name || p?.email?.split('@')[0] || 'Anonymous',
      displayName: e.display_name || p?.display_name || p?.email?.split('@')[0] || 'Anonymous',
      isActive: e.is_active,
      submittedAt: e.submitted_at,
      score: Number(e.total_points) || 0,
      maxPossible,
      rank: idx + 1,
      roundsSurvived: survivorPickCounts[e.id] || 0,
      tiebreakerPrediction: e.tiebreaker_prediction as { team1_score: number; team2_score: number } | null,
      primaryColor: e.primary_color as string | null,
      secondaryColor: e.secondary_color as string | null,
      imageUrl: e.image_url as string | null,
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
            maxEntriesPerUser: pool.max_entries_per_user ?? 1,
            gameType: pool.game_type,
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
            ...(pool.game_type === 'roster' || tournament.format === 'multi' ? { metadata: p.metadata as Record<string, unknown> } : {}),
          }))}
          games={(games || []).map(g => ({
            id: g.id,
            round: g.round,
            gameNumber: g.game_number,
            participant1Id: g.participant_1_id,
            participant2Id: g.participant_2_id,
            participant1Score: g.participant_1_score,
            participant2Score: g.participant_2_score,
            startsAt: g.starts_at,
            status: g.status,
            result: g.result as Record<string, unknown> | null,
            period: g.period,
            clock: g.clock,
            liveStatus: g.live_status,
            winnerId: g.winner_id,
          }))}
          members={members}
          userEntries={userEntries.map(ue => ({
            id: ue.id,
            displayName: ue.display_name || '',
            isActive: ue.is_active,
            submittedAt: ue.submitted_at,
            score: Number(ue.total_points) || 0,
            rank: members.findIndex(m => m.id === ue.id) + 1 || null,
            tiebreakerPrediction: ue.tiebreaker_prediction as { team1_score: number; team2_score: number } | null,
            primaryColor: ue.primary_color as string | null,
            secondaryColor: ue.secondary_color as string | null,
            imageUrl: ue.image_url as string | null,
          }))}
          userPicksByEntry={Object.fromEntries(
            Object.entries(userPicksByEntry).map(([entryId, picks]) => [
              entryId,
              picks.map(p => ({
                id: p.id,
                gameId: p.game_id,
                participantId: p.participant_id,
                weekNumber: p.week_number,
              })),
            ])
          )}
          poolWeeks={poolWeeks}
          isLoggedIn={!!user}
          isCreator={!!user && pool.created_by === user.id}
          userId={user?.id || null}
          rulesText={tournament.rules_text || null}
          rosterSelectionCounts={Object.keys(rosterSelectionCounts).length > 0 ? rosterSelectionCounts : undefined}
          allRosterPicks={Object.keys(allRosterPicks).length > 0 ? allRosterPicks : undefined}
        />
      </main>
    </div>
  )
}
