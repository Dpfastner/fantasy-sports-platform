'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface UserRow {
  id: string
  display_name: string | null
  email: string
  created_at: string
  league_count: number
  entry_count: number
  last_active: string | null
  referred_by: string | null
}

type SortKey = 'display_name' | 'email' | 'created_at' | 'league_count' | 'entry_count' | 'last_active'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [period, setPeriod] = useState<string>('all')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?period=${period}&search=${encodeURIComponent(search)}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [period, search])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [fetchUsers, search])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(key)
      setSortAsc(false)
    }
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

  const periods = [
    { key: '24h', label: '24H' },
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: 'all', label: 'All' },
  ]

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <th className="px-4 py-3 font-medium cursor-pointer hover:text-text-primary select-none" onClick={() => handleSort(sortKey)}>
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

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                    <SortHeader label="Name" sortKey="display_name" />
                    <SortHeader label="Email" sortKey="email" />
                    <SortHeader label="Joined" sortKey="created_at" />
                    <SortHeader label="Leagues" sortKey="league_count" />
                    <SortHeader label="Event Entries" sortKey="entry_count" />
                    <SortHeader label="Last Active" sortKey="last_active" />
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {sorted.map(user => (
                    <tr key={user.id} className="hover:bg-surface-inset/30">
                      <td className="px-4 py-3 text-text-primary font-medium">
                        {user.display_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-text-primary text-center">{user.league_count}</td>
                      <td className="px-4 py-3 text-text-primary text-center">{user.entry_count}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {user.last_active
                          ? new Date(user.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/profile/${user.id}`}
                          className="text-brand-text hover:underline text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
