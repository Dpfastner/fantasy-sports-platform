'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

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
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    })
  }, [])

  useEffect(() => {
    if (!showPopover) return
    updatePos()
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [showPopover, updatePos])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setShowPopover(!showPopover)
        }}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer ${className || ''}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        JINXED
      </button>

      {showPopover && pos && (
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div style={{ background: '#FAF6EE', border: '1px solid rgba(201,168,76,.3)', borderRadius: 8, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,.15)', width: 260 }}>
            <p style={{ fontWeight: 700, color: '#1a5c38', marginBottom: 4, fontSize: 12 }}>The Par 3 Curse</p>
            <p style={{ color: '#4a4a4a', fontSize: 11, lineHeight: 1.5 }}>
              Aaron Rai won the 2026 Par 3 Contest at −6. No Par 3 Contest winner
              has <span style={{ fontStyle: 'italic' }}>ever</span> won The Masters in the same year.
            </p>
            <p style={{ color: '#8B7355', fontSize: 11, fontStyle: 'italic', marginTop: 6 }}>
              The curse: 0 for 64 years and counting.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
