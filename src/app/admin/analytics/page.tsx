import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

interface ActivityRow {
  action: string
  created_at: string
  user_id: string | null
  league_id: string | null
  details: Record<string, unknown>
  profiles?: { email: string; display_name: string | null } | null
}

interface CommissionerRow {
  created_by: string
  league_count: number
  profiles: { email: string; display_name: string | null } | null
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
  ] = await Promise.all([
    // Total users
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    // Users this week
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // Total leagues
    supabase.from('leagues').select('id', { count: 'exact', head: true }),
    // Leagues this week
    supabase.from('leagues').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // Total drafts
    supabase.from('drafts').select('id', { count: 'exact', head: true }),
    // Drafts completed
    supabase.from('drafts').select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    // Total transactions
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
    // Active users 7d (distinct user_id from activity_log)
    supabase.from('activity_log').select('user_id')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('user_id', 'is', null),
    // Waitlist total
    supabase.from('waitlist').select('id', { count: 'exact', head: true }),
    // Waitlist converted
    supabase.from('waitlist').select('id', { count: 'exact', head: true })
      .not('converted_at', 'is', null),
    // Referrals
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .not('referred_by', 'is', null),
    // Waitlist sources
    supabase.from('waitlist').select('source'),
    // Recent activity (last 25)
    supabase.from('activity_log')
      .select('action, created_at, user_id, league_id, details, profiles(email, display_name)')
      .order('created_at', { ascending: false })
      .limit(25),
    // Vercel usage estimate (count tracked events this month)
    supabase.from('activity_log')
      .select('id', { count: 'exact', head: true })
      .in('action', ['user.signup', 'league.created', 'draft.completed'])
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
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

  // Deduplicate active users
  const activeUserIds = new Set((activeUsersResult.data || []).map((r: { user_id: string }) => r.user_id))
  const activeUsers7d = activeUserIds.size

  // Count waitlist sources
  const sourceCounts: Record<string, number> = {}
  for (const row of (waitlistSourcesResult.data || [])) {
    const source = (row as { source: string }).source || 'unknown'
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  }

  const recentActivity = (recentActivityResult.data || []) as unknown as ActivityRow[]

  const draftCompletionRate = totalDrafts > 0
    ? Math.round((draftsCompleted / totalDrafts) * 100)
    : 0

  const waitlistConversionRate = waitlistTotal > 0
    ? Math.round((waitlistConverted / waitlistTotal) * 100)
    : 0

  // Commissioner metrics - fetch separately
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
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin/sync" className="text-text-secondary hover:text-text-primary">
              Data Sync
            </Link>
            <Link href="/admin/reports" className="text-text-secondary hover:text-text-primary">
              Reports
            </Link>
            <Link href="/admin/badges" className="text-text-secondary hover:text-text-primary">
              Badges
            </Link>
            <span className="text-text-primary font-medium">Analytics</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Platform Analytics</h1>

        {/* Section 1: Platform Overview */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={totalUsers} sub={`+${usersThisWeek} this week`} />
            <StatCard label="Total Leagues" value={totalLeagues} sub={`+${leaguesThisWeek} this week`} />
            <StatCard label="Active Users (7d)" value={activeUsers7d} />
            <StatCard label="Total Transactions" value={totalTransactions} />
          </div>
        </section>

        {/* Section 2: Engagement */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Engagement</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Drafts Completed"
              value={`${draftsCompleted} / ${totalDrafts}`}
              sub={`${draftCompletionRate}% completion`}
            />
            <StatCard label="Total Transactions" value={totalTransactions} />
            <StatCard label="Active Users (7d)" value={activeUsers7d} />
          </div>
        </section>

        {/* Section 3: Growth */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Growth</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Waitlist Signups" value={waitlistTotal} />
            <StatCard
              label="Conversions"
              value={waitlistConverted}
              sub={`${waitlistConversionRate}% rate`}
            />
            <StatCard label="Referrals" value={referralCount} />
            <div className="bg-surface rounded-lg p-4">
              <p className="text-text-muted text-sm mb-2">Source Breakdown</p>
              {Object.entries(sourceCounts).length === 0 ? (
                <p className="text-text-secondary text-sm">No data</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(sourceCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([source, count]) => (
                      <div key={source} className="flex justify-between text-sm">
                        <span className="text-text-secondary truncate">{source}</span>
                        <span className="text-text-primary font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Commissioner Metrics */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Commissioner Metrics</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            {commissioners.length === 0 ? (
              <p className="text-text-secondary p-4">No commissioners yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="px-4 py-3 font-medium">Commissioner</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium text-right">Leagues</th>
                  </tr>
                </thead>
                <tbody>
                  {commissioners.map((c) => (
                    <tr key={c.userId} className="border-b border-border-subtle">
                      <td className="px-4 py-3 text-text-primary">
                        {c.displayName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-sm">{c.email}</td>
                      <td className="px-4 py-3 text-text-primary font-medium text-right">{c.leagueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Section 5: Recent Activity */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            {recentActivity.length === 0 ? (
              <p className="text-text-secondary p-4">No activity logged yet. Events will appear here once users interact with the platform.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((entry, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="px-4 py-3">
                        <span className="text-text-primary text-sm font-mono">{entry.action}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-sm">
                        {entry.profiles?.display_name || entry.profiles?.email || entry.user_id?.slice(0, 8) || '-'}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-sm">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Section 6: Vercel Analytics Usage */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Vercel Analytics Usage</h2>
          <div className="bg-surface rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Estimated custom events this month</p>
                <p className="text-3xl font-bold text-text-primary">
                  ~{vercelUsage} <span className="text-text-muted text-lg font-normal">/ 2,500</span>
                </p>
                <p className="text-text-muted text-sm mt-1">
                  Events tracked: signup, league create, draft complete
                </p>
              </div>
              <div className="flex flex-col items-end">
                {vercelUsage > 2000 ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-danger/20 text-danger-text">
                    Approaching limit
                  </span>
                ) : vercelUsage > 1000 ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-warning/20 text-warning-text">
                    Moderate usage
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-success/20 text-success-text">
                    Low usage
                  </span>
                )}
                <div className="mt-2 w-48 h-2 bg-surface-inset rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      vercelUsage > 2000 ? 'bg-danger' :
                      vercelUsage > 1000 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, (vercelUsage / 2500) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-surface rounded-lg p-4">
      <p className="text-text-muted text-sm">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-text-secondary text-sm mt-1">{sub}</p>}
    </div>
  )
}
