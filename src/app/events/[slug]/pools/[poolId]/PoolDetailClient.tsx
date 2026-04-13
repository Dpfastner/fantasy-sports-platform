'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import { GamePicker } from './GamePicker'
import { Leaderboard } from './Leaderboard'
import { RosterLeaderboard } from './RosterLeaderboard'
import { PoolActivityFeed } from './PoolActivityFeed'
import { PoolAnnouncements } from './PoolAnnouncements'
import { TournamentCountdown } from '@/components/TournamentCountdown'
import { RulesHighlights } from '@/components/RulesHighlights'
import { GolfHoleGrid, type GolfHole } from '@/components/GolfHoleGrid'
import { TIER_COLORS } from '@/lib/events/tiers'
import { CourseMapContainer } from '@/components/CourseMap/CourseMapContainer'
import { PlayerOwnershipCard } from '@/components/PlayerOwnershipCard'
import { BiggestMovers } from '@/components/BiggestMovers'
import { TeeTimesCard } from '@/components/TeeTimesCard'
import { ProjectedCutTracker } from '@/components/ProjectedCutTracker'
import { golferRoundToPar, type CutRule } from '@/lib/events/golf-aggregations'
import { EntryAvatar } from '@/components/EntryAvatar'
import { ScheduleView } from './ScheduleView'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SchoolPicker } from '@/components/SchoolPicker'
import { ViewBracketModal } from './ViewBracketModal'
import { MembersTab } from './MembersTab'
import { SettingsTab } from './SettingsTab'
import { CutCountdown } from '@/components/events/masters/CutCountdown'
import { computeAllMastersAwards } from '@/lib/events/masters-awards'
import { GreenJacketCeremony } from '@/components/events/masters/GreenJacketCeremony'
import { Top10Leaderboard } from '@/components/events/masters/Top10Leaderboard'
import { MastersLeaderboard } from '@/components/events/masters/MastersLeaderboard'
import { Par3CurseBadge } from '@/components/events/masters/Par3CurseBadge'
import { CutStatus } from '@/components/events/masters/CutStatus'
import { useSundayRoar, RoarFeed, RoarOverlay } from '@/components/events/masters/SundayRoar'

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
  metadata?: Record<string, unknown>
}

interface Game {
  id: string
  round: string
  gameNumber: number
  participant1Id: string | null
  participant2Id: string | null
  participant1Score?: number | null
  participant2Score?: number | null
  startsAt: string
  status: string
  result: Record<string, unknown> | null
  period?: string | null
  clock?: string | null
  liveStatus?: string | null
  winnerId?: string | null
}

interface Member {
  id: string
  userId: string | null
  entryName?: string | null
  userName?: string
  displayName: string
  isActive: boolean
  submittedAt: string | null
  score: number
  maxPossible: number
  rank: number | null
  roundsSurvived?: number
  tiebreakerPrediction?: { team1_score: number; team2_score: number } | null
  primaryColor?: string | null
  secondaryColor?: string | null
  imageUrl?: string | null
  championPick?: { participantId: string; participantName: string } | null
}

interface UserEntry {
  id: string
  displayName: string
  isActive: boolean
  submittedAt: string | null
  score: number
  rank: number | null
  tiebreakerPrediction: { team1_score: number; team2_score: number } | null
  primaryColor?: string | null
  secondaryColor?: string | null
  imageUrl?: string | null
}

interface PoolWeek {
  id: string
  week_number: number
  deadline: string
  resolution_status: string
}

interface UserPick {
  id: string
  gameId: string | null
  participantId: string
  weekNumber: number | null
}

interface PoolDetailClientProps {
  pool: {
    id: string
    name: string
    inviteCode: string
    visibility: string
    status: string
    tiebreaker: string
    maxEntries: number | null
    scoringRules: Record<string, unknown>
    deadline: string | null
    maxEntriesPerUser: number
    gameType: string | null
  }
  tournament: {
    id: string
    name: string
    slug: string
    sport: string
    format: string
    status: string
    startsAt: string
    endsAt: string | null
    bracketSize: number | null
    totalWeeks: number | null
    config: Record<string, unknown> | null
  }
  participants: Participant[]
  games: Game[]
  members: Member[]
  userEntries: UserEntry[]
  userPicksByEntry: Record<string, UserPick[]>
  poolWeeks: PoolWeek[]
  isLoggedIn: boolean
  isCreator: boolean
  userId: string | null
  rulesText: string | null
  rulesHighlights: Array<{ icon: string; label: string; description: string }> | null
  hasFavoriteSchool: boolean
  uniqueMembers: Member[]
  rosterSelectionCounts?: Record<string, number>
  rosterTotalEntries?: number
  /** All submitted entries' roster picks: entryId → participantIds */
  allRosterPicks?: Record<string, string[]>
}

type Tab = 'overview' | 'picks' | 'schedule' | 'course' | 'members' | 'settings'

