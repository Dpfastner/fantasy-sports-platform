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
  /** When 'embedded', the component drops its own card chrome (background,
   *  border, padding, header) because a parent is providing those. */
  variant?: 'standalone' | 'embedded'
}

// Royal Gambit palette — warm / neutral / cool trio.
const TIER_COLORS: Record<string, { bar: string; dot: string }> = {
  A: { bar: 'bg-brand', dot: 'bg-brand' },                      // amber    #F59E0B
  B: { bar: 'bg-tertiary', dot: 'bg-tertiary' },                // cream    #FAF5EE
  C: { bar: 'bg-text-secondary', dot: 'bg-text-secondary' },    // lavender #C4B5D4
}

export function RosterOwnership({ participants, selectionCounts, totalEntries, variant = 'standalone' }: RosterOwnershipProps) {
  const embedded = variant === 'embedded'
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
    if (embedded) {
      return <p className="text-sm text-text-muted">No entries submitted yet. Ownership will appear once members lock in their picks.</p>
    }
    return (
      <div className="bg-surface rounded-lg p-5 border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Player Ownership</h3>
        <p className="text-sm text-text-muted">No entries submitted yet. Ownership will appear once members lock in their picks.</p>
      </div>
    )
  }

  if (rows.length === 0) return null

  const body = (
    <div className="space-y-2">
        {rows.map(row => {
          const colors = TIER_COLORS[row.tier] || TIER_COLORS.C
          return (
            <div key={row.id} className="grid grid-cols-[0.5rem_8rem_1fr_2.5rem] sm:grid-cols-[0.5rem_11rem_1fr_2.5rem] items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span className="text-sm text-text-primary truncate">{row.name}</span>
              <div className="h-1.5 bg-surface-inset rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} transition-all`}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="text-xs text-text-muted tabular-nums text-right">{row.pct}%</span>
            </div>
          )
        })}
    </div>
  )

  if (embedded) return body

  return (
    <div className="bg-surface rounded-lg p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Player Ownership</h3>
        <span className="text-xs text-text-muted">{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
      </div>
      {body}
    </div>
  )
}
