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
 *
 * Dev-mode coordinate readout: when NEXT_PUBLIC_COURSE_MAP_DEV=true, hovering
 * the map displays the x/y percentage at the cursor position so coordinates
 * can be read off the actual pin locations and pasted into augusta-holes.ts.
 */

import Image from 'next/image'
import { useRef, useState } from 'react'
import { AUGUSTA_HOLES } from '@/lib/events/augusta-holes'

interface AugustaMapProps {
  selectedHole: number | null
  onHoleClick: (hole: number) => void
  /** Map of hole number → count of golfers currently playing it */
  golferCounts: Map<number, number>
  hardestHole?: number | null
  easiestHole?: number | null
}

const DEV_MODE = process.env.NEXT_PUBLIC_COURSE_MAP_DEV === 'true'

export function AugustaMap({
  selectedHole,
  onHoleClick,
  golferCounts,
  hardestHole,
  easiestHole,
}: AugustaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!DEV_MODE) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setHoverPos({ x, y })
  }

  const handleMouseLeave = () => {
    if (DEV_MODE) setHoverPos(null)
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-[5/4] bg-surface"
    >
      {/* Course map image */}
      <Image
        src="/Augusta%20Course%20Map.jpg"
        alt="Augusta National Golf Club course map"
        fill
        className="object-contain"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      {/* Hole marker overlay.
          AUGUSTA_HOLES coordinates point at the actual yellow flag pin.
          We render the clickable circle with a consistent LEFT offset
          (pixel-based so it stays uniform regardless of map size) so the
          pin stays visible to the right of each marker. */}
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
                left: `${hole.x}%`,
                top: `${hole.y}%`,
                // -100% moves the marker's RIGHT edge to the pin location,
                // placing the entire circle to the LEFT of the flag.
                // -16px adds a visible gap between marker and flag.
                transform: 'translate(calc(-100% - 16px), -50%)',
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

      {/* Dev mode: hover coordinate readout + crosshair */}
      {DEV_MODE && hoverPos && (
        <>
          <div
            className="absolute w-px h-full bg-brand/70 pointer-events-none"
            style={{ left: `${hoverPos.x}%`, top: 0 }}
          />
          <div
            className="absolute w-full h-px bg-brand/70 pointer-events-none"
            style={{ top: `${hoverPos.y}%`, left: 0 }}
          />
          <div className="absolute top-2 right-2 bg-page border border-brand rounded px-2 py-1 text-xs font-mono text-brand pointer-events-none shadow-lg">
            x: {hoverPos.x.toFixed(1)}% · y: {hoverPos.y.toFixed(1)}%
          </div>
        </>
      )}
    </div>
  )
}
