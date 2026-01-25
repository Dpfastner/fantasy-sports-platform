'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

  const handleLookup = async () => {
    setError(null)
    setLeaguePreview(null)

    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)

    try {
      // Look up the league by invite code
      const { data: league, error: lookupError } = await supabase
        .from('leagues')
        .select(`
          id,
          name,
          max_teams,
          sports (name),
          seasons (name),
          league_members (id)
        `)
        .eq('invite_code', inviteCode.trim().toLowerCase())
        .single()

      if (lookupError || !league) {
        setError('League not found. Please check your invite code.')
        return
      }

      // Type the league data
      const leagueData = league as unknown as {
        id: string
        name: string
        max_teams: number
        sports: { name: string } | null
        seasons: { name: string } | null
        league_members: { id: string }[] | null
      }

      // Check if user is already a member
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const existingMember = leagueData.league_members?.find(
          (m) => m.id === user.id
        )
        if (existingMember) {
          setError('You are already a member of this league')
          return
        }
      }

      setLeaguePreview({
        id: leagueData.id,
        name: leagueData.name,
        sport: leagueData.sports?.name || 'Unknown',
        season: leagueData.seasons?.name || 'Unknown',
        memberCount: leagueData.league_members?.length || 0,
        maxTeams: leagueData.max_teams,
      })
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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to join a league')
        return
      }

      // Check if league is full
      if (leaguePreview.memberCount >= leaguePreview.maxTeams) {
        setError('This league is full')
        return
      }

      // Add user as league member
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: leaguePreview.id,
          user_id: user.id,
          role: 'member',
        })

      if (memberError) {
        if (memberError.code === '23505') {
          setError('You are already a member of this league')
        } else {
          setError(memberError.message)
        }
        return
      }

      // Create fantasy team
      const { error: teamError } = await supabase
        .from('fantasy_teams')
        .insert({
          league_id: leaguePreview.id,
          user_id: user.id,
          name: teamName.trim(),
        })

      if (teamError) {
        setError(teamError.message)
        return
      }

      // Redirect to the league page
      router.push(`/leagues/${leaguePreview.id}`)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Fantasy Sports Platform
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-white mb-8">Join a League</h1>

          <div className="bg-gray-800 rounded-lg p-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {!leaguePreview ? (
              // Step 1: Enter invite code
              <div>
                <p className="text-gray-400 mb-6">
                  Enter the invite code you received from your league commissioner.
                </p>

                <div className="mb-6">
                  <label htmlFor="inviteCode" className="block text-gray-300 mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-center text-lg tracking-wider"
                    placeholder="abc123"
                    maxLength={20}
                  />
                </div>

                <button
                  onClick={handleLookup}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Looking up...' : 'Find League'}
                </button>
              </div>
            ) : (
              // Step 2: Confirm and enter team name
              <form onSubmit={handleJoin}>
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <h3 className="text-white font-semibold mb-2">{leaguePreview.name}</h3>
                  <div className="text-gray-400 text-sm space-y-1">
                    <p>Sport: {leaguePreview.sport}</p>
                    <p>Season: {leaguePreview.season}</p>
                    <p>
                      Members: {leaguePreview.memberCount} / {leaguePreview.maxTeams}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="teamName" className="block text-gray-300 mb-2">
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
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Touchdown Titans"
                  />
                  <p className="text-gray-500 text-sm mt-1">
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
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
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
