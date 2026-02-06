'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Sport {
  id: string
  name: string
  slug: string
  is_active: boolean
}

interface Season {
  id: string
  name: string
  year: number
  is_current: boolean
}

export default function CreateLeaguePage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teamName, setTeamName] = useState('')
  const [sportId, setSportId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [maxTeams, setMaxTeams] = useState(12)
  const [isPublic, setIsPublic] = useState(false)
  const [sports, setSports] = useState<Sport[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Load sports on mount
  useEffect(() => {
    async function loadSports() {
      const { data } = await supabase
        .from('sports')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (data) {
        const sportsData = data as Sport[]
        setSports(sportsData)
        // Auto-select college football if available
        const football = sportsData.find(s => s.slug === 'college_football')
        if (football) {
          setSportId(football.id)
        }
      }
    }
    loadSports()
  }, [supabase])

  // Load seasons when sport changes - auto-select 2025 season
  useEffect(() => {
    async function loadSeasons() {
      if (!sportId) {
        setSeasons([])
        return
      }

      const { data } = await supabase
        .from('seasons')
        .select('*')
        .eq('sport_id', sportId)
        .order('year', { ascending: false })

      if (data) {
        const seasonsData = data as Season[]
        setSeasons(seasonsData)
        // Auto-select 2025 season for testing, otherwise current season
        const season2025 = seasonsData.find(s => s.year === 2025)
        const current = seasonsData.find(s => s.is_current)
        if (season2025) {
          setSeasonId(season2025.id)
        } else if (current) {
          setSeasonId(current.id)
        } else if (seasonsData.length > 0) {
          setSeasonId(seasonsData[0].id)
        }
      }
    }
    loadSeasons()
  }, [sportId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('League name is required')
      return
    }

    if (!sportId) {
      setError('Please select a sport')
      return
    }

    if (!seasonId) {
      setError('No season available for this sport')
      return
    }

    if (!teamName.trim()) {
      setError('Your team name is required')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in to create a league')
        return
      }

      const { data: league, error: createError } = await supabase
        .from('leagues')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          sport_id: sportId,
          season_id: seasonId,
          max_teams: maxTeams,
          is_public: isPublic,
          created_by: user.id,
        })
        .select()
        .single()

      if (createError) {
        setError(createError.message)
        return
      }

      // Create commissioner's fantasy team
      const { error: teamError } = await supabase
        .from('fantasy_teams')
        .insert({
          name: teamName.trim(),
          league_id: league.id,
          user_id: user.id,
        })

      if (teamError) {
        // League was created but team failed - show error but still redirect
        console.error('Failed to create team:', teamError)
      }

      // Redirect to the new league page
      router.push(`/leagues/${league.id}`)
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              &larr; Back to Dashboard
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-white mb-8">Create a New League</h1>

          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="name" className="block text-gray-300 mb-2">
                League Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., College Football Fanatics 2025"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Tell your friends what this league is about..."
              />
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
                maxLength={100}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="e.g., The Gridiron Gang"
              />
              <p className="text-gray-500 text-sm mt-1">
                As the commissioner, you'll need a team to participate in the draft
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="sport" className="block text-gray-300 mb-2">
                  Sport *
                </label>
                <select
                  id="sport"
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select a sport</option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="maxTeams" className="block text-gray-300 mb-2">
                  Maximum Teams
                </label>
                <input
                  type="number"
                  id="maxTeams"
                  value={maxTeams}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setMaxTeams(Math.min(30, Math.max(1, val)))
                  }}
                  min={1}
                  max={30}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-gray-500 text-sm mt-1">
                  Enter a number between 1-30
                </p>
              </div>
            </div>

            <div className="mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-300">Make this league public</span>
              </label>
              <p className="text-gray-500 text-sm mt-1 ml-8">
                Public leagues can be found by anyone. Private leagues require an invite code.
              </p>
            </div>

            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create League'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
