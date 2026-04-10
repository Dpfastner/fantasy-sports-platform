'use client'

/**
 * Two-panel Course view: Augusta SVG map on the left, hole info panel on the right.
 * Desktop: side-by-side. Mobile: stacked (map on top, info below).
 */

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { AugustaMap } from './AugustaMap'
import { HoleInfoPanel } from './HoleInfoPanel'
import { getHoleByNumber, AUGUSTA_META } from '@/lib/events/augusta-holes'
import {
  extractGolfers,
  groupGolfersByCurrentHole,
  getLatestRound,
  findExtremeHoles,
} from '@/lib/events/golf-aggregations'

interface CourseMapContainerProps {
  participants: Array<{ id: string; name: string; metadata?: Record<string, unknown> | null }>
}

export function CourseMapContainer({ participants }: CourseMapContainerProps) {
  const [selectedHole, setSelectedHole] = useState<number | null>(1)

  const golfers = useMemo(() => extractGolfers(participants), [participants])
  const round = useMemo(() => getLatestRound(golfers), [golfers])
  const golferCounts = useMemo(() => {
    const grouped = groupGolfersByCurrentHole(golfers)
    const counts = new Map<number, number>()
    for (const [hole, list] of grouped.entries()) counts.set(hole, list.length)
    return counts
  }, [golfers])
  const extremes = useMemo(() => findExtremeHoles(golfers, round), [golfers, round])

  const selectedHoleData = selectedHole ? getHoleByNumber(selectedHole) : null

  return (
    <div className="space-y-4">
      {/* Header strip — surface box with Masters logo + course meta + hardest/easiest chips */}
      <div className="bg-surface rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/Masters-Logo.png"
              alt="Masters Tournament"
              width={48}
              height={48}
              className="shrink-0 object-contain"
            />
            <div>
              <h3 className="brand-h3 text-base text-text-primary">{AUGUSTA_META.name}</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Par {AUGUSTA_META.par} · {AUGUSTA_META.totalYards.toLocaleString()} yds · {AUGUSTA_META.designers} · Opened {AUGUSTA_META.opened}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {extremes.hardest && (
              <button
                onClick={() => setSelectedHole(extremes.hardest!.hole)}
                className="text-xs bg-surface-inset hover:bg-surface-hover border border-danger/40 rounded px-2.5 py-1.5 transition-colors"
              >
                <span className="text-text-muted uppercase tracking-wider mr-1.5">Hardest</span>
                <span className="text-danger-text font-semibold">
                  #{extremes.hardest.hole} (+{extremes.hardest.avgVsPar.toFixed(2)})
                </span>
              </button>
            )}
            {extremes.easiest && (
              <button
                onClick={() => setSelectedHole(extremes.easiest!.hole)}
                className="text-xs bg-surface-inset hover:bg-surface-hover border border-success/40 rounded px-2.5 py-1.5 transition-colors"
              >
                <span className="text-text-muted uppercase tracking-wider mr-1.5">Easiest</span>
                <span className="text-success-text font-semibold">
                  #{extremes.easiest.hole} ({extremes.easiest.avgVsPar.toFixed(2)})
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map panel — cream/beige background matches the info panel */}
        <div className="bg-tertiary rounded-lg border border-border overflow-hidden flex items-center justify-center">
          <div className="w-full max-w-full">
            <AugustaMap
              selectedHole={selectedHole}
              onHoleClick={setSelectedHole}
              golferCounts={golferCounts}
              hardestHole={extremes.hardest?.hole ?? null}
              easiestHole={extremes.easiest?.hole ?? null}
            />
          </div>
        </div>

        {/* Info panel — dark surface for contrast with cream blocks */}
        <HoleInfoPanel
          hole={selectedHoleData ?? null}
          round={round}
          golfers={golfers}
        />
      </div>
    </div>
  )
}
