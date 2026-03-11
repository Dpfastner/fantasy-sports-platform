'use client'

import { useState } from 'react'

interface NudgeCommissionerButtonProps {
  leagueId: string
}

export function NudgeCommissionerButton({ leagueId }: NudgeCommissionerButtonProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNudge() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/leagues/${leagueId}/nudge`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send reminder')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <p className="text-success-text text-sm">Reminder sent! Your commissioner has been notified.</p>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleNudge}
        disabled={loading}
        className="bg-surface-subtle hover:bg-surface-inset text-text-primary font-medium py-2 px-5 rounded-lg border border-border transition-colors disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Remind Commissioner'}
      </button>
      {error && (
        <p className="text-danger-text text-sm">{error}</p>
      )}
    </div>
  )
}
