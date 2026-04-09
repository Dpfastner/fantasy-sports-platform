'use client'

/**
 * Roster Matrix — a heatmap view showing every entry's 7 golfer picks,
 * colored by each golfer's current score-to-par.
 *
 * Rows: pool entries (one per roster submission), sorted by entry total score
 * Columns: golfers picked by any entry, sorted by current to-par
 * Cells: filled square if that entry picked that golfer, colored by score-to-par
 */

import { useMemo } from 'react'

interface Participant {
  id: string
  name: string
  shortName: string | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface EntryLite {
  id: string
  displayName: string
  entryName?: string | null
  userName?: string
  score: number
}

interface RosterMatrixProps {
  entries: EntryLite[]
  participants: Participant[]
  allRosterPicks: Record<string, string[]>
}

function scoreColorClass(scoreToPar: number | null): string {
  if (scoreToPar == null) return 'bg-surface-inset'
  if (scoreToPar <= -3) return 'bg-brand'
  if (scoreToPar <= -1) return 'bg-success'
  if (scoreToPar === 0) return 'bg-surface-hover'
  if (scoreToPar <= 2) return 'bg-warning/70'
  return 'bg-danger/70'
}

function scoreLabel(scoreToPar: number | null): string {
  if (scoreToPar == null) return '—'
  if (scoreToPar === 0) return 'E'
  if (scoreToPar > 0) return `+${scoreToPar}`
  return String(scoreToPar)
}

export function RosterMatrix({ entries, participants, allRosterPicks }: RosterMatrixProps) {
  // Build sorted list of golfers that have been picked by at least one entry
  const pickedGolfers = useMemo(() => {
    const pickedIds = new Set<string>()
    for (const picks of Object.values(allRosterPicks)) {
      for (const id of picks) pickedIds.add(id)
    }
    return participants
      .filter(p => pickedIds.has(p.id))
      .map(p => {
        const meta = (p.metadata || {}) as Record<string, unknown>
        return {
          id: p.id,
          name: p.name,
          shortName: p.shortName || p.name.split(' ').pop() || p.name,
          scoreToPar: (meta.score_to_par as number | null) ?? null,
          status: (meta.status as string) || 'active',
        }
      })
      .sort((a, b) => {
        const aScore = a.scoreToPar ?? 999
        const bScore = b.scoreToPar ?? 999
        return aScore - bScore || a.name.localeCompare(b.name)
      })
  }, [participants, allRosterPicks])

  // Sort entries by total score ascending (best first)
  const sortedEntries = useMemo(() => {
    return [...entries]
      .filter(e => allRosterPicks[e.id])
      .sort((a, b) => a.score - b.score)
  }, [entries, allRosterPicks])

  if (sortedEntries.length === 0 || pickedGolfers.length === 0) {
    return (
      <p className="text-sm text-text-muted italic text-center py-6">
        No roster picks to display yet.
      </p>
    )
  }

  // For each entry, build a set of picked golfer IDs for fast lookup
  const pickSets = new Map(sortedEntries.map(e => [e.id, new Set(allRosterPicks[e.id] || [])]))

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="min-w-max px-1">
        {/* Column header: golfer names (rotated) */}
        <div className="grid" style={{ gridTemplateColumns: `10rem repeat(${pickedGolfers.length}, 1.5rem)`, gap: '2px' }}>
          <div />
          {pickedGolfers.map(g => (
            <div
              key={g.id}
              className="flex items-end justify-center h-24"
              title={`${g.name} · ${scoreLabel(g.scoreToPar)}`}
            >
              <span
                className="text-[10px] text-text-muted whitespace-nowrap origin-bottom-left"
                style={{ transform: 'rotate(-60deg) translateX(-0.25rem)' }}
              >
                {g.shortName}
              </span>
            </div>
          ))}
        </div>

        {/* Row header summary (score badges) */}
        <div className="grid mb-1" style={{ gridTemplateColumns: `10rem repeat(${pickedGolfers.length}, 1.5rem)`, gap: '2px' }}>
          <div className="text-[9px] text-text-muted uppercase tracking-wider pr-2 flex items-end pb-0.5">Entry · Score</div>
          {pickedGolfers.map(g => (
            <div
              key={g.id}
              className={`h-4 flex items-center justify-center text-[8px] font-semibold text-text-primary rounded-sm ${scoreColorClass(g.scoreToPar)}`}
              title={`${g.name} · ${scoreLabel(g.scoreToPar)}`}
            >
              {scoreLabel(g.scoreToPar)}
            </div>
          ))}
        </div>

        {/* Entry rows */}
        {sortedEntries.map(entry => {
          const pickSet = pickSets.get(entry.id) || new Set<string>()
          const label = entry.entryName || entry.displayName
          return (
            <div
              key={entry.id}
              className="grid items-center hover:bg-surface-inset/30 rounded py-0.5"
              style={{ gridTemplateColumns: `10rem repeat(${pickedGolfers.length}, 1.5rem)`, gap: '2px' }}
            >
              <div className="pr-2 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">{label}</div>
                {entry.entryName && entry.userName && (
                  <div className="text-[10px] text-text-muted truncate">{entry.userName}</div>
                )}
                <div className="text-[10px] text-text-muted tabular-nums">{scoreLabel(entry.score)}</div>
              </div>
              {pickedGolfers.map(g => {
                const picked = pickSet.has(g.id)
                return (
                  <div
                    key={g.id}
                    className={`h-6 rounded-sm ${picked ? scoreColorClass(g.scoreToPar) : 'bg-transparent'}`}
                    title={picked ? `${label} picked ${g.name} · ${scoreLabel(g.scoreToPar)}` : ''}
                  />
                )
              })}
            </div>
          )
        })}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border-subtle text-[10px] text-text-muted">
          <span className="uppercase tracking-wider">Colors:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand" /> −3 or better</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success" /> −1 to −2</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-surface-hover" /> Even</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning/70" /> +1 to +2</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-danger/70" /> +3 or worse</span>
        </div>
      </div>
    </div>
  )
}
