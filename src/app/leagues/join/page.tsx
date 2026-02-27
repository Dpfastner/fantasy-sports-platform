'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trackActivity } from '@/app/actions/activity'

export default function JoinLeaguePage() {
  const [inviteCode, setInviteCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [leaguePreview, setLeaguePreview] = useState<{
    id: string
    name: string
    sport: string
    season: string
    memberCount: number
    maxTeams: number
  } | null>(null)
  const router = useRouter()

  const handleLookup = async () => {
    setError(null)
    setLeaguePreview(null)

    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        const debugInfo = data.debug ? `\n[Debug: ${JSON.stringify(data.debug)}]` : ''
        setError((data.error || 'League not found') + debugInfo)
        return
      }

      trackActivity('invite_code.looked_up', data.league.id, { inviteCode: inviteCode.trim() })
      setLeaguePreview(data.league)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!leaguePreview) {
      setError('Please look up a league first')
      return
    }

    if (!teamName.trim()) {
      setError('Please enter a team name')
      return
    }

    if (teamName.trim().length < 3) {
      setError('Team name must be at least 3 characters')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), teamName: teamName.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join league')
        return
      }

      router.push(`/leagues/${data.leagueId}`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      {/* Header */}
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-8">Join a League</h1>

          <div className="bg-surface rounded-lg p-8">
            {error && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!leaguePreview ? (
              // Step 1: Enter invite code
              <div>
                <p className="text-text-secondary mb-6">
                  Enter the invite code you received from your league commissioner.
                </p>

                <div className="mb-6">
                  <label htmlFor="inviteCode" className="block text-text-secondary mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand font-mono text-center text-lg tracking-wider"
                    placeholder="abc123"
                    maxLength={20}
                  />
                </div>

                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Looking up...' : 'Find League'}
                </button>
              </div>
            ) : (
              // Step 2: Confirm and enter team name
              <form onSubmit={handleJoin}>
                <div className="bg-surface rounded-lg p-4 mb-6">
                  <h3 className="text-text-primary font-semibold mb-2">{leaguePreview.name}</h3>
                  <div className="text-text-secondary text-sm space-y-1">
                    <p>Sport: {leaguePreview.sport}</p>
                    <p>Season: {leaguePreview.season}</p>
                    <p>
                      Members: {leaguePreview.memberCount} / {leaguePreview.maxTeams}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="teamName" className="block text-text-secondary mb-2">
                    Your Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    minLength={3}
                    maxLength={25}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand"
                    placeholder="e.g., Touchdown Titans"
                  />
                  <p className="text-text-muted text-sm mt-1">
                    3-25 characters
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setLeaguePreview(null)
                      setTeamName('')
                      setError(null)
                    }}
                    className="flex-1 bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Joining...' : 'Join League'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
