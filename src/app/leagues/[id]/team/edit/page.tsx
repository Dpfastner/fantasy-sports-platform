'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackActivity } from '@/app/actions/activity'
import { useConfirm } from '@/components/ConfirmDialog'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function TeamEditPage({ params }: PageProps) {
  const router = useRouter()
  const { confirm } = useConfirm()
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
  const [hasChanges, setHasChanges] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

  // Track unsaved changes for beforeunload warning
  const [originalValues, setOriginalValues] = useState({ name: '', primaryColor: '', secondaryColor: '', imageUrl: '' })

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
      setOriginalValues({
        name: team.name,
        primaryColor: team.primary_color || '#1a1a1a',
        secondaryColor: team.secondary_color || '#ffffff',
        imageUrl: team.image_url || '',
      })
      setLoading(false)
    }

    loadTeam()
  }, [params, router])

  // Detect changes
  useEffect(() => {
    if (!originalValues.name) return
    const changed = name !== originalValues.name
      || primaryColor !== originalValues.primaryColor
      || secondaryColor !== originalValues.secondaryColor
      || imageUrl !== originalValues.imageUrl
      || logoFile !== null
    setHasChanges(changed)
  }, [name, primaryColor, secondaryColor, imageUrl, originalValues, logoFile])

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges && !success) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges, success])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 500 * 1024) {
      setError('File too large. Maximum size is 500KB.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      setError('Invalid file type. Accepted: PNG, JPG, GIF, WEBP, SVG')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
    setShowUrlInput(false)
    setImageUrl('')
    setError(null)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(null)
    setImageUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!await confirm({ title: 'Save changes?', message: 'Save changes to your team?' })) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    let finalImageUrl = imageUrl.trim() || null

    // Upload file if selected
    if (logoFile) {
      const formData = new FormData()
      formData.append('file', logoFile)

      const res = await fetch(`/api/teams/${teamId}/logo`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Logo upload failed. Please try again.')
        setSaving(false)
        return
      }

      const data = await res.json()
      finalImageUrl = data.url
    }

    const supabase = createClient()

    const { error: updateError } = await supabase
      .from('fantasy_teams')
      .update({
        name: name.trim(),
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        image_url: finalImageUrl,
      })
      .eq('id', teamId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    trackActivity('team.edited', leagueId, { teamId, teamName: name.trim() })
    setSuccess(true)
    setSaving(false)

    // Redirect back to team page after short delay
    setTimeout(() => {
      router.push(`/leagues/${leagueId}/team`)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to flex items-center justify-center">
        <div className="text-text-primary text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      {/* Header */}
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">
            Rivyls
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/leagues/${leagueId}/team`}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              Back to Team
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-surface rounded-lg p-6">
          <h1 className="text-2xl font-bold text-text-primary mb-6">Edit Team</h1>

          {error && (
            <div className="bg-danger/20 border border-danger text-danger-text px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/20 border border-success text-success-text px-4 py-3 rounded-lg mb-6">
              Team updated successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                Team Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={50}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="Enter team name"
              />
            </div>

            {/* Color Presets */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Color Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { primary: '#1a1a1a', secondary: '#ffffff', label: 'Classic' },
                  { primary: '#1e3a5f', secondary: '#f0c040', label: 'Navy/Gold' },
                  { primary: '#8b0000', secondary: '#ffffff', label: 'Crimson' },
                  { primary: '#002244', secondary: '#c83803', label: 'Navy/Orange' },
                  { primary: '#333f48', secondary: '#b3a369', label: 'Steel/Gold' },
                  { primary: '#4b2e83', secondary: '#e8d3a2', label: 'Purple/Gold' },
                  { primary: '#006747', secondary: '#cfc493', label: 'Green/Gold' },
                  { primary: '#cc0033', secondary: '#000000', label: 'Red/Black' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setPrimaryColor(preset.primary); setSecondaryColor(preset.secondary) }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      primaryColor === preset.primary && secondaryColor === preset.secondary
                        ? 'border-brand bg-brand/10'
                        : 'border-border hover:border-text-muted'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: preset.secondary }}
                    />
                    <span className="text-text-secondary">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-text-secondary mb-2">
                  Primary Color
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded border border-border cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['#CC0000', '#FF6600', '#FFD700', '#228B22', '#003DA5', '#4B0082', '#8B0000', '#000000', '#1A0F28', '#F59E0B', '#E74C6F', '#FFFFFF'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === c ? 'border-brand scale-110' : 'border-border'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-text-secondary mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-12 rounded border border-border cursor-pointer"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['#CC0000', '#FF6600', '#FFD700', '#228B22', '#003DA5', '#4B0082', '#8B0000', '#000000', '#1A0F28', '#F59E0B', '#E74C6F', '#FFFFFF'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSecondaryColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${secondaryColor === c ? 'border-brand scale-110' : 'border-border'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
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

            {/* Team Logo */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Team Logo <span className="text-text-muted">(optional)</span>
              </label>

              {/* Current/preview logo */}
              {(logoPreviewUrl || imageUrl) && (
                <div className="flex items-center gap-4 mb-3 p-3 bg-surface-inset rounded-lg">
                  <img
                    src={logoPreviewUrl || imageUrl}
                    alt="Team logo preview"
                    className="w-16 h-16 object-contain rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-secondary text-sm truncate">
                      {logoFile ? logoFile.name : 'Current logo'}
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-danger-text text-xs hover:underline mt-1"
                    >
                      Remove logo
                    </button>
                  </div>
                </div>
              )}

              {/* File upload */}
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border-2 border-dashed border-border hover:border-brand/50 rounded-lg cursor-pointer transition-colors">
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-text-secondary text-sm">Upload an image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="mt-1 text-xs text-text-muted">
                PNG, JPG, GIF, WEBP, or SVG. Max 500KB.
              </p>

              {/* URL fallback */}
              {!logoFile && (
                <div className="mt-2">
                  {showUrlInput ? (
                    <div className="mt-2">
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                        placeholder="https://example.com/your-logo.png"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(true)}
                      className="text-brand-text text-xs hover:underline mt-1"
                    >
                      Or paste an image URL
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Link
                href={`/leagues/${leagueId}/team`}
                className="flex-1 text-center bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors"
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
