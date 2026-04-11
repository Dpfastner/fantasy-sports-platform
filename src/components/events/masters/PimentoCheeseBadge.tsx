'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface PimentoCheeseBadgeProps {
  round: number
  entryName: string
  className?: string
}

export function PimentoCheeseBadge({ round, entryName, className }: PimentoCheeseBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null)

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
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowPopover(!showPopover) }}
        className={`inline-flex cursor-pointer hover:scale-110 transition-transform ${className || ''}`}
        title={`Pimento Cheese — Round ${round}`}
      >
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
          <path d="M8 24 Q6 13 32 12 Q58 13 56 24 L54 30 Q32 28 10 30 Z" fill="#E8C97A" />
          <path d="M8 24 Q6 13 32 12 Q58 13 56 24" stroke="#C9A84C" strokeWidth="1.8" fill="none" />
          <ellipse cx="32" cy="16" rx="18" ry="4" fill="#F0D890" opacity="0.45" />
          <path d="M10 30 Q32 32 54 30 L54 33.5 Q32 36 10 33.5 Z" fill="#D4A843" />
          <path d="M10 33.5 Q32 36 54 33.5 L54 39 Q32 41.5 10 39 Z" fill="#E8855A" />
          <ellipse cx="20" cy="35.5" rx="2.8" ry="1.6" fill="#C0392B" opacity="0.85" />
          <ellipse cx="32" cy="37" rx="2.8" ry="1.6" fill="#C0392B" opacity="0.85" />
          <ellipse cx="44" cy="35.5" rx="2.8" ry="1.6" fill="#C0392B" opacity="0.85" />
          <path d="M10 39 Q32 41.5 54 39 L55 43.5 Q32 46.5 9 43.5 Z" fill="#E8C97A" />
          <path d="M9 43.5 Q32 46.5 55 43.5 L55 51 Q32 55 9 51 Z" fill="#DDBA65" />
          <path d="M9 51 Q32 55 55 51" stroke="#C9A84C" strokeWidth="1.8" fill="none" />
          <line x1="32" y1="12" x2="32" y2="2" stroke="#C9A84C" strokeWidth="1" />
          <circle cx="32" cy="1.5" r="1.5" fill="#C9A84C" />
        </svg>
      </button>

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
            <p style={{ fontWeight: 700, color: '#1a5c38', marginBottom: 4, fontSize: 12 }}>Pimento Cheese — Round {round}</p>
            <p style={{ color: '#4a4a4a', fontSize: 11, lineHeight: 1.5 }}>
              The $1.50 pimento cheese sandwich has been sold at Augusta since 1947.{' '}
              {entryName} had the best round in Round {round}.
            </p>
            <p style={{ color: '#8B7355', fontSize: 11, fontStyle: 'italic', marginTop: 6 }}>
              Want one? They&apos;re at the concession stand between 5 and 6.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
