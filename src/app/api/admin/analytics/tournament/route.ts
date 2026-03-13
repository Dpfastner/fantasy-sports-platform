import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const tournamentId = new URL(req.url).searchParams.get('id')
  if (!tournamentId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch tournament info
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id, name, slug, sport, format, status, starts_at, ends_at, bracket_size, total_weeks')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  // Fetch pools for this tournament
  const { data: pools } = await admin
    .from('event_pools')
    .select('id, name, game_type, visibility, status, created_at, max_entries, max_entries_per_user, scoring_rules')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })

  // Fetch entry counts per pool
  const poolIds = (pools || []).map(p => p.id)
  let entryCounts: Record<string, number> = {}
  let submittedCounts: Record<string, number> = {}
  if (poolIds.length > 0) {
    const { data: entries } = await admin
      .from('event_entries')
      .select('pool_id, submitted_at')
      .in('pool_id', poolIds)

    for (const e of (entries || [])) {
      entryCounts[e.pool_id] = (entryCounts[e.pool_id] || 0) + 1
      if (e.submitted_at) submittedCounts[e.pool_id] = (submittedCounts[e.pool_id] || 0) + 1
    }
  }

  // Fetch participant count
  const { count: participantCount } = await admin
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  // Fetch game stats
  const { data: games } = await admin
    .from('event_games')
    .select('id, status, round')
    .eq('tournament_id', tournamentId)

  const totalGames = (games || []).length
  const completedGames = (games || []).filter(g => g.status === 'completed' || g.status === 'final').length
  const liveGames = (games || []).filter(g => g.status === 'live' || g.status === 'in_progress').length

  // Total picks across all pools
  const { count: totalPicks } = await admin
    .from('event_picks')
    .select('id', { count: 'exact', head: true })
    .in('entry_id', poolIds.length > 0 ? (await admin.from('event_entries').select('id').in('pool_id', poolIds)).data?.map((e: { id: string }) => e.id) || [] : ['__none__'])

  // Recent activity for this tournament
  const { data: recentActivity } = await admin
    .from('event_activity_log')
    .select('action, created_at, user_id, pool_id, details')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false })
    .limit(20)

  const poolDetails = (pools || []).map(p => ({
    id: p.id,
    name: p.name,
    gameType: p.game_type,
    visibility: p.visibility,
    status: p.status,
    createdAt: p.created_at,
    maxEntries: p.max_entries,
    maxEntriesPerUser: p.max_entries_per_user,
    entries: entryCounts[p.id] || 0,
    submitted: submittedCounts[p.id] || 0,
  }))

  return NextResponse.json({
    tournament,
    pools: poolDetails,
    stats: {
      totalPools: (pools || []).length,
      totalEntries: Object.values(entryCounts).reduce((a, b) => a + b, 0),
      totalSubmitted: Object.values(submittedCounts).reduce((a, b) => a + b, 0),
      participants: participantCount || 0,
      totalGames,
      completedGames,
      liveGames,
      totalPicks: totalPicks || 0,
    },
    recentActivity: recentActivity || [],
  })
}
