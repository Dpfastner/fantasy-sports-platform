'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { grantBadge, revokeBadge } from '@/app/actions/admin'

interface BadgeInfo {
  id: string
  slug: string
  label: string
  color: string
  bg_color: string
  fallback_icon: string
}

interface UserRow {
  id: string
  display_name: string | null
  email: string
  created_at: string
  league_count: number
  entry_count: number
  last_active: string | null
  referred_by: string | null
  is_commissioner: boolean
  is_pool_creator: boolean
  badges: BadgeInfo[]
}

interface BadgeDefinition {
  id: string
  slug: string
  label: string
  requires_metadata: boolean
}

type SortKey = 'display_name' | 'email' | 'created_at' | 'league_count' | 'entry_count' | 'last_active'
type RoleFilter = '' | 'commissioner' | 'creator' | 'has_badge' | 'no_badge'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [period, setPeriod] = useState<string>('all')
  const [role, setRole] = useState<RoleFilter>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [badgeDefs, setBadgeDefs] = useState<BadgeDefinition[]>([])
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [grantTargets, setGrantTargets] = useState<string[]>([])
  const [grantBadgeSlug, setGrantBadgeSlug] = useState('')
  const [grantMetadata, setGrantMetadata] = useState<Record<string, string>>({})
  const [granting, setGranting] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?period=${period}&search=${encodeURIComponent(search)}&role=${role}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [period, search, role])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchUsers, search])

  // Fetch badge definitions once
  useEffect(() => {
    fetch('/api/admin/badges')
      .then(r => r.ok ? r.json() : { definitions: [] })
      .then(d => setBadgeDefs(d.definitions || []))
      .catch(() => {})
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(false) }
  }

  const sorted = [...users].sort((a, b) => {
    const va = a[sortBy]
    const vb = b[sortBy]
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb))
    return sortAsc ? cmp : -cmp
  })

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set())
    else setSelected(new Set(sorted.map(u => u.id)))
  }

  const openGrantModal = (userIds: string[]) => {
    setGrantTargets(userIds)
    setGrantBadgeSlug('')
    setGrantMetadata({})
    setGrantModalOpen(true)
  }

  const handleGrant = async () => {
    if (!grantBadgeSlug || grantTargets.length === 0) return
    setGranting(true)
    let successCount = 0
    let errorMsg = ''

    for (const userId of grantTargets) {
      const meta = Object.keys(grantMetadata).length > 0 ? grantMetadata : undefined
      const result = await grantBadge(userId, grantBadgeSlug, meta)
      if (result.success) successCount++
      else if (result.error) errorMsg = result.error
    }

    setGranting(false)
    setGrantModalOpen(false)
    setSelected(new Set())

    if (successCount > 0) {
      setActionMessage(`Granted ${selectedDef?.label || grantBadgeSlug} to ${successCount} user${successCount > 1 ? 's' : ''}`)
      fetchUsers()
    } else {
      setActionMessage(`Error: ${errorMsg}`)
    }
    setTimeout(() => setActionMessage(null), 4000)
  }

  const handleRevoke = async (userId: string, badgeId: string) => {
    const result = await revokeBadge(badgeId)
    if (result.success) {
      setActionMessage('Badge revoked')
      fetchUsers()
    } else {
      setActionMessage(`Error: ${result.error}`)
    }
    setTimeout(() => setActionMessage(null), 3000)
  }

  const selectedDef = badgeDefs.find(d => d.slug === grantBadgeSlug)

  const periods = [
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: 'all', label: 'All' },
  ]

  const roles: { key: RoleFilter; label: string }[] = [
    { key: '', label: 'All Users' },
    { key: 'commissioner', label: 'Commissioners' },
    { key: 'creator', label: 'Pool Creators' },
    { key: 'has_badge', label: 'Has Badge' },
    { key: 'no_badge', label: 'No Badge' },
  ]

  const SortHeader = ({ label, sortKey, className }: { label: string; sortKey: SortKey; className?: string }) => (
    <th className={`px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none ${className || ''}`} onClick={() => handleSort(sortKey)}>
      <span className="flex items-center gap-1">
        {label}
        {sortBy === sortKey && (
          <svg className={`w-3 h-3 ${sortAsc ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </span>
    </th>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-6">User Management</h1>

        {/* Action message */}
        {actionMessage && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${actionMessage.startsWith('Error') ? 'bg-danger/10 text-danger-text' : 'bg-success/10 text-success-text'}`}>
            {actionMessage}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50 text-sm"
            />
            <div className="flex gap-1">
              {periods.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    period === p.key
                      ? 'bg-brand text-white font-medium'
                      : 'bg-surface text-text-secondary hover:bg-surface-inset border border-border'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Role filters */}
          <div className="flex flex-wrap gap-1.5">
            {roles.map(r => (
              <button
                key={r.key}
                onClick={() => { setRole(r.key); setSelected(new Set()) }}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                  role === r.key
                    ? 'bg-brand/20 text-brand-text font-medium border border-brand/30'
                    : 'bg-surface text-text-muted hover:text-text-secondary border border-border'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selection bar */}
        {selected.size > 0 && (
          <div className="mb-4 px-4 py-3 bg-brand/10 border border-brand/20 rounded-lg flex items-center justify-between">
            <span className="text-sm text-text-primary font-medium">{selected.size} selected</span>
            <button
              onClick={() => openGrantModal([...selected])}
              className="px-4 py-1.5 text-sm font-medium rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors"
            >
              Grant Badge
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="text-sm text-text-muted mb-4">
          {loading ? 'Loading...' : `${sorted.length} user${sorted.length !== 1 ? 's' : ''}`}
        </div>

        {/* Table */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-text-muted">No users match that search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === sorted.length && sorted.length > 0}
                        onChange={toggleAll}
                        className="rounded border-border"
                      />
                    </th>
                    <SortHeader label="Name" sortKey="display_name" />
                    <SortHeader label="Email" sortKey="email" />
                    <th className="px-4 py-3 font-medium">Badges</th>
                    <SortHeader label="Joined" sortKey="created_at" />
                    <SortHeader label="Leagues" sortKey="league_count" className="text-center" />
                    <SortHeader label="Entries" sortKey="entry_count" className="text-center" />
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {sorted.map(u => (
                    <tr key={u.id} className={`hover:bg-surface-inset/30 ${selected.has(u.id) ? 'bg-brand/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 text-text-primary font-medium">
                        {u.display_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {u.badges.length > 0 ? u.badges.map(b => (
                            <span key={b.id} className="inline-flex items-center gap-0.5">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{ backgroundColor: b.bg_color, color: b.color }}
                              >
                                {b.label}
                              </span>
                              <button
                                onClick={() => handleRevoke(u.id, b.id)}
                                className="px-1 py-0.5 text-[10px] rounded bg-danger/10 hover:bg-danger/20 text-danger-text transition-colors"
                                title={`Revoke ${b.label}`}
                              >
                                x
                              </button>
                            </span>
                          )) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap text-xs">
                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-text-primary text-center">{u.league_count}</td>
                      <td className="px-4 py-3 text-text-primary text-center">{u.entry_count}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {u.is_commissioner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand/15 text-brand-text">Comm</span>}
                          {u.is_pool_creator && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success-text">Creator</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openGrantModal([u.id])}
                            className="text-brand-text hover:underline text-xs"
                          >
                            Grant
                          </button>
                          <Link
                            href={`/profile/${u.id}`}
                            className="text-text-muted hover:text-text-primary text-xs"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Grant Badge Modal */}
      {grantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setGrantModalOpen(false)}>
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Grant Badge to {grantTargets.length} user{grantTargets.length > 1 ? 's' : ''}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-1">Badge</label>
                <select
                  value={grantBadgeSlug}
                  onChange={(e) => { setGrantBadgeSlug(e.target.value); setGrantMetadata({}) }}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm"
                >
                  <option value="">Select a badge...</option>
                  {badgeDefs.map(d => (
                    <option key={d.slug} value={d.slug}>{d.label}</option>
                  ))}
                </select>
              </div>

              {selectedDef?.requires_metadata && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-text-secondary text-sm mb-1">Year</label>
                    <input
                      type="text"
                      value={grantMetadata.year || ''}
                      onChange={(e) => setGrantMetadata(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="2026"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary text-sm mb-1">Competition Name</label>
                    <input
                      type="text"
                      value={grantMetadata.competition_name || ''}
                      onChange={(e) => setGrantMetadata(prev => ({ ...prev, competition_name: e.target.value }))}
                      placeholder="Frozen Four 2026"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setGrantModalOpen(false)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGrant}
                disabled={!grantBadgeSlug || granting}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:opacity-50"
              >
                {granting ? 'Granting...' : `Grant${grantTargets.length > 1 ? ` to ${grantTargets.length}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
