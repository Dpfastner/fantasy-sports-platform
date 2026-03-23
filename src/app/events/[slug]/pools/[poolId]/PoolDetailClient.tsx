'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import { GamePicker } from './GamePicker'
import { Leaderboard } from './Leaderboard'
import { RosterLeaderboard } from './RosterLeaderboard'
import { PoolActivityFeed } from './PoolActivityFeed'
import { PoolAnnouncements } from './PoolAnnouncements'
import { EntryAvatar } from '@/components/EntryAvatar'
import { ScheduleView } from './ScheduleView'
import { ShareButton } from '@/components/ShareButton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ViewBracketModal } from './ViewBracketModal'
import { MembersTab } from './MembersTab'
import { SettingsTab } from './SettingsTab'

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
  rosterSelectionCounts?: Record<string, number>
  /** All submitted entries' roster picks: entryId → participantIds */
  allRosterPicks?: Record<string, string[]>
}

type Tab = 'overview' | 'picks' | 'schedule' | 'members' | 'settings'

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
  rosterSelectionCounts,
  allRosterPicks,
}: PoolDetailClientProps) {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  const [activeTab, setActiveTabState] = useState<Tab>(initialTab)
  const [showRules, setShowRules] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab)
    const url = tab === 'overview' ? window.location.pathname : `${window.location.pathname}?tab=${tab}`
    router.replace(url, { scroll: false })
  }

  // Effective format: pool.gameType takes precedence over tournament.format for multi-format tournaments
  const effectiveFormat = pool.gameType || tournament.format

  // View another user's bracket
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null)
  const viewingMember = viewingEntryId ? members.find(m => m.id === viewingEntryId) : null

  // Multi-entry state
  const [activeEntryIndex, setActiveEntryIndex] = useState(0)
  const activeEntry = userEntries[activeEntryIndex] ?? null
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
    { key: 'members', label: `Members (${members.length})` },
    ...(isCreator ? [{ key: 'settings' as Tab, label: 'Settings' }] : []),
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
              {tournament.name} &middot; {members.length} member{members.length !== 1 ? 's' : ''}
              {pool.maxEntries && ` / ${pool.maxEntries} max`}
            </p>
          </div>

          {/* Invite Code + Share + Edit Entry */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeEntry && (
              <Link
                href={`/events/${tournament.slug}/pools/${pool.id}/edit-entry?entryId=${activeEntry.id}`}
                className="text-xs px-2 py-1.5 rounded-md border border-border text-text-muted hover:text-text-primary hover:border-brand/40 transition-colors"
              >
                Edit Entry
              </Link>
            )}
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

      {/* Not a member — join button */}
      {isLoggedIn && !hasAnyEntry && pool.status === 'open' && (
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-5 mb-6 text-center">
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
                  router.refresh()
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

      {/* Start Your Bracket CTA — shown when member hasn't submitted picks */}
      {activeEntry && !activeEntry.submittedAt && pool.status === 'open' && activeTab !== 'picks' && (
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-5 mb-6 text-center">
          <h3 className="brand-h3 text-base text-text-primary mb-1">
            {effectiveFormat === 'bracket' ? 'Fill out your bracket!' :
             effectiveFormat === 'roster' ? 'Build your roster!' : 'Make your picks!'}
          </h3>
          <p className="text-text-muted text-sm mb-3">
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

      {/* Rules (collapsible) */}
      {rulesText && (
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
            <div className="mt-2 bg-surface rounded-lg border border-border p-4 text-sm text-text-secondary whitespace-pre-wrap">
              {rulesText}
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
          {/* Announcements */}
          <PoolAnnouncements poolId={pool.id} isCreator={isCreator} />

          {/* Rivalry Board — user standings */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Rivalry Board</h3>
          </div>
          <ErrorBoundary sectionName="Rivalry Board">
          {effectiveFormat === 'roster' ? (
            <RosterLeaderboard
              members={members}
              participants={participants}
              poolStatus={pool.status}
              scoringRules={pool.scoringRules}
              allRosterPicks={allRosterPicks}
            />
          ) : (
            <Leaderboard
              members={members}
              format={effectiveFormat}
              poolStatus={pool.status}
              tiebreaker={pool.tiebreaker}
              onViewEntry={effectiveFormat === 'bracket' ? setViewingEntryId : undefined}
            />
          )}
          </ErrorBoundary>


          {/* Activity Feed */}
          <ErrorBoundary sectionName="Activity Feed">
          <PoolActivityFeed poolId={pool.id} tournamentId={tournament.id} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'picks' && activeEntry && (
        <div>
          {/* Entry selector */}
          {(userEntries.length > 1 || canAddEntry) && (
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {userEntries.map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => setActiveEntryIndex(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border whitespace-nowrap transition-colors ${
                    i === activeEntryIndex
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <EntryAvatar imageUrl={entry.imageUrl} primaryColor={entry.primaryColor} size="sm" />
                  {entry.displayName || `Entry ${i + 1}`}
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
            format={effectiveFormat}
            pool={pool}
            tournament={tournament}
            activeEntry={activeEntry}
            participants={participants}
            games={games}
            existingPicks={activeEntryPicks}
            poolWeeks={poolWeeks}
            members={members}
            isCreator={isCreator}
            rosterSelectionCounts={rosterSelectionCounts}
          />
        </div>
      )}

      {activeTab === 'schedule' && (
        effectiveFormat === 'roster' ? (
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_4rem] gap-1 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide">
              <span className="text-right">#</span>
              <span>Golfer</span>
              <span className="text-center">R1</span>
              <span className="text-center">R2</span>
              <span className="text-center">R3</span>
              <span className="text-center">R4</span>
              <span className="text-right">Score</span>
            </div>
            {[...participants]
              .filter(p => p.metadata?.score_to_par != null || p.metadata?.status === 'active')
              .sort((a, b) => {
                const aScore = (a.metadata?.score_to_par as number) ?? 999
                const bScore = (b.metadata?.score_to_par as number) ?? 999
                return aScore - bScore
              })
              .map((p, i) => {
                const meta = (p.metadata || {}) as Record<string, unknown>
                const isCut = String(meta.status || '') === 'cut'
                const scoreToPar = meta.score_to_par as number | null
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_4rem] gap-1 px-3 py-2 border-b border-border-subtle last:border-0 text-sm ${isCut ? 'opacity-50' : ''}`}
                  >
                    <span className="text-right text-text-muted">{i + 1}</span>
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
                      {isCut && <span className="text-xs text-danger-text shrink-0">CUT</span>}
                    </div>
                    <span className="text-center text-text-secondary">{meta.r1 != null ? String(meta.r1) : '—'}</span>
                    <span className="text-center text-text-secondary">{meta.r2 != null ? String(meta.r2) : '—'}</span>
                    <span className="text-center text-text-secondary">{meta.r3 != null ? String(meta.r3) : '—'}</span>
                    <span className="text-center text-text-secondary">{meta.r4 != null ? String(meta.r4) : '—'}</span>
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
                )
              })}
            {participants.every(p => p.metadata?.score_to_par == null) && (
              <div className="p-6 text-center text-text-muted text-sm">
                No scores yet. Leaderboard will update when the tournament begins.
              </div>
            )}
          </div>
        ) : (
          <ErrorBoundary sectionName="Schedule">
          <ScheduleView
            games={games}
            participants={participants}
            format={effectiveFormat}
            tournamentId={tournament.id}
            sport={tournament.sport}
          />
          </ErrorBoundary>
        )
      )}

      {activeTab === 'members' && (
        <MembersTab members={members} poolId={pool.id} isCreator={isCreator} userId={userId} />
      )}

      {activeTab === 'settings' && isCreator && (
        <SettingsTab
          pool={pool}
          tournament={tournament}
          effectiveFormat={effectiveFormat}
          members={members}
          codeCopied={codeCopied}
          onCopyInviteCode={copyInviteCode}
        />
      )}
      {/* View Bracket Modal */}
      {viewingEntryId && viewingMember && (
        <ViewBracketModal
          entryId={viewingEntryId}
          entryName={viewingMember.entryName || viewingMember.displayName}
          games={games.map(g => ({
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
    </div>
  )
}
