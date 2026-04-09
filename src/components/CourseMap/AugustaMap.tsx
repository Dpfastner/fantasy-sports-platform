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
    <div className="relative w-full aspect-[5/4] bg-tertiary">
      {/* Course map image */}
      <Image
        src="/Augusta%20Course%20Map.jpg"
        alt="Augusta National Golf Club course map"
        fill
        className="object-contain"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      {/* Hole marker overlay — circles sit UP-RIGHT of the flag icons in the image */}
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
              className="absolute group"
              style={{
                // Offset the circle slightly up-right from the flag anchor
                // so the flag icon remains visible beneath it.
                left: `calc(${hole.x}% + 1.1rem)`,
                top: `calc(${hole.y}% - 1.1rem)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pulse ring for hardest / easiest */}
              {(isHardest || isEasiest) && (
                <span
                  className={`absolute inset-0 rounded-full animate-ping ${
                    isHardest ? 'bg-danger/40' : 'bg-success/40'
                  }`}
                  style={{ width: '1.25rem', height: '1.25rem' }}
                />
              )}

              {/* Hole pin — smaller circle, clearly styled against cream bg */}
              <div
                className={`relative w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all shadow-md ${
                  isSelected
                    ? 'bg-page text-brand border-brand scale-125 ring-2 ring-brand/40'
                    : 'bg-brand text-text-inverse border-page group-hover:scale-110'
                }`}
              >
                {hole.number}
              </div>

              {/* Golfer count badge */}
              {count > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[0.9rem] h-3.5 px-1 rounded-full bg-accent text-text-primary text-[8px] font-bold flex items-center justify-center border border-page shadow-sm">
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
