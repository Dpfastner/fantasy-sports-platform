'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

interface School {
  id: string
  name: string
  abbreviation: string | null
  conference: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
}

interface Team {
  id: string
  name: string
  user_id: string
  draft_position: number | null
  profiles: { display_name: string | null; email: string } | null
}

interface DraftPick {
  id: string
  round: number
  pick_number: number
  fantasy_team_id: string
  school_id: string
  picked_at: string
  schools: School
  fantasy_teams: { name: string }
}

interface DraftState {
  id: string
  status: 'not_started' | 'in_progress' | 'paused' | 'completed'
  current_round: number
  current_pick: number
  current_team_id: string | null
  pick_deadline: string | null
}

interface LeagueSettings {
  draft_type: 'snake' | 'linear'
  draft_order_type: 'random' | 'manual'
  draft_timer_seconds: number
  schools_per_team: number
  max_school_selections_total: number
  max_school_selections_per_team: number
}

export default function DraftRoomPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const leagueId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [leagueName, setLeagueName] = useState('')

  // Draft state
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [settings, setSettings] = useState<LeagueSettings | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [draftOrder, setDraftOrder] = useState<{ fantasy_team_id: string; pick_number: number; round: number }[]>([])
  const [memberCount, setMemberCount] = useState(0)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConference, setSelectedConference] = useState<string>('all')
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [viewingTeamId, setViewingTeamId] = useState<string | null>(null) // For viewing other teams' rosters
  const [pendingPick, setPendingPick] = useState<School | null>(null) // School selected, awaiting confirmation
  const [isSubmittingPick, setIsSubmittingPick] = useState(false)
  const [isResettingDraft, setIsResettingDraft] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [mobileTab, setMobileTab] = useState<'schools' | 'history' | 'teams'>('schools')

  // Track if timer has expired (for showing warning)
  const [timerExpired, setTimerExpired] = useState(false)

  // Get unique conferences from schools
  const conferences = [...new Set(schools.map(s => s.conference))].sort()

  // Count how many times each school has been picked (globally and per team)
  const schoolPickCounts: Record<string, number> = {}
  const myTeamSchoolPickCounts: Record<string, number> = {}
  const myTeamId = teams.find(t => t.user_id === user?.id)?.id

  picks.forEach(pick => {
    // Global count
    schoolPickCounts[pick.school_id] = (schoolPickCounts[pick.school_id] || 0) + 1
    // Per-team count (for current user's team)
    if (pick.fantasy_team_id === myTeamId) {
      myTeamSchoolPickCounts[pick.school_id] = (myTeamSchoolPickCounts[pick.school_id] || 0) + 1
    }
  })

  // Max selections allowed (0 means unlimited)
  const maxSelectionsTotal = settings?.max_school_selections_total || 3
  const maxSelectionsPerTeam = settings?.max_school_selections_per_team || 1
  const isUnlimitedTotal = maxSelectionsTotal === 0

  // Helper to check if school matches search/filter criteria
  const schoolMatchesFilters = (school: School) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!school.name.toLowerCase().includes(query) &&
          !school.abbreviation?.toLowerCase().includes(query)) {
        return false
      }
    }
    if (selectedConference !== 'all' && school.conference !== selectedConference) {
      return false
    }
    return true
  }

  // Helper to check if school is maxed out (globally)
  const isSchoolMaxedOut = (school: School) => {
    if (isUnlimitedTotal) return false // 0 means unlimited
    const globalPickCount = schoolPickCounts[school.id] || 0
    return globalPickCount >= maxSelectionsTotal
  }

  // Helper to check if school is already on my team (when per-team limit is reached)
  const isSchoolOnMyTeam = (school: School) => {
    if (!myTeamId) return false
    const myTeamPickCount = myTeamSchoolPickCounts[school.id] || 0
    return myTeamPickCount >= maxSelectionsPerTeam
  }

  // Filter schools into available and maxed-out categories
  const availableSchools = schools.filter(school => {
    if (!schoolMatchesFilters(school)) return false
    if (isSchoolMaxedOut(school)) return false
    if (isSchoolOnMyTeam(school)) return false
    return true
  })

  // Schools that are maxed out globally (show at bottom with strikethrough)
  const maxedOutSchools = schools.filter(school => {
    if (!schoolMatchesFilters(school)) return false
    return isSchoolMaxedOut(school)
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Get current team on the clock - derive from draftOrder for consistency with ticker
  const currentPickFromOrder = draftOrder.find(o => o.pick_number === draft?.current_pick)
  const currentTeam = currentPickFromOrder
    ? teams.find(t => t.id === currentPickFromOrder.fantasy_team_id)
    : teams.find(t => t.id === draft?.current_team_id) // Fallback to database value
  const isMyPick = user && currentTeam?.user_id === user.id

  // Get user's team
  const myTeam = teams.find(t => t.user_id === user?.id)

  // Get team to view (default to user's team)
  const viewingTeam = viewingTeamId ? teams.find(t => t.id === viewingTeamId) : myTeam
  const viewingTeamPicks = picks.filter(p => p.fantasy_team_id === viewingTeam?.id)

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }
        setUser({ id: authUser.id })

        // Get league info
        const { data: league } = await supabase
          .from('leagues')
          .select('name, created_by, sport_id')
          .eq('id', leagueId)
          .single()

        if (!league) {
          setError('League not found')
          return
        }

        setLeagueName(league.name)
        setIsCommissioner(league.created_by === authUser.id)

        // Get member count
        const { count } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId)

        setMemberCount(count || 0)

        // Get league settings
        const { data: settingsData } = await supabase
          .from('league_settings')
          .select('draft_type, draft_order_type, draft_timer_seconds, schools_per_team, max_school_selections_total, max_school_selections_per_team')
          .eq('league_id', leagueId)
          .single()

        if (settingsData) {
          setSettings(settingsData as LeagueSettings)
        }

        // Get draft state
        const { data: draftData } = await supabase
          .from('drafts')
          .select('*')
          .eq('league_id', leagueId)
          .single()

        if (draftData) {
          setDraft(draftData as DraftState)
        }

        // Get teams
        const { data: teamsData } = await supabase
          .from('fantasy_teams')
          .select('id, name, user_id, draft_position, profiles!fantasy_teams_user_id_fkey (display_name, email)')
          .eq('league_id', leagueId)
          .order('draft_position')

        if (teamsData) {
          setTeams(teamsData as unknown as Team[])
        }

        // Get schools for this sport
        const { data: schoolsData } = await supabase
          .from('schools')
          .select('id, name, abbreviation, conference, primary_color, secondary_color, logo_url')
          .eq('sport_id', league.sport_id)
          .eq('is_active', true)
          .order('name')

        if (schoolsData) {
          setSchools(schoolsData as School[])
        }

        // Get draft order
        if (draftData) {
          const { data: orderData } = await supabase
            .from('draft_order')
            .select('fantasy_team_id, pick_number, round')
            .eq('draft_id', draftData.id)
            .order('pick_number')

          if (orderData) {
            setDraftOrder(orderData)
          }
        }

        // Get existing picks
        if (draftData) {
          const { data: picksData } = await supabase
            .from('draft_picks')
            .select(`
              id, round, pick_number, fantasy_team_id, school_id, picked_at,
              schools (id, name, abbreviation, conference, primary_color, secondary_color),
              fantasy_teams (name)
            `)
            .eq('draft_id', draftData.id)
            .order('pick_number')

          if (picksData) {
            setPicks(picksData as unknown as DraftPick[])
          }
        }

      } catch (err) {
        console.error('Error loading draft data:', err)
        setError('Failed to load draft data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [leagueId, router, supabase])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!draft?.id) return

    // Subscribe to draft state changes
    const draftChannel = supabase
      .channel(`draft:${draft.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'drafts',
        filter: `id=eq.${draft.id}`
      }, async (payload) => {
        const newDraft = payload.new as DraftState
        console.log('Realtime: draft update received', newDraft)

        // If draft just started, also load the draft order
        if (newDraft.status === 'in_progress' && draft.status === 'not_started') {
          console.log('Realtime: draft started, loading draft order')
          const { data: orderData } = await supabase
            .from('draft_order')
            .select('fantasy_team_id, pick_number, round')
            .eq('draft_id', draft.id)
            .order('pick_number')

          if (orderData && orderData.length > 0) {
            console.log('Realtime: loaded draft order', orderData.length, 'entries')
            setDraftOrder(orderData)
          }
        }

        // Only accept realtime updates that are at or ahead of our current pick
        // This prevents race conditions where realtime returns stale data before our DB write completes
        if (newDraft.current_pick >= draft.current_pick) {
          console.log('Realtime: accepting draft update (pick', newDraft.current_pick, ')')
          setDraft(newDraft)
          // Reset timer when pick changes
          if (newDraft.current_pick !== draft.current_pick) {
            setTimerExpired(false)
          }
        } else {
          console.log('Realtime: ignoring stale update (server pick', newDraft.current_pick, '< local pick', draft.current_pick, ')')
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'draft_picks',
        filter: `draft_id=eq.${draft.id}`
      }, async (payload) => {
        console.log('Realtime: new pick received', payload.new)
        // Fetch the full pick with joins
        const { data: newPick } = await supabase
          .from('draft_picks')
          .select(`
            id, round, pick_number, fantasy_team_id, school_id, picked_at,
            schools (id, name, abbreviation, conference, primary_color, secondary_color),
            fantasy_teams (name)
          `)
          .eq('id', payload.new.id)
          .single()

        if (newPick) {
          setPicks(prev => [...prev, newPick as unknown as DraftPick])
        }
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    return () => {
      supabase.removeChannel(draftChannel)
    }
  }, [draft?.id, draft?.status, supabase])

  // Polling fallback for real-time - refresh draft state every 5 seconds
  // Polls when not_started (to detect when commissioner starts) and in_progress
  useEffect(() => {
    if (!draft?.id || draft.status === 'completed') return

    const pollInterval = setInterval(async () => {
      const { data: draftData } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draft.id)
        .single()

      if (draftData) {
        // Check if draft just started (status changed from not_started to in_progress)
        const draftJustStarted = draftData.status === 'in_progress' && draft.status === 'not_started'

        if (draftJustStarted) {
          console.log('Polling: draft just started! Loading draft order...')
          // Load draft order immediately
          const { data: orderData } = await supabase
            .from('draft_order')
            .select('fantasy_team_id, pick_number, round')
            .eq('draft_id', draft.id)
            .order('pick_number')

          if (orderData && orderData.length > 0) {
            console.log('Polling: loaded draft order', orderData.length, 'entries')
            setDraftOrder(orderData)
          }
          setDraft(draftData as DraftState)
          return
        }

        // Only accept server updates that are at or ahead of our current pick
        // This prevents race conditions where polling returns stale data before our DB write completes
        if (draftData.current_pick >= draft.current_pick) {
          if (draftData.current_pick !== draft.current_pick ||
              draftData.status !== draft.status ||
              draftData.current_team_id !== draft.current_team_id) {
            console.log('Polling: accepting draft update (pick', draftData.current_pick, ')')
            setDraft(draftData as DraftState)
            // Reset timer expired flag when pick changes
            if (draftData.current_pick !== draft.current_pick) {
              setTimerExpired(false)
            }
          }
        } else {
          console.log('Polling: ignoring stale data (server pick', draftData.current_pick, '< local pick', draft.current_pick, ')')
        }
      }

      // Also check for new picks
      const { data: picksData } = await supabase
        .from('draft_picks')
        .select(`
          id, round, pick_number, fantasy_team_id, school_id, picked_at,
          schools (id, name, abbreviation, conference, primary_color, secondary_color),
          fantasy_teams (name)
        `)
        .eq('draft_id', draft.id)
        .order('pick_number')

      if (picksData && picksData.length > picks.length) {
        console.log('Polling: new picks found', picksData.length - picks.length)
        setPicks(picksData as unknown as DraftPick[])
      }

      // Also refresh draft order if needed (for when commissioner starts draft)
      if (draftOrder.length === 0 && draftData?.status === 'in_progress') {
        const { data: orderData } = await supabase
          .from('draft_order')
          .select('fantasy_team_id, pick_number, round')
          .eq('draft_id', draft.id)
          .order('pick_number')

        if (orderData && orderData.length > 0) {
          console.log('Polling: loaded draft order', orderData.length, 'entries')
          setDraftOrder(orderData)
        }
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [draft?.id, draft?.status, draft?.current_pick, draft?.current_team_id, picks.length, draftOrder.length, supabase])

  // Timer countdown - just tracks time, no auto-skip
  useEffect(() => {
    if (!draft?.pick_deadline || draft.status !== 'in_progress') {
      setTimeRemaining(null)
      setTimerExpired(false)
      return
    }

    const updateTimer = () => {
      const deadline = new Date(draft.pick_deadline!).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000))
      setTimeRemaining(remaining)

      // Set expired flag when timer hits 0 (but don't auto-skip)
      if (remaining === 0 && !timerExpired) {
        setTimerExpired(true)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [draft?.pick_deadline, draft?.status, timerExpired])

  // Close confirmation modal if it's no longer my turn (someone else picked)
  useEffect(() => {
    if (pendingPick && !isMyPick) {
      console.log('Closing modal - no longer my turn')
      setPendingPick(null)
    }
  }, [isMyPick, pendingPick])

  // Commissioner: Start draft
  const handleStartDraft = async () => {
    console.log('handleStartDraft called', { isCommissioner, draft, settings, teamsLength: teams.length })
    setActionError(null)

    if (!isCommissioner) {
      setActionError('Only the commissioner can start the draft')
      return
    }
    if (!draft) {
      setActionError('Draft not found')
      return
    }
    if (!settings) {
      setActionError('League settings not found')
      return
    }
    if (teams.length < 1) {
      setActionError('Need at least 1 team to start the draft')
      return
    }
    if (teams.length < memberCount) {
      setActionError(`All league members must create a team before the draft can start (${teams.length}/${memberCount} teams created)`)
      return
    }

    try {
      let firstTeamId: string | null = null

      console.log('Starting draft process, draftOrder.length:', draftOrder.length)

      // Generate draft order if not exists
      if (draftOrder.length === 0) {
        // Generate order based on draft_order_type setting
        const isManualOrder = settings.draft_order_type === 'manual'
        const orderedTeams = isManualOrder
          ? [...teams].sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
          : [...teams].sort(() => Math.random() - 0.5)

        const totalRounds = settings.schools_per_team
        console.log('Generating draft order for', totalRounds, 'rounds with', orderedTeams.length, 'teams', isManualOrder ? '(manual order)' : '(random order)')

        const orderEntries = []
        let pickNumber = 1

        for (let round = 1; round <= totalRounds; round++) {
          const roundOrder = settings.draft_type === 'snake' && round % 2 === 0
            ? [...orderedTeams].reverse()
            : orderedTeams

          for (let pos = 0; pos < roundOrder.length; pos++) {
            orderEntries.push({
              draft_id: draft.id,
              fantasy_team_id: roundOrder[pos].id,
              round,
              pick_number: pickNumber,
              position_in_round: pos + 1
            })
            pickNumber++
          }
        }

        console.log('Generated', orderEntries.length, 'order entries')

        // Update team draft positions (only for random order, preserve manual)
        if (!isManualOrder) {
          for (let i = 0; i < orderedTeams.length; i++) {
            const { error: posError } = await supabase
              .from('fantasy_teams')
              .update({ draft_position: i + 1 })
              .eq('id', orderedTeams[i].id)
            if (posError) {
              console.error('Error updating team draft position:', posError)
            }
          }
          console.log('Updated team draft positions (random)')
        } else {
          console.log('Using existing draft positions (manual)')
        }

        // Insert all order entries
        const { error: orderError } = await supabase.from('draft_order').insert(orderEntries)
        if (orderError) {
          console.error('Error inserting draft order:', orderError)
          setActionError('Failed to create draft order: ' + orderError.message)
          return
        }
        console.log('Inserted draft order successfully')

        // Update local state
        setDraftOrder(orderEntries.map(e => ({
          fantasy_team_id: e.fantasy_team_id,
          pick_number: e.pick_number,
          round: e.round
        })))

        // First team is first in ordered teams
        firstTeamId = orderedTeams[0].id
      } else {
        console.log('Draft order already exists, fetching first pick')
        // Draft order already exists, get first pick
        const { data: firstPick, error: firstPickError } = await supabase
          .from('draft_order')
          .select('fantasy_team_id')
          .eq('draft_id', draft.id)
          .eq('pick_number', 1)
          .single()

        if (firstPickError) {
          console.error('Error fetching first pick:', firstPickError)
        }

        if (!firstPick) {
          setActionError('No draft order found')
          return
        }
        firstTeamId = firstPick.fantasy_team_id
      }

      console.log('First team ID:', firstTeamId)

      if (!firstTeamId) {
        setActionError('Could not determine first team')
        return
      }

      // Update draft state
      const deadline = new Date(Date.now() + (settings.draft_timer_seconds || 60) * 1000)
      console.log('Updating draft status to in_progress')

      const { error: updateError, data: updateData, count } = await supabase
        .from('drafts')
        .update({
          status: 'in_progress',
          current_round: 1,
          current_pick: 1,
          current_team_id: firstTeamId,
          pick_deadline: deadline.toISOString(),
          started_at: new Date().toISOString()
        })
        .eq('id', draft.id)
        .select()

      console.log('Draft update result:', { updateError, updateData, count })

      if (updateError) {
        console.error('Error updating draft status:', updateError)
        setActionError('Failed to update draft status: ' + updateError.message)
        return
      }

      if (!updateData || updateData.length === 0) {
        console.error('Draft update returned no data - RLS policy may be blocking')
        setActionError('Failed to start draft - you may not have permission. Please check that you are the commissioner.')
        return
      }

      console.log('Draft started successfully!', updateData[0])
      // Force local state update
      setDraft(updateData[0] as DraftState)

      // Reload draft order from database to ensure consistency
      const { data: freshOrderData } = await supabase
        .from('draft_order')
        .select('fantasy_team_id, pick_number, round')
        .eq('draft_id', draft.id)
        .order('pick_number')

      if (freshOrderData) {
        console.log('Reloaded draft order:', freshOrderData.length, 'entries')
        setDraftOrder(freshOrderData)
      }

    } catch (err) {
      console.error('Error starting draft:', err)
      setActionError('Failed to start draft: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Generate draft order
  const generateDraftOrder = async () => {
    if (!draft || !settings) return

    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)
    const totalRounds = settings.schools_per_team
    const numTeams = shuffledTeams.length

    const orderEntries = []
    let pickNumber = 1

    for (let round = 1; round <= totalRounds; round++) {
      const roundOrder = settings.draft_type === 'snake' && round % 2 === 0
        ? [...shuffledTeams].reverse()
        : shuffledTeams

      for (let pos = 0; pos < roundOrder.length; pos++) {
        orderEntries.push({
          draft_id: draft.id,
          fantasy_team_id: roundOrder[pos].id,
          round,
          pick_number: pickNumber,
          position_in_round: pos + 1
        })
        pickNumber++
      }
    }

    // Also update team draft positions
    for (let i = 0; i < shuffledTeams.length; i++) {
      await supabase
        .from('fantasy_teams')
        .update({ draft_position: i + 1 })
        .eq('id', shuffledTeams[i].id)
    }

    await supabase.from('draft_order').insert(orderEntries)
    setDraftOrder(orderEntries.map(e => ({
      fantasy_team_id: e.fantasy_team_id,
      pick_number: e.pick_number,
      round: e.round
    })))
  }

  // Show pick confirmation modal
  const handleSelectSchool = (school: School) => {
    console.log('>>> handleSelectSchool called <<<', school.name)
    console.log('Draft status:', draft?.status, 'isMyPick:', isMyPick, 'timeRemaining:', timeRemaining)
    if (!draft || !isMyPick || draft.status !== 'in_progress') {
      console.log('Blocked from showing modal:', { hasDraft: !!draft, isMyPick, status: draft?.status })
      return
    }
    // Allow picks even after timer expires - no auto-skip
    console.log('Opening confirmation modal for:', school.name)
    setPendingPick(school)
  }

  // Cancel the pending pick
  const handleCancelPick = () => {
    setPendingPick(null)
  }

  // Confirm and make the pick
  const handleConfirmPick = async () => {
    if (!pendingPick) return
    // Reset timer expired flag immediately when user confirms their pick
    setTimerExpired(false)
    await handleMakePick(pendingPick.id)
    setPendingPick(null)
  }

  // Make a pick
  const handleMakePick = async (schoolId: string) => {
    console.log('handleMakePick called', { schoolId, isMyPick, draftStatus: draft?.status, timeRemaining })
    if (!draft || draft.status !== 'in_progress') {
      console.log('Pick rejected - draft not in progress')
      return
    }

    const myTeam = teams.find(t => t.user_id === user?.id)
    if (!myTeam) {
      console.log('No team found for user')
      return
    }

    // Verify it's actually this team's turn by checking draft_order
    const currentOrderEntry = draftOrder.find(o => o.pick_number === draft.current_pick)
    const isActuallyMyTurn = currentOrderEntry?.fantasy_team_id === myTeam.id

    console.log('Turn verification:', {
      currentPick: draft.current_pick,
      expectedTeam: currentOrderEntry?.fantasy_team_id,
      myTeam: myTeam.id,
      isActuallyMyTurn
    })

    if (!isActuallyMyTurn) {
      console.log('Pick rejected - not actually my turn (state out of sync)')
      setActionError('It\'s not your turn. The draft has moved on.')
      setPendingPick(null)
      return
    }

    // Allow picks even after timer expires - no auto-skip
    setIsSubmittingPick(true)

    try {
      console.log('Inserting pick for team', myTeam.id, 'school', schoolId)

      // Insert the pick
      const { error: pickError } = await supabase.from('draft_picks').insert({
        draft_id: draft.id,
        fantasy_team_id: myTeam.id,
        school_id: schoolId,
        round: draft.current_round,
        pick_number: draft.current_pick
      })

      if (pickError) {
        console.error('Error inserting pick:', pickError)
        setActionError('Failed to make pick: ' + pickError.message)
        addToast('Failed to make pick: ' + pickError.message, 'error')
        setIsSubmittingPick(false)
        return
      }

      // Immediately update local picks state so the school is filtered out
      const selectedSchool = schools.find(s => s.id === schoolId)
      if (selectedSchool) {
        const newPick: DraftPick = {
          id: `temp-${Date.now()}`, // Temporary ID until realtime updates
          round: draft.current_round,
          pick_number: draft.current_pick,
          fantasy_team_id: myTeam.id,
          school_id: schoolId,
          picked_at: new Date().toISOString(),
          schools: selectedSchool,
          fantasy_teams: { name: myTeam.name }
        }
        setPicks(prev => [...prev, newPick])
        addToast(`Successfully drafted ${selectedSchool.name}!`, 'success')
      }

      console.log('Pick inserted, adding to roster')

      // Also add to roster
      const { error: rosterError } = await supabase.from('roster_periods').insert({
        fantasy_team_id: myTeam.id,
        school_id: schoolId,
        slot_number: draft.current_pick,
        start_week: 1
      })

      if (rosterError) {
        console.error('Error adding to roster:', rosterError)
        // Don't return - pick was made, roster is secondary
      }

      console.log('Advancing to next pick')
      // Advance to next pick
      await advanceToNextPick()

    } catch (err) {
      console.error('Error making pick:', err)
      const errorMessage = 'Failed to make pick: ' + (err instanceof Error ? err.message : String(err))
      setActionError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setIsSubmittingPick(false)
    }
  }

  // Skip current pick (commissioner or timeout)
  const handleSkipPick = useCallback(async () => {
    if (!draft || draft.status !== 'in_progress') return
    await advanceToNextPick()
  }, [draft])

  // Advance to next pick
  const advanceToNextPick = async () => {
    if (!draft || !settings) return

    const nextPickNumber = draft.current_pick + 1

    // Get next team from draft order (includes makeup picks from skips)
    const nextOrder = draftOrder.find(o => o.pick_number === nextPickNumber)

    console.log('advanceToNextPick: next pick', nextPickNumber, 'nextOrder:', nextOrder)

    if (!nextOrder) {
      // No more picks in the order - draft complete
      console.log('Draft complete! No more picks in order.')
      const { error } = await supabase
        .from('drafts')
        .update({
          status: 'completed',
          current_team_id: null,
          pick_deadline: null,
          completed_at: new Date().toISOString()
        })
        .eq('id', draft.id)

      if (error) {
        console.error('Error completing draft:', error)
      } else {
        // Force local state update
        setDraft(prev => prev ? { ...prev, status: 'completed', current_team_id: null, pick_deadline: null } : null)
      }
      return
    }

    // Use the round from the draft order entry (handles makeup picks correctly)
    const nextRound = nextOrder.round
    const deadline = new Date(Date.now() + (settings.draft_timer_seconds || 60) * 1000)

    console.log('Advancing to pick', nextPickNumber, 'round', nextRound, 'team', nextOrder.fantasy_team_id)

    // Reset timer expired flag for the next pick
    setTimerExpired(false)

    const { error, data } = await supabase
      .from('drafts')
      .update({
        current_round: nextRound,
        current_pick: nextPickNumber,
        current_team_id: nextOrder.fantasy_team_id,
        pick_deadline: deadline.toISOString()
      })
      .eq('id', draft.id)
      .select()

    if (error) {
      console.error('Error advancing pick:', error)
      setActionError('Failed to advance pick: ' + error.message)
    } else if (!data || data.length === 0) {
      console.error('advanceToNextPick: No rows updated - RLS policy may be blocking the update')
      setActionError('Failed to advance pick - permission denied. Please refresh.')
    } else {
      console.log('advanceToNextPick: DB update successful, pick now', nextPickNumber)
      // Force local state update
      setDraft(prev => prev ? {
        ...prev,
        current_round: nextRound,
        current_pick: nextPickNumber,
        current_team_id: nextOrder.fantasy_team_id,
        pick_deadline: deadline.toISOString()
      } : null)
    }
  }

  // Move team up or down in manual draft order
  const handleMoveTeam = async (teamId: string, direction: 'up' | 'down') => {
    const sortedTeams = [...teams].sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
    const currentIndex = sortedTeams.findIndex(t => t.id === teamId)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= sortedTeams.length) return

    // Swap positions
    const teamA = sortedTeams[currentIndex]
    const teamB = sortedTeams[newIndex]
    const posA = teamA.draft_position || currentIndex + 1
    const posB = teamB.draft_position || newIndex + 1

    // Update in database
    await supabase
      .from('fantasy_teams')
      .update({ draft_position: posB })
      .eq('id', teamA.id)

    await supabase
      .from('fantasy_teams')
      .update({ draft_position: posA })
      .eq('id', teamB.id)

    // Update local state
    setTeams(prevTeams => prevTeams.map(t => {
      if (t.id === teamA.id) return { ...t, draft_position: posB }
      if (t.id === teamB.id) return { ...t, draft_position: posA }
      return t
    }))
  }

  // Pause/Resume draft
  const handleTogglePause = async () => {
    if (!isCommissioner || !draft) return

    const newStatus = draft.status === 'paused' ? 'in_progress' : 'paused'
    const newDeadline = newStatus === 'in_progress'
      ? new Date(Date.now() + (settings?.draft_timer_seconds || 60) * 1000).toISOString()
      : null

    console.log('Toggling pause:', newStatus)

    const { error } = await supabase
      .from('drafts')
      .update({
        status: newStatus,
        pick_deadline: newDeadline
      })
      .eq('id', draft.id)

    if (error) {
      console.error('Error toggling pause:', error)
      setActionError('Failed to pause/resume: ' + error.message)
    } else {
      // Force local state update
      setDraft(prev => prev ? { ...prev, status: newStatus, pick_deadline: newDeadline } : null)
    }
  }

  // Reset draft (commissioner only)
  const handleResetDraft = async () => {
    if (!isCommissioner) return

    setIsResettingDraft(true)
    setActionError(null)

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

      console.log('Draft reset successfully:', data)

      // Reset local state
      setDraft(prev => prev ? {
        ...prev,
        status: 'not_started',
        current_round: 1,
        current_pick: 1,
        current_team_id: null,
        pick_deadline: null
      } : null)
      setPicks([])
      setDraftOrder([])
      setShowResetConfirm(false)
      setTimerExpired(false)

    } catch (err) {
      console.error('Error resetting draft:', err)
      setActionError('Failed to reset draft: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsResettingDraft(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading draft room...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }

  // Generate full draft board (all picks in order)
  const generateDraftBoard = () => {
    if (!settings || teams.length === 0) return []

    const board: { pickNumber: number; round: number; team: Team; pick?: DraftPick }[] = []

    // If draft order exists in database, use it (this is the authoritative source)
    if (draftOrder.length > 0) {
      for (const orderEntry of draftOrder) {
        const team = teams.find(t => t.id === orderEntry.fantasy_team_id)
        if (team) {
          const existingPick = picks.find(p => p.pick_number === orderEntry.pick_number)
          board.push({
            pickNumber: orderEntry.pick_number,
            round: orderEntry.round,
            team,
            pick: existingPick
          })
        }
      }
      return board
    }

    // Otherwise, calculate from team positions (for pre-draft display)
    const totalRounds = settings.schools_per_team
    const sortedTeams = [...teams].sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))

    let pickNumber = 1
    for (let round = 1; round <= totalRounds; round++) {
      const roundOrder = settings.draft_type === 'snake' && round % 2 === 0
        ? [...sortedTeams].reverse()
        : sortedTeams

      for (const team of roundOrder) {
        const existingPick = picks.find(p => p.pick_number === pickNumber)
        board.push({
          pickNumber,
          round,
          team,
          pick: existingPick
        })
        pickNumber++
      }
    }

    return board
  }

  const draftBoard = generateDraftBoard()

  // Get conference abbreviation
  const getConferenceAbbr = (conference: string) => {
    const abbrs: Record<string, string> = {
      'SEC': 'SEC',
      'Big Ten': 'B1G',
      'Big 12': 'B12',
      'ACC': 'ACC',
      'Pac-12': 'P12',
      'Big East': 'BE',
      'AAC': 'AAC',
      'Mountain West': 'MW',
      'Sun Belt': 'SB',
      'MAC': 'MAC',
      'Conference USA': 'CUSA',
      'Independent': 'IND'
    }
    return abbrs[conference] || conference.slice(0, 3).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header with Timer and On the Clock */}
      <header className="bg-gray-800 border-b border-gray-700 px-3 md:px-4 py-2">
        {/* Mobile: Stack layout */}
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
          {/* Row 1: Back + Title + Status (on mobile shows compactly) */}
          <div className="flex items-center justify-between md:justify-start md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link href={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white text-sm">
                &larr;
              </Link>
              <h1 className="text-base md:text-lg font-bold text-white truncate max-w-[150px] md:max-w-none">{leagueName} Draft</h1>
            </div>
            {/* Status badge - shown on mobile in header row */}
            <div className="md:hidden">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                draft?.status === 'in_progress' ? 'bg-green-600 text-white' :
                draft?.status === 'paused' ? 'bg-yellow-600 text-white' :
                draft?.status === 'completed' ? 'bg-blue-600 text-white' :
                'bg-gray-600 text-white'
              }`}>
                {draft?.status === 'in_progress' ? 'Live' :
                 draft?.status === 'paused' ? 'Paused' :
                 draft?.status === 'completed' ? 'Done' : 'Not Started'}
              </span>
            </div>
          </div>

          {/* Row 2 on mobile / Center on desktop: On the Clock + Timer */}
          <div className="flex items-center justify-between md:justify-center gap-2 md:gap-6">
            {draft?.status === 'in_progress' && currentTeam && (
              <>
                <div className="flex items-center gap-1 md:gap-3 flex-1 md:flex-none min-w-0">
                  <span className="text-gray-400 text-xs md:text-sm hidden sm:inline">ON THE CLOCK:</span>
                  <span className={`text-sm md:text-lg font-bold truncate ${isMyPick ? 'text-green-400' : 'text-white'}`}>
                    {currentTeam.name}
                  </span>
                  <span className="text-gray-500 text-xs md:text-sm whitespace-nowrap">
                    R{draft.current_round} P{draft.current_pick}
                  </span>
                </div>
                {timeRemaining !== null && (
                  <div className={`text-lg md:text-2xl font-mono font-bold whitespace-nowrap ${
                    timerExpired ? 'text-red-500 animate-pulse' :
                    timeRemaining <= 10 ? 'text-red-500 animate-pulse' :
                    timeRemaining <= 30 ? 'text-yellow-500' :
                    'text-white'
                  }`}>
                    {timerExpired ? 'TIME!' : `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Status + Controls - hidden on mobile, controls shown below */}
          <div className="hidden md:flex items-center gap-3">
            {actionError && (
              <span className="text-red-400 text-sm">{actionError}</span>
            )}
            <span className={`px-3 py-1 rounded text-sm font-medium ${
              draft?.status === 'in_progress' ? 'bg-green-600 text-white' :
              draft?.status === 'paused' ? 'bg-yellow-600 text-white' :
              draft?.status === 'completed' ? 'bg-blue-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {draft?.status === 'in_progress' ? 'Live' :
               draft?.status === 'paused' ? 'Paused' :
               draft?.status === 'completed' ? 'Completed' :
               'Not Started'}
            </span>

            {isCommissioner && draft?.status === 'not_started' && teams.length >= 1 && teams.length >= memberCount && (
              <button
                onClick={handleStartDraft}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium"
              >
                Start Draft
              </button>
            )}
            {isCommissioner && draft?.status === 'not_started' && teams.length >= 1 && teams.length < memberCount && (
              <span className="text-yellow-400 text-sm">
                Waiting for teams ({teams.length}/{memberCount})
              </span>
            )}

            {isCommissioner && (draft?.status === 'in_progress' || draft?.status === 'paused') && (
              <button
                onClick={handleTogglePause}
                className={`${
                  draft.status === 'paused' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                } text-white px-4 py-1.5 rounded text-sm font-medium`}
              >
                {draft.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )}

            {/* Reset Draft button - commissioners only, when draft has started or completed */}
            {isCommissioner && (draft?.status === 'in_progress' || draft?.status === 'paused' || draft?.status === 'completed' || picks.length > 0) && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded text-sm font-medium"
              >
                Reset Draft
              </button>
            )}
          </div>

          {/* Mobile Commissioner Controls - shown as row below header on mobile */}
          {isCommissioner && (
            <div className="flex md:hidden items-center gap-2 pt-1">
              {actionError && (
                <span className="text-red-400 text-xs flex-1">{actionError}</span>
              )}
              {draft?.status === 'not_started' && teams.length >= 1 && teams.length >= memberCount && (
                <button
                  onClick={handleStartDraft}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  Start Draft
                </button>
              )}
              {draft?.status === 'not_started' && teams.length >= 1 && teams.length < memberCount && (
                <span className="text-yellow-400 text-xs">
                  Waiting ({teams.length}/{memberCount})
                </span>
              )}
              {(draft?.status === 'in_progress' || draft?.status === 'paused') && (
                <button
                  onClick={handleTogglePause}
                  className={`${
                    draft.status === 'paused' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                  } text-white px-3 py-1 rounded text-xs font-medium`}
                >
                  {draft.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
              )}
              {(draft?.status === 'in_progress' || draft?.status === 'paused' || draft?.status === 'completed' || picks.length > 0) && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Draft Ticker - Horizontal scrolling pick order */}
      {(draft?.status === 'in_progress' || draft?.status === 'paused' || picks.length > 0) && (
        <div className="bg-gray-800/50 border-b border-gray-700 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {draftBoard.map((slot, idx) => {
              const isCurrent = slot.pickNumber === draft?.current_pick
              const isPicked = !!slot.pick
              const isPast = slot.pickNumber < (draft?.current_pick || 1)

              if (isPicked && !isCurrent) return null // Hide completed picks

              return (
                <div
                  key={slot.pickNumber}
                  className={`flex-shrink-0 px-3 py-1.5 rounded text-xs ${
                    isCurrent
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : isPast
                      ? 'bg-gray-700/50 text-gray-500'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="font-medium">{slot.team.name}</div>
                  <div className="text-[10px] opacity-75">R{slot.round} P{slot.pickNumber}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timer Expired Warning */}
      {timerExpired && draft?.status === 'in_progress' && (
        <div className="bg-red-600 text-white text-center py-3 font-bold animate-pulse">
          TIME EXPIRED! {currentTeam?.name} must make a selection to continue the draft.
        </div>
      )}

      {/* Your Turn Notification */}
      {isMyPick && draft?.status === 'in_progress' && !timerExpired && (
        <div className="bg-green-600 text-white text-center py-2 font-semibold animate-pulse">
          It&apos;s your turn! Select a school from the left panel.
        </div>
      )}

      {/* Your Turn + Timer Expired */}
      {isMyPick && draft?.status === 'in_progress' && timerExpired && (
        <div className="bg-red-600 text-white text-center py-2 font-semibold animate-pulse">
          Your time is up! Please make your selection now.
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-gray-700">
        <button
          onClick={() => setMobileTab('schools')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'schools'
              ? 'text-white border-b-2 border-blue-500 bg-gray-800'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Schools ({availableSchools.length})
        </button>
        <button
          onClick={() => setMobileTab('history')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'history'
              ? 'text-white border-b-2 border-blue-500 bg-gray-800'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          History ({picks.length})
        </button>
        <button
          onClick={() => setMobileTab('teams')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'teams'
              ? 'text-white border-b-2 border-blue-500 bg-gray-800'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Teams
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Available Schools */}
        <div className={`${mobileTab === 'schools' ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 border-r border-gray-700 flex-col`}>
          <div className="p-3 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-white mb-2 hidden md:block">Available Schools</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400"
              />
              <select
                value={selectedConference}
                onChange={(e) => setSelectedConference(e.target.value)}
                className="px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white"
              >
                <option value="all">All</option>
                {conferences.map(conf => (
                  <option key={conf} value={conf}>{getConferenceAbbr(conf)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {availableSchools.map(school => {
                const globalPickCount = schoolPickCounts[school.id] || 0

                return (
                  <button
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    disabled={!isMyPick || draft?.status !== 'in_progress'}
                    className={`w-full p-2 rounded text-left transition-colors ${
                      isMyPick && draft?.status === 'in_progress'
                        ? 'hover:ring-2 hover:ring-blue-500 cursor-pointer'
                        : 'cursor-not-allowed opacity-60'
                    }`}
                    style={{
                      backgroundColor: school.primary_color,
                      color: school.secondary_color
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {school.logo_url ? (
                        <img
                          src={school.logo_url}
                          alt={school.name}
                          className="w-8 h-8 rounded-full bg-white p-0.5"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: school.secondary_color, color: school.primary_color }}
                        >
                          {school.abbreviation?.slice(0, 2) || school.name.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{school.name}</div>
                        <div className="text-xs opacity-75">{school.conference}</div>
                      </div>
                      <div
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: school.secondary_color, color: school.primary_color }}
                      >
                        {globalPickCount}/{maxSelectionsTotal}
                      </div>
                    </div>
                  </button>
                )
              })}

              {/* Maxed out schools - shown at bottom with grey strikethrough */}
              {maxedOutSchools.map(school => (
                <div
                  key={school.id}
                  className="w-full p-2 rounded text-left bg-gray-700 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={school.name}
                        className="w-8 h-8 rounded-full bg-white p-0.5 opacity-50 grayscale"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-600 text-gray-400">
                        {school.abbreviation?.slice(0, 2) || school.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-gray-500 line-through">{school.name}</div>
                      <div className="text-xs text-gray-600">{school.conference}</div>
                    </div>
                    <div className="text-xs px-1.5 py-0.5 rounded bg-gray-600 text-gray-400">
                      {maxSelectionsTotal}/{maxSelectionsTotal}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Draft History */}
        <div className={`${mobileTab === 'history' ? 'flex' : 'hidden'} md:flex flex-1 flex-col border-r border-gray-700`}>
          {/* Draft Status Messages */}
          {draft?.status === 'not_started' && (
            <div className="p-6">
              <div className="text-center text-gray-400 mb-6">
                <p className="text-xl mb-2">Draft has not started yet</p>
                {teams.length < 1 && (
                  <p>Need at least 2 teams to start the draft</p>
                )}
                {isCommissioner && teams.length >= 1 && (
                  <p>Click &quot;Start Draft&quot; when everyone is ready</p>
                )}
              </div>

              {/* Manual Draft Order Setup */}
              {isCommissioner && settings?.draft_order_type === 'manual' && teams.length >= 1 && (
                <div className="max-w-md mx-auto bg-gray-800 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">Set Draft Order</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Use the arrows to reorder teams.
                  </p>
                  <div className="space-y-2">
                    {[...teams]
                      .sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
                      .map((team, index) => (
                        <div
                          key={team.id}
                          className="flex items-center gap-3 bg-gray-700 p-3 rounded"
                        >
                          <span className="text-gray-400 font-mono w-6">{index + 1}.</span>
                          <span className="text-white flex-1">{team.name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMoveTeam(team.id, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => handleMoveTeam(team.id, 'down')}
                              disabled={index === teams.length - 1}
                              className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Random Order Info */}
              {isCommissioner && settings?.draft_order_type === 'random' && teams.length >= 1 && (
                <div className="max-w-md mx-auto text-center">
                  <p className="text-gray-500 text-sm">
                    Draft order is set to <strong className="text-gray-400">Random</strong>.
                  </p>
                  <p className="text-gray-600 text-xs mt-2">
                    Change this in <Link href={`/leagues/${leagueId}/settings`} className="text-blue-400 hover:text-blue-300">League Settings</Link>
                  </p>
                </div>
              )}
            </div>
          )}

          {draft?.status === 'paused' && (
            <div className="p-6 text-center">
              <div className="text-yellow-500 text-xl">Draft is paused</div>
              {isCommissioner && (
                <p className="text-gray-400 mt-2">Click &quot;Resume&quot; to continue</p>
              )}
            </div>
          )}

          {draft?.status === 'completed' && (
            <div className="p-6 text-center">
              <div className="text-blue-400 text-xl">Draft Complete!</div>
              <Link
                href={`/leagues/${leagueId}`}
                className="text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                Return to League
              </Link>
            </div>
          )}

          {/* Draft History - All picks in order */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-sm font-semibold text-white mb-3">Draft History</h3>
            {picks.length === 0 ? (
              <p className="text-gray-500 text-sm">No picks yet</p>
            ) : (
              <div className="space-y-1">
                {picks.map(pick => (
                  <div
                    key={pick.id}
                    className="flex items-center gap-2 p-2 rounded text-sm"
                    style={{
                      backgroundColor: pick.schools.primary_color,
                      color: pick.schools.secondary_color
                    }}
                  >
                    <span className="w-14 text-xs opacity-75">
                      R{pick.round} P{pick.pick_number}
                    </span>
                    {pick.schools.logo_url ? (
                      <img
                        src={pick.schools.logo_url}
                        alt={pick.schools.name}
                        className="w-6 h-6 rounded-full bg-white p-0.5"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: pick.schools.secondary_color, color: pick.schools.primary_color }}
                      >
                        {pick.schools.abbreviation?.slice(0, 2) || pick.schools.name.slice(0, 2)}
                      </div>
                    )}
                    <span className="font-bold flex-1">{pick.schools.name}</span>
                    <span className="text-xs opacity-75">{pick.fantasy_teams.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - My Team / View Teams */}
        <div className={`${mobileTab === 'teams' ? 'flex' : 'hidden'} md:flex w-full md:w-1/4 flex-col`}>
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-white">Team Roster</h2>
              <select
                value={viewingTeamId || myTeam?.id || ''}
                onChange={(e) => setViewingTeamId(e.target.value || null)}
                className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white"
              >
                {myTeam && (
                  <option value={myTeam.id}>My Team: {myTeam.name}</option>
                )}
                {teams
                  .filter(t => t.id !== myTeam?.id)
                  .sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
                  .map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
              </select>
            </div>
            {viewingTeam && (
              <div className="text-gray-400 text-xs">
                {viewingTeamPicks.length}/{settings?.schools_per_team || 12} schools drafted
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {viewingTeam ? (
              <div className="space-y-1">
                {viewingTeamPicks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No picks yet</p>
                ) : (
                  viewingTeamPicks.map((pick, idx) => (
                    <div
                      key={pick.id}
                      className="flex items-center gap-2 p-2 rounded text-sm"
                      style={{
                        backgroundColor: pick.schools.primary_color,
                        color: pick.schools.secondary_color
                      }}
                    >
                      <span className="w-5 text-xs opacity-75">{idx + 1}.</span>
                      {pick.schools.logo_url ? (
                        <img
                          src={pick.schools.logo_url}
                          alt={pick.schools.name}
                          className="w-6 h-6 rounded-full bg-white p-0.5"
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: pick.schools.secondary_color, color: pick.schools.primary_color }}
                        >
                          {pick.schools.abbreviation?.slice(0, 2) || pick.schools.name.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{pick.schools.name}</div>
                        <div className="text-[10px] opacity-75">R{pick.round}</div>
                      </div>
                      <div className="text-xs opacity-75">
                        {getConferenceAbbr(pick.schools.conference)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No team selected</p>
            )}
          </div>
        </div>
      </div>

      {/* Pick Confirmation Modal */}
      {pendingPick && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Pick</h3>

            <div
              className="p-4 rounded-lg mb-6 flex items-center gap-4"
              style={{
                backgroundColor: pendingPick.primary_color,
                color: pendingPick.secondary_color
              }}
            >
              {pendingPick.logo_url ? (
                <img
                  src={pendingPick.logo_url}
                  alt={pendingPick.name}
                  className="w-16 h-16 rounded-full bg-white p-1"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: pendingPick.secondary_color, color: pendingPick.primary_color }}
                >
                  {pendingPick.abbreviation?.slice(0, 3) || pendingPick.name.slice(0, 3)}
                </div>
              )}
              <div>
                <div className="text-xl font-bold">{pendingPick.name}</div>
                <div className="text-sm opacity-75">{pendingPick.conference}</div>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to draft <strong>{pendingPick.name}</strong>?
              <br />
              <span className="text-gray-500 text-sm">Round {draft?.current_round}, Pick {draft?.current_pick}</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelPick}
                disabled={isSubmittingPick}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPick}
                disabled={isSubmittingPick}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmittingPick ? 'Drafting...' : 'Confirm Pick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Draft Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Reset Draft?</h3>

            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300 font-medium mb-2">Warning: This action cannot be undone!</p>
              <p className="text-red-200 text-sm">
                This will delete all draft picks, clear the draft order, and remove all schools from team rosters.
                The draft will return to &quot;Not Started&quot; status.
              </p>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to reset the draft for <strong>{leagueName}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResettingDraft}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDraft}
                disabled={isResettingDraft}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isResettingDraft ? 'Resetting...' : 'Reset Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
