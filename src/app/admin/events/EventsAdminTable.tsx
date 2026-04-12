'use client'

import { useState } from 'react'

interface Tournament {
  id: string
  name: string
  slug: string
  sport: string
  format: string
  status: string
  starts_at: string
  ends_at: string | null
}

interface Pool {
  id: string
  name: string
  tournament_id: string
  status: string
  game_type: string
  created_by: string
}

interface Props {
  tournaments: Tournament[]
  pools: Pool[]
}

const STATUS_OPTIONS = ['upcoming', 'active', 'completed', 'cancelled'] as const
const POOL_STATUS_OPTIONS = ['open', 'locked', 'scoring', 'completed'] as const

const statusColors: Record<string, string> = {
  upcoming: 'bg-info/20 text-info-text',
  active: 'bg-success/20 text-success-text',
  completed: 'bg-surface-inset text-text-muted',
  cancelled: 'bg-danger/20 text-danger-text',
  open: 'bg-success/20 text-success-text',
  locked: 'bg-warning/20 text-warning-text',
  scoring: 'bg-brand/20 text-brand',
}

export function EventsAdminTable({ tournaments, pools }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function updateStatus(type: 'tournament' | 'pool', id: string, newStatus: string) {
    setUpdating(id)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/events/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Updated to "${newStatus}"`)
        setTimeout(() => window.location.reload(), 1000)
      } else {
        setMessage(data.error || 'Failed')
      }
    } catch {
      setMessage('Error')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className="bg-success/20 text-success-text text-sm px-4 py-2 rounded-lg">
          {message}
        </div>
      )}

      {tournaments.map(t => {
        const tournamentPools = pools.filter(p => p.tournament_id === t.id)

        return (
          <div key={t.id} className="bg-surface rounded-lg border border-border overflow-hidden">
            {/* Tournament header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-text-primary">{t.name}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[t.status] || 'bg-surface-inset text-text-muted'}`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-text-muted">{t.sport} · {t.format}</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {t.slug} · Started {new Date(t.starts_at).toLocaleDateString()}
                    {t.ends_at && ` · Ends ${new Date(t.ends_at).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus('tournament', t.id, e.target.value)}
                    disabled={updating === t.id}
                    className="text-xs bg-surface-inset border border-border rounded px-2 py-1.5 text-text-primary"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pools */}
            {tournamentPools.length > 0 && (
              <div className="divide-y divide-border-subtle">
                {tournamentPools.map(p => (
                  <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{p.name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[p.status] || 'bg-surface-inset text-text-muted'}`}>
                          {p.status}
                        </span>
                        <span className="text-[10px] text-text-muted">{p.game_type}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        ID: {p.id.slice(0, 8)}
                      </p>
                    </div>

                    <select
                      value={p.status}
                      onChange={(e) => updateStatus('pool', p.id, e.target.value)}
                      disabled={updating === p.id}
                      className="text-xs bg-surface-inset border border-border rounded px-2 py-1.5 text-text-primary"
                    >
                      {POOL_STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {tournamentPools.length === 0 && (
              <div className="px-4 py-3 text-xs text-text-muted italic">No pools</div>
            )}
          </div>
        )
      })}

      {tournaments.length === 0 && (
        <div className="bg-surface rounded-lg border border-border p-8 text-center text-text-muted">
          No tournaments found.
        </div>
      )}
    </div>
  )
}
