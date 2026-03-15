'use client'

import { useState, useEffect, useCallback } from 'react'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  metric?: string
  onClick?: (metric: string) => void
}

interface DetailData {
  rows: Record<string, unknown>[]
  count: number
  columns: string[]
}

type Period = '24h' | '7d' | '30d' | 'all'

const METRIC_LABELS: Record<string, string> = {
  total_users: 'Users',
  total_leagues: 'Leagues',
  active_users: 'Active Users',
  total_transactions: 'Transactions',
  drafts: 'Drafts',
  waitlist: 'Waitlist Signups',
  referrals: 'Referrals',
  event_pools: 'Event Pools',
  event_entries: 'Event Entries',
  event_picks: 'Event Picks',
  favorite_schools: 'Favorite Schools',
}

const COLUMN_LABELS: Record<string, string> = {
  display_name: 'Name',
  email: 'Email',
  created_at: 'Created',
  name: 'Name',
  created_by: 'Created By',
  action_count: 'Actions',
  last_action: 'Last Action',
  last_at: 'Last Active',
  type: 'Type',
  user_id: 'User ID',
  league_id: 'League ID',
  league_name: 'League',
  status: 'Status',
  started_at: 'Started',
  completed_at: 'Completed',
  source: 'Source',
  converted_at: 'Converted',
  referred_by: 'Referred By',
  tournament: 'Tournament',
  format: 'Format',
  visibility: 'Visibility',
  pool_name: 'Pool',
  submitted_at: 'Submitted',
  total_points: 'Points',
  entry_id: 'Entry ID',
  participant_id: 'Participant',
  picked_at: 'Picked At',
  school: 'School',
  fans: 'Fans',
}

