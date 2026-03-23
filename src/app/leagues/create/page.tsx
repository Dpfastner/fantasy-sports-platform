'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackActivity } from '@/app/actions/activity'
import { track } from '@vercel/analytics'
import { SchoolPicker } from '@/components/SchoolPicker'
import { useConfirm } from '@/components/ConfirmDialog'

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
  const [maxTeams, setMaxTeams] = useState<number | ''>(12)
  const [isPublic, setIsPublic] = useState(false)
  const [sports, setSports] = useState<Sport[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [favoriteSchoolId, setFavoriteSchoolId] = useState<string | null>(null)
  const [hasExistingFavorite, setHasExistingFavorite] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { confirm } = useConfirm()
  const supabase = createClient()

  // Track if form has any input for #25 unsaved changes warning
  const hasChanges = name.trim() !== '' || description.trim() !== '' || teamName.trim() !== ''

  // Inline validation helpers (#116)
  const fieldErrors = {
    name: touched.name && !name.trim() ? 'League name is required' : null,
    teamName: touched.teamName && !teamName.trim() ? 'Team name is required' : null,
  }

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

  // Check for existing sport favorite when sport changes
  useEffect(() => {
    async function checkFavorite() {
      if (!sportId) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: existing } = await supabase
        .from('user_sport_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('sport_id', sportId)
        .maybeSingle()
      setHasExistingFavorite(!!existing)
    }
    checkFavorite()
  }, [sportId, supabase])

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

  const handleSubmit = (e: React.FormEvent) => {
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

    // Show preview instead of immediately creating (#24)
    setShowPreview(true)
  }

  const handleConfirmCreate = async () => {
    setLoading(true)
    setError(null)

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
          max_teams: maxTeams || 12,
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

      // Set scoring preset to standard (DB defaults to 'custom')
      await supabase
        .from('league_settings')
        .update({ scoring_preset: 'standard' })
        .eq('league_id', league.id)

      // Save sport favorite if provided
      if (favoriteSchoolId && sportId) {
        const { data: inserted } = await supabase
          .from('user_sport_favorites')
          .upsert(
            { user_id: user.id, sport_id: sportId, school_id: favoriteSchoolId },
            { onConflict: 'user_id,sport_id' }
          )
          .select('id')
          .single()

        if (inserted) {
          // If first favorite, set as featured + sync favorite_school_id
          const { data: profile } = await supabase
            .from('profiles')
            .select('featured_favorite_id')
            .eq('id', user.id)
            .single()

          if (!profile?.featured_favorite_id) {
            await supabase
              .from('profiles')
              .update({ featured_favorite_id: inserted.id, favorite_school_id: favoriteSchoolId })
              .eq('id', user.id)
          }
        }
      }

      // Track events
      trackActivity('league.created', league.id, { leagueName: name.trim(), maxTeams })
      track('league_created')

      // Redirect to the new league page
      router.push(`/leagues/${league.id}`)
    } catch {
      setError('Something went wrong creating the league. Please check your connection and try again.')
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
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <button
              onClick={async () => {
                if (hasChanges && !await confirm({ title: 'Unsaved changes', message: 'You have unsaved changes. Are you sure you want to leave?' })) return
                router.push('/dashboard')
              }}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              &larr; Back to Dashboard
            </button>
          </div>

          <h1 className="text-3xl font-bold text-text-primary mb-2">Create</h1>
          <p className="text-text-secondary mb-6">Start a season-long fantasy league or create a pool for an upcoming event.</p>

          {/* Type selector cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-surface rounded-lg border-2 border-brand p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏈</span>
                <h3 className="text-text-primary font-semibold">Season League</h3>
              </div>
              <p className="text-text-muted text-sm mb-3">Draft teams and compete across a full season with your friends.</p>
              <span className="text-xs text-brand font-medium">Selected</span>
            </div>
            <Link
              href="/events"
              className="bg-surface rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏆</span>
                <h3 className="text-text-primary font-semibold">Event Pool</h3>
              </div>
              <p className="text-text-muted text-sm mb-3">Brackets, pick&apos;em, or survivor for a specific tournament.</p>
              <span className="text-xs text-text-muted">Browse events &rarr;</span>
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface rounded-lg p-8">
            {error && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            {/* 1. League Name */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-text-secondary mb-2">
                League Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, name: true }))}
                required
                maxLength={100}
                className={`w-full px-4 py-3 bg-surface border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand ${fieldErrors.name ? 'border-danger' : 'border-border'}`}
                placeholder="e.g., College Football Fanatics 2025"
              />
              {fieldErrors.name && <p className="text-danger-text text-xs mt-1">{fieldErrors.name}</p>}
            </div>

            {/* 2. Team Name */}
            <div className="mb-6">
              <label htmlFor="teamName" className="block text-text-secondary mb-2">
                Your Team Name *
              </label>
              <input
                type="text"
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onBlur={() => setTouched(t => ({ ...t, teamName: true }))}
                required
                maxLength={100}
                className={`w-full px-4 py-3 bg-surface border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-brand ${fieldErrors.teamName ? 'border-danger' : 'border-border'}`}
                placeholder="e.g., The Gridiron Gang"
              />
              {fieldErrors.teamName && <p className="text-danger-text text-xs mt-1">{fieldErrors.teamName}</p>}
            </div>

            {/* 3. Max Teams */}
            <div className="mb-6">
              <label htmlFor="maxTeams" className="block text-text-secondary mb-2">
                Maximum Teams
              </label>
              <input
                type="number"
                id="maxTeams"
                inputMode="numeric"
                value={maxTeams}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') { setMaxTeams(''); return }
                  const val = parseInt(raw)
                  if (!isNaN(val)) setMaxTeams(Math.min(30, val))
                }}
                onBlur={() => {
                  if (maxTeams === '' || (typeof maxTeams === 'number' && maxTeams < 2)) setMaxTeams(2)
                }}
                min={2}
                max={30}
                className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:border-brand"
              />
              <p className="text-text-muted text-sm mt-1">
                Enter a number between 2-30
              </p>
            </div>

            {/* 4. Public/Private */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-5 h-5 rounded border-border bg-surface text-brand focus:ring-brand"
                />
                <span className="text-text-secondary">Make this league public</span>
              </label>
              <p className="text-text-muted text-sm mt-1 ml-8">
                Public leagues can be found by anyone. Private leagues require an invite code.
              </p>
            </div>

            {/* 5. Favorite School (optional) */}
            {!hasExistingFavorite && sportId && (
              <div className="mb-6">
                <SchoolPicker
                  value={favoriteSchoolId}
                  onChange={setFavoriteSchoolId}
                  label={`Your Favorite ${sports.find(s => s.id === sportId)?.name || ''} Team (optional)`}
                />
              </div>
            )}

            {/* Defaults one-liner */}
            <p className="text-text-muted text-sm mb-6">
              Standard scoring · Snake draft · Change anytime in Settings
            </p>


            {/* Preview Panel (#24) */}
            {showPreview && (
              <div className="bg-highlight-row border border-brand rounded-lg p-4 mb-6">
                <h3 className="text-text-primary font-semibold mb-3">Review Your League</h3>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-text-muted">League Name</span>
                    <p className="text-text-primary font-medium">{name.trim()}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Your Team</span>
                    <p className="text-text-primary font-medium">{teamName.trim()}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Sport</span>
                    <p className="text-text-primary font-medium">{sports.find(s => s.id === sportId)?.name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Max Teams</span>
                    <p className="text-text-primary font-medium">{maxTeams}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Visibility</span>
                    <p className="text-text-primary font-medium">{isPublic ? 'Public' : 'Private (invite only)'}</p>
                  </div>
                  {description.trim() && (
                    <div className="col-span-2">
                      <span className="text-text-muted">Description</span>
                      <p className="text-text-primary">{description.trim()}</p>
                    </div>
                  )}
                </div>
                <p className="text-text-muted text-xs mb-4">
                  After creating, you&apos;ll be able to configure draft settings, invite members, and start the draft.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="flex-1 bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCreate}
                    disabled={loading}
                    className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Creating...' : 'Confirm & Create'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={async () => {
                  if (hasChanges && !await confirm({ title: 'Unsaved changes', message: 'You have unsaved changes. Are you sure you want to leave?' })) return
                  router.push('/dashboard')
                }}
                className="flex-1 text-center bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {!showPreview && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Create League & Draft'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
