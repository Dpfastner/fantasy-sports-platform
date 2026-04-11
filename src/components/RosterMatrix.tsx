'use client'

/**
 * Roster Matrix — heatmap showing every picked golfer × every pool entry,
 * with cells colored by each golfer's current score-to-par.
 *
 * Rows: picked golfers (sorted by current score-to-par)
 * Columns: pool entries (sorted by current entry score)
 * Cells: filled square if that entry picked that golfer, colored by golfer's
 * to-par; empty bordered cell otherwise.
 *
 * Uses real borders (not gap) for crisp grid lines.
 */

import { useMemo, Fragment } from 'react'

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
  // Picked golfers sorted by current score
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
          shortName: p.shortName || p.name,
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

  // Entries sorted by total score
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

  // For each entry, a Set of picked golfer IDs for fast lookup
  const pickSets = new Map(sortedEntries.map(e => [e.id, new Set(allRosterPicks[e.id] || [])]))

  // Row/col dimensions
  // Entry columns use minmax so they stretch to fill available width when
  // there are few entries, and fall back to 4.5rem + horizontal scroll when
  // the container is narrower than the full grid.
  const goldierCol = '12rem'                  // left header column for golfer info

  return (
    <div className="overflow-x-auto -mx-1">
      <div
        className="w-full px-1 text-xs"
        style={{
          display: 'grid',
          gridTemplateColumns: `${goldierCol} repeat(${sortedEntries.length}, minmax(4.5rem, 1fr))`,
          minWidth: `calc(12rem + ${sortedEntries.length} * 4.5rem)`,
        }}
      >
        {/* ── Top-left corner cell ── */}
        <div className="border-b border-r border-border-subtle p-2 bg-surface-inset sticky left-0 z-10">
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Golfer</div>
        </div>

        {/* ── Entry column headers ── */}
        {sortedEntries.map(entry => {
          const label = entry.entryName || entry.displayName
          return (
            <div
              key={`h-${entry.id}`}
              className="border-b border-r border-border-subtle p-2 bg-surface-inset text-center flex flex-col items-center justify-end"
              title={label}
            >
              <div className="text-[10px] text-text-primary font-medium truncate w-full">{label}</div>
              <div className={`text-[10px] font-semibold tabular-nums ${
                entry.score < 0 ? 'text-success-text'
                : entry.score > 0 ? 'text-danger-text'
                : 'text-text-muted'
              }`}>{scoreLabel(entry.score)}</div>
            </div>
          )
        })}

        {/* ── Golfer rows ── */}
        {pickedGolfers.map(golfer => {
          return (
            <Fragment key={`row-${golfer.id}`}>
              {/* Golfer name cell (row header) */}
              <div
                className="border-b border-r border-border-subtle px-2 py-1.5 bg-surface-inset flex items-center justify-between gap-2 min-w-0 sticky left-0 z-10"
              >
                <span className="text-text-primary truncate">{golfer.name}</span>
                <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                  golfer.scoreToPar != null && golfer.scoreToPar < 0 ? 'text-success-text'
                  : golfer.scoreToPar != null && golfer.scoreToPar > 0 ? 'text-danger-text'
                  : 'text-text-muted'
                }`}>
                  {scoreLabel(golfer.scoreToPar)}
                </span>
              </div>
              {/* Entry cells */}
              {sortedEntries.map(entry => {
                const picked = pickSets.get(entry.id)?.has(golfer.id)
                return (
                  <div
                    key={`c-${golfer.id}-${entry.id}`}
                    className={`border-b border-r border-border-subtle h-8 flex items-center justify-center ${
                      picked ? scoreColorClass(golfer.scoreToPar) : 'bg-surface'
                    }`}
                    title={picked ? `${entry.entryName || entry.displayName} picked ${golfer.name}` : ''}
                  >
                    {picked && (
                      <span className="text-[10px] text-text-primary font-semibold tabular-nums">
                        {scoreLabel(golfer.scoreToPar)}
                      </span>
                    )}
                  </div>
                )
              })}
            </Fragment>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border-subtle text-[10px] text-text-muted px-1">
        <span className="uppercase tracking-wider">Colors:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand" /> −3 or better</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success" /> −1 to −2</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-surface-hover" /> Even</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning/70" /> +1 to +2</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-danger/70" /> +3 or worse</span>
      </div>
    </div>
  )
}
