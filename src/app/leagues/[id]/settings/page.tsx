'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface LeagueSettings {
  id: string
  draft_date: string | null
  draft_type: 'snake' | 'linear'
  draft_order_type: 'random' | 'manual'
  draft_timer_seconds: number
  schools_per_team: number
  max_add_drops_per_season: number
  entry_fee: number
  prize_pool: number
  high_points_enabled: boolean
  high_points_weekly_amount: number
  settings_locked: boolean
}

export default function LeagueSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [leagueName, setLeagueName] = useState('')
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>('not_started')

  const [settings, setSettings] = useState<LeagueSettings | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get league info
        const { data: league } = await supabase
          .from('leagues')
          .select('name, created_by')
          .eq('id', leagueId)
          .single()

        if (!league) {
          setError('League not found')
          return
        }

        setLeagueName(league.name)
        setIsCommissioner(league.created_by === user.id)

        if (league.created_by !== user.id) {
          setError('Only the commissioner can access settings')
          return
        }

        // Get draft status
        const { data: draft } = await supabase
          .from('drafts')
          .select('status')
          .eq('league_id', leagueId)
          .single()

        if (draft) {
          setDraftStatus(draft.status)
        }

        // Get settings
        const { data: settingsData } = await supabase
          .from('league_settings')
          .select('*')
          .eq('league_id', leagueId)
          .single()

        if (settingsData) {
          setSettings(settingsData as LeagueSettings)
        }

      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [leagueId, router, supabase])

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('league_settings')
        .update({
          draft_date: settings.draft_date,
          draft_type: settings.draft_type,
          draft_order_type: settings.draft_order_type,
          draft_timer_seconds: settings.draft_timer_seconds,
          schools_per_team: settings.schools_per_team,
          max_add_drops_per_season: settings.max_add_drops_per_season,
          entry_fee: settings.entry_fee,
          prize_pool: settings.prize_pool,
          high_points_enabled: settings.high_points_enabled,
          high_points_weekly_amount: settings.high_points_weekly_amount,
        })
        .eq('league_id', leagueId)

      if (updateError) throw updateError

      setSuccess('Settings saved successfully!')
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading settings...</div>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link href={`/leagues/${leagueId}`} className="text-blue-400 hover:text-blue-300">
            Back to League
          </Link>
        </div>
      </div>
    )
  }

  const isDraftStarted = draftStatus !== 'not_started'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <Link href={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white">
            &larr; Back to {leagueName}
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">League Settings</h1>

          {isDraftStarted && (
            <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-400 px-4 py-3 rounded-lg mb-6">
              Some settings cannot be changed after the draft has started.
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {settings && (
            <div className="space-y-8">
              {/* Draft Settings */}
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Draft Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Draft Date & Time</label>
                    <input
                      type="datetime-local"
                      value={settings.draft_date?.slice(0, 16) || ''}
                      onChange={(e) => setSettings({ ...settings, draft_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    />
                    <p className="text-gray-500 text-sm mt-1">Optional - for display purposes</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Draft Type</label>
                    <select
                      value={settings.draft_type}
                      onChange={(e) => setSettings({ ...settings, draft_type: e.target.value as 'snake' | 'linear' })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="snake">Snake (reverses each round)</option>
                      <option value="linear">Linear (same order each round)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Draft Order</label>
                    <select
                      value={settings.draft_order_type || 'random'}
                      onChange={(e) => setSettings({ ...settings, draft_order_type: e.target.value as 'random' | 'manual' })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="random">Random (shuffled when draft starts)</option>
                      <option value="manual">Manual (set order at draft)</option>
                    </select>
                    <p className="text-gray-500 text-sm mt-1">
                      {settings.draft_order_type === 'manual'
                        ? 'Set the draft order on the draft page before starting'
                        : 'Teams will be randomly ordered when the draft begins'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Pick Timer (seconds)</label>
                    <select
                      value={settings.draft_timer_seconds}
                      onChange={(e) => setSettings({ ...settings, draft_timer_seconds: parseInt(e.target.value) })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="30">30 seconds</option>
                      <option value="60">60 seconds</option>
                      <option value="90">90 seconds</option>
                      <option value="120">120 seconds</option>
                      <option value="180">180 seconds (3 min)</option>
                      <option value="300">300 seconds (5 min)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Schools per Team</label>
                    <select
                      value={settings.schools_per_team}
                      onChange={(e) => setSettings({ ...settings, schools_per_team: parseInt(e.target.value) })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      {[6, 8, 10, 12, 14, 16, 18, 20].map(n => (
                        <option key={n} value={n}>{n} schools</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Season Settings */}
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Season Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Max Add/Drops per Season</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.max_add_drops_per_season}
                      onChange={(e) => setSettings({ ...settings, max_add_drops_per_season: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </section>

              {/* Prize Settings */}
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Prize Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Entry Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.entry_fee}
                      onChange={(e) => setSettings({ ...settings, entry_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Prize Pool ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.prize_pool}
                      onChange={(e) => setSettings({ ...settings, prize_pool: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="highPoints"
                      checked={settings.high_points_enabled}
                      onChange={(e) => setSettings({ ...settings, high_points_enabled: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600 bg-gray-700"
                    />
                    <label htmlFor="highPoints" className="text-gray-300">
                      Enable Weekly High Points Prize
                    </label>
                  </div>

                  {settings.high_points_enabled && (
                    <div>
                      <label className="block text-gray-300 mb-2">Weekly High Points Amount ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.high_points_weekly_amount}
                        onChange={(e) => setSettings({ ...settings, high_points_weekly_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Save Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <Link
                  href={`/leagues/${leagueId}`}
                  className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
