'use client'

import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/components/Toast'

interface CopyableEntry {
  entryId: string
  poolName: string
  displayName: string | null
  pickCount: number
  picks: { gameId: string; participantId: string }[]
}

interface CopyBracketButtonProps {
  tournamentId: string
  poolId: string
  onCopy: (picks: Record<string, string>) => void
  disabled?: boolean
}

export function CopyBracketButton({ tournamentId, poolId, onCopy, disabled }: CopyBracketButtonProps) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<CopyableEntry[] | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const handleClick = async () => {
    if (disabled || loading) return

    // If we already fetched and have multiple, just toggle dropdown
    if (entries && entries.length > 1) {
      setShowDropdown(!showDropdown)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/events/picks/copyable?tournamentId=${tournamentId}&excludePoolId=${poolId}`
      )
      const data = await res.json()

      if (!res.ok || !data.entries?.length) {
        addToast('No other brackets found for this tournament', 'info')
        setLoading(false)
        return
      }

      setEntries(data.entries)

      if (data.entries.length === 1) {
        // Single entry — copy immediately
        applyEntry(data.entries[0])
      } else {
        // Multiple — show dropdown
        setShowDropdown(true)
      }
    } catch {
      addToast('Couldn\'t load brackets. Try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const applyEntry = (entry: CopyableEntry) => {
    const picksMap: Record<string, string> = {}
    for (const pick of entry.picks) {
      picksMap[pick.gameId] = pick.participantId
    }
    onCopy(picksMap)
    setShowDropdown(false)
    const label = entry.displayName || entry.poolName
    addToast(`Bracket copied from "${label}" (${entry.pickCount} picks)`, 'success')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-text-secondary hover:bg-surface-inset transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : 'Copy from another bracket'}
      </button>

      {showDropdown && entries && entries.length > 1 && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg min-w-[220px]">
          <div className="px-3 py-2 text-xs text-text-muted border-b border-border">
            Select a bracket to copy
          </div>
          {entries.map(entry => (
            <button
              key={entry.entryId}
              onClick={() => applyEntry(entry)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface-inset transition-colors"
            >
              <div className="font-medium text-text-primary truncate">
                {entry.displayName || 'Unnamed Bracket'}
              </div>
              <div className="text-xs text-text-muted">
                {entry.poolName} &middot; {entry.pickCount} picks
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
