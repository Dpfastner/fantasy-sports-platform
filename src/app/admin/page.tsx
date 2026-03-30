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

  // Build unified competitions list
  const allLeagues = allLeaguesResult.data || []
  const memberCounts: Record<string, number> = {}
  for (const league of allLeagues) {
    const { count } = await supabase
      .from('league_members')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', league.id)
    memberCounts[league.id] = count || 0
  }

  // Fetch all event pools
  const { data: allPools } = await supabase
    .from('event_pools')
    .select('id, name, status, visibility, max_entries, invite_code, created_at, game_type, tournament_id, event_tournaments(name, sport, slug)')
    .order('created_at', { ascending: false })

  const poolEntryCount: Record<string, number> = {}
  for (const pool of allPools || []) {
    const { count } = await supabase
      .from('event_entries')
      .select('id', { count: 'exact', head: true })
      .eq('pool_id', pool.id)
    poolEntryCount[pool.id] = count || 0
  }

  // Merge into one list
  interface Competition {
    id: string
    name: string
    type: string
    sport: string
    members: number
    capacity: number | null
    visibility: string
    status: string
    code: string
    created: string
    href: string
  }

  const allCompetitions: Competition[] = [
    ...allLeagues.map(l => ({
      id: l.id,
      name: l.name,
      type: 'Season League',
      sport: (l.sports as unknown as { name: string })?.name || '—',
      members: memberCounts[l.id] || 0,
      capacity: l.max_teams,
      visibility: l.is_public ? 'Public' : 'Private',
      status: l.status,
      code: l.invite_code,
      created: l.created_at,
      href: `/leagues/${l.id}`,
    })),
    ...(allPools || []).map(p => {
      const tournament = p.event_tournaments as unknown as { name: string; sport: string; slug: string } | null
      const formatLabels: Record<string, string> = { bracket: 'Bracket', pickem: "Pick'em", survivor: 'Survivor', roster: 'Roster' }
      const sportLabels: Record<string, string> = { hockey: 'Hockey', golf: 'Golf', rugby: 'Rugby', college_football: 'Football' }
      return {
        id: p.id,
        name: `${p.name} (${tournament?.name || 'Event'})`,
        type: formatLabels[p.game_type || ''] || p.game_type || 'Pool',
        sport: sportLabels[tournament?.sport || ''] || tournament?.sport || '—',
        members: poolEntryCount[p.id] || 0,
        capacity: p.max_entries,
        visibility: p.visibility === 'public' ? 'Public' : 'Private',
        status: p.status,
        code: p.invite_code,
        created: p.created_at,
        href: `/events/${tournament?.slug}/pools/${p.id}`,
      }
    }),
  ].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

  const totalUsers = totalUsersResult.count ?? 0
  const newToday = newTodayResult.count ?? 0
  const activeLeagues = activeLeaguesResult.count ?? 0
  const openReports = openReportsResult.count ?? 0
  const activeEvents = activeEventsResult.count ?? 0

  const stats = [
    { label: 'Total Users', value: totalUsers },
    { label: 'New Today', value: newToday },
    { label: 'Competitions', value: allCompetitions.length },
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
      stat: `${allCompetitions.length} competitions`,
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

        {/* All Competitions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">All Competitions ({allCompetitions.length})</h2>
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Sport</th>
                    <th className="px-4 py-2 font-medium">Members</th>
                    <th className="px-4 py-2 font-medium">Visibility</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allCompetitions.map((comp) => {
                    const created = new Date(comp.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    const typeColors: Record<string, string> = {
                      'Season League': 'bg-brand/15 text-brand-text',
                      'Bracket': 'bg-blue-500/15 text-blue-400',
                      "Pick'em": 'bg-green-500/15 text-green-400',
                      'Survivor': 'bg-red-500/15 text-red-400',
                      'Roster': 'bg-amber-500/15 text-amber-400',
                    }
                    return (
                      <tr key={comp.id} className="border-b border-border/50 hover:bg-surface-subtle transition-colors">
                        <td className="px-4 py-2">
                          <Link href={comp.href} className="text-text-primary font-medium hover:text-brand transition-colors">
                            {comp.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeColors[comp.type] || 'bg-surface-subtle text-text-muted'}`}>
                            {comp.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-text-muted">{comp.sport}</td>
                        <td className="px-4 py-2 text-text-muted">{comp.members}{comp.capacity ? `/${comp.capacity}` : ''}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            comp.visibility === 'Public' ? 'bg-success/15 text-success-text' : 'bg-warning/15 text-warning-text'
                          }`}>
                            {comp.visibility}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            comp.status === 'active' || comp.status === 'open' ? 'bg-success/15 text-success-text'
                              : comp.status === 'completed' || comp.status === 'archived' ? 'bg-surface-subtle text-text-muted'
                              : 'bg-brand/15 text-brand-text'
                          }`}>
                            {comp.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-text-muted">{comp.code}</td>
                        <td className="px-4 py-2 text-text-muted text-xs">{created}</td>
                      </tr>
                    )
                  })}
                  {allCompetitions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-text-muted">No competitions yet</td>
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
