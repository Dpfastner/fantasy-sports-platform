'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function TeamEditPage({ params }: PageProps) {
  const router = useRouter()
  const [leagueId, setLeagueId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [teamId, setTeamId] = useState<string>('')
  const [name, setName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1a1a1a')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [imageUrl, setImageUrl] = useState('')
  const [leagueName, setLeagueName] = useState('')

  useEffect(() => {
    async function loadTeam() {
      const { id } = await params
      setLeagueId(id)

      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get league info
      const { data: league } = await supabase
        .from('leagues')
        .select('name')
        .eq('id', id)
        .single()

      if (league) {
        setLeagueName(league.name)
      }

      // Get user's team
      const { data: team, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('league_id', id)
        .eq('user_id', user.id)
        .single()

      if (teamError || !team) {
        router.push(`/leagues/${id}`)
        return
      }

      setTeamId(team.id)
      setName(team.name)
      setPrimaryColor(team.primary_color || '#1a1a1a')
      setSecondaryColor(team.secondary_color || '#ffffff')
      setImageUrl(team.image_url || '')
      setLoading(false)
    }

    loadTeam()
  }, [params, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('fantasy_teams')
      .update({
        name: name.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        image_url: imageUrl.trim() || null,
      })
      .eq('id', teamId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)

    // Redirect back to team page after short delay
    setTimeout(() => {
      router.push(`/leagues/${leagueId}/team`)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-white">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/leagues/${leagueId}/team`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to Team
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-gray-800 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Edit Team</h1>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-6">
              Team updated successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Team Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={50}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter team name"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#1a1a1a"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-300 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color Preview
              </label>
              <div
                className="h-20 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: primaryColor,
                  border: `3px solid ${secondaryColor}`
                }}
              >
                <span
                  className="text-lg font-bold px-4 py-2 rounded"
                  style={{ color: secondaryColor }}
                >
                  {name || 'Your Team Name'}
                </span>
              </div>
            </div>

            {/* Team Image URL */}
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300 mb-2">
                Team Logo URL <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="url"
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/your-logo.png"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter a URL to an image for your team logo
              </p>
            </div>

            {/* Image Preview */}
            {imageUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Logo Preview
                </label>
                <div className="flex justify-center p-4 bg-gray-700/50 rounded-lg">
                  <img
                    src={imageUrl}
                    alt="Team logo preview"
                    className="max-h-32 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Link
                href={`/leagues/${leagueId}/team`}
                className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
