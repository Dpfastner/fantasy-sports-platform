'use client'

import { useState, useRef, useEffect } from 'react'

interface CrowsNestBadgeProps {
  rounds: number[]
  entryName: string
  className?: string
}

/**
 * Crow's Nest badge — worst round performance.
 * Rotates each round — only one holder at a time.
 *
 * The Crow's Nest is the 30x40ft dorm room at the top of the Augusta National
 * clubhouse where amateur players stay during the Masters.
 */
export function CrowsNestBadge({ rounds, entryName, className }: CrowsNestBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const isConsecutive = rounds.length >= 2

  useEffect(() => {
    if (!showPopover) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showPopover])

  return (
    <span className={`relative inline-flex items-center gap-0.5 ${className || ''}`}>
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowPopover(!showPopover)
        }}
        className="inline-flex cursor-pointer hover:scale-110 transition-transform"
        title="The Crow's Nest"
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
        >
          {/* Clubhouse roofline */}
          <rect x="3" y="50" width="58" height="5.5" rx="1.2" fill="#2C3E2D" />
          <polygon points="3,50 21,37 32,37" fill="#1a2b1a" />
          <polygon points="61,50 43,37 32,37" fill="#243524" />
          <rect x="17" y="35.5" width="30" height="3" rx="1" fill="#2C3E2D" />
          <rect x="17" y="35.5" width="30" height="1" rx="0.5" fill="#3a4e3a" opacity="0.5" />
          {/* Cupola tower body */}
          <rect x="21" y="16" width="22" height="22" rx="2" fill="#F5F0E8" />
          <rect x="21" y="16" width="4" height="22" rx="0" fill="#E2D9C4" />
          <rect x="41" y="16" width="2" height="22" fill="#FAF6EE" opacity="0.6" />
          {/* Windows */}
          <rect x="24.5" y="19.5" width="7" height="7" rx="0.8" fill="#A8C5A0" stroke="#7A9E74" strokeWidth="0.6" />
          <rect x="33.5" y="19.5" width="7" height="7" rx="0.8" fill="#A8C5A0" stroke="#7A9E74" strokeWidth="0.6" />
          <rect x="24.5" y="28.5" width="7" height="7" rx="0.8" fill="#8FAF87" stroke="#7A9E74" strokeWidth="0.6" />
          <rect x="33.5" y="28.5" width="7" height="7" rx="0.8" fill="#8FAF87" stroke="#7A9E74" strokeWidth="0.6" />
          {/* Mullions */}
          <rect x="30.5" y="19.5" width="1.2" height="16" fill="#D4C9B0" />
          <rect x="24.5" y="27" width="16" height="1.2" fill="#D4C9B0" />
          {/* Warm glow */}
          <rect x="24.5" y="19.5" width="7" height="7" rx="0.8" fill="rgba(255,240,180,0.2)" />
          <rect x="33.5" y="19.5" width="7" height="7" rx="0.8" fill="rgba(255,240,180,0.2)" />
          {/* Cornice */}
          <rect x="18.5" y="14" width="27" height="3.5" rx="1.2" fill="#D4C9B0" />
          <rect x="18.5" y="14" width="27" height="1" rx="0.6" fill="#E8E0CC" opacity="0.7" />
          {/* Base trim */}
          <rect x="18.5" y="37.5" width="27" height="2.5" rx="1" fill="#D4C9B0" />
          {/* Pyramid roof */}
          <polygon points="32,3 44,14 32,14" fill="#243524" />
          <polygon points="32,3 20,14 32,14" fill="#1a2b1a" />
          <line x1="20" y1="14" x2="44" y2="14" stroke="#2C3E2D" strokeWidth="0.8" />
          {/* Gold finial */}
          <circle cx="32" cy="3" r="2.8" fill="#A8862A" />
          <circle cx="32" cy="3" r="2" fill="#C9A84C" />
          <circle cx="31" cy="2.2" r="0.8" fill="#E8C96A" opacity="0.8" />
        </svg>
      </button>
      {isConsecutive && (
        <span className="text-[9px] italic text-[#8B7355]">Back in the attic</span>
      )}

      {showPopover && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface border border-border rounded-lg shadow-lg text-xs text-text-secondary leading-relaxed">
          <p className="font-semibold text-[#8B7355] mb-1">The Crow&apos;s Nest</p>
          <p>
            &ldquo;I dipped into the Añejo. Please don&apos;t bill me.&rdquo;
            <span className="text-text-muted"> — Stewart Hagestad, 2024</span>
          </p>
          <p className="mt-1.5">
            {entryName} had the worst round in Round {rounds[rounds.length - 1]}.
            {isConsecutive ? ' Back-to-back stays. Getting comfortable up there.' : ' Sleep tight up there.'}
          </p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-surface border-r border-b border-border rotate-45 -mt-1" />
        </div>
      )}
    </span>
  )
}
