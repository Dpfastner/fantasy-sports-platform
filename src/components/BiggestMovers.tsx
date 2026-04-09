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

  if (climbers.length === 0 && droppers.length === 0) {
    return (
      <div className="bg-surface rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Biggest Movers</h3>
        <p className="text-xs text-text-muted italic">No movement in the last 30 minutes.</p>
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
