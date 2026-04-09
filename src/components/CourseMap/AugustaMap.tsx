'use client'

/**
 * Stylized Augusta National course map.
 *
 * Hand-authored SVG — not a copy of any copyrighted course illustration.
 * Represents the 18 holes in their approximate geographic relationships:
 * front 9 looping out and back to the clubhouse, Amen Corner (11-12-13)
 * at the eastern low point, finish loop (17-18) back at the clubhouse.
 *
 * Hole markers are numbered flag pins that highlight on hover/selection
 * and pulse when a golfer count is above zero. Tapping a pin is handled
 * by the parent via onHoleClick.
 */

import { AUGUSTA_HOLES } from '@/lib/events/augusta-holes'

interface AugustaMapProps {
  selectedHole: number | null
  onHoleClick: (hole: number) => void
  /** Map of hole number → count of golfers currently playing it */
  golferCounts: Map<number, number>
  /** Optional hole to highlight with a hardest/easiest ring */
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
    <svg
      viewBox="0 0 100 100"
      className="w-full h-auto"
      role="img"
      aria-label="Augusta National Golf Club course map"
    >
      {/* Base course area — soft green fill suggesting the property */}
      <defs>
        <radialGradient id="fairwayGradient" cx="50%" cy="55%" r="70%">
          <stop offset="0%" stopColor="#4a7c3a" />
          <stop offset="60%" stopColor="#3a6a2c" />
          <stop offset="100%" stopColor="#2a4f1f" />
        </radialGradient>
        <pattern id="treePattern" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.8" fill="#1e3a18" opacity="0.6" />
        </pattern>
      </defs>

      {/* Property boundary — irregular polygon suggesting Augusta's shape */}
      <path
        d="M 8 22 L 18 10 L 48 8 L 68 12 L 88 18 L 94 38 L 92 60 L 88 80 L 70 92 L 42 94 L 18 90 L 6 72 L 4 48 Z"
        fill="url(#fairwayGradient)"
        stroke="#1e3a18"
        strokeWidth="0.5"
      />

      {/* Tree border — patterned ring around the inside of the property */}
      <path
        d="M 8 22 L 18 10 L 48 8 L 68 12 L 88 18 L 94 38 L 92 60 L 88 80 L 70 92 L 42 94 L 18 90 L 6 72 L 4 48 Z"
        fill="none"
        stroke="url(#treePattern)"
        strokeWidth="6"
        opacity="0.5"
      />

      {/* Rae's Creek — curves through Amen Corner area */}
      <path
        d="M 90 20 Q 78 28 72 38 Q 68 46 72 52 Q 78 56 84 62"
        fill="none"
        stroke="#4a90c4"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Small pond near hole 15/16 */}
      <ellipse cx="80" cy="58" rx="3" ry="2" fill="#4a90c4" opacity="0.8" />

      {/* Clubhouse marker — top-left, roughly where it is in real life */}
      <g transform="translate(18 42)">
        <rect x="-2" y="-1.5" width="4" height="3" fill="#d4c5a0" stroke="#6b5a35" strokeWidth="0.2" />
        <text x="0" y="5" textAnchor="middle" className="fill-text-muted" fontSize="2.2" fontFamily="monospace">
          CLUB
        </text>
      </g>

      {/* Fairway path suggestions — faint connecting lines for visual flow */}
      <g stroke="#5a8f48" strokeWidth="0.8" fill="none" opacity="0.45" strokeLinecap="round">
        {/* Front 9 rough flow */}
        <path d="M 22 50 L 24 58 L 32 70 L 44 66 L 52 82 L 76 74 L 74 66 L 64 56 L 50 64 L 32 56" />
        {/* Back 9 rough flow */}
        <path d="M 22 46 L 42 44 L 58 18 L 78 26 L 84 36 L 70 32 L 66 42 L 82 60 L 60 46 L 44 40 L 22 44" />
      </g>

      {/* Hole markers */}
      {AUGUSTA_HOLES.map(hole => {
        const isSelected = selectedHole === hole.number
        const isAmenCorner = hole.number >= 11 && hole.number <= 13
        const count = golferCounts.get(hole.number) || 0
        const isHardest = hardestHole === hole.number
        const isEasiest = easiestHole === hole.number

        return (
          <g
            key={hole.number}
            transform={`translate(${hole.x} ${hole.y})`}
            className="cursor-pointer"
            onClick={() => onHoleClick(hole.number)}
          >
            {/* Difficulty ring (pulse for hardest/easiest) */}
            {(isHardest || isEasiest) && (
              <circle
                r="4.5"
                fill="none"
                stroke={isHardest ? '#ef4444' : '#4ade80'}
                strokeWidth="0.4"
                opacity="0.6"
                className="animate-pulse"
              />
            )}
            {/* Selection ring */}
            {isSelected && (
              <circle
                r="4"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="0.5"
              />
            )}
            {/* Flag pin — stick + pennant + base */}
            <line x1="0" y1="0" x2="0" y2="-3.5" stroke="#1a0f28" strokeWidth="0.3" />
            <path
              d={isAmenCorner
                ? 'M 0 -3.5 L 2.6 -2.8 L 0 -2 Z'
                : 'M 0 -3.5 L 2.4 -2.8 L 0 -2.2 Z'}
              fill={isSelected ? '#F59E0B' : isAmenCorner ? '#FAF5EE' : '#F59E0B'}
              stroke="#1a0f28"
              strokeWidth="0.15"
            />
            {/* Base circle with number */}
            <circle
              r="2.4"
              fill={isSelected ? '#F59E0B' : '#1a0f28'}
              stroke={isSelected ? '#FAF5EE' : '#F59E0B'}
              strokeWidth="0.3"
            />
            <text
              x="0"
              y="0.9"
              textAnchor="middle"
              className={isSelected ? 'fill-text-primary' : 'fill-brand'}
              fontSize="2.6"
              fontFamily="system-ui, sans-serif"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >
              {hole.number}
            </text>
            {/* Golfer count badge — small dot above the pin when golfers are present */}
            {count > 0 && (
              <g transform="translate(2.4 -2.8)">
                <circle r="1.5" fill="#E74C6F" stroke="#1a0f28" strokeWidth="0.2" />
                <text
                  x="0"
                  y="0.55"
                  textAnchor="middle"
                  className="fill-text-primary"
                  fontSize="1.6"
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  {count}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Amen Corner label */}
      <text
        x="72"
        y="15"
        className="fill-text-inverse"
        fontSize="2.2"
        fontWeight="600"
        letterSpacing="0.2"
        opacity="0.7"
      >
        AMEN CORNER
      </text>
    </svg>
  )
}
