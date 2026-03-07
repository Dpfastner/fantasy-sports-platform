'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trackActivity } from '@/app/actions/activity'

interface LeaguePreview {
  id: string
  name: string
  sport: string
  season: string
  memberCount: number
  maxTeams: number
  draftDate: string | null
  draftCompleted: boolean
  scoringPreset: string | null
  schoolsPerTeam: number
}

function JoinLeagueForm() {
  const [inviteCode, setInviteCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [leaguePreview, setLeaguePreview] = useState<LeaguePreview | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<{ leagueId: string; leagueName: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Pre-fill invite code from URL parameter and auto-lookup
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam && !inviteCode) {
      setInviteCode(codeParam)
      // Auto-lookup after a tick to let state settle
      setTimeout(() => {
        lookupLeague(codeParam)
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const lookupLeague = async (code: string) => {
    setError(null)
    setLeaguePreview(null)

    if (!code.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          // User is not logged in — redirect to login with return URL
          const returnUrl = `/leagues/join?code=${encodeURIComponent(code.trim())}`
          router.push(`/login?next=${encodeURIComponent(returnUrl)}`)
          return
        }
        setError(data.error || 'League not found. Check your invite code and try again.')
        return
      }

      trackActivity('invite_code.looked_up', data.league.id, { inviteCode: code.trim() })
      setLeaguePreview(data.league)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLookup = () => lookupLeague(inviteCode)

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

      setJoinSuccess({ leagueId: data.leagueId, leagueName: leaguePreview.name })
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Format draft date for display
  const formatDraftDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Format scoring preset for display
  const formatScoringPreset = (preset: string | null) => {
    if (!preset || preset === 'custom') return 'Custom'
    return preset.charAt(0).toUpperCase() + preset.slice(1)
  }

  // Success state
  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
        <header className="bg-surface/50 border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
              Rivyls
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="bg-surface rounded-lg p-8 text-center">
              <div className="text-success-text text-5xl mb-4">&#10003;</div>
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                You&apos;re in!
              </h2>
              <p className="text-text-secondary mb-6">
                You&apos;ve joined <span className="text-text-primary font-semibold">{joinSuccess.leagueName}</span>. Head to your league to see the standings, check the schedule, and get ready for the draft.
              </p>
              <button
                onClick={() => router.push(`/leagues/${joinSuccess.leagueId}`)}
                className="w-full bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Go to League
              </button>
            </div>
          </div>
        </main>
      </div>
    )
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

          <h1 className="text-3xl font-bold text-text-primary mb-2">Join a League</h1>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex items-center gap-1.5 text-sm ${!leaguePreview ? 'text-brand-text font-semibold' : 'text-text-muted'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${!leaguePreview ? 'bg-brand text-text-primary' : 'bg-success text-text-primary'}`}>
                {leaguePreview ? '\u2713' : '1'}
              </span>
              Find League
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-1.5 text-sm ${leaguePreview ? 'text-brand-text font-semibold' : 'text-text-muted'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${leaguePreview ? 'bg-brand text-text-primary' : 'bg-surface-subtle text-text-muted'}`}>
                2
              </span>
              Join &amp; Name Team
            </div>
          </div>

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
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup() } }}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand font-mono text-center text-lg tracking-wider"
                    placeholder="abc123"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Looking up...' : 'Look Up League'}
                </button>
              </div>
            ) : (
              // Step 2: Confirm and enter team name
              <form onSubmit={handleJoin}>
                {/* League preview card */}
                <div className="bg-surface-subtle rounded-lg p-4 mb-6 border border-border">
                  <h3 className="text-text-primary font-semibold text-lg mb-3">{leaguePreview.name}</h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-text-muted">Sport</span>
                    <span className="text-text-secondary">{leaguePreview.sport}</span>

                    <span className="text-text-muted">Season</span>
                    <span className="text-text-secondary">{leaguePreview.season}</span>

                    <span className="text-text-muted">Members</span>
                    <span className="text-text-secondary">
                      {leaguePreview.memberCount} / {leaguePreview.maxTeams}
                      {leaguePreview.memberCount >= leaguePreview.maxTeams && (
                        <span className="text-danger ml-1">(Full)</span>
                      )}
                    </span>

                    <span className="text-text-muted">Schools per team</span>
                    <span className="text-text-secondary">{leaguePreview.schoolsPerTeam}</span>

                    <span className="text-text-muted">Scoring</span>
                    <span className="text-text-secondary">{formatScoringPreset(leaguePreview.scoringPreset)}</span>

                    <span className="text-text-muted">Draft</span>
                    <span className="text-text-secondary">
                      {leaguePreview.draftCompleted
                        ? 'Completed'
                        : leaguePreview.draftDate
                          ? formatDraftDate(leaguePreview.draftDate)
                          : 'Not scheduled yet'}
                    </span>
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
                    autoFocus
                  />
                  <p className="text-text-muted text-sm mt-1">
                    3-25 characters. You can change this later.
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
                    className="flex-1 bg-surface hover:bg-surface-subtle border border-border text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || leaguePreview.memberCount >= leaguePreview.maxTeams}
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

export default function JoinLeaguePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center">
        <div className="text-text-primary">Loading...</div>
      </div>
    }>
      <JoinLeagueForm />
    </Suspense>
  )
}
