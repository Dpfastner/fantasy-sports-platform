'use client'

import { useState, useRef, useEffect } from 'react'

interface PimentoCheeseBadgeProps {
  round: number
  entryName: string
  className?: string
}

/**
 * Pimento Cheese Sandwich award — best round performance.
 * Awarded permanently per round. Stack side-by-side for multiple rounds.
 */
export function PimentoCheeseBadge({ round, entryName, className }: PimentoCheeseBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

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
    <span className={`relative inline-flex ${className || ''}`}>
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowPopover(!showPopover)
        }}
        className="inline-flex cursor-pointer hover:scale-110 transition-transform"
        title={`Pimento Cheese — Round ${round}`}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
        >
          {/* Top bread — domed, soft */}
          <path d="M8 24 Q6 13 32 12 Q58 13 56 24 L54 30 Q32 28 10 30 Z" fill="#E8C97A" />
          <path d="M8 24 Q6 13 32 12 Q58 13 56 24" stroke="#C9A84C" strokeWidth="1.8" fill="none" />
          <ellipse cx="32" cy="16" rx="18" ry="4" fill="#F0D890" opacity="0.45" />
          {/* Top bread underside */}
          <path d="M10 30 Q32 32 54 30 L54 33.5 Q32 36 10 33.5 Z" fill="#D4A843" />
          {/* Pimento cheese filling */}
          <path d="M10 33.5 Q32 36 54 33.5 L54 39 Q32 41.5 10 39 Z" fill="#E8855A" />
          <path d="M15 34.8 Q24 33.5 31 34.8 Q38 36 44 34.8 Q50 33.5 53 35.2" stroke="#D4694A" strokeWidth="1" fill="none" opacity="0.55" />
          <path d="M13 37 Q22 35.5 29 37 Q37 38.5 45 37 Q51 35.8 54 37.5" stroke="#D4694A" strokeWidth="1" fill="none" opacity="0.5" />
          {/* Pimento pepper pieces */}
          <ellipse cx="20" cy="35.5" rx="2.8" ry="1.6" fill="#C0392B" opacity="0.85" />
          <ellipse cx="32" cy="37" rx="2.8" ry="1.6" fill="#C0392B" opacity="0.85" />
          <ellipse cx="44" cy="35.5" rx="2.8" ry="1.6" fill="#C0392B" opacity="0.85" />
          <ellipse cx="26.5" cy="38" rx="2" ry="1.2" fill="#C0392B" opacity="0.75" />
          <ellipse cx="38.5" cy="37.5" rx="2" ry="1.2" fill="#C0392B" opacity="0.75" />
          <ellipse cx="14" cy="36.5" rx="1.5" ry="1" fill="#C0392B" opacity="0.6" />
          <ellipse cx="50" cy="36.5" rx="1.5" ry="1" fill="#C0392B" opacity="0.6" />
          {/* Bottom bread */}
          <path d="M10 39 Q32 41.5 54 39 L55 43.5 Q32 46.5 9 43.5 Z" fill="#E8C97A" />
          <path d="M9 43.5 Q32 46.5 55 43.5 L55 51 Q32 55 9 51 Z" fill="#DDBA65" />
          <path d="M9 51 Q32 55 55 51" stroke="#C9A84C" strokeWidth="1.8" fill="none" />
          <path d="M9 51 Q32 55 55 51 Q32 57 9 53 Z" fill="#C9A84C" opacity="0.2" />
          {/* Toothpick */}
          <line x1="32" y1="12" x2="32" y2="2" stroke="#C9A84C" strokeWidth="1" />
          <circle cx="32" cy="1.5" r="1.5" fill="#C9A84C" />
        </svg>
      </button>

      {showPopover && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface border border-border rounded-lg shadow-lg text-xs text-text-secondary leading-relaxed">
          <p className="font-semibold text-amber-500 mb-1">Pimento Cheese — Round {round}</p>
          <p>
            The $1.50 pimento cheese sandwich has been sold at Augusta since 1947.{' '}
            {entryName} had the best round in Round {round}.
          </p>
          <p className="mt-1.5 text-text-muted italic">
            Want one? They&apos;re at the concession stand between 5 and 6.
          </p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-surface border-r border-b border-border rotate-45 -mt-1" />
        </div>
      )}
    </span>
  )
}
