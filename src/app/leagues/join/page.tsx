'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trackActivity } from '@/app/actions/activity'
import { createClient } from '@/lib/supabase/client'
import { SchoolPicker } from '@/components/SchoolPicker'

interface LeaguePreview {
  id: string
  name: string
  sport: string
  sportId: string
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
  const [favoriteSchoolId, setFavoriteSchoolId] = useState<string | null>(null)
  const [hasExistingFavorite, setHasExistingFavorite] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState<{ leagueId: string; leagueName: string } | null>(null)
  const [joinMode, setJoinMode] = useState<'code' | 'browse'>('code')
  const [openEvents, setOpenEvents] = useState<{ id: string; name: string; slug: string; sport: string; format: string; status: string; poolCount: number; startsAt: string }[]>([])
  const [publicLeagues, setPublicLeagues] = useState<{ id: string; name: string; sport: string; season: string; memberCount: number; maxTeams: number }[]>([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

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

  // Load open events and public leagues when browsing
  useEffect(() => {
    if (joinMode === 'browse' && !eventsLoaded) {
      async function loadBrowseData() {
        // Load events
        const { data: tournaments } = await supabase
          .from('event_tournaments')
          .select('id, name, slug, sport, format, status, starts_at')
          .in('status', ['upcoming', 'active'])
          .order('starts_at', { ascending: true })

        if (tournaments?.length) {
          const tIds = tournaments.map(t => t.id)
          const { data: pools } = await supabase
            .from('event_pools')
            .select('tournament_id')
            .in('tournament_id', tIds)
            .eq('visibility', 'public')

          const countMap: Record<string, number> = {}
          for (const p of pools || []) {
            countMap[p.tournament_id] = (countMap[p.tournament_id] || 0) + 1
          }

          setOpenEvents(tournaments.map(t => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            sport: t.sport,
            format: t.format,
            status: t.status,
            poolCount: countMap[t.id] || 0,
            startsAt: t.starts_at,
          })))
        }

        // Load public leagues that aren't full
        const { data: leagues } = await supabase
          .from('leagues')
          .select('id, name, max_teams, status, sports(name), seasons(name)')
          .eq('is_public', true)
          .neq('status', 'dormant')
          .order('created_at', { ascending: false })
          .limit(20)

        if (leagues?.length) {
          // Get member counts
          const leagueIds = leagues.map(l => l.id)
          const { data: members } = await supabase
            .from('league_members')
            .select('league_id')
            .in('league_id', leagueIds)

          const memberCounts: Record<string, number> = {}
          for (const m of members || []) {
            memberCounts[m.league_id] = (memberCounts[m.league_id] || 0) + 1
          }

          setPublicLeagues(leagues
            .map(l => ({
              id: l.id,
              name: l.name,
              sport: (l.sports as unknown as { name: string })?.name || 'Unknown',
              season: (l.seasons as unknown as { name: string })?.name || '',
              memberCount: memberCounts[l.id] || 0,
              maxTeams: l.max_teams,
            }))
            .filter(l => l.memberCount < l.maxTeams)
          )
        }

        setEventsLoaded(true)
      }
      loadBrowseData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinMode])

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
          const returnUrl = `/leagues/join?code=${encodeURIComponent(code.trim())}`
          router.push(`/login?next=${encodeURIComponent(returnUrl)}`)
          return
        }
        setError(data.error || 'Competition not found. Check your invite code and try again.')
        return
      }

      // If it's a pool, redirect directly to the pool page
      if (data.type === 'pool') {
        router.push(`/events/${data.pool.tournamentSlug}/pools/${data.pool.id}`)
        return
      }

      trackActivity('invite_code.looked_up', data.league.id, { inviteCode: code.trim() })
      setLeaguePreview(data.league)

      // Check if user already has a favorite for this sport
      if (data.league.sportId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existing } = await supabase
            .from('user_sport_favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('sport_id', data.league.sportId)
            .maybeSingle()
          setHasExistingFavorite(!!existing)
        }
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
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
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
          teamName: teamName.trim(),
          ...(favoriteSchoolId && { favoriteSchoolId }),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Couldn\'t join. Try again.')
        return
      }

      // Pool join redirects directly
      if (data.type === 'pool') {
        router.push(`/events/${data.tournamentSlug}/pools/${data.poolId}`)
        return
      }

      setJoinSuccess({ leagueId: data.leagueId, leagueName: leaguePreview.name })
    } catch {
      setError('Something went wrong. Please check your connection and try again.')
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

          <h1 className="text-3xl font-bold text-text-primary mb-2">Join a Competition</h1>
          <p className="text-text-secondary mb-6">Enter an invite code or browse open competitions.</p>

          {joinMode === 'browse' && (
            <div className="mb-8">
              {!eventsLoaded ? (
                <div className="bg-surface rounded-lg p-8 text-center text-text-muted">Loading...</div>
              ) : publicLeagues.length === 0 && openEvents.length === 0 ? (
                <div className="bg-surface rounded-lg p-8 text-center">
                  <p className="text-text-secondary">Nothing open right now</p>
                  <p className="text-text-muted text-sm mt-1">Check back soon or use an invite code to join a private league.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xs text-text-muted mb-2 uppercase tracking-wide">Open Competitions</h3>
                  <div className="space-y-3">
                    {publicLeagues.map((league) => (
                      <Link
                        key={`league-${league.id}`}
                        href={`/leagues/${league.id}`}
                        className="block bg-surface rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-text-primary font-medium">{league.name}</h3>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand/15 text-brand-text">Season League</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-text-muted">
                              <span>{league.sport}</span>
                              <span>{league.season}</span>
                              <span>{league.memberCount}/{league.maxTeams} members</span>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                    {openEvents.map((event) => {
                      const sportIcon: Record<string, string> = {
                        hockey: '\uD83C\uDFD2', golf: '\u26F3', rugby: '\uD83C\uDFC9',
                        football: '\uD83C\uDFC8', basketball: '\uD83C\uDFC0',
                      }
                      const formatLabel: Record<string, string> = {
                        bracket: 'Bracket', pickem: "Pick'em", survivor: 'Survivor',
                      }
                      return (
                        <Link
                          key={`event-${event.id}`}
                          href={`/events/${event.slug}`}
                          className="block bg-surface rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{sportIcon[event.sport] || '\uD83C\uDFC6'}</span>
                                <h3 className="text-text-primary font-medium">{event.name}</h3>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent-text">{formatLabel[event.format] || event.format}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-text-muted">
                                <span>{event.poolCount} pool{event.poolCount !== 1 ? 's' : ''}</span>
                                <span>{new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {joinMode === 'code' && <div className="bg-surface rounded-lg p-8">
            {error && (
              <div className="bg-surface border border-danger text-danger px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!leaguePreview ? (
              // Step 1: Enter invite code
              <div>
                <p className="text-text-secondary mb-6">
                  Enter the invite code you received to join a competition.
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
                  {loading ? 'Looking up...' : 'Look Up'}
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

                {!hasExistingFavorite && (
                  <div className="mb-6">
                    <SchoolPicker
                      value={favoriteSchoolId}
                      onChange={setFavoriteSchoolId}
                      label={`Your Favorite ${leaguePreview.sport} Team`}
                    />
                  </div>
                )}

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
          </div>}

          {/* Browse link — below invite code form */}
          {joinMode === 'code' && (
            <p className="text-center text-sm text-text-muted mt-4">
              Or{' '}
              <button
                onClick={() => setJoinMode('browse')}
                className="text-brand-text hover:underline"
              >
                browse open competitions
              </button>
            </p>
          )}

          {/* Back to invite code link when browsing */}
          {joinMode === 'browse' && (
            <button
              onClick={() => setJoinMode('code')}
              className="text-sm text-text-muted hover:text-text-secondary mb-4 transition-colors"
            >
              &larr; Back to invite code
            </button>
          )}
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
