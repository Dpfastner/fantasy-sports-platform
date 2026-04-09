'use client'

/**
 * Biggest Movers widget — top 3 climbers and top 3 droppers over the rolling
 * snapshot window (default 30 min, maintained server-side by the gameday sync).
 *
 * Requires participants with `prevScoreToPar` populated on metadata. Empty
 * state shows "No movement in the last 30 minutes" when no deltas exist.
 */

import { useMemo } from 'react'
import { extractGolfers, computeMovers, type GolferMove } from '@/lib/events/golf-aggregations'

interface Participant {
  id: string
  name: string
  metadata?: Record<string, unknown> | null
}

interface BiggestMoversProps {
  participants: Participant[]
}

function formatScore(n: number): string {
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

function formatDelta(delta: number): string {
  if (delta === 0) return '—'
  if (delta > 0) return `↑${delta}`
  return `↓${Math.abs(delta)}`
}

export function BiggestMovers({ participants }: BiggestMoversProps) {
  const golfers = useMemo(() => extractGolfers(participants), [participants])
  const { climbers, droppers } = useMemo(() => computeMovers(golfers), [golfers])

  // Diagnose the empty state: is the baseline set? Is it stale?
  const snapshotInfo = useMemo(() => {
    const withPrev = golfers.filter(g => g.prevScoreAt)
    if (withPrev.length === 0) return { status: 'no_baseline' as const, at: null }
    // Use the oldest prev_at as a rough "when was the rolling window captured"
    const oldest = withPrev
      .map(g => (g.prevScoreAt ? new Date(g.prevScoreAt).getTime() : 0))
      .filter(t => t > 0)
      .sort((a, b) => a - b)[0]
    if (!oldest) return { status: 'no_baseline' as const, at: null }
    return {
      status: 'has_baseline' as const,
      at: new Date(oldest),
    }
  }, [golfers])

  if (climbers.length === 0 && droppers.length === 0) {
    let emptyMessage = 'No movement in the last 30 minutes.'
    if (snapshotInfo.status === 'no_baseline') {
      emptyMessage = 'Baseline forming — check back after the next sync.'
    } else if (snapshotInfo.at) {
      const ago = Math.round((Date.now() - snapshotInfo.at.getTime()) / 60000)
      emptyMessage = ago > 0
        ? `No movement since ${ago} min ago. Waiting for golfers to score.`
        : 'No movement yet. Snapshot just captured.'
    }
    return (
      <div className="bg-surface rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-text-primary">Biggest Movers</h3>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Last 30 min</span>
        </div>
        <p className="text-xs text-text-muted italic">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Biggest Movers</h3>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">Last 30 min</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MoverList
          title="Climbers"
          titleColor="text-success-text"
          arrow="↓"
          movers={climbers}
          deltaColorClass="text-success-text"
        />
        <MoverList
          title="Droppers"
          titleColor="text-danger-text"
          arrow="↑"
          movers={droppers}
          deltaColorClass="text-danger-text"
        />
      </div>
    </div>
  )
}

function MoverList({
  title,
  titleColor,
  arrow,
  movers,
  deltaColorClass,
}: {
  title: string
  titleColor: string
  arrow: string
  movers: GolferMove[]
  deltaColorClass: string
}) {
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wider mb-2 ${titleColor}`}>
        {arrow} {title}
      </div>
      {movers.length === 0 ? (
        <p className="text-xs text-text-muted italic">None</p>
      ) : (
        <div className="space-y-1.5">
          {movers.map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {m.countryCode && (
                  <img
                    src={`https://flagcdn.com/24x18/${m.countryCode}.png`}
                    alt=""
                    width={18}
                    height={14}
                    className="inline-block shrink-0 rounded-[2px]"
                    loading="lazy"
                  />
                )}
                <span className="text-text-primary truncate">{m.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-text-muted tabular-nums">{formatScore(m.currentScoreToPar)}</span>
                <span className={`text-xs font-semibold tabular-nums ${deltaColorClass}`}>{formatDelta(m.delta)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
