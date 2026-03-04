'use client'

import { useState } from 'react'

interface WatchlistStarProps {
  schoolId: string
  leagueId: string
  initialWatchlisted: boolean
  size?: 'sm' | 'md'
  onToggle?: (schoolId: string, watchlisted: boolean) => void
}

export function WatchlistStar({
  schoolId,
  leagueId,
  initialWatchlisted,
  size = 'sm',
  onToggle,
}: WatchlistStarProps) {
  const [watchlisted, setWatchlisted] = useState(initialWatchlisted)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isToggling) return

    const newState = !watchlisted
    setWatchlisted(newState)
    setIsToggling(true)

    try {
      const res = await fetch('/api/watchlists/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, leagueId }),
      })

      if (res.ok) {
        onToggle?.(schoolId, newState)
      } else {
        setWatchlisted(!newState)
      }
    } catch {
      setWatchlisted(!newState)
    } finally {
      setIsToggling(false)
    }
  }

  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`flex-shrink-0 transition-colors ${
        watchlisted ? 'text-warning' : 'text-text-muted hover:text-warning/60'
      } ${isToggling ? 'opacity-50' : ''}`}
      title={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label={watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <svg
        className={sizeClasses}
        fill={watchlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    </button>
  )
}