function StatCard({ label, value, sub, metric, onClick }: StatCardProps) {
  const isClickable = !!metric && !!onClick
  const Tag = isClickable ? 'button' : 'div'

  return (
    <Tag
      onClick={isClickable ? () => onClick(metric!) : undefined}
      className={`bg-surface rounded-lg p-4 text-left ${
        isClickable ? 'hover:bg-surface-inset/50 cursor-pointer transition-colors group' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm">{label}</p>
        {isClickable && (
          <svg className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-text-secondary text-sm mt-1">{sub}</p>}
    </Tag>
  )
}

function formatCellValue(value: unknown, column: string): string {
  if (value == null) return '—'
  if (column.endsWith('_at') || column === 'created_at') {
    const d = new Date(value as string)
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

interface DetailPanelProps {
  metric: string
  onClose: () => void
}

function DetailPanel({ metric, onClose }: DetailPanelProps) {
  const [period, setPeriod] = useState<Period>('7d')
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?metric=${metric}&period=${period}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [metric, period])

  useEffect(() => { fetchData() }, [fetchData])

  const periods: Period[] = ['24h', '7d', '30d', 'all']

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-2xl bg-page border-l border-border shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{METRIC_LABELS[metric] || metric}</h2>
            {data && !loading && (
              <p className="text-sm text-text-muted">{data.count?.toLocaleString() || data.rows.length} records</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 px-6 py-3 border-b border-border-subtle">
          {periods.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === p
                  ? 'bg-brand text-white font-medium'
                  : 'text-text-secondary hover:bg-surface-inset'
              }`}
            >
              {p === 'all' ? 'All time' : p.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No data for this period</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ backgroundColor: 'var(--palette-sticky-bg)' }}>
                <tr>
                  {data.columns.map(col => (
                    <th key={col} className="text-left px-4 py-2.5 text-text-muted font-medium text-xs uppercase tracking-wide">
                      {COLUMN_LABELS[col] || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {data.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-surface-inset/30">
                    {data.columns.map(col => (
                      <td key={col} className="px-4 py-2 text-text-secondary whitespace-nowrap">
                        {formatCellValue(row[col], col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Tournament Detail Panel ----

interface TournamentDetail {
  tournament: { id: string; name: string; sport: string; format: string; status: string; starts_at: string }
  pools: Array<{
    id: string; name: string; gameType: string | null; visibility: string; status: string
    createdAt: string; entries: number; submitted: number
  }>
  stats: {
    totalPools: number; totalEntries: number; totalSubmitted: number
    participants: number; totalGames: number; completedGames: number; liveGames: number; totalPicks: number
  }
  recentActivity: Array<{ action: string; created_at: string; user_id: string | null; details: Record<string, unknown> }>
}

function TournamentDetailPanel({ tournamentId, onClose }: { tournamentId: string; onClose: () => void }) {
  const [data, setData] = useState<TournamentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/analytics/tournament?id=${tournamentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tournamentId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-3xl bg-page border-l border-border shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{data?.tournament.name || 'Loading...'}</h2>
            {data && (
              <p className="text-sm text-text-muted capitalize">{data.tournament.sport} &middot; {data.tournament.format} &middot; {data.tournament.status}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-text-muted">Failed to load</div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-text-muted text-xs">Pools</p>
                  <p className="text-xl font-bold text-text-primary">{data.stats.totalPools}</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-text-muted text-xs">Entries</p>
                  <p className="text-xl font-bold text-text-primary">{data.stats.totalEntries}</p>
                  <p className="text-text-secondary text-xs">{data.stats.totalSubmitted} submitted</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-text-muted text-xs">Participants</p>
                  <p className="text-xl font-bold text-text-primary">{data.stats.participants}</p>
                </div>
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-text-muted text-xs">Games</p>
                  <p className="text-xl font-bold text-text-primary">{data.stats.completedGames}/{data.stats.totalGames}</p>
                  {data.stats.liveGames > 0 && <p className="text-success-text text-xs">{data.stats.liveGames} live</p>}
                </div>
              </div>

              {/* Pools table */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">Pools</h3>
                <div className="bg-surface rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border text-xs uppercase tracking-wide">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Entries</th>
                        <th className="px-3 py-2 text-right">Submitted</th>
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {data.pools.map(p => (
                        <tr key={p.id} className="hover:bg-surface-inset/30">
                          <td className="px-3 py-2 text-text-primary font-medium">{p.name}</td>
                          <td className="px-3 py-2 text-text-secondary capitalize">{p.gameType || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              p.status === 'open' ? 'bg-success/20 text-success-text' :
                              p.status === 'locked' ? 'bg-warning/20 text-warning-text' :
                              'bg-surface-inset text-text-muted'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-3 py-2 text-text-primary text-right">{p.entries}</td>
                          <td className="px-3 py-2 text-text-primary text-right">{p.submitted}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent activity */}
              {data.recentActivity.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Recent Activity</h3>
                  <div className="bg-surface rounded-lg divide-y divide-border-subtle overflow-hidden">
                    {data.recentActivity.map((a, i) => (
                      <div key={i} className="px-3 py-2 flex items-center justify-between">
                        <span className="text-text-primary text-sm font-mono">{a.action}</span>
                        <span className="text-text-muted text-xs">{new Date(a.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Main Dashboard Component ----

interface Tournament {
  id: string; name: string; slug: string; format: string; status: string; sport: string
}

interface ActivityRow {
  action: string; created_at: string; user_id: string | null; league_id: string | null
  details: Record<string, unknown>
  profiles?: { email: string; display_name: string | null } | null
}

interface EventActivity {
  action: string; created_at: string; user_id: string | null; pool_id: string | null
  tournament_id: string | null; details: Record<string, unknown>
}

interface Commissioner {
  userId: string; email: string; displayName: string | null; leagueCount: number
}

interface AnalyticsDashboardProps {
  totalUsers: number
  usersThisWeek: number
  totalLeagues: number
  leaguesThisWeek: number
  activeUsers7d: number
  totalTransactions: number
  draftsCompleted: number
  totalDrafts: number
  draftCompletionRate: number
  waitlistTotal: number
  waitlistConverted: number
  waitlistConversionRate: number
  referralCount: number
  sourceCounts: Record<string, number>
  vercelUsage: number
  eventTournaments: Tournament[]
  eventPools: number
  eventEntries: number
  eventPicks: number
  poolsByTournament: Record<string, number>
  eventRecentActivity: EventActivity[]
  commissioners: Commissioner[]
  recentActivity: ActivityRow[]
  favoriteSchools: Array<{ school_id: string; school_name: string; count: number }>
  totalFavoriteSchools: number
}

export function AnalyticsDashboard(props: AnalyticsDashboardProps) {
  const [activeMetric, setActiveMetric] = useState<string | null>(null)
  const [activeTournament, setActiveTournament] = useState<string | null>(null)

  const openDetail = (metric: string) => setActiveMetric(metric)
  const closeDetail = () => setActiveMetric(null)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-8">Platform Analytics</h1>

        {/* Platform Overview */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={props.totalUsers} sub={`+${props.usersThisWeek} this week`} metric="total_users" onClick={openDetail} />
            <StatCard label="Total Leagues" value={props.totalLeagues} sub={`+${props.leaguesThisWeek} this week`} metric="total_leagues" onClick={openDetail} />
            <StatCard label="Active Users (7d)" value={props.activeUsers7d} metric="active_users" onClick={openDetail} />
            <StatCard label="Total Transactions" value={props.totalTransactions} metric="total_transactions" onClick={openDetail} />
          </div>
        </section>

        {/* Engagement */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Engagement</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Drafts Completed" value={`${props.draftsCompleted} / ${props.totalDrafts}`} sub={`${props.draftCompletionRate}% completion`} metric="drafts" onClick={openDetail} />
            <StatCard label="Total Transactions" value={props.totalTransactions} metric="total_transactions" onClick={openDetail} />
            <StatCard label="Active Users (7d)" value={props.activeUsers7d} metric="active_users" onClick={openDetail} />
          </div>
        </section>

        {/* Event Games */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Event Games</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Tournaments" value={props.eventTournaments.length} />
            <StatCard label="Pools Created" value={props.eventPools} metric="event_pools" onClick={openDetail} />
            <StatCard label="Total Entries" value={props.eventEntries} metric="event_entries" onClick={openDetail} />
            <StatCard label="Total Picks" value={props.eventPicks} metric="event_picks" onClick={openDetail} />
          </div>

          {props.eventTournaments.length > 0 && (
            <div className="bg-surface rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="px-4 py-3 font-medium">Tournament</th>
                    <th className="px-4 py-3 font-medium">Sport</th>
                    <th className="px-4 py-3 font-medium">Format</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Pools</th>
                  </tr>
                </thead>
                <tbody>
                  {props.eventTournaments.map((t) => (
                    <tr key={t.id} className="border-b border-border-subtle hover:bg-surface-inset/50 cursor-pointer transition-colors" onClick={() => setActiveTournament(t.id)}>
                      <td className="px-4 py-3 text-text-primary">{t.name}</td>
                      <td className="px-4 py-3 text-text-secondary text-sm capitalize">{t.sport}</td>
                      <td className="px-4 py-3 text-text-secondary text-sm capitalize">{t.format}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'active' ? 'bg-success/20 text-success-text' :
                          t.status === 'upcoming' ? 'bg-brand/20 text-brand' :
                          t.status === 'completed' ? 'bg-surface-inset text-text-muted' :
                          'bg-danger/20 text-danger-text'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-primary font-medium text-right">
                        {props.poolsByTournament[t.id] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {props.eventRecentActivity.length > 0 && (
            <div className="bg-surface rounded-lg overflow-hidden">
              <h3 className="text-sm font-medium text-text-secondary px-4 py-3 border-b border-border">Recent Event Activity</h3>
              <div className="divide-y divide-border-subtle">
                {props.eventRecentActivity.map((entry, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-text-primary text-sm font-mono">{entry.action}</span>
                    <span className="text-text-muted text-xs">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Growth */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Growth</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Waitlist Signups" value={props.waitlistTotal} metric="waitlist" onClick={openDetail} />
            <StatCard label="Conversions" value={props.waitlistConverted} sub={`${props.waitlistConversionRate}% rate`} metric="waitlist" onClick={openDetail} />
            <StatCard label="Referrals" value={props.referralCount} metric="referrals" onClick={openDetail} />
            <div className="bg-surface rounded-lg p-4">
              <p className="text-text-muted text-sm mb-2">Source Breakdown</p>
              {Object.entries(props.sourceCounts).length === 0 ? (
                <p className="text-text-secondary text-sm">No data</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(props.sourceCounts)
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

        {/* Favorite Schools */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Favorite Schools</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Users with Favorite" value={props.totalFavoriteSchools} metric="favorite_schools" onClick={openDetail} />
          </div>
          {props.favoriteSchools.length > 0 && (
            <div className="bg-surface rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">School</th>
                    <th className="px-4 py-3 font-medium text-right">Fans</th>
                  </tr>
                </thead>
                <tbody>
                  {props.favoriteSchools.map((s, i) => (
                    <tr key={s.school_id} className="border-b border-border-subtle">
                      <td className="px-4 py-3 text-text-muted text-sm">{i + 1}</td>
                      <td className="px-4 py-3 text-text-primary">{s.school_name}</td>
                      <td className="px-4 py-3 text-text-primary font-medium text-right">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Commissioner Metrics */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Commissioner Metrics</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            {props.commissioners.length === 0 ? (
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
                  {props.commissioners.map((c) => (
                    <tr key={c.userId} className="border-b border-border-subtle">
                      <td className="px-4 py-3 text-text-primary">{c.displayName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-text-secondary text-sm">{c.email}</td>
                      <td className="px-4 py-3 text-text-primary font-medium text-right">{c.leagueCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Activity</h2>
          <div className="bg-surface rounded-lg overflow-hidden">
            {props.recentActivity.length === 0 ? (
              <p className="text-text-secondary p-4">No activity logged yet.</p>
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
                  {props.recentActivity.map((entry, i) => (
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

        {/* Vercel Analytics Usage */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Vercel Analytics Usage</h2>
          <div className="bg-surface rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Estimated custom events this month</p>
                <p className="text-3xl font-bold text-text-primary">
                  ~{props.vercelUsage} <span className="text-text-muted text-lg font-normal">/ 2,500</span>
                </p>
                <p className="text-text-muted text-sm mt-1">Events tracked: signup, league create, draft complete</p>
              </div>
              <div className="flex flex-col items-end">
                {props.vercelUsage > 2000 ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-danger/20 text-danger-text">Approaching limit</span>
                ) : props.vercelUsage > 1000 ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-warning/20 text-warning-text">Moderate usage</span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-success/20 text-success-text">Low usage</span>
                )}
                <div className="mt-2 w-48 h-2 bg-surface-inset rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      props.vercelUsage > 2000 ? 'bg-danger' :
                      props.vercelUsage > 1000 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, (props.vercelUsage / 2500) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Detail Panel */}
      {activeMetric && (
        <DetailPanel metric={activeMetric} onClose={closeDetail} />
      )}

      {/* Tournament Detail Panel */}
      {activeTournament && (
        <TournamentDetailPanel tournamentId={activeTournament} onClose={() => setActiveTournament(null)} />
      )}
    </div>
  )
}
