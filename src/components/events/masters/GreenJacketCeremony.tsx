'use client'

import { useState, useEffect } from 'react'
import { GreenJacketBadge } from './GreenJacketBadge'

interface GreenJacketCeremonyProps {
  winnerName: string
}

const SESSION_KEY = 'rivyls-green-jacket-shown'

/**
 * Full-screen overlay animation for the Masters pool champion.
 * Shows once per session (tracked via sessionStorage).
 */
export function GreenJacketCeremony({ winnerName }: GreenJacketCeremonyProps) {
  const [visible, setVisible] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    // Only show once per session
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return
    setVisible(true)
    // Trigger fade in
    requestAnimationFrame(() => setFadeIn(true))
    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => dismiss(), 8000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    setFadeIn(false)
    setTimeout(() => {
      setVisible(false)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, '1')
      }
    }, 500)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'radial-gradient(ellipse at center, #0e1c0e 0%, #070d07 60%, #040904 100%)' }}
      onClick={dismiss}
    >
      <div className="flex flex-col items-center">
        <GreenJacketBadge />

        <div className="text-center mt-7 animate-fade-in">
          <div
            className="text-[10px] uppercase tracking-[.24em] mb-2"
            style={{ color: '#C9A84C', opacity: 0.85 }}
          >
            Rivyls &middot; Masters 2026
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold tracking-wide"
            style={{
              color: '#F5F0E8',
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 40px rgba(201,168,76,.4)',
            }}
          >
            {winnerName}
          </div>
          <div
            className="text-2xl sm:text-3xl font-bold tracking-wide mt-1"
            style={{
              color: '#F5F0E8',
              fontFamily: 'Georgia, serif',
              textShadow: '0 0 40px rgba(201,168,76,.4)',
            }}
          >
            Wins the Green Jacket
          </div>
          <div
            className="text-xs italic mt-2 tracking-wide"
            style={{ color: 'rgba(245,240,232,.4)' }}
          >
            Pool Champion &middot; Best in Augusta
          </div>
          <div
            className="mx-auto mt-4"
            style={{
              width: 80,
              height: 1,
              background: 'linear-gradient(to right,transparent,#C9A84C,transparent)',
              opacity: 0.5,
            }}
          />
        </div>
      </div>

      <button
        onClick={dismiss}
        className="absolute top-6 right-6 text-white/40 hover:text-white/80 transition-colors text-sm"
      >
        Close
      </button>
    </div>
  )
}
