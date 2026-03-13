import { createAdminClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from './AnalyticsDashboard'

interface ActivityRow {
  action: string
  created_at: string
  user_id: string | null
  league_id: string | null
  details: Record<string, unknown>
  profiles?: { email: string; display_name: string | null } | null
}

export default async function AdminAnalyticsPage() {
  const supabase = createAdminClient()

  // Run all queries in parallel
  const [
    usersResult,
    usersThisWeekResult,
    leaguesResult,
    leaguesThisWeekResult,
    draftsResult,
    draftsCompletedResult,
    transactionsResult,
    activeUsersResult,
    waitlistResult,
    waitlistConvertedResult,
    referralsResult,
    waitlistSourcesResult,
    recentActivityResult,
    vercelUsageResult,
    eventTournamentsResult,
    eventPoolsResult,
    eventEntriesResult,
    eventPicksResult,
    eventRecentActivityResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('leagues').select('id', { count: 'exact', head: true }),
    supabase.from('leagues').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('drafts').select('id', { count: 'exact', head: true }),
    supabase.from('drafts').select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
    supabase.from('activity_log').select('user_id')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('user_id', 'is', null),
    supabase.from('waitlist').select('id', { count: 'exact', head: true }),
    supabase.from('waitlist').select('id', { count: 'exact', head: true })
      .not('converted_at', 'is', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .not('referred_by', 'is', null),
    supabase.from('waitlist').select('source'),
    supabase.from('activity_log')
      .select('action, created_at, user_id, league_id, details, profiles(email, display_name)')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase.from('activity_log')
      .select('id', { count: 'exact', head: true })
      .in('action', ['user.signup', 'league.created', 'draft.completed', 'event.pool_created', 'event.pool_joined', 'event.picks_submitted'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('event_tournaments').select('id, name, slug, format, status, sport'),
    supabase.from('event_pools').select('id, tournament_id, name, visibility, status, created_at', { count: 'exact' }),
    supabase.from('event_entries').select('id', { count: 'exact', head: true }),
    supabase.from('event_picks').select('id', { count: 'exact', head: true }),
    supabase.from('event_activity_log')
      .select('action, created_at, user_id, pool_id, tournament_id, details')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const totalUsers = usersResult.count || 0
  const usersThisWeek = usersThisWeekResult.count || 0
  const totalLeagues = leaguesResult.count || 0
  const leaguesThisWeek = leaguesThisWeekResult.count || 0
  const totalDrafts = draftsResult.count || 0
  const draftsCompleted = draftsCompletedResult.count || 0
  const totalTransactions = transactionsResult.count || 0
  const waitlistTotal = waitlistResult.count || 0
  const waitlistConverted = waitlistConvertedResult.count || 0
  const referralCount = referralsResult.count || 0
  const vercelUsage = vercelUsageResult.count || 0

  const eventTournaments = (eventTournamentsResult.data || []) as { id: string; name: string; slug: string; format: string; status: string; sport: string }[]
  const eventPools = eventPoolsResult.count || 0
  const eventEntries = eventEntriesResult.count || 0
  const eventPicks = eventPicksResult.count || 0
  const eventRecentActivity = (eventRecentActivityResult.data || []) as { action: string; created_at: string; user_id: string | null; pool_id: string | null; tournament_id: string | null; details: Record<string, unknown> }[]

  const poolsByTournament: Record<string, number> = {}
  for (const pool of (eventPoolsResult.data || []) as { tournament_id: string }[]) {
    poolsByTournament[pool.tournament_id] = (poolsByTournament[pool.tournament_id] || 0) + 1
  }

  const activeUserIds = new Set((activeUsersResult.data || []).map((r: { user_id: string }) => r.user_id))
  const activeUsers7d = activeUserIds.size

  const sourceCounts: Record<string, number> = {}
  for (const row of (waitlistSourcesResult.data || [])) {
    const source = (row as { source: string }).source || 'unknown'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  }

  const recentActivity = (recentActivityResult.data || []) as unknown as ActivityRow[]

  const draftCompletionRate = totalDrafts > 0 ? Math.round((draftsCompleted / totalDrafts) * 100) : 0
  const waitlistConversionRate = waitlistTotal > 0 ? Math.round((waitlistConverted / waitlistTotal) * 100) : 0

  // Favorite schools
  const { data: schoolProfiles } = await supabase
    .from('profiles')
    .select('favorite_school_id, schools(name)')
    .not('favorite_school_id', 'is', null)

  const schoolCounts: Record<string, { name: string; count: number }> = {}
  for (const p of (schoolProfiles || [])) {
    const sp = p as unknown as { favorite_school_id: string; schools: { name: string } | null }
    if (sp.favorite_school_id) {
      const existing = schoolCounts[sp.favorite_school_id]
      if (existing) {
        existing.count++
      } else {
        schoolCounts[sp.favorite_school_id] = { name: sp.schools?.name || 'Unknown', count: 1 }
      }
    }
  }

  const favoriteSchools = Object.entries(schoolCounts)
    .map(([school_id, { name, count }]) => ({ school_id, school_name: name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  const totalFavoriteSchools = schoolProfiles?.length || 0

  // Commissioner metrics
  const { data: leagueData } = await supabase
    .from('leagues')
    .select('created_by, profiles(email, display_name)')

  const commissionerMap = new Map<string, { email: string; displayName: string | null; leagueCount: number }>()
  for (const league of (leagueData || [])) {
    const l = league as unknown as { created_by: string; profiles: { email: string; display_name: string | null } | null }
    const existing = commissionerMap.get(l.created_by)
    if (existing) {
      existing.leagueCount++
    } else {
      commissionerMap.set(l.created_by, {
        email: l.profiles?.email || 'Unknown',
        displayName: l.profiles?.display_name || null,
        leagueCount: 1,
      })
    }
  }

  const commissioners = [...commissionerMap.entries()]
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.leagueCount - a.leagueCount)

  return (
    <AnalyticsDashboard
      totalUsers={totalUsers}
      usersThisWeek={usersThisWeek}
      totalLeagues={totalLeagues}
      leaguesThisWeek={leaguesThisWeek}
      activeUsers7d={activeUsers7d}
      totalTransactions={totalTransactions}
      draftsCompleted={draftsCompleted}
      totalDrafts={totalDrafts}
      draftCompletionRate={draftCompletionRate}
      waitlistTotal={waitlistTotal}
      waitlistConverted={waitlistConverted}
      waitlistConversionRate={waitlistConversionRate}
      referralCount={referralCount}
      sourceCounts={sourceCounts}
      vercelUsage={vercelUsage}
      eventTournaments={eventTournaments}
      eventPools={eventPools}
      eventEntries={eventEntries}
      eventPicks={eventPicks}
      poolsByTournament={poolsByTournament}
      eventRecentActivity={eventRecentActivity}
      commissioners={commissioners}
      recentActivity={recentActivity}
      favoriteSchools={favoriteSchools}
      totalFavoriteSchools={totalFavoriteSchools}
    />
  )
}
