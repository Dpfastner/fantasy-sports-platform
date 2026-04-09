'use client'

/**
 * Augusta National course map.
 *
 * Uses public/augusta-map.jpg as the background image with absolutely-positioned
 * clickable hole markers layered over it. Hole coordinates come from
 * AUGUSTA_HOLES (percentage of image size, 0-100).
 *
 * Each marker shows the hole number + optional golfer count badge + pulse
 * ring on hardest/easiest holes of the current round.
 */

import Image from 'next/image'
import { AUGUSTA_HOLES } from '@/lib/events/augusta-holes'

interface AugustaMapProps {
  selectedHole: number | null
  onHoleClick: (hole: number) => void
  /** Map of hole number → count of golfers currently playing it */
  golferCounts: Map<number, number>
  hardestHole?: number | null
  easiestHole?: number | null
}

export function AugustaMap({
  selectedHole,
  onHoleClick,
  golferCounts,
  hardestHole,
  easiestHole,
}: AugustaMapProps) {
  return (
    <div className="relative w-full aspect-[5/4] bg-surface-inset">
      {/* Course map image */}
      <Image
        src="/Augusta%20Course%20Map.jpg"
        alt="Augusta National Golf Club course map"
        fill
        className="object-contain"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      {/* Hole marker overlay */}
      <div className="absolute inset-0">
        {AUGUSTA_HOLES.map(hole => {
          const isSelected = selectedHole === hole.number
          const count = golferCounts.get(hole.number) || 0
          const isHardest = hardestHole === hole.number
          const isEasiest = easiestHole === hole.number

          return (
            <button
              key={hole.number}
              type="button"
              onClick={() => onHoleClick(hole.number)}
              aria-label={`Hole ${hole.number} · ${hole.name} · Par ${hole.par}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${hole.x}%`, top: `${hole.y}%` }}
            >
              {/* Pulse ring for hardest / easiest */}
              {(isHardest || isEasiest) && (
                <span
                  className={`absolute inset-0 rounded-full animate-ping ${
                    isHardest ? 'bg-danger/40' : 'bg-success/40'
                  }`}
                  style={{ width: '1.75rem', height: '1.75rem', left: '-0.125rem', top: '-0.125rem' }}
                />
              )}

              {/* Hole pin — circle with number */}
              <div
                className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shadow-md ${
                  isSelected
                    ? 'bg-brand text-text-primary border-text-primary scale-125'
                    : 'bg-page text-brand border-brand group-hover:scale-110 group-hover:bg-brand group-hover:text-text-primary'
                }`}
              >
                {hole.number}
              </div>

              {/* Golfer count badge */}
              {count > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-accent text-text-primary text-[9px] font-bold flex items-center justify-center border border-page shadow-md">
                  {count}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
