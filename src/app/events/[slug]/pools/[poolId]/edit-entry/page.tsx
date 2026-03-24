'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface PageProps {
  params: Promise<{ slug: string; poolId: string }>
}

export default function EditEntryPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [slug, setSlug] = useState('')
  const [poolId, setPoolId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [entryId, setEntryId] = useState('')
  const [name, setName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1a1a1a')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [imageUrl, setImageUrl] = useState('')
  const [poolName, setPoolName] = useState('')
  const [gameType, setGameType] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const [originalValues, setOriginalValues] = useState({ name: '', primaryColor: '', secondaryColor: '', imageUrl: '' })

  useEffect(() => {
    async function load() {
      const { slug: s, poolId: p } = await params
      setSlug(s)
      setPoolId(p)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get pool info
      const { data: pool } = await supabase
        .from('event_pools')
        .select('name, game_type')
        .eq('id', p)
        .single()
      if (pool) {
        setPoolName(pool.name)
        setGameType(pool.game_type || '')
      }

      // Get user's entry — by entryId param if provided, otherwise first entry
      const entryIdParam = searchParams.get('entryId')
      let entryQuery = supabase
        .from('event_entries')
        .select('id, display_name, primary_color, secondary_color, image_url, user_id')
        .eq('pool_id', p)

      if (entryIdParam) {
        entryQuery = entryQuery.eq('id', entryIdParam)
      } else {
        entryQuery = entryQuery.eq('user_id', user.id).order('created_at', { ascending: true }).limit(1)
      }

      const { data: entries, error: entryError } = await entryQuery
      const entry = entries?.[0]

      if (entryError || !entry || entry.user_id !== user.id) {
        router.push(`/events/${s}/pools/${p}`)
        return
      }

      setEntryId(entry.id)
      setName(entry.display_name || '')
      setPrimaryColor(entry.primary_color || '#1a1a1a')
      setSecondaryColor(entry.secondary_color || '#ffffff')
      setImageUrl(entry.image_url || '')
      setOriginalValues({
        name: entry.display_name || '',
        primaryColor: entry.primary_color || '#1a1a1a',
        secondaryColor: entry.secondary_color || '#ffffff',
        imageUrl: entry.image_url || '',
      })
      setLoading(false)
    }
    load()
  }, [params, router, searchParams])

  // Detect changes
  useEffect(() => {
    if (!originalValues.primaryColor) return
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
      if (hasChanges && !success) e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges, success])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { setError('File too large. Maximum size is 500KB.'); return }
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) { setError('Invalid file type. Accepted: PNG, JPG, GIF, WEBP, SVG'); return }
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
    setSaving(true)
    setError(null)
    setSuccess(false)

    let finalImageUrl = imageUrl.trim() || null

    // Upload file if selected
    if (logoFile) {
      const formData = new FormData()
      formData.append('file', logoFile)
      const res = await fetch(`/api/events/pools/${poolId}/entries/${entryId}/logo`, {
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
      .from('event_entries')
      .update({
        display_name: name.trim() || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        image_url: finalImageUrl,
      })
      .eq('id', entryId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    setTimeout(() => router.push(`/events/${slug}/pools/${poolId}`), 1000)
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
      <header className="bg-surface/50 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-text-primary">Rivyls</Link>
          <Link
            href={`/events/${slug}/pools/${poolId}`}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            Back to {poolName || 'Pool'}
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-surface rounded-lg p-6">
          <h1 className="text-2xl font-bold text-text-primary mb-6">Edit {({ bracket: 'Bracket', pickem: "Pick'em", survivor: 'Survivor', roster: 'Roster' } as Record<string, string>)[gameType] || ''} Entry</h1>

          {error && (
            <div className="bg-danger/20 border border-danger text-danger-text px-4 py-3 rounded-lg mb-6">{error}</div>
          )}
          {success && (
            <div className="bg-success/20 border border-success text-success-text px-4 py-3 rounded-lg mb-6">
              Entry updated! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bracket Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                Entry Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="Give your entry a name"
              />
            </div>

            {/* Color Presets */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Color Presets</label>
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
                    <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: preset.primary }} />
                    <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: preset.secondary }} />
                    <span className="text-text-secondary">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-text-secondary mb-2">Primary Color</label>
                <div className="flex gap-3 items-center">
                  <input type="color" id="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded border border-border cursor-pointer" />
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
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-text-secondary mb-2">Secondary Color</label>
                <div className="flex gap-3 items-center">
                  <input type="color" id="secondaryColor" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-12 rounded border border-border cursor-pointer" />
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
              <label className="block text-sm font-medium text-text-secondary mb-2">Preview</label>
              <div className="h-20 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor, border: `3px solid ${secondaryColor}` }}>
                <span className="text-lg font-bold px-4 py-2 rounded" style={{ color: secondaryColor }}>
                  {name || 'My Entry'}
                </span>
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Entry Logo <span className="text-text-muted">(optional)</span>
              </label>

              {(logoPreviewUrl || imageUrl) && (
                <div className="flex items-center gap-4 mb-3 p-3 bg-surface-inset rounded-lg">
                  <img src={logoPreviewUrl || imageUrl} alt="Logo preview" className="w-16 h-16 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-secondary text-sm truncate">{logoFile ? logoFile.name : 'Current logo'}</p>
                    <button type="button" onClick={handleRemoveLogo} className="text-danger-text text-xs hover:underline mt-1">Remove logo</button>
                  </div>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border-2 border-dashed border-border hover:border-brand/50 rounded-lg cursor-pointer transition-colors">
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-text-secondary text-sm">Upload an image</span>
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="mt-1 text-xs text-text-muted">PNG, JPG, GIF, WEBP, or SVG. Max 500KB.</p>

              {!logoFile && (
                <div className="mt-2">
                  {showUrlInput ? (
                    <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" placeholder="https://example.com/your-logo.png" />
                  ) : (
                    <button type="button" onClick={() => setShowUrlInput(true)} className="text-brand-text text-xs hover:underline mt-1">Or paste an image URL</button>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Link href={`/events/${slug}/pools/${poolId}`} className="flex-1 text-center bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors">Cancel</Link>
              <button type="submit" disabled={saving || (!hasChanges && !logoFile)} className="flex-1 bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
