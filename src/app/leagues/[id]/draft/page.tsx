'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DraftChat } from '@/components/DraftChat'
import { trackActivity } from '@/app/actions/activity'
import { track } from '@vercel/analytics'
import { ensureContrast } from '@/lib/color-utils'

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
  auto_pick_enabled?: boolean
  profiles: { display_name: string | null; email: string } | null
}

interface DraftPick {
  id: string
  round: number
  pick_number: number
  fantasy_team_id: string
  school_id: string
  picked_at: string
  is_auto_pick?: boolean
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
  draft_date: string | null
}

// ── Sortable Draft Order Components ──────────────────────────

function SortableTeamItem({ team, index, totalTeams, onMoveTeam }: {
  team: Team
  index: number
  totalTeams: number
  onMoveTeam: (id: string, dir: 'up' | 'down') => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-surface-subtle p-3 rounded">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary p-1 touch-none"
        aria-label="Drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="5" r="1.5" fill="currentColor" /><circle cx="15" cy="5" r="1.5" fill="currentColor" />
          <circle cx="9" cy="12" r="1.5" fill="currentColor" /><circle cx="15" cy="12" r="1.5" fill="currentColor" />
          <circle cx="9" cy="19" r="1.5" fill="currentColor" /><circle cx="15" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>
      <span className="text-text-secondary font-mono w-6">{index + 1}.</span>
      <span className="text-text-primary flex-1">{team.name}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onMoveTeam(team.id, 'up')}
          disabled={index === 0}
          className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed p-1"
        >
          ▲
        </button>
        <button
          onClick={() => onMoveTeam(team.id, 'down')}
          disabled={index === totalTeams - 1}
          className="text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed p-1"
        >
          ▼
        </button>
      </div>
    </div>
  )
}

