'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackActivity } from '@/app/actions/activity'
import { detectPreset, type ScoringPresetKey } from '@/lib/scoring-presets'
import { Header } from '@/components/Header'
import { LeagueNav } from '@/components/LeagueNav'
import type { UserBadgeWithDefinition } from '@/types/database'
import { useConfirm } from '@/components/ConfirmDialog'
import type { LeagueSettings, League, LeagueMember, DraftOrderTeam, RecentTrade } from './types'
import { LeagueBasicSettings } from './LeagueBasicSettings'
import { LeagueRosterSettings } from './LeagueRosterSettings'
import { LeagueScoringSettings } from './LeagueScoringSettings'
import { LeagueTransactionSettings } from './LeagueTransactionSettings'
import { LeagueDraftSettings } from './LeagueDraftSettings'
import { LeagueMembersSettings } from './LeagueMembersSettings'

type TabType = 'league' | 'draft' | 'members' | 'misc'
type LeagueSubTab = 'basic' | 'roster' | 'scoring' | 'transactions' | 'trades' | 'double_points'

export default function CommissionerToolsPage() {
  const params = useParams()
  const router = useRouter()
  const { confirm: confirmDialog } = useConfirm()
  const searchParams = useSearchParams()
  const leagueId = params.id as string
  const supabase = createClient()

  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>('not_started')

  // Draft order reordering
  const [draftOrderTeams, setDraftOrderTeams] = useState<DraftOrderTeam[]>([])
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null)

  const [league, setLeague] = useState<League | null>(null)
  const [settings, setSettings] = useState<LeagueSettings | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<ScoringPresetKey>('custom')
  const [members, setMembers] = useState<LeagueMember[]>([])
  const [memberBadges, setMemberBadges] = useState<Map<string, UserBadgeWithDefinition[]>>(new Map())

  // Tab state — read initial tab from URL query param if present
  const initialTab = (searchParams.get('tab') || 'league') as TabType
  const [activeTab, setActiveTab] = useState<TabType>(
    ['league', 'draft', 'members', 'misc'].includes(initialTab) ? initialTab : 'league'
  )
  const [leagueSubTab, setLeagueSubTab] = useState<LeagueSubTab>('basic')

  // Trade veto state
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([])
  const [vetoingTradeId, setVetoingTradeId] = useState<string | null>(null)
  const [vetoReason, setVetoReason] = useState('')
  const [vetoSubmitting, setVetoSubmitting] = useState(false)

  // Unsaved changes tracking
  const [savedSettingsJson, setSavedSettingsJson] = useState<string>('')
  const [savedLeagueJson, setSavedLeagueJson] = useState<string>('')

  const hasUnsavedChanges = () => {
    if (savedSettingsJson && settings && JSON.stringify(settings) !== savedSettingsJson) return true
    if (savedLeagueJson && league && JSON.stringify(league) !== savedLeagueJson) return true
    return false
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSettingsJson, savedLeagueJson, settings, league])

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        setUserId(user.id)
        setUserEmail(user.email)

        // Get user profile for header
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        setUserName(userProfile?.display_name || undefined)

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
        setSavedLeagueJson(JSON.stringify(leagueData))

        // Check membership role to determine commissioner access
        const { data: membershipData } = await supabase
          .from('league_members')
          .select('role')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .single()

        if (!membershipData) {
          setError('You are not a member of this league')
          return
        }

        const hasCommissionerRole = membershipData.role === 'commissioner' || membershipData.role === 'co_commissioner'
        setIsCommissioner(hasCommissionerRole)

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
          setSavedSettingsJson(JSON.stringify(settingsData))
          setSelectedPreset(detectPreset(settingsData))
        }

        // Load teams for draft order reordering
        const { data: draftTeamsData } = await supabase
          .from('fantasy_teams')
          .select('id, name, draft_position, user_id, profiles!fantasy_teams_user_id_fkey(display_name, email)')
          .eq('league_id', leagueId)
          .order('draft_position', { ascending: true })

        if (draftTeamsData) {
          setDraftOrderTeams(
            draftTeamsData.map((t, i) => ({
              id: t.id,
              name: t.name,
              draft_position: t.draft_position || i + 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              owner_name: (t.profiles as any)?.display_name || (t.profiles as any)?.email?.split('@')[0] || 'Unknown',
            }))
          )
        }

        // Get members first
        const { data: membersData, error: membersError } = await supabase
          .from('league_members')
          .select('id, user_id, role, has_paid, joined_at')
          .eq('league_id', leagueId)

        if (membersError) {
          console.error('Error loading members:', membersError)
        }

        if (membersData && membersData.length > 0) {
          // Fetch profiles, teams, and badges for these members
          const userIds = membersData.map(m => m.user_id)

          const [{ data: profilesData }, { data: teamsData }, { data: badgesData }] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, email, display_name, tier')
              .in('id', userIds),
            supabase
              .from('fantasy_teams')
              .select('id, name, user_id, second_owner_id')
              .eq('league_id', leagueId),
            supabase
              .from('user_badges')
              .select('id, user_id, badge_definition_id, metadata, granted_at, badge_definitions(*)')
              .in('user_id', userIds)
              .is('revoked_at', null),
          ])

          // Build badges map
          const badgesMap = new Map<string, UserBadgeWithDefinition[]>()
          for (const badge of (badgesData || [])) {
            const typed = badge as unknown as UserBadgeWithDefinition
            const existing = badgesMap.get(typed.user_id) || []
            existing.push(typed)
            badgesMap.set(typed.user_id, existing)
          }
          setMemberBadges(badgesMap)

          // Combine the data
          const combinedMembers = membersData.map(member => ({
            ...member,
            profiles: profilesData?.find(p => p.id === member.user_id) || { id: member.user_id, email: 'Unknown', display_name: null },
            fantasy_teams: teamsData?.filter(t => t.user_id === member.user_id) || []
          }))

          setMembers(combinedMembers as unknown as LeagueMember[])
        }

      } catch (err) {
        console.error('Error loading settings:', err)
        setError('Failed to load settings. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [leagueId, router, supabase])

  const handleMoveDraftOrder = async (teamId: string, direction: 'up' | 'down') => {
    const sorted = [...draftOrderTeams].sort((a, b) => a.draft_position - b.draft_position)
    const idx = sorted.findIndex(t => t.id === teamId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const teamA = sorted[idx]
    const teamB = sorted[swapIdx]
    const posA = teamA.draft_position
    const posB = teamB.draft_position

    // Optimistic update
    setDraftOrderTeams(prev =>
      prev.map(t => {
        if (t.id === teamA.id) return { ...t, draft_position: posB }
        if (t.id === teamB.id) return { ...t, draft_position: posA }
        return t
      })
    )

    // Persist to DB
    await supabase.from('fantasy_teams').update({ draft_position: posB }).eq('id', teamA.id)
    await supabase.from('fantasy_teams').update({ draft_position: posA }).eq('id', teamB.id)
  }

  const handleDraftOrderDrop = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    const sorted = [...draftOrderTeams].sort((a, b) => a.draft_position - b.draft_position)
    const dragIdx = sorted.findIndex(t => t.id === draggedId)
    const dropIdx = sorted.findIndex(t => t.id === targetId)
    if (dragIdx < 0 || dropIdx < 0) return

    // Reorder: remove dragged item, insert at drop position
    const reordered = [...sorted]
    const [removed] = reordered.splice(dragIdx, 1)
    reordered.splice(dropIdx, 0, removed)

    // Assign new positions (1-indexed)
    const updated = reordered.map((t, i) => ({ ...t, draft_position: i + 1 }))
    setDraftOrderTeams(updated)

    // Persist all positions to DB
    for (const team of updated) {
      await supabase.from('fantasy_teams').update({ draft_position: team.draft_position }).eq('id', team.id)
    }
  }

  const updateScoringField = (field: string, value: number) => {
    if (!settings) return
    const updated = { ...settings, [field]: value }
    const detected = detectPreset(updated)
    updated.scoring_preset = detected === 'custom' ? 'custom' : detected
    setSettings(updated as LeagueSettings)
    setSelectedPreset(detected)
  }

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

      trackActivity('league.settings_changed', leagueId)
      setSavedSettingsJson(JSON.stringify(settings))
      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // Fetch recent accepted trades for veto section
  const loadRecentTrades = async () => {
    const { data } = await supabase
      .from('trades')
      .select(`
        id, status, proposed_at, resolved_at,
        proposer_team:proposer_team_id (id, name),
        receiver_team:receiver_team_id (id, name),
        trade_items (school_id, team_id, direction, schools (name))
      `)
      .eq('league_id', leagueId)
      .in('status', ['accepted', 'vetoed'])
      .order('resolved_at', { ascending: false })
      .limit(10)
    setRecentTrades((data || []) as unknown as RecentTrade[])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (leagueSubTab === 'trades') loadRecentTrades() }, [leagueSubTab])

  const handleVeto = async (tradeId: string) => {
    if (!vetoReason.trim()) {
      setError('Please provide a reason for the veto')
      return
    }
    setVetoSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/trades/veto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId, reason: vetoReason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to veto trade')
      setSuccess('Trade vetoed. Rosters have been reversed.')
      setVetoingTradeId(null)
      setVetoReason('')
      loadRecentTrades()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to veto trade')
    } finally {
      setVetoSubmitting(false)
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

      setSavedLeagueJson(JSON.stringify(league))
      setSuccess('League settings saved!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving league:', err)
      setError('Failed to save league settings. Please check your connection and try again.')
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

      trackActivity('member.payment_toggled', leagueId, { memberId, hasPaid: !currentPaid })
      setMembers(members.map(m =>
        m.id === memberId ? { ...m, has_paid: !currentPaid } : m
      ))
    } catch (err) {
      console.error('Error updating payment status:', err)
      setError('Failed to update payment status. Please try again.')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the league?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      trackActivity('member.removed', leagueId, { memberId, memberName })
      setMembers(members.filter(m => m.id !== memberId))
      setSuccess('Member removed successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error removing member:', err)
      setError('Failed to remove member. Please try again.')
    }
  }

  const handleChangeRole = async (memberId: string, userId: string, newRole: 'commissioner' | 'co_commissioner' | 'member') => {
    // If transferring commissioner role, confirm
    if (newRole === 'commissioner') {
      if (!confirm('Are you sure you want to transfer commissioner role? You will become a co-commissioner.')) {
        return
      }
    }

    try {
      // If transferring commissioner, update current commissioner to co-commissioner
      if (newRole === 'commissioner' && league) {
        const currentCommissioner = members.find(m => m.role === 'commissioner')
        if (currentCommissioner) {
          await supabase
            .from('league_members')
            .update({ role: 'co_commissioner' })
            .eq('id', currentCommissioner.id)
        }

        // Also update the league's created_by to the new commissioner
        await supabase
          .from('leagues')
          .update({ created_by: userId })
          .eq('id', league.id)
      }

      const { error } = await supabase
        .from('league_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      // Reload members to get updated roles
      const { data: membersData } = await supabase
        .from('league_members')
        .select('id, user_id, role, has_paid, joined_at')
        .eq('league_id', leagueId)

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, display_name, tier')
          .in('id', userIds)
        const { data: teamsData } = await supabase
          .from('fantasy_teams')
          .select('id, name, user_id, second_owner_id')
          .eq('league_id', leagueId)

        const combinedMembers = membersData.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.id === member.user_id) || { id: member.user_id, email: 'Unknown', display_name: null },
          fantasy_teams: teamsData?.filter(t => t.user_id === member.user_id) || []
        }))
        setMembers(combinedMembers as unknown as LeagueMember[])
      }

      trackActivity('member.role_changed', leagueId, { memberId, newRole })
      setSuccess('Role updated successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error changing role:', err)
      setError('Failed to change role. Please try again.')
    }
  }

  const handleAddSecondOwnerByEmail = async (teamId: string, email: string) => {
    try {
      // Look up user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name, tier')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (profileError || !profile) {
        setError('No user found with that email address')
        return
      }

      // Update the team with the second owner
      const { error } = await supabase
        .from('fantasy_teams')
        .update({ second_owner_id: profile.id })
        .eq('id', teamId)

      if (error) throw error

      // Update local state
      setMembers(members.map(m => ({
        ...m,
        fantasy_teams: m.fantasy_teams?.map(t =>
          t.id === teamId ? { ...t, second_owner_id: profile.id } : t
        ) || null
      })))

      trackActivity('second_owner.added', leagueId, { teamId, secondOwnerEmail: email })
      setSuccess('Second owner added')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating second owner:', err)
      setError('Failed to update second owner. Please try again.')
    }
  }

  const handleRemoveSecondOwner = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('fantasy_teams')
        .update({ second_owner_id: null })
        .eq('id', teamId)

      if (error) throw error

      // Update local state
      setMembers(members.map(m => ({
        ...m,
        fantasy_teams: m.fantasy_teams?.map(t =>
          t.id === teamId ? { ...t, second_owner_id: null } : t
        ) || null
      })))

      trackActivity('second_owner.removed', leagueId, { teamId })
      setSuccess('Second owner removed')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error removing second owner:', err)
      setError('Failed to remove second owner. Please try again.')
    }
  }

  const handleToggleSectionVisibility = async (field: 'show_announcements' | 'show_chat' | 'show_activity_feed') => {
    if (!settings) return
    const updated = { ...settings, [field]: !settings[field] }
    setSettings(updated as LeagueSettings)
    try {
      const { error: updateError } = await supabase
        .from('league_settings')
        .update({ [field]: updated[field] })
        .eq('league_id', leagueId)
      if (updateError) throw updateError
    } catch (err) {
      console.error('Error toggling section visibility:', err)
      // Revert on error
      setSettings(settings)
      setError('Failed to update setting. Please try again.')
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
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-text-primary">Loading league settings...</div>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="text-danger text-xl mb-4">{error}</div>
          <Link href={`/leagues/${leagueId}`} className="text-brand-text hover:text-brand-text">
            Back to League
          </Link>
        </div>
      </div>
    )
  }

  const isDraftStarted = draftStatus !== 'not_started'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={userName} userEmail={userEmail} userId={userId} />

      <LeagueNav leagueId={leagueId} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-text-primary mb-2">League Settings</h1>
          {isCommissioner ? (
            <p className="text-text-secondary mb-6">Manage your league settings, draft, and members</p>
          ) : (
            <div className="bg-info/10 border border-info/30 text-info-text px-4 py-3 rounded-lg mb-6 text-sm">
              You are viewing league settings in read-only mode. Only commissioners can edit these settings.
            </div>
          )}

          {/* Status Messages */}
          {isDraftStarted && (
            <div className="bg-highlight-special border border-warning text-warning-text px-4 py-3 rounded-lg mb-6">
              Draft has started. Some settings cannot be changed.
            </div>
          )}

          {error && (
            <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success/10 border border-success text-success-text px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* Main Tab Navigation */}
          <div className="flex gap-1 mb-6 bg-surface p-1 rounded-lg">
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
                    ? 'bg-brand text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
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
              <div className="flex gap-2 border-b border-border pb-2">
                {[
                  { id: 'basic' as LeagueSubTab, label: 'Basic Settings' },
                  { id: 'roster' as LeagueSubTab, label: 'Roster Settings' },
                  { id: 'scoring' as LeagueSubTab, label: 'Scoring' },
                  { id: 'transactions' as LeagueSubTab, label: 'Transactions' },
                  { id: 'trades' as LeagueSubTab, label: 'Trades' },
                  { id: 'double_points' as LeagueSubTab, label: 'Double Points' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setLeagueSubTab(tab.id)}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${
                      leagueSubTab === tab.id
                        ? 'text-brand-text border-b-2 border-brand'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {leagueSubTab === 'basic' && (
                <LeagueBasicSettings
                  settings={settings} setSettings={setSettings}
                  league={league} setLeague={setLeague}
                  isCommissioner={isCommissioner} isDraftStarted={isDraftStarted}
                  saving={saving} onSave={() => { handleSaveLeague(); handleSaveSettings() }}
                />
              )}
              {leagueSubTab === 'roster' && (
                <LeagueRosterSettings
                  settings={settings} setSettings={setSettings}
                  isCommissioner={isCommissioner} isDraftStarted={isDraftStarted}
                  saving={saving} onSave={handleSaveSettings}
                />
              )}
              {leagueSubTab === 'scoring' && (
                <LeagueScoringSettings
                  settings={settings} setSettings={setSettings}
                  selectedPreset={selectedPreset} setSelectedPreset={setSelectedPreset}
                  updateScoringField={updateScoringField}
                  isCommissioner={isCommissioner} saving={saving} onSave={handleSaveSettings}
                  onConfirmReset={() => confirmDialog({ title: 'Reset scoring?', message: 'Reset all scoring values to the Standard preset? You can still adjust individual values after.' })}
                />
              )}
              {(leagueSubTab === 'transactions' || leagueSubTab === 'trades' || leagueSubTab === 'double_points') && (
                <LeagueTransactionSettings
                  settings={settings} setSettings={setSettings}
                  leagueSubTab={leagueSubTab}
                  isCommissioner={isCommissioner} saving={saving} onSave={handleSaveSettings}
                  recentTrades={recentTrades} vetoingTradeId={vetoingTradeId}
                  setVetoingTradeId={setVetoingTradeId} vetoReason={vetoReason}
                  setVetoReason={setVetoReason} vetoSubmitting={vetoSubmitting} onVeto={handleVeto}
                />
              )}
            </div>
          )}

          {/* Draft Settings Tab */}
          {activeTab === 'draft' && settings && (
            <LeagueDraftSettings
              settings={settings} setSettings={setSettings}
              isCommissioner={isCommissioner} isDraftStarted={isDraftStarted}
              saving={saving} onSave={handleSaveSettings}
              draftOrderTeams={draftOrderTeams} draggedTeamId={draggedTeamId}
              setDraggedTeamId={setDraggedTeamId}
              onMoveDraftOrder={handleMoveDraftOrder}
              onDraftOrderDrop={handleDraftOrderDrop}
              onResetDraft={handleResetDraft}
            />
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <LeagueMembersSettings
              members={members} memberBadges={memberBadges}
              isCommissioner={isCommissioner}
              onTogglePaid={handleTogglePaid}
              onRemoveMember={handleRemoveMember}
              onChangeRole={handleChangeRole}
              onAddSecondOwner={handleAddSecondOwnerByEmail}
              onRemoveSecondOwner={handleRemoveSecondOwner}
            />
          )}

          {/* Miscellaneous Tab */}
          {activeTab === 'misc' && settings && (
            <div className="space-y-6">
              {/* League Home Page Sections */}
              <section className="bg-surface rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">League Home Page Sections</h2>
                <p className="text-text-secondary text-sm mb-6">Choose which sections appear on your league home page.</p>

                <div className="space-y-4">
                  {/* Show Announcements */}
                  <div className="flex items-center justify-between p-4 bg-surface-inset rounded-lg">
                    <div>
                      <label className="text-text-primary font-medium">League Announcements</label>
                      <p className="text-text-secondary text-sm mt-1">Post updates and news for your league members</p>
                    </div>
                    <button
                      onClick={() => isCommissioner && handleToggleSectionVisibility('show_announcements')}
                      disabled={!isCommissioner}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.show_announcements ? 'bg-brand' : 'bg-surface-subtle'
                      } ${!isCommissioner ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition-transform ${
                          settings.show_announcements ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Chat */}
                  <div className="flex items-center justify-between p-4 bg-surface-inset rounded-lg">
                    <div>
                      <label className="text-text-primary font-medium">League Chat</label>
                      <p className="text-text-secondary text-sm mt-1">Real-time chat with your league members</p>
                    </div>
                    <button
                      onClick={() => isCommissioner && handleToggleSectionVisibility('show_chat')}
                      disabled={!isCommissioner}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.show_chat ? 'bg-brand' : 'bg-surface-subtle'
                      } ${!isCommissioner ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition-transform ${
                          settings.show_chat ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Activity Feed */}
                  <div className="flex items-center justify-between p-4 bg-surface-inset rounded-lg">
                    <div>
                      <label className="text-text-primary font-medium">League Activity Feed</label>
                      <p className="text-text-secondary text-sm mt-1">Auto-generated feed of draft picks, transactions, and more</p>
                    </div>
                    <button
                      onClick={() => isCommissioner && handleToggleSectionVisibility('show_activity_feed')}
                      disabled={!isCommissioner}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.show_activity_feed ? 'bg-brand' : 'bg-surface-subtle'
                      } ${!isCommissioner ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-text-primary transition-transform ${
                          settings.show_activity_feed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              {/* Other Coming Soon Tools */}
              <section className="bg-surface rounded-lg p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">More Tools</h2>
                <div className="p-4 bg-surface-inset rounded-lg border border-border">
                  <h3 className="text-text-primary font-medium mb-2">Coming Soon</h3>
                  <ul className="text-text-secondary text-sm space-y-1">
                    <li>• Export league data</li>
                    <li>• Manual score adjustments</li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {/* Back Button */}
          <div className="mt-8">
            <Link
              href={`/leagues/${leagueId}`}
              className="inline-block text-text-secondary hover:text-text-primary transition-colors"
            >
              &larr; Back to League
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
