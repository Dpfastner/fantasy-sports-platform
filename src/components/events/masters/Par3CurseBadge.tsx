'use client'

import { useState, useRef, useEffect } from 'react'

interface Par3CurseBadgeProps {
  className?: string
}

/**
 * "JINXED" badge shown next to any entry that has Aaron Rai on their roster,
 * or next to Rai himself on the tournament leaderboard.
 *
 * Aaron Rai won the 2026 Par 3 Contest. No Par 3 Contest winner has ever won
 * The Masters in the same year — 0 for 63+ years.
 */
export function Par3CurseBadge({ className }: Par3CurseBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  // Close popover on outside click
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
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        JINXED
      </button>

      {showPopover && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface border border-border rounded-lg shadow-lg text-xs text-text-secondary leading-relaxed">
          <p className="font-semibold text-amber-400 mb-1">The Par 3 Curse</p>
          <p>
            Aaron Rai won the 2026 Par 3 Contest at −6. No Par 3 Contest winner
            has <span className="italic">ever</span> won The Masters in the same year.
          </p>
          <p className="mt-1.5 text-text-muted">
            The curse: 0 for 64 years and counting.
          </p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-surface border-r border-b border-border rotate-45 -mt-1" />
        </div>
      )}
    </span>
  )
}
