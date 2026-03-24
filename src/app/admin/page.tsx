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
  ])

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
