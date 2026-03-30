import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = createAdminClient()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    totalUsersResult,
    newTodayResult,
    activeLeaguesResult,
    openReportsResult,
    activeEventsResult,
    allLeaguesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('leagues')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'archived'),
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'open']),
    supabase
      .from('event_tournaments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'upcoming']),
    supabase
      .from('leagues')
      .select('id, name, status, is_public, max_teams, invite_code, created_at, sports(name)')
      .order('created_at', { ascending: false }),
  ])

  // Get member counts for all leagues
  const allLeagues = allLeaguesResult.data || []
  const leagueIds = allLeagues.map(l => l.id)
  const memberCounts: Record<string, number> = {}
  if (leagueIds.length > 0) {
    for (const league of allLeagues) {
      const { count } = await supabase
        .from('league_members')
        .select('id', { count: 'exact', head: true })
        .eq('league_id', league.id)
      memberCounts[league.id] = count || 0
    }
  }

  const totalUsers = totalUsersResult.count ?? 0
  const newToday = newTodayResult.count ?? 0
  const activeLeagues = activeLeaguesResult.count ?? 0
  const openReports = openReportsResult.count ?? 0
  const activeEvents = activeEventsResult.count ?? 0

  const stats = [
    { label: 'Total Users', value: totalUsers },
    { label: 'New Today', value: newToday },
    { label: 'Active Leagues', value: activeLeagues },
    { label: 'Open Bug Reports', value: openReports },
    { label: 'Active Events', value: activeEvents },
  ]

  const adminPages = [
    {
      href: '/admin/sync',
      title: 'Data Sync',
      emoji: '🔄',
      description: 'Sync schools, games, rankings, and live scores from external APIs.',
    },
    {
      href: '/admin/badges',
      title: 'Badges',
      emoji: '🏅',
      description: 'Manage badge definitions, grant/revoke badges, upload icons.',
    },
    {
      href: '/admin/analytics',
      title: 'Analytics',
      emoji: '📊',
      description: 'Platform metrics, user activity, and usage trends.',
      stat: `${totalUsers} users`,
    },
    {
      href: '/admin/users',
      title: 'Users',
      emoji: '👥',
      description: 'Browse, search, and manage user accounts.',
      stat: `${newToday} new today`,
    },
    {
      href: '/admin/reports',
      title: 'Issue Reports',
      emoji: '🐛',
      description: 'View and manage user-submitted bug reports and issues.',
      stat: `${openReports} open`,
    },
    {
      href: '/admin/scores',
      title: 'Scores',
      emoji: '🏆',
      description: 'Review and manage scoring, points, and leaderboard calculations.',
      stat: `${activeLeagues} active leagues`,
    },
    {
      href: '/admin/monitoring',
      title: 'Monitoring',
      emoji: '📡',
      description: 'System health, cron job status, error tracking, and uptime.',
      stat: `${activeEvents} active events`,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Dashboard</h1>
        <p className="text-text-secondary mb-8">Platform management tools.</p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface rounded-lg p-4 border border-border text-center"
            >
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* All Leagues */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">All Leagues ({allLeagues.length})</h2>
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Sport</th>
                    <th className="px-4 py-2 font-medium">Members</th>
                    <th className="px-4 py-2 font-medium">Visibility</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allLeagues.map((league) => {
                    const sport = (league.sports as unknown as { name: string })?.name || '—'
                    const members = memberCounts[league.id] || 0
                    const created = new Date(league.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <tr key={league.id} className="border-b border-border/50 hover:bg-surface-subtle transition-colors">
                        <td className="px-4 py-2">
                          <Link href={`/leagues/${league.id}`} className="text-text-primary font-medium hover:text-brand transition-colors">
                            {league.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-text-muted">{sport}</td>
                        <td className="px-4 py-2 text-text-muted">{members}/{league.max_teams}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            league.is_public
                              ? 'bg-success/15 text-success-text'
                              : 'bg-warning/15 text-warning-text'
                          }`}>
                            {league.is_public ? 'Public' : 'Private'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            league.status === 'active' ? 'bg-success/15 text-success-text'
                              : league.status === 'archived' ? 'bg-surface-subtle text-text-muted'
                              : 'bg-brand/15 text-brand-text'
                          }`}>
                            {league.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-text-muted">{league.invite_code}</td>
                        <td className="px-4 py-2 text-text-muted text-xs">{created}</td>
                      </tr>
                    )
                  })}
                  {allLeagues.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-text-muted">No leagues yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {adminPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block bg-surface rounded-lg p-6 hover:bg-surface-subtle transition-colors border border-border"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden="true">
                  {page.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-text-primary mb-1">
                    {page.title}
                  </h2>
                  <p className="text-text-secondary text-sm">{page.description}</p>
                  {page.stat && (
                    <p className="text-xs text-brand font-medium mt-2">{page.stat}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
