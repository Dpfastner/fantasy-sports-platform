'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface CrowsNestBadgeProps {
  rounds: number[]
  entryName: string
  className?: string
}

export function CrowsNestBadge({ rounds, entryName, className }: CrowsNestBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)
  const isConsecutive = rounds.length >= 2

  const updatePos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const spaceAbove = rect.top
    const below = spaceAbove < 120
    setPos({
      top: below ? rect.bottom + 8 : rect.top - 8,
      left: rect.left + rect.width / 2,
      below,
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
      <span className={`inline-flex items-center gap-0.5 ${className || ''}`}>
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowPopover(!showPopover) }}
          className="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform rounded-full"
          title="The Crow's Nest"
          style={{ width: 24, height: 24, background: '#FAF6EE', padding: 2 }}
        >
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 18, height: 18 }}>
            <rect x="3" y="50" width="58" height="5.5" rx="1.2" fill="#2C3E2D" />
            <polygon points="3,50 21,37 32,37" fill="#1a2b1a" />
            <polygon points="61,50 43,37 32,37" fill="#243524" />
            <rect x="17" y="35.5" width="30" height="3" rx="1" fill="#2C3E2D" />
            <rect x="21" y="16" width="22" height="22" rx="2" fill="#F5F0E8" />
            <rect x="21" y="16" width="4" height="22" fill="#E2D9C4" />
            <rect x="24.5" y="19.5" width="7" height="7" rx="0.8" fill="#A8C5A0" stroke="#7A9E74" strokeWidth="0.6" />
            <rect x="33.5" y="19.5" width="7" height="7" rx="0.8" fill="#A8C5A0" stroke="#7A9E74" strokeWidth="0.6" />
            <rect x="24.5" y="28.5" width="7" height="7" rx="0.8" fill="#8FAF87" stroke="#7A9E74" strokeWidth="0.6" />
            <rect x="33.5" y="28.5" width="7" height="7" rx="0.8" fill="#8FAF87" stroke="#7A9E74" strokeWidth="0.6" />
            <rect x="30.5" y="19.5" width="1.2" height="16" fill="#D4C9B0" />
            <rect x="24.5" y="27" width="16" height="1.2" fill="#D4C9B0" />
            <rect x="18.5" y="14" width="27" height="3.5" rx="1.2" fill="#D4C9B0" />
            <rect x="18.5" y="37.5" width="27" height="2.5" rx="1" fill="#D4C9B0" />
            <polygon points="32,3 44,14 32,14" fill="#243524" />
            <polygon points="32,3 20,14 32,14" fill="#1a2b1a" />
            <circle cx="32" cy="3" r="2.8" fill="#A8862A" />
            <circle cx="32" cy="3" r="2" fill="#C9A84C" />
          </svg>
        </button>
        {isConsecutive && (
          <span className="text-[9px] italic text-[#8B7355]">Back in the attic</span>
        )}
      </span>

      {showPopover && pos && (
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
        >
          <div style={{ background: '#FAF6EE', border: '1px solid rgba(201,168,76,.3)', borderRadius: 8, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,.15)', width: 260 }}>
            <p style={{ fontWeight: 700, color: '#1a5c38', marginBottom: 4, fontSize: 12 }}>The Crow&apos;s Nest</p>
            <p style={{ color: '#4a4a4a', fontSize: 11, lineHeight: 1.5 }}>
              &ldquo;I dipped into the Añejo. Please don&apos;t bill me.&rdquo;
              <span style={{ color: '#8B7355' }}> — Stewart Hagestad, 2024</span>
            </p>
            <p style={{ color: '#4a4a4a', fontSize: 11, lineHeight: 1.5, marginTop: 6 }}>
              {entryName} had the worst round in Round {rounds[rounds.length - 1]}.
              {isConsecutive ? ' Back-to-back stays. Getting comfortable up there.' : ' Sleep tight up there.'}
            </p>
            <p style={{ color: '#8B7355', fontSize: 11, fontStyle: 'italic', marginTop: 6 }}>
              ha, amateur.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