function DraftOrderSortable({ teams, onMoveTeam, onDragEnd }: {
  teams: Team[]
  onMoveTeam: (id: string, dir: 'up' | 'down') => void
  onDragEnd: (event: DragEndEvent) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  return (
    <div className="max-w-md mx-auto bg-surface rounded-lg p-4">
      <h3 className="text-text-primary font-semibold mb-3">Set Draft Order</h3>
      <p className="text-text-secondary text-sm mb-4">
        Drag to reorder or use the arrows.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={teams.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {teams.map((team, index) => (
              <SortableTeamItem
                key={team.id}
                team={team}
                index={index}
                totalTeams={teams.length}
                onMoveTeam={onMoveTeam}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
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
  const [leagueSeasonId, setLeagueSeasonId] = useState<string | null>(null)

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
  const [mobileTab, setMobileTab] = useState<'schools' | 'history' | 'teams' | 'chat'>('history')
  const [showDraftHelp, setShowDraftHelp] = useState(false)
  const [unreadChat, setUnreadChat] = useState(false)
  const [watchlistedSchoolIds, setWatchlistedSchoolIds] = useState<Set<string>>(new Set())
  const [showConfetti, setShowConfetti] = useState(false)
  const [rankingsMap, setRankingsMap] = useState<Record<string, number>>({})
  const [showRankedOnly, setShowRankedOnly] = useState(false)

  // Track if timer has expired (for showing warning)
  const [timerExpired, setTimerExpired] = useState(false)

  // Auto-pick state
  const [autoPickTriggered, setAutoPickTriggered] = useState(false)
  const autoPickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Draft queue (ordered watchlist with priorities)
  const [draftQueue, setDraftQueue] = useState<{ schoolId: string; priority: number }[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // Auto-pick toggle (user can enable to auto-pick when it's their turn)
  const [autoPickEnabled, setAutoPickEnabled] = useState(false)

  // Fire-and-forget notification trigger for draft events
  const triggerNotification = useCallback((payload: {
    type: string
    leagueId: string
    draftId?: string
    title: string
    body: string
    targetUserId?: string
  }) => {
    fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }, [])

  // Resizable draft chat panel (percentage of right panel height for chat)
  const [chatHeightPct, setChatHeightPct] = useState(33)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !rightPanelRef.current) return
      const rect = rightPanelRef.current.getBoundingClientRect()
      const pct = ((rect.bottom - e.clientY) / rect.height) * 100
      setChatHeightPct(Math.min(80, Math.max(15, pct)))
    }
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

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
    if (showRankedOnly && !rankingsMap[school.id]) return false
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
  }).sort((a, b) => a.name.localeCompare(b.name))

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
          .select('name, created_by, sport_id, season_id')
          .eq('id', leagueId)
          .single()

        if (!league) {
          setError('League not found')
          return
        }

        setLeagueName(league.name)
        setLeagueSeasonId(league.season_id)
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
          .select('draft_type, draft_order_type, draft_timer_seconds, schools_per_team, max_school_selections_total, max_school_selections_per_team, draft_date')
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
          .select('id, name, user_id, draft_position, auto_pick_enabled, profiles!fantasy_teams_user_id_fkey (display_name, email)')
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

        // Fetch AP rankings for current season
        if (league.season_id) {
          const { data: rankingsData } = await supabase
            .from('ap_rankings_history')
            .select('school_id, rank')
            .eq('season_id', league.season_id)
            .order('week_number', { ascending: false })
            .limit(25)

          if (rankingsData) {
            const map: Record<string, number> = {}
            rankingsData.forEach(r => {
              // Only keep the first (most recent week) rank for each school
              if (!map[r.school_id]) {
                map[r.school_id] = r.rank
              }
            })
            setRankingsMap(map)
          }
        }

        // Get user's watchlist for this league (including priority for draft queue)
        const { data: watchlistData } = await supabase
          .from('watchlists')
          .select('school_id, priority')
          .eq('user_id', authUser.id)
          .eq('league_id', leagueId)

        if (watchlistData) {
          setWatchlistedSchoolIds(new Set(watchlistData.map(w => w.school_id)))

          // Populate draft queue from entries with non-null priority
          const queue = watchlistData
            .filter((w): w is typeof w & { priority: number } => w.priority !== null)
            .sort((a, b) => a.priority - b.priority)
            .map(w => ({ schoolId: w.school_id, priority: w.priority }))
          setDraftQueue(queue)
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
              id, round, pick_number, fantasy_team_id, school_id, picked_at, is_auto_pick,
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
        setError('Couldn\'t load draft data. Try refreshing the page.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [leagueId, router, supabase])

  // Auto-disable auto-pick when user returns to the draft page
  useEffect(() => {
    if (!myTeam) return

    // Disable auto-pick in DB when user opens the draft page
    supabase
      .from('fantasy_teams')
      .update({ auto_pick_enabled: false })
      .eq('id', myTeam.id)
      .then(() => {
        setAutoPickEnabled(false)
      })
  }, [myTeam?.id, supabase])

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
          // Trigger confetti when draft completes
          if (newDraft.status === 'completed' && draft.status !== 'completed') {
            setShowConfetti(true)
            setMobileTab('teams')
            setTimeout(() => setShowConfetti(false), 4000)
          }
          // Reset timer when pick changes
          if (newDraft.current_pick !== draft.current_pick) {
            setTimerExpired(false)
            setAutoPickTriggered(false)
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
            // Trigger confetti when draft completes
            if (draftData.status === 'completed' && draft.status !== 'completed') {
              setShowConfetti(true)
              setMobileTab('teams')
              setTimeout(() => setShowConfetti(false), 4000)
            }
            setDraft(draftData as DraftState)
            // Reset timer expired flag when pick changes
            if (draftData.current_pick !== draft.current_pick) {
              setTimerExpired(false)
              setAutoPickTriggered(false)
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

      // Refresh teams to pick up auto_pick_enabled changes
      if (draftData?.status === 'in_progress') {
        const { data: freshTeams } = await supabase
          .from('fantasy_teams')
          .select('id, name, user_id, draft_position, auto_pick_enabled, profiles!fantasy_teams_user_id_fkey (display_name, email)')
          .eq('league_id', leagueId)
          .order('draft_position')

        if (freshTeams) {
          setTeams(freshTeams as unknown as Team[])
          // Sync local toggle state from server (e.g. when auto-pick was enabled by timer expiry)
          const myFreshTeam = (freshTeams as unknown as Team[]).find(t => t.user_id === user?.id)
          if (myFreshTeam) {
            setAutoPickEnabled(!!myFreshTeam.auto_pick_enabled)
          }
        }
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

  // Auto-pick trigger: when timer expires, wait 5 seconds then call auto-pick API
  useEffect(() => {
    if (!timerExpired || !draft || draft.status !== 'in_progress') {
      if (autoPickTimeoutRef.current) {
        clearTimeout(autoPickTimeoutRef.current)
        autoPickTimeoutRef.current = null
      }
      return
    }

    // Don't re-trigger if already triggered for this pick
    if (autoPickTriggered) return

    autoPickTimeoutRef.current = setTimeout(async () => {
      setAutoPickTriggered(true)
      try {
        const res = await fetch(`/api/leagues/${leagueId}/draft/auto-pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draft.id,
            expectedPick: draft.current_pick,
          }),
        })
        const data = await res.json()
        if (data.success && data.pick) {
          addToast(`${data.pick.schoolName} selected for ${data.pick.teamName} (Auto-pick)`, 'success')
        }
        // If skipped, that's fine — another client handled it or pick already advanced
      } catch {
        // Silent failure — polling will catch up with draft state
      }
    }, 5000) // 5-second grace period

    return () => {
      if (autoPickTimeoutRef.current) {
        clearTimeout(autoPickTimeoutRef.current)
      }
    }
  }, [timerExpired, draft?.id, draft?.current_pick, draft?.status, autoPickTriggered, leagueId, addToast])

  // Immediate auto-pick when the team on the clock has auto_pick_enabled
  // Any connected client fires this — works for AFK users and self-toggle
  useEffect(() => {
    if (!draft || draft.status !== 'in_progress') return
    if (autoPickTriggered) return

    // Check if the current team on the clock has auto-pick enabled
    const teamOnClock = teams.find(t => t.id === draft.current_team_id)
    if (!teamOnClock?.auto_pick_enabled) return

    // Fire immediately — the server will skip timer check because auto_pick_enabled is true
    const timeout = setTimeout(async () => {
      setAutoPickTriggered(true)
      try {
        const res = await fetch(`/api/leagues/${leagueId}/draft/auto-pick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: draft.id,
            expectedPick: draft.current_pick,
          }),
        })
        const data = await res.json()
        if (data.success && data.pick) {
          addToast(`${data.pick.schoolName} selected for ${data.pick.teamName} (Auto-pick)`, 'success')
        }
      } catch {
        // Silent failure — polling will catch up
      }
    }, 1000) // 1-second delay to allow UI to render the turn change

    return () => clearTimeout(timeout)
  }, [draft?.id, draft?.current_pick, draft?.current_team_id, draft?.status, autoPickTriggered, teams, leagueId, addToast])

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
          setActionError('Couldn\'t create draft order. Try again. ' + orderError.message)
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

      // Reset auto-pick for all teams before starting (server-side to bypass RLS)
      await fetch(`/api/leagues/${leagueId}/draft/auto-pick`, { method: 'DELETE' })
      setTeams(prev => prev.map(t => ({ ...t, auto_pick_enabled: false })))
      setAutoPickEnabled(false)

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
        setActionError('Couldn\'t update draft status. Try again. ' + updateError.message)
        return
      }

      if (!updateData || updateData.length === 0) {
        console.error('Draft update returned no data - RLS policy may be blocking')
        setActionError('Couldn\'t start draft. You may not have permission -- check that you are the commissioner.')
        return
      }

      console.log('Draft started successfully!', updateData[0])
      trackActivity('draft.started', leagueId, { draftId: draft.id, teamsCount: teams.length })
      triggerNotification({
        type: 'draft_started',
        leagueId,
        draftId: draft.id,
        title: 'Draft Started',
        body: `The draft for ${leagueName} has begun!`,
      })
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
      setActionError('Couldn\'t start draft. Try again. ' + (err instanceof Error ? err.message : String(err)))
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
        setActionError('Couldn\'t make pick. Try again. ' + pickError.message)
        addToast('Couldn\'t make pick. Try again. ' + pickError.message, 'error')
        setIsSubmittingPick(false)
        return
      }

      trackActivity('draft.pick_made', leagueId, { schoolId, round: draft.current_round, pick: draft.current_pick })

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
        start_week: 1,
        season_id: leagueSeasonId,
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
      const errorMessage = 'Couldn\'t make pick. Try again. ' + (err instanceof Error ? err.message : String(err))
      setActionError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setIsSubmittingPick(false)
    }
  }

  // Skip current pick (commissioner or timeout)
  const handleSkipPick = useCallback(async () => {
    if (!draft || draft.status !== 'in_progress') return
    trackActivity('draft.pick_skipped', leagueId, { pick: draft.current_pick, round: draft.current_round })
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
        trackActivity('draft.completed', leagueId, { draftId: draft.id, totalPicks: picks.length + 1 })
        track('draft_completed')
        triggerNotification({
          type: 'draft_completed',
          leagueId,
          draftId: draft.id,
          title: 'Draft Completed',
          body: `The draft for ${leagueName} is complete!`,
        })
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
    setAutoPickTriggered(false)

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
      setActionError('Couldn\'t advance pick. Try again. ' + error.message)
    } else if (!data || data.length === 0) {
      console.error('advanceToNextPick: No rows updated - RLS policy may be blocking the update')
      setActionError('Couldn\'t advance pick. Permission denied -- try refreshing the page.')
    } else {
      console.log('advanceToNextPick: DB update successful, pick now', nextPickNumber)
      // Notify the next user it's their turn
      const nextTeam = teams.find(t => t.id === nextOrder.fantasy_team_id)
      if (nextTeam && nextTeam.user_id !== user?.id) {
        triggerNotification({
          type: 'draft_your_turn',
          leagueId,
          draftId: draft.id,
          title: 'Your Turn to Pick',
          body: `It's your turn in the ${leagueName} draft!`,
          targetUserId: nextTeam.user_id,
        })
      }
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

    const reordered = arrayMove(sortedTeams, currentIndex, newIndex)
    await saveDraftOrder(reordered)
  }

  // Save full draft order to database
  const saveDraftOrder = async (orderedTeams: typeof teams) => {
    // Optimistic local update
    setTeams(prev => prev.map(t => {
      const idx = orderedTeams.findIndex(ot => ot.id === t.id)
      return idx >= 0 ? { ...t, draft_position: idx + 1 } : t
    }))

    // Persist all positions
    const updates = orderedTeams.map((t, i) =>
      supabase.from('fantasy_teams').update({ draft_position: i + 1 }).eq('id', t.id)
    )
    const results = await Promise.all(updates)
    const failed = results.some(r => r.error)
    if (failed) {
      addToast('Couldn\'t save draft order. Try again.', 'error')
    }
  }

  // Drag-and-drop handler
  const handleDraftOrderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sortedTeams = [...teams].sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
    const oldIndex = sortedTeams.findIndex(t => t.id === active.id)
    const newIndex = sortedTeams.findIndex(t => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedTeams, oldIndex, newIndex)
    saveDraftOrder(reordered)
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
      setActionError('Couldn\'t pause/resume. Try again. ' + error.message)
    } else {
      trackActivity(newStatus === 'paused' ? 'draft.paused' : 'draft.resumed', leagueId, { draftId: draft.id })
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
        throw new Error(data.error || 'Couldn\'t reset draft. Try again.')
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
      setAutoPickEnabled(false)
      setAutoPickTriggered(false)

      // Reset auto-pick local state (server-side reset handled by /api/drafts/reset)
      setTeams(prev => prev.map(t => ({ ...t, auto_pick_enabled: false })))

    } catch (err) {
      console.error('Error resetting draft:', err)
      setActionError('Couldn\'t reset draft. Try again. ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsResettingDraft(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-text-primary text-xl">Loading draft room...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="text-danger text-xl">{error}</div>
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

  // ── Draft Queue Handlers ─────────────────────────────────
  const persistQueueOrder = async (newQueue: { schoolId: string; priority: number }[]) => {
    await fetch('/api/watchlists/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId,
        order: newQueue.map((q, i) => ({ schoolId: q.schoolId, priority: i + 1 })),
      }),
    })
  }

  const handleMoveInQueue = (schoolId: string, direction: 'up' | 'down') => {
    const idx = draftQueue.findIndex(q => q.schoolId === schoolId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= draftQueue.length) return

    const newQueue = [...draftQueue]
    ;[newQueue[idx], newQueue[newIdx]] = [newQueue[newIdx], newQueue[idx]]
    const renumbered = newQueue.map((item, i) => ({ ...item, priority: i + 1 }))
    setDraftQueue(renumbered)
    persistQueueOrder(renumbered)
  }

  const handleAddToQueue = async (schoolId: string) => {
    if (draftQueue.some(q => q.schoolId === schoolId)) return

    // Ensure the school exists in watchlists table (insert if not already there)
    if (!watchlistedSchoolIds.has(schoolId)) {
      await fetch('/api/watchlists/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, leagueId }),
      })
      setWatchlistedSchoolIds(prev => new Set(prev).add(schoolId))
    }

    const newQueue = [...draftQueue, { schoolId, priority: draftQueue.length + 1 }]
    setDraftQueue(newQueue)
    await persistQueueOrder(newQueue)
  }

  const handleRemoveFromQueue = (schoolId: string) => {
    const filtered = draftQueue.filter(q => q.schoolId !== schoolId)
    const renumbered = filtered.map((q, i) => ({ ...q, priority: i + 1 }))
    setDraftQueue(renumbered)
    persistQueueOrder(renumbered)
  }

  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      const newQueue = [...draftQueue]
      const [dragged] = newQueue.splice(dragIdx, 1)
      newQueue.splice(dragOverIdx, 0, dragged)
      const renumbered = newQueue.map((q, i) => ({ ...q, priority: i + 1 }))
      setDraftQueue(renumbered)
      persistQueueOrder(renumbered)
    }
    setDragIdx(null)
    setDragOverIdx(null)
  }

  // Toggle auto-pick mode
  const handleToggleAutoPick = async () => {
    if (!myTeam) return
    const newValue = !autoPickEnabled
    setAutoPickEnabled(newValue)

    // Update local teams state immediately so the auto-pick trigger sees it
    setTeams(prev => prev.map(t =>
      t.id === myTeam.id ? { ...t, auto_pick_enabled: newValue } : t
    ))

    await supabase
      .from('fantasy_teams')
      .update({ auto_pick_enabled: newValue })
      .eq('id', myTeam.id)

    if (newValue) {
      addToast('Auto-pick enabled — picks will be made automatically when it\'s your turn', 'info')
    } else {
      addToast('Auto-pick disabled', 'info')
    }
  }

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
    <div className="h-screen bg-page flex flex-col overflow-hidden">
      {/* Draft Complete Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" onAnimationEnd={() => setShowConfetti(false)}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][i % 6],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* Header with Timer and On the Clock */}
      <header className="bg-surface border-b border-border px-3 md:px-4 py-2">
        {/* Mobile: Stack layout */}
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
          {/* Row 1: Back + Title + Status (on mobile shows compactly) */}
          <div className="flex items-center justify-between md:justify-start md:gap-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link href={`/leagues/${leagueId}`} className="text-text-secondary hover:text-text-primary text-sm flex items-center gap-1">
                &larr; <span className="hidden sm:inline">League</span>
              </Link>
              <h1 className="text-base md:text-lg font-bold text-text-primary truncate max-w-[150px] md:max-w-none">{leagueName} Draft</h1>
            </div>
            {/* Status badge - shown on mobile in header row */}
            <div className="md:hidden">
              {draft?.status === 'completed' ? (
                <button
                  onClick={() => router.push(`/leagues/${leagueId}`)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-brand text-text-primary hover:bg-brand-hover transition-colors"
                >
                  Done
                </button>
              ) : (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  draft?.status === 'in_progress' ? 'bg-success text-text-primary' :
                  draft?.status === 'paused' ? 'bg-warning text-text-primary' :
                  'bg-surface-subtle text-text-primary'
                }`}>
                  {draft?.status === 'in_progress' ? 'Live' :
                   draft?.status === 'paused' ? 'Paused' : 'Not Started'}
                </span>
              )}
            </div>
          </div>

          {/* Row 2 on mobile / Center on desktop: On the Clock + Timer */}
          <div className="flex items-center justify-between md:justify-center gap-2 md:gap-6">
            {draft?.status === 'in_progress' && currentTeam && (
              <>
                <div className="flex items-center gap-1 md:gap-3 flex-1 md:flex-none min-w-0">
                  <span className="text-text-secondary text-xs md:text-sm hidden sm:inline">ON THE CLOCK:</span>
                  <span className={`text-sm md:text-lg font-bold truncate ${isMyPick ? 'text-success-text' : 'text-text-primary'}`}>
                    {currentTeam.name}
                  </span>
                  {currentTeam.auto_pick_enabled && (
                    <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded bg-brand/20 text-brand-text animate-pulse whitespace-nowrap">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand" />
                      AUTO
                    </span>
                  )}
                  <span className="text-text-muted text-xs md:text-sm whitespace-nowrap">
                    R{draft.current_round} P{draft.current_pick}
                  </span>
                </div>
                {timeRemaining !== null && (
                  <div className={`text-lg md:text-2xl font-mono font-bold whitespace-nowrap ${
                    timerExpired ? 'text-danger animate-pulse' :
                    timeRemaining <= 10 ? 'text-danger animate-pulse' :
                    timeRemaining <= 30 ? 'text-warning' :
                    'text-text-primary'
                  }`}>
                    {timerExpired
                      ? (autoPickTriggered ? 'AUTO...' : 'TIME!')
                      : `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Status + Controls - hidden on mobile, controls shown below */}
          <div className="hidden md:flex items-center gap-3">
            {actionError && (
              <span className="text-danger-text text-sm">{actionError}</span>
            )}
            {draft?.status === 'completed' ? (
              <button
                onClick={() => router.push(`/leagues/${leagueId}`)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium bg-brand text-text-primary hover:bg-brand-hover transition-colors"
              >
                Done
              </button>
            ) : (
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                draft?.status === 'in_progress' ? 'bg-success text-text-primary' :
                draft?.status === 'paused' ? 'bg-warning text-text-primary' :
                'bg-surface-subtle text-text-primary'
              }`}>
                {draft?.status === 'in_progress' ? 'Live' :
                 draft?.status === 'paused' ? 'Paused' :
                 'Not Started'}
              </span>
            )}

            <button
              onClick={() => setShowDraftHelp(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-base font-bold bg-surface-subtle border border-border hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
              title="Draft room help"
            >
              ?
            </button>

            {isCommissioner && draft?.status === 'not_started' && teams.length >= 1 && teams.length >= memberCount && (
              <button
                onClick={handleStartDraft}
                className="bg-success hover:bg-success-hover text-text-primary px-4 py-1.5 rounded text-sm font-medium"
              >
                Start Draft
              </button>
            )}
            {isCommissioner && draft?.status === 'not_started' && teams.length >= 1 && teams.length < memberCount && (
              <span className="text-warning-text text-sm">
                Waiting for teams ({teams.length}/{memberCount})
              </span>
            )}

            {isCommissioner && (draft?.status === 'in_progress' || draft?.status === 'paused') && (
              <button
                onClick={handleTogglePause}
                className={`${
                  draft.status === 'paused' ? 'bg-success hover:bg-success-hover' : 'bg-warning hover:bg-warning-hover'
                } text-text-primary px-4 py-1.5 rounded text-sm font-medium`}
              >
                {draft.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )}

            {/* Reset Draft button - commissioners only, when draft has started or completed */}
            {isCommissioner && (draft?.status === 'in_progress' || draft?.status === 'paused' || draft?.status === 'completed' || picks.length > 0) && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-danger hover:bg-danger-hover text-text-primary px-4 py-1.5 rounded text-sm font-medium"
              >
                Reset Draft
              </button>
            )}
          </div>

          {/* Mobile Controls - shown as row below header on mobile */}
          <div className="flex md:hidden items-center gap-2 pt-1">
            {actionError && (
              <span className="text-danger-text text-xs flex-1">{actionError}</span>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setShowDraftHelp(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-base font-bold bg-surface-subtle border border-border hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
                title="Help"
              >
                ?
              </button>
            </div>
          </div>
          {isCommissioner && (
            <div className="flex md:hidden items-center gap-2">
              {draft?.status === 'not_started' && teams.length >= 1 && teams.length >= memberCount && (
                <button
                  onClick={handleStartDraft}
                  className="bg-success hover:bg-success-hover text-text-primary px-3 py-1 rounded text-xs font-medium"
                >
                  Start Draft
                </button>
              )}
              {draft?.status === 'not_started' && teams.length >= 1 && teams.length < memberCount && (
                <span className="text-warning-text text-xs">
                  Waiting ({teams.length}/{memberCount})
                </span>
              )}
              {(draft?.status === 'in_progress' || draft?.status === 'paused') && (
                <button
                  onClick={handleTogglePause}
                  className={`${
                    draft.status === 'paused' ? 'bg-success hover:bg-success-hover' : 'bg-warning hover:bg-warning-hover'
                  } text-text-primary px-3 py-1 rounded text-xs font-medium`}
                >
                  {draft.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
              )}
              {(draft?.status === 'in_progress' || draft?.status === 'paused' || draft?.status === 'completed' || picks.length > 0) && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-danger hover:bg-danger-hover text-text-primary px-3 py-1 rounded text-xs font-medium"
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
        <div className="bg-surface/50 border-b border-border px-4 py-2">
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
                      ? 'bg-success text-text-primary ring-2 ring-success'
                      : isPast
                      ? 'bg-surface-inset text-text-muted'
                      : 'bg-surface text-text-secondary'
                  }`}
                >
                  <div className="font-medium flex items-center gap-1">
                    {slot.team.name}
                    {slot.team.auto_pick_enabled && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand animate-pulse" title="Auto-pick on" />
                    )}
                  </div>
                  <div className="text-[10px] opacity-75">R{slot.round} P{slot.pickNumber}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timer Expired Warning */}
      {timerExpired && draft?.status === 'in_progress' && (
        <div className="bg-danger text-text-primary text-center py-3 font-bold animate-pulse">
          TIME EXPIRED! {currentTeam?.name} must make a selection to continue the draft.
        </div>
      )}

      {/* Your Turn Notification */}
      {isMyPick && draft?.status === 'in_progress' && !timerExpired && (
        <div className={`text-text-primary text-center py-2 font-semibold animate-pulse ${
          timeRemaining !== null && timeRemaining <= 15 ? 'bg-warning' : 'bg-success'
        }`}>
          {timeRemaining !== null && timeRemaining <= 15
            ? `Hurry! Only ${timeRemaining} seconds left to make your pick!`
            : 'It\u2019s your turn! Select a school from the left panel.'}
        </div>
      )}

      {/* Your Turn + Timer Expired */}
      {isMyPick && draft?.status === 'in_progress' && timerExpired && (
        <div className="bg-danger text-text-primary text-center py-2 font-semibold animate-pulse">
          Your time is up! Please make your selection now.
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex border-b border-border">
        <button
          onClick={() => setMobileTab('history')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'history'
              ? 'text-text-primary border-b-2 border-brand bg-surface'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          History ({picks.length})
        </button>
        <button
          onClick={() => setMobileTab('schools')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'schools'
              ? 'text-text-primary border-b-2 border-brand bg-surface'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Schools ({availableSchools.length})
        </button>
        <button
          onClick={() => setMobileTab('teams')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            mobileTab === 'teams'
              ? 'text-text-primary border-b-2 border-brand bg-surface'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Teams
        </button>
        <button
          onClick={() => { setMobileTab('chat'); setUnreadChat(false) }}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            mobileTab === 'chat'
              ? 'text-text-primary border-b-2 border-brand bg-surface'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Chat
          {unreadChat && mobileTab !== 'chat' && (
            <span className="absolute top-2 right-1/4 w-2 h-2 bg-brand rounded-full" />
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Available Schools */}
        <div className={`${mobileTab === 'schools' ? 'flex' : 'hidden'} md:flex w-full md:w-1/3 border-r border-border flex-col`}>
          <div className="p-3 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary mb-2 hidden md:block">Available Schools</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search schools by name..."
                className="flex-1 px-2 py-1.5 bg-surface border border-border rounded text-sm text-text-primary placeholder-text-muted"
              />
              <select
                value={selectedConference}
                onChange={(e) => setSelectedConference(e.target.value)}
                className="px-2 py-1.5 bg-surface border border-border rounded text-sm text-text-primary"
                title="Filter by conference"
              >
                <option value="all">All Conf.</option>
                {conferences.map(conf => (
                  <option key={conf} value={conf}>{getConferenceAbbr(conf)}</option>
                ))}
              </select>
              <button
                onClick={() => setShowRankedOnly(!showRankedOnly)}
                className={`px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                  showRankedOnly ? 'bg-warning/20 text-warning-text' : 'bg-surface border border-border text-text-secondary'
                }`}
              >
                Top 25
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Auto-Pick Toggle */}
            {draft?.status === 'in_progress' && myTeam && (
              <div className="mb-2 border border-brand/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-brand/10">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-text-primary text-xs font-medium">Auto-Pick</span>
                  </div>
                  <button
                    onClick={handleToggleAutoPick}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      autoPickEnabled ? 'bg-success' : 'bg-surface-subtle'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        autoPickEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                </div>
                <div className="px-3 py-1.5 text-[10px] text-text-muted bg-brand/5">
                  {autoPickEnabled
                    ? 'Picks will be made automatically from your queue or best available when it\u2019s your turn.'
                    : 'Enable to auto-draft from your queue (or best available) when it\u2019s your turn. Useful if you need to step away.'}
                </div>
              </div>
            )}

            {/* Draft Queue Panel - Ordered auto-pick list */}
            {draftQueue.length > 0 && (
              <div className="mb-2 border border-brand/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1.5 bg-brand/10 text-xs">
                  <span className="text-text-primary font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Draft Queue ({draftQueue.length})
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand/20 text-brand-text">Auto-pick order</span>
                </div>
                <div className="px-2 py-1 text-[11px] text-text-muted bg-brand/5 border-b border-brand/10">
                  Drag to reorder. Auto-pick uses this order. Click &quot;+ Queue&quot; on any school to add it.
                </div>
                <div className="p-1.5 max-h-48 overflow-y-auto">
                  {draftQueue.map((item, idx) => {
                    const school = schools.find(s => s.id === item.schoolId)
                    if (!school) return null
                    const globalPickCount = schoolPickCounts[school.id] || 0
                    const isMaxed = !isUnlimitedTotal && globalPickCount >= maxSelectionsTotal
                    const isOnMyTeam = isSchoolOnMyTeam(school)
                    const isUnavailable = isMaxed || isOnMyTeam
                    const isDragging = dragIdx === idx
                    const isDragOver = dragOverIdx === idx
                    return (
                      <div key={item.schoolId}>
                        {/* Drop indicator line */}
                        {isDragOver && dragIdx !== null && dragIdx > idx && (
                          <div className="h-0.5 bg-brand rounded-full mx-2 my-0.5" />
                        )}
                        <div
                          draggable
                          onDragStart={() => setDragIdx(idx)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx) }}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-opacity ${
                            isUnavailable ? 'opacity-40 line-through' : ''
                          } ${isDragging ? 'opacity-40' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Drag handle */}
                            <svg className="w-3 h-3 text-text-muted shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                              <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                            </svg>
                            <span className="text-[10px] font-bold text-text-muted w-4 text-right">{idx + 1}</span>
                            {school.logo_url ? (
                              <img src={school.logo_url} alt="" className="w-5 h-5 rounded-full bg-text-primary p-0.5" />
                            ) : (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                                style={{ backgroundColor: school.primary_color, color: ensureContrast(school.primary_color, school.secondary_color) }}
                              >
                                {school.abbreviation?.slice(0, 2) || school.name.slice(0, 2)}
                              </div>
                            )}
                            <span className="text-text-primary text-xs font-medium">{school.name}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleMoveInQueue(item.schoolId, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30"
                              title="Move up"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleMoveInQueue(item.schoolId, 'down')}
                              disabled={idx === draftQueue.length - 1}
                              className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30"
                              title="Move down"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveFromQueue(item.schoolId)}
                              className="p-0.5 text-text-muted hover:text-danger"
                              title="Remove from queue"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {/* Drop indicator line */}
                        {isDragOver && dragIdx !== null && dragIdx < idx && (
                          <div className="h-0.5 bg-brand rounded-full mx-2 my-0.5" />
                        )}
                        {/* Divider line between items */}
                        {idx < draftQueue.length - 1 && !isDragOver && (
                          <div className="h-px bg-border mx-2" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              {availableSchools.map(school => {
                const globalPickCount = schoolPickCounts[school.id] || 0

                return (
                  <div
                    key={school.id}
                    className={`w-full p-2 rounded text-left transition-colors ${
                      isMyPick && draft?.status === 'in_progress'
                        ? 'hover:ring-2 hover:ring-brand'
                        : ''
                    }`}
                    style={{
                      backgroundColor: school.primary_color,
                      color: ensureContrast(school.primary_color, school.secondary_color)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectSchool(school)}
                        disabled={!isMyPick || draft?.status !== 'in_progress'}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                      {school.logo_url ? (
                        <img
                          src={school.logo_url}
                          alt={school.name}
                          className="w-8 h-8 rounded-full bg-text-primary p-0.5"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: school.secondary_color, color: ensureContrast(school.secondary_color, school.primary_color) }}
                        >
                          {school.abbreviation?.slice(0, 2) || school.name.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">
                          {rankingsMap[school.id] && (
                            <span className="text-warning-text text-xs font-medium mr-1">#{rankingsMap[school.id]}</span>
                          )}
                          {school.name}
                        </div>
                        <div className="text-xs opacity-75">{school.conference}</div>
                      </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {draftQueue.some(q => q.schoolId === school.id) ? (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/20 font-medium">
                            #{draftQueue.findIndex(q => q.schoolId === school.id) + 1}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToQueue(school.id) }}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-black/20 hover:bg-black/30 transition-colors font-medium"
                            title="Add to draft queue"
                          >
                            + Queue
                          </button>
                        )}
                        <div
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: school.secondary_color, color: ensureContrast(school.secondary_color, school.primary_color) }}
                        >
                          {globalPickCount}/{maxSelectionsTotal}
                        </div>
                        {isMyPick && draft?.status === 'in_progress' && (
                          <button
                            onClick={() => handleSelectSchool(school)}
                            className="text-[10px] px-2 py-1 rounded font-bold bg-white/90 text-green-800 hover:bg-white transition-colors"
                          >
                            Draft
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Maxed out schools - shown at bottom with grey strikethrough */}
              {maxedOutSchools.length > 0 && (
                <div className="mt-3 mb-1 px-2 py-1.5 text-[10px] text-text-muted border-t border-border">
                  Schools below have reached the league draft limit ({maxSelectionsTotal} teams max) and are no longer available.
                </div>
              )}
              {maxedOutSchools.map(school => (
                <div
                  key={school.id}
                  className="w-full p-2 rounded text-left bg-surface cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={school.name}
                        className="w-8 h-8 rounded-full bg-text-primary p-0.5 opacity-50 grayscale"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-surface-subtle text-text-secondary">
                        {school.abbreviation?.slice(0, 2) || school.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-text-muted line-through">{school.name}</div>
                      <div className="text-xs text-text-muted">{school.conference}</div>
                    </div>
                    <div className="text-xs px-1.5 py-0.5 rounded bg-surface-subtle text-text-secondary">
                      {maxSelectionsTotal}/{maxSelectionsTotal}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Panel - Draft History */}
        <div className={`${mobileTab === 'history' ? 'flex' : 'hidden'} md:flex flex-1 flex-col border-r border-border overflow-y-auto`}>
          {/* Draft Status Messages */}
          {draft?.status === 'not_started' && (
            <div className="p-6">
              <div className="text-center text-text-secondary mb-6">
                <p className="text-xl mb-2">Waiting for the draft to begin</p>
                {settings?.draft_date && (
                  <p className="text-text-primary font-medium mb-1">
                    Scheduled: {new Date(settings.draft_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                {teams.length < 1 && (
                  <p>Need at least 2 teams to start the draft</p>
                )}
                {isCommissioner && teams.length >= 1 && (
                  <p>Click &quot;Start Draft&quot; when everyone is ready</p>
                )}
                {!isCommissioner && teams.length >= 1 && !settings?.draft_date && (
                  <p>The commissioner will start the draft when everyone is ready.</p>
                )}
              </div>

              {/* Draft Rules Summary */}
              {settings && (
                <div className="max-w-md mx-auto bg-surface rounded-lg p-4 mb-6">
                  <h3 className="text-text-primary font-semibold mb-3">Draft Rules</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-text-muted">Format</span>
                      <p className="text-text-primary font-medium capitalize">{settings.draft_type} Draft</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Pick Timer</span>
                      <p className="text-text-primary font-medium">{settings.draft_timer_seconds}s per pick</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Roster Size</span>
                      <p className="text-text-primary font-medium">{settings.schools_per_team} schools</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Draft Limit</span>
                      <p className="text-text-primary font-medium">{settings.max_school_selections_total === 0 ? 'Unlimited' : `${settings.max_school_selections_total} teams per school`}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Teams</span>
                      <p className="text-text-primary font-medium">{teams.length} teams</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Total Rounds</span>
                      <p className="text-text-primary font-medium">{settings.schools_per_team} rounds</p>
                    </div>
                  </div>
                  <p className="text-text-muted text-xs mt-3">
                    {settings.draft_type === 'snake'
                      ? 'Snake draft: pick order reverses each round (1→12, then 12→1, etc.)'
                      : 'Linear draft: same pick order every round.'}
                    {' '}If time expires, auto-pick selects the best available school.
                  </p>
                </div>
              )}

              {/* Manual Draft Order Setup */}
              {isCommissioner && settings?.draft_order_type === 'manual' && teams.length >= 1 && (
                <DraftOrderSortable
                  teams={[...teams].sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))}
                  onMoveTeam={handleMoveTeam}
                  onDragEnd={handleDraftOrderDragEnd}
                />
              )}

              {/* Random Order Info */}
              {isCommissioner && settings?.draft_order_type === 'random' && teams.length >= 1 && (
                <div className="max-w-md mx-auto text-center">
                  <p className="text-text-muted text-sm">
                    Draft order is set to <strong className="text-text-secondary">Random</strong>.
                  </p>
                  <p className="text-text-muted text-xs mt-2">
                    Change this in <Link href={`/leagues/${leagueId}/settings`} className="text-brand-text hover:text-brand-text">League Settings</Link>
                  </p>
                </div>
              )}
            </div>
          )}

          {draft?.status === 'paused' && (
            <div className="p-6 text-center">
              <div className="text-warning text-xl">Draft is paused</div>
            </div>
          )}

          {draft?.status === 'completed' && (
            <div className="p-6 text-center">
              <div className="text-brand-text text-xl">Draft Complete!</div>
              <Link
                href={`/leagues/${leagueId}`}
                className="text-brand-text hover:text-brand-text mt-2 inline-block"
              >
                Return to League
              </Link>
            </div>
          )}

          {/* Draft History - All picks in order */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Draft History</h3>
            {picks.length === 0 ? (
              <p className="text-text-muted text-sm">No picks yet</p>
            ) : (
              <div className="space-y-1">
                {picks.map(pick => (
                  <div
                    key={pick.id}
                    className="flex items-center gap-2 p-2 rounded text-sm"
                    style={{
                      backgroundColor: pick.schools.primary_color,
                      color: ensureContrast(pick.schools.primary_color, pick.schools.secondary_color)
                    }}
                  >
                    <span className="w-14 text-xs opacity-75">
                      R{pick.round} P{pick.pick_number}
                    </span>
                    {pick.schools.logo_url ? (
                      <img
                        src={pick.schools.logo_url}
                        alt={pick.schools.name}
                        className="w-6 h-6 rounded-full bg-text-primary p-0.5"
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: pick.schools.secondary_color, color: ensureContrast(pick.schools.secondary_color, pick.schools.primary_color) }}
                      >
                        {pick.schools.abbreviation?.slice(0, 2) || pick.schools.name.slice(0, 2)}
                      </div>
                    )}
                    <span className="font-bold flex-1">{pick.schools.name}</span>
                    {pick.is_auto_pick && (
                      <span className="text-[11px] px-1 py-0.5 rounded bg-black/20 font-medium">Auto</span>
                    )}
                    <span className="text-xs opacity-75">{pick.fantasy_teams.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - My Team / View Teams + Draft Chat */}
        <div
          ref={rightPanelRef}
          className={`${mobileTab === 'teams' ? 'flex' : 'hidden'} md:flex w-full md:w-1/4 flex-col`}
        >
          {/* Roster section */}
          <div className="flex flex-col min-h-0" style={{ height: draft?.id && user ? `${100 - chatHeightPct}%` : '100%' }}>
            <div className="p-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-text-primary">Team Roster</h2>
                <select
                  value={viewingTeamId || myTeam?.id || ''}
                  onChange={(e) => setViewingTeamId(e.target.value || null)}
                  className="px-2 py-1 bg-surface border border-border rounded text-xs text-text-primary"
                >
                  {myTeam && (
                    <option value={myTeam.id}>My Team: {myTeam.name}</option>
                  )}
                  {teams
                    .filter(t => t.id !== myTeam?.id)
                    .sort((a, b) => (a.draft_position || 999) - (b.draft_position || 999))
                    .map(team => (
                      <option key={team.id} value={team.id}>{team.name}{team.auto_pick_enabled ? ' (Auto)' : ''}</option>
                    ))}
                </select>
              </div>
              {viewingTeam && (
                <div className="text-text-secondary text-xs">
                  {viewingTeamPicks.length}/{settings?.schools_per_team || 12} schools drafted
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {viewingTeam ? (
                <div className="space-y-1">
                  {viewingTeamPicks.length === 0 ? (
                    <p className="text-text-muted text-sm">No picks yet</p>
                  ) : (
                    viewingTeamPicks.map((pick, idx) => (
                      <div
                        key={pick.id}
                        className="flex items-center gap-2 p-2 rounded text-sm"
                        style={{
                          backgroundColor: pick.schools.primary_color,
                          color: ensureContrast(pick.schools.primary_color, pick.schools.secondary_color)
                        }}
                      >
                        <span className="w-5 text-xs opacity-75">{idx + 1}.</span>
                        {pick.schools.logo_url ? (
                          <img
                            src={pick.schools.logo_url}
                            alt={pick.schools.name}
                            className="w-6 h-6 rounded-full bg-text-primary p-0.5"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: pick.schools.secondary_color, color: ensureContrast(pick.schools.secondary_color, pick.schools.primary_color) }}
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
                <p className="text-text-muted text-sm">No team selected</p>
              )}
            </div>
          </div>

          {/* Drag handle + Draft Chat */}
          {draft?.id && user && (
            <div className="hidden md:flex flex-col min-h-0 w-full" style={{ height: `${chatHeightPct}%` }}>
              {/* Drag handle */}
              <div
                onMouseDown={() => {
                  isDraggingRef.current = true
                  document.body.style.cursor = 'row-resize'
                  document.body.style.userSelect = 'none'
                }}
                className={`h-1.5 cursor-row-resize shrink-0 transition-colors ${unreadChat ? 'bg-brand animate-pulse' : 'bg-border hover:bg-brand'}`}
                title="Drag to resize"
              />
              <div className="flex-1 min-h-0">
                <DraftChat draftId={draft.id} leagueId={leagueId} currentUserId={user.id} onNewMessage={() => setUnreadChat(true)} />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Chat Panel */}
        {mobileTab === 'chat' && draft?.id && user && (
          <div className="flex md:hidden w-full h-full">
            <DraftChat draftId={draft.id} leagueId={leagueId} currentUserId={user.id} />
          </div>
        )}
      </div>

      {/* Draft Help Modal */}
      {showDraftHelp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary">Draft Room Guide</h3>
              <button onClick={() => setShowDraftHelp(false)} className="text-text-muted hover:text-text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-text-primary mb-1">How to Pick</h4>
                <p className="text-text-secondary">When it&apos;s your turn, click a school from the left panel, then confirm in the popup. Two clicks total: select, then confirm.</p>
              </div>

              <div>
                <h4 className="font-semibold text-text-primary mb-1">Pick Timer</h4>
                <p className="text-text-secondary">Each pick has a countdown timer. The timer turns yellow at 30s and red at 10s. If time runs out, auto-pick selects the best available school for you.</p>
              </div>

              <div>
                <h4 className="font-semibold text-text-primary mb-1">Draft Queue</h4>
                <p className="text-text-secondary">Click &quot;+ Queue&quot; on any school to add it to your draft queue. Drag to reorder. When auto-pick runs (timer expires or auto-pick enabled), it picks the first available school from your queue.</p>
              </div>

              <div>
                <h4 className="font-semibold text-text-primary mb-1">Auto-Pick</h4>
                <p className="text-text-secondary">Toggle auto-pick on to have the system automatically draft for you when it&apos;s your turn. Picks come from your queue first, then best available. Useful if you need to step away.</p>
              </div>

              <div>
                <h4 className="font-semibold text-text-primary mb-1">Draft Limit</h4>
                <p className="text-text-secondary">Each school can only be drafted by a limited number of teams (shown as X/{maxSelectionsTotal}). Once maxed out, the school appears greyed out and struck through at the bottom of the list.</p>
              </div>

              <div>
                <h4 className="font-semibold text-text-primary mb-1">Search & Filter</h4>
                <p className="text-text-secondary">Use the search box to find schools by name, and the conference dropdown to filter by conference.</p>
              </div>

              <div>
                <h4 className="font-semibold text-text-primary mb-1">Draft Chat</h4>
                <p className="text-text-secondary">Chat with other league members during the draft. On desktop, the chat panel is at the bottom-right — drag the divider to resize. On mobile, use the &quot;Chat&quot; tab.</p>
              </div>
            </div>

            <button
              onClick={() => setShowDraftHelp(false)}
              className="w-full mt-6 px-4 py-2.5 bg-brand hover:bg-brand-hover text-text-primary rounded-lg font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Pick Confirmation Modal */}
      {pendingPick && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-text-primary mb-4">Confirm Pick</h3>

            <div
              className="p-4 rounded-lg mb-6 flex items-center gap-4"
              style={{
                backgroundColor: pendingPick.primary_color,
                color: ensureContrast(pendingPick.primary_color, pendingPick.secondary_color)
              }}
            >
              {pendingPick.logo_url ? (
                <img
                  src={pendingPick.logo_url}
                  alt={pendingPick.name}
                  className="w-16 h-16 rounded-full bg-text-primary p-1"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: pendingPick.secondary_color, color: ensureContrast(pendingPick.secondary_color, pendingPick.primary_color) }}
                >
                  {pendingPick.abbreviation?.slice(0, 3) || pendingPick.name.slice(0, 3)}
                </div>
              )}
              <div>
                <div className="text-xl font-bold">{pendingPick.name}</div>
                <div className="text-sm opacity-75">{pendingPick.conference}</div>
              </div>
            </div>

            <p className="text-text-secondary mb-6">
              Are you sure you want to draft <strong>{pendingPick.name}</strong>?
              <br />
              <span className="text-text-muted text-sm">Round {draft?.current_round}, Pick {draft?.current_pick}</span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelPick}
                disabled={isSubmittingPick}
                className="flex-1 px-4 py-3 bg-surface hover:bg-surface-subtle text-text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPick}
                disabled={isSubmittingPick}
                className="flex-1 px-4 py-3 bg-success hover:bg-success-hover text-text-primary rounded-lg font-semibold transition-colors disabled:opacity-50"
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
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-text-primary mb-4">Reset Draft?</h3>

            <div className="bg-danger/20 border border-danger rounded-lg p-4 mb-6">
              <p className="text-danger-text font-medium mb-2">Warning: This action cannot be undone!</p>
              <p className="text-danger-text text-sm">
                This will delete all draft picks, clear the draft order, and remove all schools from team rosters.
                The draft will return to &quot;Not Started&quot; status.
              </p>
            </div>

            <p className="text-text-secondary mb-6">
              Are you sure you want to reset the draft for <strong>{leagueName}</strong>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResettingDraft}
                className="flex-1 px-4 py-3 bg-surface hover:bg-surface-subtle text-text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDraft}
                disabled={isResettingDraft}
                className="flex-1 px-4 py-3 bg-danger hover:bg-danger-hover text-text-primary rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {isResettingDraft ? 'Resetting...' : 'Reset Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Paused Overlay */}
      {draft?.status === 'paused' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-warning" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Draft Paused</h3>
            <p className="text-text-secondary mb-6">
              {isCommissioner
                ? 'You have paused the draft. Click below to resume.'
                : 'The commissioner has paused the draft. Please wait for it to resume.'}
            </p>
            {isCommissioner && (
              <button
                onClick={handleTogglePause}
                className="w-full px-4 py-3 bg-success hover:bg-success-hover text-text-primary rounded-lg font-semibold transition-colors"
              >
                Resume Draft
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