export function PoolDetailClient({
  pool,
  tournament,
  participants,
  games,
  members,
  userEntries,
  userPicksByEntry,
  poolWeeks,
  isLoggedIn,
  isCreator,
  userId,
  rulesText,
  rulesHighlights,
  hasFavoriteSchool,
  uniqueMembers,
  rosterSelectionCounts,
  rosterTotalEntries,
  allRosterPicks,
}: PoolDetailClientProps) {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  // Start as null to prevent server-side rendering of tab content.
  // Server HTML has no tab content → client renders it fresh → no hydration duplicates.
  const [activeTab, setActiveTabState] = useState<Tab | null>(null)
  useEffect(() => { setActiveTabState(initialTab) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [showRules, setShowRules] = useState(false)
  const [expandedGolferId, setExpandedGolferId] = useState<string | null>(null)
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showSchoolPrompt, setShowSchoolPrompt] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null)
  const [savingSchool, setSavingSchool] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  // Tournament palette override — swap the global palette while on this pool
  // page only. Read from tournament.config.palette_override (set per tournament
  // via SQL) and restore the previous palette on unmount so dashboard/other
  // pages keep the user's chosen theme.
  useEffect(() => {
    const override = (tournament.config as Record<string, unknown> | null | undefined)?.palette_override as string | undefined
    if (!override) return
    const html = document.documentElement
    const prevPalette = html.getAttribute('data-palette')
    const prevMode = html.getAttribute('data-palette-mode')
    html.setAttribute('data-palette', override)
    // Heritage Field, Collegiate Fire, Warm Kickoff all have specific modes —
    // for simplicity default to dark unless the override is known light.
    html.setAttribute('data-palette-mode', override === 'warm-kickoff' ? 'light' : 'dark')
    return () => {
      if (prevPalette === null) html.removeAttribute('data-palette')
      else html.setAttribute('data-palette', prevPalette)
      if (prevMode === null) html.removeAttribute('data-palette-mode')
      else html.setAttribute('data-palette-mode', prevMode)
    }
  }, [tournament.config])

  // Live-updating members: subscribe to event_entries changes for this pool
  const [liveMembers, setLiveMembers] = useState(members)
  useEffect(() => { setLiveMembers(members) }, [members])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`pool-scores-${pool.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_entries',
        filter: `pool_id=eq.${pool.id}`,
      }, (payload) => {
        const updated = payload.new as { id: string; total_points: number }
        setLiveMembers(prev => prev.map(m =>
          m.id === updated.id ? { ...m, score: Number(updated.total_points) || 0 } : m
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [pool.id])

  // Live-updating participants (golfer scores, hole data, current hole).
  // Fed by ESPN sync → event_participants.metadata updates → Supabase Realtime
  // pushes here. Drives the Leaderboard tab and the Course tab visualizations.
  const [liveParticipants, setLiveParticipants] = useState(participants)
  useEffect(() => { setLiveParticipants(participants) }, [participants])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`pool-participants-${tournament.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_participants',
        filter: `tournament_id=eq.${tournament.id}`,
      }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        setLiveParticipants(prev => prev.map(p =>
          p.id === updated.id ? {
            ...p,
            metadata: (updated.metadata as Record<string, unknown>) || p.metadata,
          } : p
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournament.id])

  // Live game scores: Supabase Realtime subscription (replaces polling)
  // When game scores change in the DB (via Apps Script, GitHub Actions, or manual refresh),
  // Supabase pushes the update to all connected clients instantly. Zero Vercel CPU.
  const [liveGames, setLiveGames] = useState(games)
  useEffect(() => { setLiveGames(games) }, [games])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`pool-games-${tournament.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_games',
        filter: `tournament_id=eq.${tournament.id}`,
      }, (payload) => {
        const g = payload.new as Record<string, unknown>
        setLiveGames(prev => prev.map(existing =>
          existing.id === g.id ? {
            ...existing,
            participant1Id: g.participant_1_id as string | null,
            participant2Id: g.participant_2_id as string | null,
            participant1Score: g.participant_1_score as number | null,
            participant2Score: g.participant_2_score as number | null,
            status: g.status as string,
            result: g.result as Record<string, unknown> | null,
            period: g.period as string | null,
            clock: g.clock as string | null,
            liveStatus: g.live_status as string | null,
            winnerId: g.winner_id as string | null,
          } : existing
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournament.id])

  // One-time stale check on page load: only for bracket/pickem with live games.
  // Roster pools rely on the gameday sync cron (every 5 min) + Supabase Realtime
  // to push fresh data — no per-user API call needed at scale.
  useEffect(() => {
    const hasLive = liveGames.some(g => g.status === 'live')
    const hasUpcoming = liveGames.some(g =>
      g.status === 'scheduled' && new Date(g.startsAt).getTime() - Date.now() < 15 * 60 * 1000
    )
    if (!hasLive && !hasUpcoming) return

    fetch(`/api/events/live-scores?tournamentId=${tournament.id}`).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab)
    const url = tab === 'overview' ? window.location.pathname : `${window.location.pathname}?tab=${tab}`
    router.replace(url, { scroll: false })
  }

  // Effective format: pool.gameType takes precedence over tournament.format for multi-format tournaments
  const effectiveFormat = pool.gameType || tournament.format

  // View another user's bracket
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null)
  const viewingMember = viewingEntryId ? liveMembers.find(m => m.id === viewingEntryId) : null

  // Multi-entry state
  const [activeEntryIndex, setActiveEntryIndex] = useState(0)
  const activeEntry = userEntries[activeEntryIndex] ?? null

  // Combined pick IDs across all of the current user's entries (for TeeTimesCard "My Roster" view).
  const myRosterPickIds = useMemo(() => {
    if (!allRosterPicks) return []
    const ids = new Set<string>()
    for (const entry of userEntries) {
      const picks = allRosterPicks[entry.id] || []
      for (const pid of picks) ids.add(pid)
    }
    return Array.from(ids)
  }, [userEntries, allRosterPicks])

  // Tournament cut rule from config (for Projected Cut Tracker — golf only)
  const cutRule = useMemo<CutRule>(() => {
    const cfg = (tournament.config || {}) as Record<string, unknown>
    const raw = cfg.cut_rule as Record<string, unknown> | undefined
    if (!raw || typeof raw !== 'object') return null
    if (raw.type === 'top_n_and_ties' && typeof raw.n === 'number') {
      return { type: 'top_n_and_ties', n: raw.n }
    }
    if (raw.type === 'stroke_limit' && typeof raw.strokes === 'number') {
      return { type: 'stroke_limit', strokes: raw.strokes }
    }
    return null
  }, [tournament.config])

  // Masters awards: pimento cheese (best round) + crow's nest (worst round)
  const isMasters = tournament.sport === 'golf' && (tournament.slug?.startsWith('masters') ?? false)
  const mastersAwards = useMemo(() => {
    if (!isMasters || !allRosterPicks || effectiveFormat !== 'roster') return undefined
    const countBest = (pool.scoringRules?.count_best as number) || 5
    const entryInfos = liveMembers.map(m => ({
      id: m.id,
      displayName: m.displayName,
      entryName: m.entryName,
      score: m.score,
    }))
    return computeAllMastersAwards(entryInfos, allRosterPicks, liveParticipants, countBest)
  }, [isMasters, allRosterPicks, effectiveFormat, pool.scoringRules, liveMembers, liveParticipants])

  // Masters: Sunday Roar — detect eagles, birdie runs, big moves
  const sundayRoar = useSundayRoar({
    participants: isMasters ? liveParticipants : [],
    allRosterPicks,
    poolId: isMasters ? pool.id : undefined,
    tournamentId: isMasters ? tournament.id : undefined,
  })

  // Masters: detect pool winner for Green Jacket ceremony
  const mastersWinner = useMemo(() => {
    if (!isMasters || tournament.status !== 'completed' || liveMembers.length === 0) return null
    const sorted = [...liveMembers].sort((a, b) => a.score - b.score)
    // Only award if clear winner (no tie in top 2)
    if (sorted.length >= 2 && sorted[0].score === sorted[1].score) return null
    return sorted[0]
  }, [isMasters, tournament.status, liveMembers])

  const activeEntryPicks = activeEntry ? (userPicksByEntry[activeEntry.id] || []) : []
  const hasAnyEntry = userEntries.length > 0
  const canAddEntry = hasAnyEntry && userEntries.length < pool.maxEntriesPerUser && pool.status === 'open'

  const handleAddEntry = async () => {
    try {
      const res = await fetch(`/api/events/pools/${pool.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        addToast('New entry created!', 'success')
        router.refresh()
      } else {
        const data = await res.json()
        addToast(data.error || 'Couldn\'t add entry. Try again.', 'error')
      }
    } catch {
      addToast('Something went wrong', 'error')
    }
  }

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(pool.inviteCode)
      setCodeCopied(true)
      addToast('Invite code copied!', 'success')
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      addToast('Couldn\'t copy. Try again.', 'error')
    }
  }

  const tabs: { key: Tab; label: string; requiresMember?: boolean }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'picks', label: effectiveFormat === 'bracket'
      ? (userEntries.length > 1 ? `My Brackets (${userEntries.length})` : 'My Bracket')
      : effectiveFormat === 'roster'
        ? (((pool.scoringRules?.draft_mode as string) === 'snake_draft' || (pool.scoringRules?.draft_mode as string) === 'linear_draft') ? 'Draft Room' : 'My Roster')
      : 'My Picks', requiresMember: true },
    { key: 'schedule', label: effectiveFormat === 'roster' ? 'Leaderboard' : 'Schedule' },
    ...(tournament.sport === 'golf' && tournament.slug === 'masters-2026' ? [{ key: 'course' as Tab, label: 'Course' }] : []),
    { key: 'members', label: `Members (${uniqueMembers.length})` },
    { key: 'settings' as Tab, label: 'Settings' },
  ]

  return (
    <div>
      {/* Pool Header */}
      <div className="bg-surface rounded-lg border border-border p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="brand-h2 text-xl sm:text-2xl text-text-primary">{pool.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                pool.status === 'open' ? 'bg-success/20 text-success-text' :
                pool.status === 'locked' ? 'bg-warning/20 text-warning-text' :
                'bg-surface-inset text-text-muted'
              }`}>
                {pool.status}
              </span>
              {isCreator && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning-text">Creator</span>
              )}
            </div>
            <p className="text-text-muted text-sm">
              {tournament.name} &middot; {uniqueMembers.length} member{uniqueMembers.length !== 1 ? 's' : ''}
              {pool.maxEntries && ` / ${pool.maxEntries} max`}
            </p>
          </div>

          {/* Invite Code + Share */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-surface-inset rounded-md px-3 py-1.5 border border-border">
              <span className="text-xs text-text-muted mr-1">Code:</span>
              <span className="font-mono text-sm text-text-primary tracking-wider">{pool.inviteCode}</span>
            </div>
            <button
              onClick={copyInviteCode}
              className="text-xs px-2 py-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-brand/40 transition-colors"
            >
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
            <ShareButton
              shareData={{
                title: `Join ${pool.name} on Rivyls`,
                text: `Join my ${effectiveFormat} pool "${pool.name}" for ${tournament.name}! Use code: ${pool.inviteCode}`,
                url: `https://rivyls.com/events/${tournament.slug}/pools/${pool.id}`,
              }}
              ogImageUrl={`https://rivyls.com/api/og/pool?poolId=${pool.id}`}
              label="Share"
              className="text-xs px-2 py-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-brand/40 transition-colors flex items-center gap-1"
            />
          </div>
        </div>

        {/* Status info */}
        {pool.deadline && (
          <div className="mt-3 text-xs text-text-muted">
            Deadline: {new Date(pool.deadline).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
            })}
          </div>
        )}
        {!pool.deadline && (
          <div className="mt-3 text-xs text-text-muted">
            Locks at first game: {new Date(tournament.startsAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
            })}
          </div>
        )}
      </div>

      {/* Not a member — join button or post-join school prompt */}
      {isLoggedIn && !hasAnyEntry && pool.status === 'open' && !showSchoolPrompt && (
        <div className="bg-surface border-2 border-brand rounded-lg p-5 mb-6 text-center">
          <p className="text-text-secondary text-sm mb-3">You&apos;re not in this pool yet.</p>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/events/pools', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inviteCode: pool.inviteCode }),
                })
                if (res.ok) {
                  addToast('Joined pool!', 'success')
                  if (!hasFavoriteSchool) {
                    setShowSchoolPrompt(true)
                  } else {
                    router.refresh()
                  }
                } else {
                  const data = await res.json()
                  addToast(data.error || 'Couldn\'t join pool. Try again.', 'error')
                }
              } catch {
                addToast('Couldn\'t join pool. Try again.', 'error')
              }
            }}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors"
          >
            Join Pool
          </button>
        </div>
      )}

      {showSchoolPrompt && (
        <div className="bg-surface border-2 border-brand rounded-lg p-5 mb-6 text-center">
          <h3 className="text-base font-semibold text-brand mb-1">You&apos;re in! Rep your school?</h3>
          <p className="text-text-secondary text-sm mb-4">Pick your alma mater or favorite school to join the Fan Zone.</p>
          <div className="max-w-sm mx-auto text-left">
            <SchoolPicker value={selectedSchoolId} onChange={setSelectedSchoolId} label="Pick your school" />
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={async () => {
                if (!selectedSchoolId) return
                setSavingSchool(true)
                try {
                  await fetch('/api/profile/favorite-school', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ schoolId: selectedSchoolId }),
                  })
                  addToast('School saved!', 'success')
                } catch {
                  // Non-critical — proceed anyway
                }
                router.refresh()
              }}
              disabled={!selectedSchoolId || savingSchool}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:opacity-50"
            >
              {savingSchool ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => router.refresh()}
              className="text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Start Your Bracket CTA — shown when member hasn't submitted picks */}
      {activeEntry && !activeEntry.submittedAt && pool.status === 'open' && activeTab !== 'picks' && (
        <div className="bg-surface border-2 border-brand rounded-lg p-5 mb-6 text-center">
          <h3 className="brand-h3 text-base text-brand mb-1">
            {effectiveFormat === 'bracket' ? 'Fill out your bracket!' :
             effectiveFormat === 'roster' ? 'Build your roster!' : 'Make your picks!'}
          </h3>
          <p className="text-text-secondary text-sm mb-3">
            {pool.deadline
              ? `${effectiveFormat === 'roster' ? 'Rosters' : 'Picks'} lock ${new Date(pool.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
              : `${effectiveFormat === 'roster' ? 'Rosters' : 'Picks'} lock at first tee time`
            }
          </p>
          <button
            onClick={() => setActiveTab('picks')}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors"
          >
            {effectiveFormat === 'bracket' ? 'Start Your Bracket' :
             effectiveFormat === 'roster' ? 'Build Your Roster' : 'Make Your Picks'}
          </button>
        </div>
      )}

      {/* Rules — structured highlights (with optional full markdown fallback) */}
      {rulesHighlights && rulesHighlights.length > 0 ? (
        <RulesHighlights
          highlights={rulesHighlights}
          rulesText={rulesText}
          tournamentName={tournament.name}
        />
      ) : rulesText && (
        <div className="mb-6">
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${showRules ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Tournament Rules
          </button>
          {showRules && (
            <div className="mt-2 bg-surface rounded-lg border border-border p-4 text-sm text-text-secondary [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1">
              {(() => {
                const lines = rulesText.split('\n')
                const elements: React.ReactNode[] = []
                let listItems: React.ReactNode[] = []
                let listType: 'ul' | 'ol' | null = null

                const flushList = () => {
                  if (listItems.length > 0) {
                    const key = `list-${elements.length}`
                    if (listType === 'ol') {
                      elements.push(<ol key={key} className="list-decimal pl-6 space-y-1">{listItems}</ol>)
                    } else {
                      elements.push(<ul key={key} className="list-disc pl-6 space-y-1">{listItems}</ul>)
                    }
                    listItems = []
                    listType = null
                  }
                }

                lines.forEach((line: string, i: number) => {
                  if (line.startsWith('## ')) { flushList(); elements.push(<h2 key={i}>{line.replace('## ', '')}</h2>) }
                  else if (line.startsWith('### ')) { flushList(); elements.push(<h3 key={i}>{line.replace('### ', '')}</h3>) }
                  else if (line.startsWith('- ')) { listType = listType || 'ul'; listItems.push(<li key={i}>{line.replace('- ', '')}</li>) }
                  else if (line.match(/^\d+\./)) { listType = listType || 'ol'; listItems.push(<li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>) }
                  else if (line.trim() === '') { flushList() }
                  else { flushList(); elements.push(<p key={i}>{line}</p>) }
                })
                flushList()
                return elements
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          // Hide member-only tabs if not a member
          if (tab.requiresMember && !hasAnyEntry) return null
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Countdown — pre-tournament or cut countdown for Masters golf */}
          {tournament.startsAt && new Date(tournament.startsAt).getTime() > Date.now() ? (
            <TournamentCountdown
              startsAt={tournament.startsAt}
              label="Tournament starts in"
              tournamentName={tournament.name}
            />
          ) : tournament.sport === 'golf' && tournament.slug?.startsWith('masters') && effectiveFormat === 'roster' && (
            <CutCountdown
              participants={liveParticipants}
              allRosterPicks={allRosterPicks}
              myRosterPickIds={myRosterPickIds}
              tournamentStatus={tournament.status}
              winner={mastersWinner ? (() => {
                const countBest = (pool.scoringRules?.count_best as number) || 5
                const picks = allRosterPicks?.[mastersWinner.id] || []
                const golfers = picks.map(pid => liveParticipants.find(p => p.id === pid)).filter(Boolean) as typeof liveParticipants
                const sorted = [...golfers].sort((a, b) => ((a.metadata?.score_to_par as number) ?? 999) - ((b.metadata?.score_to_par as number) ?? 999))
                const counting = sorted.slice(0, countBest)
                const roundScore = (round: 1|2|3|4) => {
                  let sum = 0, count = 0
                  for (const g of counting) {
                    const rtp = golferRoundToPar((g.metadata || {}) as Record<string, unknown>, round)
                    if (rtp != null) { sum += rtp; count++ }
                  }
                  return count > 0 ? sum : null
                }
                return {
                  name: mastersWinner.entryName || mastersWinner.displayName,
                  userId: mastersWinner.userId,
                  score: mastersWinner.score,
                  entryId: mastersWinner.id,
                  r1: roundScore(1), r2: roundScore(2), r3: roundScore(3), r4: roundScore(4),
                }
              })() : null}
              badgeIconUrl="/badges/green-jacket.svg"
              onReplayCeremony={() => {
                if (typeof window !== 'undefined') sessionStorage.removeItem('rivyls-green-jacket-shown')
                window.location.reload()
              }}
            />
          )}

          {/* Announcements */}
          <PoolAnnouncements poolId={pool.id} isCreator={isCreator} />

          {/* Tee Times — golf roster pools only (moves to My Roster for Masters) */}
          {effectiveFormat === 'roster' && tournament.sport === 'golf' && !isMasters && (
            <TeeTimesCard
              participants={liveParticipants}
              myRosterPicks={myRosterPickIds.length > 0 ? myRosterPickIds : null}
            />
          )}

          {/* Masters: Physical Augusta scoreboard on overview (top 10) */}
          {isMasters && effectiveFormat === 'roster' && (
            <MastersLeaderboard
              participants={liveParticipants}
              allRosterPicks={allRosterPicks}
              members={liveMembers}
              onShowAll={() => setActiveTab('schedule')}
            />
          )}

          {/* Rivalry Board — user standings */}
          <ErrorBoundary sectionName="Rivalry Board">
          {effectiveFormat === 'roster' ? (
            <RosterLeaderboard
              members={liveMembers}
              participants={liveParticipants}
              poolStatus={pool.status}
              scoringRules={pool.scoringRules}
              allRosterPicks={allRosterPicks}
              tournamentSlug={tournament.slug}
              mastersAwards={mastersAwards}
            />
          ) : (
            <Leaderboard
              members={liveMembers}
              format={effectiveFormat}
              poolStatus={pool.status}
              tiebreaker={pool.tiebreaker}
              onViewEntry={effectiveFormat === 'bracket' ? setViewingEntryId : undefined}
            />
          )}
          </ErrorBoundary>

          {/* Biggest Movers — golf roster pools (moves to Leaderboard tab for Masters) */}
          {effectiveFormat === 'roster' && tournament.sport === 'golf' && !isMasters && (
            <BiggestMovers participants={liveParticipants} />
          )}

          {/* Sunday Roar — always visible during R4 */}
          {isMasters && (
            <RoarFeed
              moments={sundayRoar.moments}
              muted={sundayRoar.muted}
              onToggleMute={sundayRoar.toggleMute}
              onReplay={sundayRoar.playRoar}
            />
          )}

          {/* Cut Status: R2 projected cut, R3 the cut, R4 hidden (CutCountdown handles top 10) */}
          {effectiveFormat === 'roster' && tournament.sport === 'golf' && cutRule && (
            isMasters
              ? <CutStatus participants={liveParticipants} cutRule={cutRule} />
              : <ProjectedCutTracker participants={liveParticipants} cutRule={cutRule} />
          )}

          {/* Player Ownership — golf roster pools (moves to Leaderboard tab for Masters) */}
          {effectiveFormat === 'roster' && !isMasters && rosterSelectionCounts && rosterTotalEntries !== undefined && userEntries.some(e => e.submittedAt) && allRosterPicks && (
            <PlayerOwnershipCard
              participants={liveParticipants}
              selectionCounts={rosterSelectionCounts}
              totalEntries={rosterTotalEntries}
              entries={liveMembers.map(m => ({
                id: m.id,
                displayName: m.displayName,
                entryName: m.entryName,
                userName: m.userName,
                score: m.score,
              }))}
              allRosterPicks={allRosterPicks}
            />
          )}

          {/* Activity Feed */}
          <ErrorBoundary sectionName="Activity Feed">
          <PoolActivityFeed poolId={pool.id} tournamentId={tournament.id} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'picks' && activeEntry && (
        <div>
          {/* Customize entry link — always visible */}
          <div className="flex items-center justify-end mb-2">
            <Link
              href={`/events/${tournament.slug}/pools/${pool.id}/edit-entry?entryId=${activeEntry.id}`}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Customize
            </Link>
          </div>

          {/* Entry selector */}
          {(userEntries.length > 1 || canAddEntry) && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {userEntries.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => setActiveEntryIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border whitespace-nowrap transition-colors ${
                    i === activeEntryIndex
                      ? 'border-brand bg-surface text-brand'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <EntryAvatar imageUrl={entry.imageUrl} primaryColor={entry.primaryColor} size="sm" />
                  {entry.displayName || `Entry ${i + 1}`}
                  {i === activeEntryIndex && (
                    <Link
                      href={`/events/${tournament.slug}/pools/${pool.id}/edit-entry?entryId=${entry.id}`}
                      className="text-text-muted hover:text-text-primary transition-colors"
                      title="Customize entry"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </Link>
                  )}
                </button>
              ))}
              {canAddEntry && (
                <button
                  onClick={handleAddEntry}
                  className="px-3 py-1.5 text-sm rounded-md border border-dashed border-border text-text-muted hover:text-brand hover:border-brand/40 transition-colors whitespace-nowrap"
                >
                  + Add Entry
                </button>
              )}
            </div>
          )}

          <GamePicker
            key={activeEntry?.id || 'no-entry'}
            format={effectiveFormat}
            pool={pool}
            tournament={tournament}
            activeEntry={activeEntry}
            participants={participants}
            games={liveGames}
            existingPicks={activeEntryPicks}
            poolWeeks={poolWeeks}
            members={members}
            isCreator={isCreator}
            rosterSelectionCounts={rosterSelectionCounts}
            rosterTotalEntries={rosterTotalEntries}
          />
        </div>
      )}

      {activeTab === 'schedule' && (
        effectiveFormat === 'roster' ? (
          <div className="space-y-6">
          <div className="bg-surface rounded-lg border border-border overflow-x-auto">
            <div className="min-w-[44rem]">
              <div className="grid grid-cols-[2rem_minmax(10rem,1fr)_2.5rem_4.5rem_2.5rem_2.5rem_2.5rem_2.5rem_3.5rem] gap-1 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide">
                <span className="text-right">#</span>
                <span>Golfer</span>
                <span className="text-center">Tier</span>
                <span className="text-center">Tee</span>
                <span className="text-center">R1</span>
                <span className="text-center">R2</span>
                <span className="text-center">R3</span>
                <span className="text-center">R4</span>
                <span className="text-right">Score</span>
              </div>
              {(() => {
                const allGolfers = [...liveParticipants]
                  .filter(p => p.metadata?.score_to_par != null || p.metadata?.status === 'active')

                // Derive cut from R1+R2 scores (client-side fallback when DB status is wrong).
                // If field is in R3+, a golfer is cut if their R1+R2 total exceeds the top-50 cut line.
                const maxFieldRound = Math.max(...allGolfers.map(p => ((p.metadata as Record<string, unknown>)?.current_round as number) || 0), 0)
                const cutN = cutRule?.type === 'top_n_and_ties' ? cutRule.n : 50
                let derivedCutScore: number | null = null
                if (maxFieldRound >= 3) {
                  const r2Totals = allGolfers
                    .map(p => {
                      const m = (p.metadata || {}) as Record<string, unknown>
                      const r1 = m.r1 as number | undefined
                      const r2 = m.r2 as number | undefined
                      return (typeof r1 === 'number' && typeof r2 === 'number') ? (r1 - 72) + (r2 - 72) : null
                    })
                    .filter((s): s is number => s !== null)
                    .sort((a, b) => a - b)
                  if (r2Totals.length > cutN) {
                    derivedCutScore = r2Totals[cutN - 1]
                  }
                }

                // A golfer is cut if: DB says 'cut' OR derived from R1+R2 scores
                function isGolferCut(p: typeof allGolfers[0]): boolean {
                  const m = (p.metadata || {}) as Record<string, unknown>
                  if (m.status === 'cut') return true
                  if (derivedCutScore == null || maxFieldRound < 3) return false
                  const r1 = m.r1 as number | undefined
                  const r2 = m.r2 as number | undefined
                  if (typeof r1 !== 'number' || typeof r2 !== 'number') return false
                  return (r1 - 72) + (r2 - 72) > derivedCutScore
                }

                // Sort: active first, then cut below
                const activeGolfers = allGolfers.filter(p => !isGolferCut(p))
                  .sort((a, b) => ((a.metadata?.score_to_par as number) ?? 999) - ((b.metadata?.score_to_par as number) ?? 999))
                const cutGolfers = allGolfers.filter(p => isGolferCut(p))
                  .sort((a, b) => ((a.metadata?.score_to_par as number) ?? 999) - ((b.metadata?.score_to_par as number) ?? 999))
                const hasCutGolfers = cutGolfers.length > 0
                const sortedGolfers = [...activeGolfers, ...cutGolfers]
                const cutLineAt = hasCutGolfers ? activeGolfers.length : null
                const COLLAPSE_LIMIT = isMasters ? 15 : sortedGolfers.length

                // Compute tie-aware positions (T1, T2, etc.)
                const positions: string[] = []
                let pos = 1
                for (let j = 0; j < sortedGolfers.length; j++) {
                  if (j > 0) {
                    const prevScore = ((sortedGolfers[j-1].metadata || {}) as Record<string, unknown>).score_to_par as number
                    const curScore = ((sortedGolfers[j].metadata || {}) as Record<string, unknown>).score_to_par as number
                    if (curScore !== prevScore) pos = j + 1
                  }
                  const isTied = sortedGolfers.some((g, k) => k !== j &&
                    ((g.metadata || {}) as Record<string, unknown>).score_to_par === ((sortedGolfers[j].metadata || {}) as Record<string, unknown>).score_to_par)
                  positions.push(isTied ? `T${pos}` : String(pos))
                }

                return sortedGolfers.map((p, i) => {
                  const meta = (p.metadata || {}) as Record<string, unknown>
                  const isCutGolfer = isGolferCut(p)
                  const scoreToPar = meta.score_to_par as number | null
                  const holes = (meta.holes as GolfHole[] | undefined) || []
                  const hasHoleData = holes.length > 0
                  const currentHole = meta.current_hole as number | null | undefined
                  const thru = meta.thru as number | null | undefined
                  const isExpanded = expandedGolferId === p.id
                  const tier = String(meta.tier || 'C')
                  const teeTimeIso = meta.tee_time as string | null | undefined
                  const teeLabel = (() => {
                    if (!teeTimeIso) return '—'
                    if (typeof thru === 'number' && thru >= 18) return 'Done'
                    try {
                      const d = new Date(teeTimeIso)
                      const day = d.toLocaleDateString('en-US', { weekday: 'short' })
                      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      return `${day} ${time}`
                    } catch {
                      return '—'
                    }
                  })()
                  const isHidden = !leaderboardExpanded && i >= COLLAPSE_LIMIT
                  const isAaronRai = isMasters && p.name.toLowerCase().includes('aaron rai')

                  return (
                    <div key={p.id} className={isHidden ? 'hidden' : ''}>
                      {/* Cut line divider — separates active from cut golfers */}
                      {cutLineAt != null && i === cutLineAt && (
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <div className="flex-1 border-t-2 border-dashed border-danger/50" />
                          <span className="text-[10px] font-bold text-danger-text uppercase tracking-wider">
                            {hasCutGolfers ? 'The Cut' : 'Projected Cut'} · {cutGolfers.length} missed
                          </span>
                          <div className="flex-1 border-t-2 border-dashed border-danger/50" />
                        </div>
                      )}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => hasHoleData && setExpandedGolferId(isExpanded ? null : p.id)}
                        className={`w-full grid grid-cols-[2rem_minmax(10rem,1fr)_2.5rem_4.5rem_2.5rem_2.5rem_2.5rem_2.5rem_3.5rem] gap-1 px-3 py-2 border-b border-border-subtle last:border-0 text-sm text-left transition-colors ${isCutGolfer ? 'opacity-50' : ''} ${hasHoleData ? 'hover:bg-surface-inset/40 cursor-pointer' : 'cursor-default'} ${isExpanded ? 'bg-surface-inset/30' : ''}`}
                      >
                        <span className="text-right text-text-muted">{positions[i]}</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {typeof meta.country_code === 'string' && (
                            <img
                              src={`https://flagcdn.com/24x18/${meta.country_code}.png`}
                              alt={String(meta.country || '')}
                              title={String(meta.country || '')}
                              width={18}
                              height={14}
                              className="inline-block shrink-0 rounded-[2px]"
                              loading="lazy"
                            />
                          )}
                          <span className="text-text-primary truncate">{p.name}</span>
                          {isCutGolfer && <span className="text-xs text-danger-text shrink-0">CUT</span>}
                          {isAaronRai && <Par3CurseBadge />}
                          {hasHoleData && (
                            <svg
                              className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                        <div className="text-center">
                          <span className={`text-[10px] px-1 py-0.5 rounded ${TIER_COLORS[tier]?.bg || 'bg-surface-inset'} ${TIER_COLORS[tier]?.text || 'text-text-muted'}`}>
                            {tier}
                          </span>
                        </div>
                        <span className="text-center text-[10px] text-text-muted tabular-nums">{teeLabel}</span>
                        {[1, 2, 3, 4].map(rd => {
                          const rtp = golferRoundToPar(meta, rd)
                          const isCutRound = isCutGolfer && rd > 2
                          return (
                            <span key={rd} className={`text-center ${isCutRound ? 'text-danger-text text-[10px]' : rtp != null && rtp < 0 ? 'text-success-text' : rtp != null && rtp > 0 ? 'text-danger-text' : 'text-text-secondary'}`}>
                              {isCutRound ? 'CUT' : rtp != null ? (rtp === 0 ? 'E' : rtp > 0 ? `+${rtp}` : String(rtp)) : '—'}
                            </span>
                          )
                        })}
                        <span className={`text-right font-medium ${
                          scoreToPar != null && scoreToPar < 0 ? 'text-success-text' :
                          scoreToPar != null && scoreToPar > 0 ? 'text-danger-text' :
                          'text-text-primary'
                        }`}>
                          {scoreToPar != null
                            ? scoreToPar === 0 ? 'E' : scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar)
                            : '—'}
                        </span>
                      </div>
                      {isExpanded && hasHoleData && (
                        <div className="px-4 py-3 bg-surface-inset/20 border-b border-border-subtle">
                          <GolfHoleGrid
                            holes={holes}
                            currentHole={currentHole ?? null}
                            thru={thru ?? null}
                            currentRound={(meta.current_round as number | null) ?? null}
                            label={p.name}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
              {/* Expand/collapse button for Masters */}
              {isMasters && (() => {
                const total = liveParticipants.filter(p => p.metadata?.score_to_par != null || p.metadata?.status === 'active').length
                if (total <= 15) return null
                return (
                  <button
                    type="button"
                    onClick={() => setLeaderboardExpanded(!leaderboardExpanded)}
                    className="w-full py-2 text-center text-xs text-brand hover:underline border-t border-border"
                  >
                    {leaderboardExpanded ? 'Show top 15' : `Show all ${total} golfers`}
                  </button>
                )
              })()}
              {liveParticipants.every(p => p.metadata?.score_to_par == null) && (
                <div className="p-6 text-center text-text-muted text-sm">
                  No scores yet. Leaderboard will update when the tournament begins.
                </div>
              )}
            </div>
          </div>

          {/* Masters: Biggest Movers + Player Ownership (moved from overview) */}
          {isMasters && (
            <BiggestMovers participants={liveParticipants} />
          )}
          {isMasters && rosterSelectionCounts && rosterTotalEntries !== undefined && userEntries.some(e => e.submittedAt) && allRosterPicks && (
            <PlayerOwnershipCard
              participants={liveParticipants}
              selectionCounts={rosterSelectionCounts}
              totalEntries={rosterTotalEntries}
              entries={liveMembers.map(m => ({
                id: m.id,
                displayName: m.displayName,
                entryName: m.entryName,
                userName: m.userName,
                score: m.score,
              }))}
              allRosterPicks={allRosterPicks}
            />
          )}
          </div>
        ) : (
          <ErrorBoundary sectionName="Schedule">
          <ScheduleView
            games={liveGames}
            participants={participants}
            format={effectiveFormat}
            tournamentId={tournament.id}
            sport={tournament.sport}
          />
          </ErrorBoundary>
        )
      )}

      {activeTab === 'course' && tournament.sport === 'golf' && (
        <ErrorBoundary sectionName="Course Map">
          <CourseMapContainer participants={liveParticipants} />
        </ErrorBoundary>
      )}

      {activeTab === 'members' && (
        <MembersTab members={uniqueMembers} poolId={pool.id} isCreator={isCreator} userId={userId} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          pool={pool}
          tournament={tournament}
          effectiveFormat={effectiveFormat}
          members={members}
          codeCopied={codeCopied}
          onCopyInviteCode={copyInviteCode}
          readOnly={!isCreator}
        />
      )}
      {/* View Bracket Modal */}
      {viewingEntryId && viewingMember && (
        <ViewBracketModal
          entryId={viewingEntryId}
          entryName={viewingMember.entryName || viewingMember.displayName}
          primaryColor={viewingMember.primaryColor}
          secondaryColor={viewingMember.secondaryColor}
          imageUrl={viewingMember.imageUrl}
          games={liveGames.map(g => ({
            id: g.id,
            round: g.round,
            gameNumber: g.gameNumber,
            participant1Id: g.participant1Id,
            participant2Id: g.participant2Id,
            participant1Score: g.participant1Score,
            participant2Score: g.participant2Score,
            startsAt: g.startsAt,
            status: g.status,
            result: g.result,
            winnerId: g.winnerId,
            period: g.period,
            clock: g.clock,
          }))}
          participants={participants}
          scoringRules={pool.scoringRules as Record<string, number>}
          tiebreakerPrediction={viewingMember.tiebreakerPrediction}
          score={viewingMember.score}
          onClose={() => setViewingEntryId(null)}
        />
      )}

      {/* Masters: Sunday Roar overlay (root level so fixed positioning works) */}
      {isMasters && <RoarOverlay moment={sundayRoar.overlayMoment} onDismiss={sundayRoar.dismissOverlay} />}

      {/* Masters: Green Jacket Ceremony for pool winner */}
      {mastersWinner && (
        <GreenJacketCeremony winnerName={mastersWinner.entryName || mastersWinner.displayName} />
      )}
    </div>
  )
}
