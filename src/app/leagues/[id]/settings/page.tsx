'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Full settings interface matching database schema
interface LeagueSettings {
  id: string
  league_id: string
  // Draft settings
  draft_date: string | null
  draft_type: 'snake' | 'linear'
  draft_order_type: 'random' | 'manual'
  draft_timer_seconds: number
  schools_per_team: number
  max_school_selections_per_team: number
  max_school_selections_total: number
  // Transaction settings
  max_add_drops_per_season: number
  add_drop_deadline: string | null
  // Scoring - Wins
  points_win: number
  points_conference_game: number
  points_over_50: number
  points_shutout: number
  points_ranked_25: number
  points_ranked_10: number
  // Scoring - Losses
  points_loss: number
  points_conference_game_loss: number
  points_over_50_loss: number
  points_shutout_loss: number
  points_ranked_25_loss: number
  points_ranked_10_loss: number
  // Scoring - Special events
  points_conference_championship_win: number
  points_conference_championship_loss: number
  points_heisman_winner: number
  points_bowl_appearance: number
  points_playoff_first_round: number
  points_playoff_quarterfinal: number
  points_playoff_semifinal: number
  points_championship_win: number
  points_championship_loss: number
  // Prize settings
  entry_fee: number
  prize_pool: number
  high_points_enabled: boolean
  high_points_weekly_amount: number
  high_points_weeks: number
  high_points_allow_ties: boolean
  num_winners: number
  winner_percentage: number
  runner_up_percentage: number
  third_place_percentage: number
  // Status
  settings_locked: boolean
}

interface League {
  id: string
  name: string
  max_teams: number
  is_public: boolean
  created_by: string
}

interface LeagueMember {
  id: string
  user_id: string
  role: 'commissioner' | 'member'
  has_paid: boolean
  joined_at: string
  profiles: {
    email: string
    display_name: string | null
  }
  fantasy_teams: {
    id: string
    name: string
  }[] | null
}

type TabType = 'league' | 'draft' | 'members' | 'misc'
type LeagueSubTab = 'basic' | 'roster' | 'scoring' | 'transactions'

