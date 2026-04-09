'use client'

/**
 * Tee Times card — shows today's tee times for either the current user's roster
 * or the marquee featured groups (top-ranked golfers).
 *
 * Data source: metadata.tee_time, start_hole, pair_ids, current_round — all
 * populated by the gameday sync from ESPN Core API status endpoint.
 */

import { useMemo, useState } from 'react'
import {
  extractGolfers,
  getTodaysTeeTimes,
  getFeaturedGroups,
  type TeeTimeRow,
  type GolferLite,
} from '@/lib/events/golf-aggregations'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
}

interface TeeTimesCardProps {
  participants: Participant[]
  /** Optional: filter My Roster view to only the current user's picks */
  myRosterPicks?: string[] | null
}

type ViewMode = 'mine' | 'featured'

function formatTeeTime(iso: string): string {
  try {
    const d = new Date(iso)
    const day = d.toLocaleDateString('en-US', { weekday: 'short' })
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `${day} · ${time}`
  } catch {
    return iso
  }
}

function formatScore(n: number | null): string {
  if (n == null) return '—'
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

function statusChip(status: TeeTimeRow['status']): { label: string; emoji: string; color: string } {
  switch (status) {
    case 'upcoming': return { label: 'Upcoming', emoji: '⏰', color: 'text-text-muted' }
    case 'on_course': return { label: 'On Course', emoji: '🏌️', color: 'text-brand' }
    case 'finished': return { label: 'Finished', emoji: '✅', color: 'text-success-text' }
  }
}

export function TeeTimesCard({ participants, myRosterPicks }: TeeTimesCardProps) {
  const golfers = useMemo(() => extractGolfers(participants), [participants])
  const hasAnyTeeTime = golfers.some(g => g.teeTime)

  const hasRoster = myRosterPicks && myRosterPicks.length > 0
  const defaultView: ViewMode = hasRoster ? 'mine' : 'featured'
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView)

  const myRows = useMemo(
    () => hasRoster ? getTodaysTeeTimes(golfers, myRosterPicks) : [],
    [golfers, myRosterPicks, hasRoster]
  )
  const featuredGroups = useMemo(() => getFeaturedGroups(golfers, 6), [golfers])
  const currentRound = useMemo(() => {
    const rounds = golfers.map(g => g.currentRound).filter((r): r is number => typeof r === 'number' && r > 0)
    return rounds.length > 0 ? Math.max(...rounds) : 1
  }, [golfers])

  if (!hasAnyTeeTime) {
    return (
      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Tee Times</h3>
        <p className="text-xs text-text-muted italic">Tee times will appear on Thursday morning.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-border">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Tee Times</h3>
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Round {currentRound}</p>
        </div>
        {hasRoster && (
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('mine')}
              className={`text-xs font-semibold uppercase tracking-wider py-1.5 px-3 rounded transition-colors ${
                viewMode === 'mine' ? 'bg-brand text-text-primary' : 'bg-surface-inset text-text-muted hover:text-text-primary'
              }`}
            >
              My Roster
            </button>
            <button
              onClick={() => setViewMode('featured')}
              className={`text-xs font-semibold uppercase tracking-wider py-1.5 px-3 rounded transition-colors ${
                viewMode === 'featured' ? 'bg-brand text-text-primary' : 'bg-surface-inset text-text-muted hover:text-text-primary'
              }`}
            >
              Featured
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {viewMode === 'mine' ? (
          myRows.length === 0 ? (
            <p className="text-xs text-text-muted italic">No tee times for your roster today.</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {myRows.map(row => (
                <TeeTimeRowView key={row.id} row={row} />
              ))}
            </div>
          )
        ) : featuredGroups.length === 0 ? (
          <p className="text-xs text-text-muted italic">No featured groups to show yet.</p>
        ) : (
          <div className="space-y-3">
            {featuredGroups.slice(0, 4).map((group, i) => (
              <FeaturedGroupView key={`${group.teeTime}-${i}`} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TeeTimeRowView({ row }: { row: TeeTimeRow }) {
  const chip = statusChip(row.status)
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        {row.countryCode && (
          <img
            src={`https://flagcdn.com/24x18/${row.countryCode}.png`}
            alt=""
            width={18}
            height={14}
            className="inline-block shrink-0 rounded-[2px]"
            loading="lazy"
          />
        )}
        <span className="text-text-primary truncate">{row.name}</span>
        {row.scoreToPar != null && (
          <span className="text-[10px] text-text-muted tabular-nums shrink-0">{formatScore(row.scoreToPar)}</span>
        )}
      </div>
      <div className="text-xs text-text-secondary tabular-nums shrink-0">
        {formatTeeTime(row.teeTime)} · Tee {row.startHole}
      </div>
      <div className={`text-xs shrink-0 ${chip.color}`} title={chip.label}>
        {chip.emoji}
      </div>
    </div>
  )
}

function FeaturedGroupView({ group }: { group: { teeTime: string; startHole: number; golfers: GolferLite[] } }) {
  return (
    <div className="bg-surface-inset/40 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-brand font-semibold tabular-nums">
          {formatTeeTime(group.teeTime)} · Tee {group.startHole}
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {group.golfers.map(g => (
          <div key={g.id} className="flex items-center justify-between gap-2 text-sm py-1.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {g.countryCode && (
                <img
                  src={`https://flagcdn.com/24x18/${g.countryCode}.png`}
                  alt=""
                  width={16}
                  height={12}
                  className="inline-block shrink-0 rounded-[2px]"
                  loading="lazy"
                />
              )}
              <span className="text-text-primary truncate">{g.name}</span>
            </div>
            <span className="text-xs text-text-muted tabular-nums shrink-0">
              {formatScore(g.scoreToPar ?? null)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
