'use client'

import { useMemo } from 'react'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface RosterOwnershipProps {
  participants: Participant[]
  selectionCounts: Record<string, number>
  totalEntries: number
}

const TIER_COLORS: Record<string, { bar: string; dot: string }> = {
  A: { bar: 'bg-brand', dot: 'bg-brand' },
  B: { bar: 'bg-info', dot: 'bg-info' },
  C: { bar: 'bg-warning', dot: 'bg-warning' },
}

export function RosterOwnership({ participants, selectionCounts, totalEntries }: RosterOwnershipProps) {
  const rows = useMemo(() => {
    return participants
      .map(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        const count = selectionCounts[p.id] || 0
        const pct = totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0
        return {
          id: p.id,
          name: p.name,
          tier: (meta.tier as string) || 'C',
          count,
          pct,
        }
      })
      .filter(r => r.count > 0) // only show picked golfers
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name))
  }, [participants, selectionCounts, totalEntries])

  if (totalEntries === 0) {
    return (
      <div className="bg-surface rounded-lg p-5 border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Player Ownership</h3>
        <p className="text-sm text-text-muted">No entries submitted yet. Ownership will appear once members lock in their picks.</p>
      </div>
    )
  }

  if (rows.length === 0) return null

  return (
    <div className="bg-surface rounded-lg p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Player Ownership</h3>
        <span className="text-xs text-text-muted">{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div className="space-y-2">
        {rows.map(row => {
          const colors = TIER_COLORS[row.tier] || TIER_COLORS.C
          return (
            <div key={row.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-text-primary truncate">{row.name}</span>
                <div className="flex-1 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bar} transition-all`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-text-muted tabular-nums w-10 text-right">{row.pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