export default function CommissionerToolsPage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params.id as string
  const supabase = createClient()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>('not_started')

  const [league, setLeague] = useState<League | null>(null)
  const [settings, setSettings] = useState<LeagueSettings | null>(null)
  const [members, setMembers] = useState<LeagueMember[]>([])

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('league')
  const [leagueSubTab, setLeagueSubTab] = useState<LeagueSubTab>('basic')

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get league info
        const { data: leagueData } = await supabase
          .from('leagues')
          .select('id, name, max_teams, is_public, created_by')
          .eq('id', leagueId)
          .single()

        if (!leagueData) {
          setError('League not found')
          return
        }

        setLeague(leagueData)
        setIsCommissioner(leagueData.created_by === user.id)

        if (leagueData.created_by !== user.id) {
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

        // Get members with their profiles and teams
        const { data: membersData, error: membersError } = await supabase
          .from('league_members')
          .select(`
            id, user_id, role, has_paid, joined_at,
            profiles(email, display_name),
            fantasy_teams(id, name)
          `)
          .eq('league_id', leagueId)

        if (membersError) {
          console.error('Error loading members:', membersError)
        }

        if (membersData) {
          setMembers(membersData as unknown as LeagueMember[])
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

  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('league_settings')
        .update(settings)
        .eq('league_id', leagueId)

      if (updateError) throw updateError

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLeague = async () => {
    if (!league) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error: updateError } = await supabase
        .from('leagues')
        .update({
          name: league.name,
          max_teams: league.max_teams,
          is_public: league.is_public
        })
        .eq('id', leagueId)

      if (updateError) throw updateError

      setSuccess('League settings saved!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving league:', err)
      setError('Failed to save league settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePaid = async (memberId: string, currentPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('league_members')
        .update({ has_paid: !currentPaid })
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.map(m =>
        m.id === memberId ? { ...m, has_paid: !currentPaid } : m
      ))
    } catch (err) {
      console.error('Error updating payment status:', err)
      setError('Failed to update payment status')
    }
  }

  const handleResetDraft = async () => {
    try {
      const response = await fetch('/api/drafts/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset draft')
      }

      setDraftStatus('not_started')
      setSuccess('Draft reset successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error resetting draft:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset draft')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading commissioner tools...</div>
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
            &larr; Back to {league?.name}
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Commissioner Tools</h1>
          <p className="text-gray-400 mb-6">Manage your league settings, draft, and members</p>

          {/* Status Messages */}
          {isDraftStarted && (
            <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-400 px-4 py-3 rounded-lg mb-6">
              Draft has started. Some settings cannot be changed.
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

          {/* Main Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-lg">
            {[
              { id: 'league' as TabType, label: 'League Settings' },
              { id: 'draft' as TabType, label: 'Draft Settings' },
              { id: 'members' as TabType, label: 'Members' },
              { id: 'misc' as TabType, label: 'Miscellaneous' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* League Settings Tab */}
          {activeTab === 'league' && settings && league && (
            <div className="space-y-6">
              {/* Sub-tabs for League Settings */}
              <div className="flex gap-2 border-b border-gray-700 pb-2">
                {[
                  { id: 'basic' as LeagueSubTab, label: 'Basic Settings' },
                  { id: 'roster' as LeagueSubTab, label: 'Roster Settings' },
                  { id: 'scoring' as LeagueSubTab, label: 'Scoring' },
                  { id: 'transactions' as LeagueSubTab, label: 'Transactions' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLeagueSubTab(tab.id)}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${
                      leagueSubTab === tab.id
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Basic Settings */}
              {leagueSubTab === 'basic' && (
                <section className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Basic Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 mb-2">League Name</label>
                      <input
                        type="text"
                        value={league.name}
                        onChange={(e) => setLeague({ ...league, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 mb-2">Number of Teams (2-30)</label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={league.max_teams}
                        onChange={(e) => setLeague({ ...league, max_teams: parseInt(e.target.value) || 2 })}
                        disabled={isDraftStarted}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                      />
                      <p className="text-gray-500 text-sm mt-1">Can be any number from 2-30, not just even numbers</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={league.is_public}
                        onChange={(e) => setLeague({ ...league, is_public: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-600 bg-gray-700"
                      />
                      <label htmlFor="isPublic" className="text-gray-300">
                        Public League (visible to everyone)
                      </label>
                    </div>

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

                    {/* Prize Distribution */}
                    <div className="border-t border-gray-700 pt-4 mt-4">
                      <h3 className="text-lg font-medium text-white mb-4">Prize Distribution</h3>

                      <div className="flex items-center gap-3 mb-4">
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
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-gray-300 mb-2">Weekly Amount ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={settings.high_points_weekly_amount}
                              onChange={(e) => setSettings({ ...settings, high_points_weekly_amount: parseFloat(e.target.value) || 0 })}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-300 mb-2">Number of Weeks</label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={settings.high_points_weeks}
                              onChange={(e) => setSettings({ ...settings, high_points_weeks: parseInt(e.target.value) || 15 })}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-300 mb-2">Number of Winners</label>
                          <select
                            value={settings.num_winners}
                            onChange={(e) => setSettings({ ...settings, num_winners: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          >
                            <option value="1">1 Winner</option>
                            <option value="2">2 Winners</option>
                            <option value="3">3 Winners</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-2">Allow Ties for High Points</label>
                          <select
                            value={settings.high_points_allow_ties ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, high_points_allow_ties: e.target.value === 'yes' })}
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                          >
                            <option value="yes">Yes - Split Prize</option>
                            <option value="no">No - Tiebreaker</option>
                          </select>
                        </div>
                      </div>

                      {settings.num_winners >= 1 && (
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="block text-gray-300 mb-2">1st Place %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={settings.winner_percentage}
                              onChange={(e) => setSettings({ ...settings, winner_percentage: parseFloat(e.target.value) || 0 })}
                              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            />
                          </div>
                          {settings.num_winners >= 2 && (
                            <div>
                              <label className="block text-gray-300 mb-2">2nd Place %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.runner_up_percentage}
                                onChange={(e) => setSettings({ ...settings, runner_up_percentage: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                              />
                            </div>
                          )}
                          {settings.num_winners >= 3 && (
                            <div>
                              <label className="block text-gray-300 mb-2">3rd Place %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.third_place_percentage}
                                onChange={(e) => setSettings({ ...settings, third_place_percentage: parseFloat(e.target.value) || 0 })}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => { handleSaveLeague(); handleSaveSettings(); }}
                      disabled={saving}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
                    >
                      {saving ? 'Saving...' : 'Save Basic Settings'}
                    </button>
                  </div>
                </section>
              )}

              {/* Roster Settings */}
              {leagueSubTab === 'roster' && (
                <section className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Roster Settings</h2>
                  <div className="space-y-4">
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
                      <p className="text-gray-500 text-sm mt-1">How many schools each team drafts (12 recommended)</p>
                    </div>

                    <div>
                      <label className="block text-gray-300 mb-2">Max Times a School Can Be on One Team</label>
                      <select
                        value={settings.max_school_selections_per_team}
                        onChange={(e) => setSettings({ ...settings, max_school_selections_per_team: parseInt(e.target.value) })}
                        disabled={isDraftStarted}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                      >
                        <option value="1">1 time (recommended)</option>
                        <option value="2">2 times</option>
                        <option value="3">3 times</option>
                      </select>
                      <p className="text-gray-500 text-sm mt-1">Usually 1 - each team can only have a school once</p>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      disabled={saving || isDraftStarted}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
                    >
                      {saving ? 'Saving...' : 'Save Roster Settings'}
                    </button>
                  </div>
                </section>
              )}

              {/* Scoring Settings */}
              {leagueSubTab === 'scoring' && (
                <section className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Scoring Settings</h2>

                  {/* Regular Game Scoring */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-blue-400 mb-4">Regular Game Points</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-green-400">Wins</h4>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Base Win Points</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_win}
                            onChange={(e) => setSettings({ ...settings, points_win: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Conference Game Bonus</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_conference_game}
                            onChange={(e) => setSettings({ ...settings, points_conference_game: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Score Over 50 Bonus</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_over_50}
                            onChange={(e) => setSettings({ ...settings, points_over_50: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Shutout Bonus</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_shutout}
                            onChange={(e) => setSettings({ ...settings, points_shutout: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Beat Ranked Top 25</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_ranked_25}
                            onChange={(e) => setSettings({ ...settings, points_ranked_25: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Beat Ranked Top 10</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_ranked_10}
                            onChange={(e) => setSettings({ ...settings, points_ranked_10: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-red-400">Losses</h4>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Base Loss Points</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_loss}
                            onChange={(e) => setSettings({ ...settings, points_loss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Conference Game Loss</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_conference_game_loss}
                            onChange={(e) => setSettings({ ...settings, points_conference_game_loss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Lose by 50+ Points</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_over_50_loss}
                            onChange={(e) => setSettings({ ...settings, points_over_50_loss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Get Shut Out</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_shutout_loss}
                            onChange={(e) => setSettings({ ...settings, points_shutout_loss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Lose to Ranked Top 25</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_ranked_25_loss}
                            onChange={(e) => setSettings({ ...settings, points_ranked_25_loss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 mb-1 text-sm">Lose to Ranked Top 10</label>
                          <input
                            type="number"
                            step="0.5"
                            value={settings.points_ranked_10_loss}
                            onChange={(e) => setSettings({ ...settings, points_ranked_10_loss: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Events */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-medium text-purple-400 mb-4">Special Events</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Conference Championship Win</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_conference_championship_win}
                          onChange={(e) => setSettings({ ...settings, points_conference_championship_win: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Conference Championship Loss</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_conference_championship_loss}
                          onChange={(e) => setSettings({ ...settings, points_conference_championship_loss: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Heisman Winner</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_heisman_winner}
                          onChange={(e) => setSettings({ ...settings, points_heisman_winner: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Bowl Appearance</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_bowl_appearance}
                          onChange={(e) => setSettings({ ...settings, points_bowl_appearance: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                    </div>

                    <h4 className="text-md font-medium text-yellow-400 mt-6 mb-3">Playoff Points</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">First Round</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_playoff_first_round}
                          onChange={(e) => setSettings({ ...settings, points_playoff_first_round: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Quarterfinal</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_playoff_quarterfinal}
                          onChange={(e) => setSettings({ ...settings, points_playoff_quarterfinal: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Semifinal</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_playoff_semifinal}
                          onChange={(e) => setSettings({ ...settings, points_playoff_semifinal: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                    </div>

                    <h4 className="text-md font-medium text-orange-400 mt-6 mb-3">National Championship</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Championship Win</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_championship_win}
                          onChange={(e) => setSettings({ ...settings, points_championship_win: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-1 text-sm">Championship Loss</label>
                        <input
                          type="number"
                          step="0.5"
                          value={settings.points_championship_loss}
                          onChange={(e) => setSettings({ ...settings, points_championship_loss: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-6"
                  >
                    {saving ? 'Saving...' : 'Save Scoring Settings'}
                  </button>
                </section>
              )}

              {/* Transaction Settings */}
              {leagueSubTab === 'transactions' && (
                <section className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">Transaction Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Final Add/Drop Deadline</label>
                      <input
                        type="date"
                        value={settings.add_drop_deadline || ''}
                        onChange={(e) => setSettings({ ...settings, add_drop_deadline: e.target.value || null })}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                      <p className="text-gray-500 text-sm mt-1">Last date teams can make add/drop transactions (usually Monday before Week 7)</p>
                    </div>

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
                      <p className="text-gray-500 text-sm mt-1">Total number of add/drops allowed per team (50 recommended)</p>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
                    >
                      {saving ? 'Saving...' : 'Save Transaction Settings'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Draft Settings Tab */}
          {activeTab === 'draft' && settings && (
            <div className="space-y-6">
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">Draft Configuration</h2>
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
                    <p className="text-gray-500 text-sm mt-1">Scheduled draft time (for display purposes)</p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Draft Type</label>
                    <select
                      value={settings.draft_type}
                      onChange={(e) => setSettings({ ...settings, draft_type: e.target.value as 'snake' | 'linear' })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="snake">Snake (order reverses each round)</option>
                      <option value="linear">Linear (same order each round)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Draft Order</label>
                    <select
                      value={settings.draft_order_type}
                      onChange={(e) => setSettings({ ...settings, draft_order_type: e.target.value as 'random' | 'manual' })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="random">Random (shuffled when draft starts)</option>
                      <option value="manual">Manual (set order in draft room)</option>
                    </select>
                    <p className="text-gray-500 text-sm mt-1">
                      {settings.draft_order_type === 'manual'
                        ? 'Set the draft order on the draft page before starting'
                        : 'Teams will be randomly ordered when the draft begins'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Pick Timer</label>
                    <select
                      value={settings.draft_timer_seconds}
                      onChange={(e) => setSettings({ ...settings, draft_timer_seconds: parseInt(e.target.value) })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="30">30 seconds</option>
                      <option value="45">45 seconds</option>
                      <option value="60">60 seconds (recommended)</option>
                      <option value="90">90 seconds</option>
                      <option value="120">120 seconds (2 min)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2">Max Times a School Can Be Drafted (All Teams)</label>
                    <select
                      value={settings.max_school_selections_total}
                      onChange={(e) => setSettings({ ...settings, max_school_selections_total: parseInt(e.target.value) })}
                      disabled={isDraftStarted}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                    >
                      <option value="1">1 time (exclusive)</option>
                      <option value="2">2 times</option>
                      <option value="3">3 times (recommended)</option>
                      <option value="4">4 times</option>
                      <option value="5">5 times</option>
                      <option value="0">Unlimited</option>
                    </select>
                    <p className="text-gray-500 text-sm mt-1">How many teams can draft the same school across the entire league</p>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    disabled={saving || isDraftStarted}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-4"
                  >
                    {saving ? 'Saving...' : 'Save Draft Settings'}
                  </button>
                </div>
              </section>

              {/* Reset Draft Section */}
              <section className="bg-gray-800 rounded-lg p-6 border border-red-900/50">
                <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
                <p className="text-gray-400 mb-4">
                  Reset the draft to start over. This will delete all picks, clear the draft order,
                  and remove all schools from team rosters.
                </p>
                <button
                  onClick={handleResetDraft}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Reset Draft
                </button>
              </section>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-6">League Members</h2>

                {members.length === 0 ? (
                  <p className="text-gray-400">No members yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-700">
                          <th className="pb-3 font-medium">Name</th>
                          <th className="pb-3 font-medium">Email</th>
                          <th className="pb-3 font-medium">Team</th>
                          <th className="pb-3 font-medium">Role</th>
                          <th className="pb-3 font-medium">Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map(member => (
                          <tr key={member.id} className="border-b border-gray-700/50">
                            <td className="py-3 text-white">
                              {member.profiles?.display_name || 'Unknown'}
                            </td>
                            <td className="py-3 text-gray-400">
                              {member.profiles?.email || 'N/A'}
                            </td>
                            <td className="py-3 text-white">
                              {member.fantasy_teams?.[0]?.name || (
                                <span className="text-yellow-500">No team yet</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                member.role === 'commissioner'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-gray-600/50 text-gray-400'
                              }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => handleTogglePaid(member.id, member.has_paid)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  member.has_paid
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                }`}
                              >
                                {member.has_paid ? '✓ Paid' : '✗ Unpaid'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Total Members:</span>
                      <span className="text-white ml-2">{members.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">With Teams:</span>
                      <span className="text-white ml-2">{members.filter(m => m.fantasy_teams && m.fantasy_teams.length > 0).length}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Paid:</span>
                      <span className="text-green-400 ml-2">{members.filter(m => m.has_paid).length}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-red-400">{members.filter(m => !m.has_paid).length}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Miscellaneous Tab */}
          {activeTab === 'misc' && (
            <div className="space-y-6">
              <section className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Miscellaneous Tools</h2>
                <p className="text-gray-400">
                  Additional commissioner tools will be added here in future updates.
                </p>

                <div className="mt-6 grid gap-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <h3 className="text-white font-medium mb-2">Coming Soon</h3>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Export league data</li>
                      <li>• Send announcements to members</li>
                      <li>• Manual score adjustments</li>
                      <li>• Trade management</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Back Button */}
          <div className="mt-8">
            <Link
              href={`/leagues/${leagueId}`}
              className="inline-block text-gray-400 hover:text-white transition-colors"
            >
              &larr; Back to League
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
