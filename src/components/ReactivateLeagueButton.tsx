'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Season {
  id: string
  year: number
  name: string
}

interface ReactivateLeagueButtonProps {
  leagueId: string
  sportId: string
  currentSeasonYear: number
}

export function ReactivateLeagueButton({ leagueId, sportId, currentSeasonYear }: ReactivateLeagueButtonProps) {
  const router = useRouter()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    async function fetchSeasons() {
      const supabase = createClient()
      const { data } = await supabase
        .from('seasons')
        .select('id, year, name')
        .eq('sport_id', sportId)
        .gt('year', currentSeasonYear)
        .order('year', { ascending: true })

      if (data && data.length > 0) {
        setSeasons(data)
        setSelectedSeasonId(data[0].id)
      }
    }
    fetchSeasons()
  }, [sportId, currentSeasonYear])

  async function handleReactivate() {
    if (!selectedSeasonId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: selectedSeasonId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reactivate')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  if (seasons.length === 0) {
    return (
      <div className="text-text-muted text-sm text-center">
        No upcoming seasons available yet. Check back later.
      </div>
    )
  }

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId)

  return (
    <div className="space-y-3">
      {!showConfirm ? (
        <>
          <div className="flex items-center gap-3 justify-center">
            <label htmlFor="season-select" className="text-text-secondary text-sm">Season:</label>
            <select
              id="season-select"
              value={selectedSeasonId}
              onChange={e => setSelectedSeasonId(e.target.value)}
              className="bg-surface-inset text-text-primary border border-border rounded px-3 py-1.5 text-sm"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            Start New Season
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-text-secondary text-sm">
            This will reactivate the league for <strong className="text-text-primary">{selectedSeason?.name}</strong>.
            All members will keep their spots but get fresh teams and a new draft.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="bg-surface-subtle hover:bg-surface-inset text-text-primary font-medium py-2 px-5 rounded-lg border border-border transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="bg-brand hover:bg-brand-hover text-text-primary font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Reactivating...' : 'Confirm Reactivation'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-danger-text text-sm text-center">{error}</p>
      )}
    </div>
  )
}
