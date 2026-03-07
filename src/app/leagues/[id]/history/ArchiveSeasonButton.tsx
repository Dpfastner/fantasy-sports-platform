'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ArchiveSeasonButtonProps {
  leagueId: string
  seasonYear: number
}

export function ArchiveSeasonButton({ leagueId, seasonYear }: ArchiveSeasonButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleArchive = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to archive season')
        setLoading(false)
        return
      }

      setShowConfirm(false)
      router.refresh()
    } catch {
      setError('Failed to archive season. Please try again.')
      setLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="bg-brand text-text-on-brand px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
      >
        Archive {seasonYear - 1}-{seasonYear} Season
      </button>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-lg">
      <p className="text-text-primary text-sm mb-3">
        Archive the current season? This will snapshot the final standings and mark the league champion.
      </p>
      {error && (
        <p className="text-danger text-xs mb-2">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleArchive}
          disabled={loading}
          className="bg-brand text-text-on-brand px-3 py-1.5 rounded text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Archiving...' : 'Confirm'}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setError(null) }}
          disabled={loading}
          className="bg-surface-subtle text-text-secondary px-3 py-1.5 rounded text-sm hover:bg-surface-inset transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
