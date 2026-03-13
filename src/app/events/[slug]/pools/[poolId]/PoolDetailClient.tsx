'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { BracketPicker } from './BracketPicker'
import { SurvivorPicker } from './SurvivorPicker'
import { PickemPicker } from './PickemPicker'
import { RosterPicker } from './RosterPicker'
import { RosterDraftRoom } from './RosterDraftRoom'
import { Leaderboard } from './Leaderboard'
import { RosterLeaderboard } from './RosterLeaderboard'
import { PoolActivityFeed } from './PoolActivityFeed'
import { PoolChat } from './PoolChat'
import { PoolAnnouncements } from './PoolAnnouncements'
import { ScheduleView } from './ScheduleView'
import { ShareButton } from '@/components/ShareButton'

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
  displayName: string
  isActive: boolean
  submittedAt: string | null
  score: number
  maxPossible: number
  rank: number | null
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

const tiebreakerLabels: Record<string, string> = {
  none: 'None',
  championship_score: 'Championship score',
  first_match_score: 'First match score',
  most_upsets: 'Most upsets',
  random: 'Random',
}

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
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showRules, setShowRules] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const { addToast } = useToast()
  const { confirm } = useConfirm()
  const router = useRouter()

  // Effective format: pool.gameType takes precedence over tournament.format for multi-format tournaments
  const effectiveFormat = pool.gameType || tournament.format

  // Multi-entry state
  const [activeEntryIndex, setActiveEntryIndex] = useState(0)
  const activeEntry = userEntries[activeEntryIndex] ?? null
  const activeEntryPicks = activeEntry ? (userPicksByEntry[activeEntry.id] || []) : []
  const hasAnyEntry = userEntries.length > 0
  const canAddEntry = hasAnyEntry && userEntries.length < pool.maxEntriesPerUser && pool.status === 'open'

  // Roster settings state
  const rosterRules = (pool.scoringRules || {}) as Record<string, unknown>
  const [settingsDraftMode, setSettingsDraftMode] = useState<string>(
    (rosterRules.draft_mode as string) || 'open'
  )
  const [settingsSelectionCap, setSettingsSelectionCap] = useState(
    String((rosterRules.selection_cap as number) || 3)
  )
  const [settingsRosterSize, setSettingsRosterSize] = useState(
    String((rosterRules.roster_size as number) || 7)
  )
  const [settingsCountBest, setSettingsCountBest] = useState(
    String((rosterRules.count_best as number) || 5)
  )
  const [settingsCutPenalty, setSettingsCutPenalty] = useState<string>(
    (rosterRules.cut_penalty as string) || 'highest_plus_one'
  )

  // Settings state
  const [settingsName, setSettingsName] = useState(pool.name)
  const [settingsVisibility, setSettingsVisibility] = useState(pool.visibility)
  const [settingsTiebreaker, setSettingsTiebreaker] = useState(pool.tiebreaker)
  const [settingsMaxEntries, setSettingsMaxEntries] = useState(pool.maxEntries?.toString() || '')
  const [settingsMaxEntriesPerUser, setSettingsMaxEntriesPerUser] = useState(pool.maxEntriesPerUser.toString())
  const defaultScoringRules: Record<string, number> = { regional_quarterfinal: 2, regional_final: 4, semifinal: 8, championship: 16 }
  const initialScoringRules = pool.scoringRules && typeof pool.scoringRules === 'object' && Object.keys(pool.scoringRules).length > 0
    ? pool.scoringRules as Record<string, number>
    : defaultScoringRules
  const [settingsScoringRules, setSettingsScoringRules] = useState<Record<string, number>>({ ...initialScoringRules })
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const hasUnsavedChanges = activeTab === 'settings' && (
    settingsName !== pool.name ||
    settingsVisibility !== pool.visibility ||
    settingsTiebreaker !== pool.tiebreaker ||
    settingsMaxEntries !== (pool.maxEntries?.toString() || '') ||
    settingsMaxEntriesPerUser !== pool.maxEntriesPerUser.toString() ||
    JSON.stringify(settingsScoringRules) !== JSON.stringify(initialScoringRules)
  )

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  const handleTabChange = useCallback(async (tab: Tab) => {
    if (activeTab === 'settings' && hasUnsavedChanges) {
      const ok = await confirm({ title: 'Unsaved changes', message: 'You have unsaved settings changes. Discard them?' })
      if (!ok) return
    }
    setActiveTab(tab)
  }, [activeTab, hasUnsavedChanges, confirm])

  // Scoring presets for bracket format
  const scoringPresets: Record<string, { label: string; description: string; rules: Record<string, number> }> = {
    standard: {
      label: 'Standard',
      description: 'Balanced scoring across all rounds',
      rules: { regional_quarterfinal: 2, regional_final: 4, semifinal: 8, championship: 16 },
    },
    upset_heavy: {
      label: 'Upset Heavy',
      description: 'Early rounds worth more — rewards bold picks',
      rules: { regional_quarterfinal: 4, regional_final: 5, semifinal: 8, championship: 12 },
    },
    final_four_focus: {
      label: 'Final Four Focus',
      description: 'Late rounds heavily weighted',
      rules: { regional_quarterfinal: 1, regional_final: 2, semifinal: 12, championship: 24 },
    },
  }

  const roundLabels: Record<string, string> = {
    regional_quarterfinal: 'Quarterfinal',
    regional_final: 'Regional Final',
    semifinal: 'Frozen Four',
    championship: 'Championship',
  }

  const activeScoringRules = settingsScoringRules

  const activePreset = Object.entries(scoringPresets).find(
    ([, preset]) => JSON.stringify(preset.rules) === JSON.stringify(activeScoringRules)
  )?.[0] || 'custom'

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
        addToast(data.error || 'Failed to add entry', 'error')
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
      addToast('Failed to copy', 'error')
    }
  }

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const res = await fetch(`/api/events/pools/${pool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName.trim(),
          visibility: settingsVisibility,
          tiebreaker: settingsTiebreaker,
          maxEntries: settingsMaxEntries ? parseInt(settingsMaxEntries, 10) : null,
          maxEntriesPerUser: parseInt(settingsMaxEntriesPerUser, 10) || 1,
          ...(effectiveFormat === 'bracket' ? { scoringRules: settingsScoringRules ?? {} } : {}),
          ...(effectiveFormat === 'roster' ? {
            scoringRules: {
              ...pool.scoringRules,
              draft_mode: settingsDraftMode,
              ...(settingsDraftMode === 'limited' ? { selection_cap: parseInt(settingsSelectionCap, 10) || 3 } : {}),
              roster_size: parseInt(settingsRosterSize, 10) || 7,
              count_best: parseInt(settingsCountBest, 10) || 5,
              cut_penalty: settingsCutPenalty,
            },
          } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to save settings', 'error')
        return
      }

      addToast('Settings saved', 'success')
      router.refresh()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSavingSettings(false)
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

      {/* Not a member notice */}
      {isLoggedIn && !hasAnyEntry && pool.status === 'open' && (
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 mb-6 text-center">
          <p className="text-text-secondary text-sm mb-2">You&apos;re not in this pool yet.</p>
          <p className="text-text-muted text-xs">Use invite code <span className="font-mono font-medium text-brand">{pool.inviteCode}</span> to join from the event page.</p>
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
              onClick={() => handleTabChange(tab.key)}
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

          {/* Leaderboard */}
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
            />
          )}

          {/* Chat (members only) */}
          {hasAnyEntry && (
            <PoolChat poolId={pool.id} userId={userId} />
          )}

          {/* Activity Feed */}
          <PoolActivityFeed poolId={pool.id} tournamentId={tournament.id} />
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
                  className={`px-3 py-1.5 text-sm rounded-md border whitespace-nowrap transition-colors ${
                    i === activeEntryIndex
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                >
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

          {effectiveFormat === 'bracket' && (
            <BracketPicker
              entryId={activeEntry.id}
              tournamentId={tournament.id}
              poolId={pool.id}
              poolStatus={pool.status}
              games={games}
              participants={participants}
              existingPicks={activeEntryPicks}
              tiebreakerType={pool.tiebreaker}
              existingTiebreaker={activeEntry.tiebreakerPrediction}
              submittedAt={activeEntry.submittedAt}
              scoringRules={pool.scoringRules}
            />
          )}
          {effectiveFormat === 'survivor' && (
            <SurvivorPicker
              entryId={activeEntry.id}
              tournamentId={tournament.id}
              poolId={pool.id}
              poolStatus={pool.status}
              participants={participants}
              existingPicks={activeEntryPicks}
              poolWeeks={poolWeeks}
              isActive={activeEntry.isActive}
              games={games}
            />
          )}
          {effectiveFormat === 'pickem' && (
            <PickemPicker
              entryId={activeEntry.id}
              tournamentId={tournament.id}
              poolId={pool.id}
              poolStatus={pool.status}
              games={games}
              participants={participants}
              existingPicks={activeEntryPicks}
              submittedAt={activeEntry.submittedAt}
            />
          )}
          {effectiveFormat === 'roster' && (
            (() => {
              const draftMode = (pool.scoringRules?.draft_mode as string) || 'open'
              if (draftMode === 'snake_draft' || draftMode === 'linear_draft') {
                return (
                  <RosterDraftRoom
                    poolId={pool.id}
                    tournamentId={tournament.id}
                    participants={participants}
                    entries={members.map(m => ({ id: m.id, displayName: m.displayName }))}
                    userEntryId={activeEntry.id}
                    isCreator={isCreator}
                    scoringRules={pool.scoringRules}
                  />
                )
              }
              return (
                <RosterPicker
                  entryId={activeEntry.id}
                  tournamentId={tournament.id}
                  poolId={pool.id}
                  poolStatus={pool.status}
                  participants={participants}
                  existingPicks={activeEntryPicks}
                  submittedAt={activeEntry.submittedAt}
                  scoringRules={pool.scoringRules}
                  deadline={pool.deadline}
                  selectionCounts={rosterSelectionCounts}
                />
              )
            })()
          )}
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
          <ScheduleView
            games={games}
            participants={participants}
            format={effectiveFormat}
            tournamentId={tournament.id}
            sport={tournament.sport}
          />
        )
      )}

      {activeTab === 'members' && (
        <div className="space-y-2">
          {members.map((member, i) => (
            <div
              key={member.id}
              className="bg-surface rounded-lg border border-border p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-sm w-6 text-right">{i + 1}</span>
                <div>
                  {member.userId ? (
                    <Link href={`/profile/${member.userId}`} className="text-text-primary text-sm font-medium hover:underline">{member.displayName}</Link>
                  ) : (
                    <span className="text-sm text-text-muted italic">{member.displayName}</span>
                  )}
                  {!member.isActive && (
                    <span className="ml-2 text-xs text-danger-text">Eliminated</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {member.submittedAt ? (
                  <span className="text-xs text-success-text">Picks in</span>
                ) : (
                  <span className="text-xs text-text-muted">No picks yet</span>
                )}
                {isCreator && member.userId !== userId && (
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: 'Remove member', message: `Remove ${member.displayName} from the pool?`, variant: 'danger', confirmLabel: 'Remove' })
                      if (!ok) return
                      try {
                        const res = await fetch(`/api/events/pools/${pool.id}/members/${member.id}`, { method: 'DELETE' })
                        if (res.ok) {
                          addToast('Member removed', 'success')
                          router.refresh()
                        } else {
                          const data = await res.json()
                          addToast(data.error || 'Failed to remove', 'error')
                        }
                      } catch {
                        addToast('Something went wrong', 'error')
                      }
                    }}
                    className="text-[10px] text-text-muted hover:text-danger-text transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'settings' && isCreator && (
        <div className="space-y-6">
          <div className="bg-surface rounded-lg border border-border p-5">
            <h3 className="brand-h3 text-base text-text-primary mb-4">Pool Settings</h3>
            <div className="space-y-4">
              {/* Pool Name */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Pool Name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  maxLength={60}
                  className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsVisibility('private')}
                    className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                      settingsVisibility === 'private'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsVisibility('public')}
                    className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                      settingsVisibility === 'public'
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    Public
                  </button>
                </div>
              </div>

              {/* Tiebreaker */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Tiebreaker</label>
                <select
                  value={settingsTiebreaker}
                  onChange={(e) => setSettingsTiebreaker(e.target.value)}
                  className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  {Object.entries(tiebreakerLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Max Entries */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Max Entries</label>
                <input
                  type="number"
                  value={settingsMaxEntries}
                  onChange={(e) => setSettingsMaxEntries(e.target.value)}
                  placeholder="Unlimited"
                  min={2}
                  max={1000}
                  className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              {/* Entries Per User */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Entries Per User</label>
                <select
                  value={settingsMaxEntriesPerUser}
                  onChange={(e) => setSettingsMaxEntriesPerUser(e.target.value)}
                  className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  <option value="1">1 (standard)</option>
                  <option value="3">Up to 3</option>
                  <option value="5">Up to 5</option>
                  <option value="10">Up to 10</option>
                </select>
                <p className="text-xs text-text-muted mt-1">How many entries each user can submit</p>
              </div>

              {/* Roster Settings */}
              {effectiveFormat === 'roster' && (
                <div className="space-y-4">
                  <label className="block text-xs text-text-muted mb-2">Roster Settings</label>

                  {/* Draft Mode */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Draft Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'open', label: 'Open Pick', desc: 'Everyone picks independently' },
                        { value: 'limited', label: 'Limited Pick', desc: 'Shared picks with cap' },
                        { value: 'snake_draft', label: 'Snake Draft', desc: 'Reverses each round' },
                        { value: 'linear_draft', label: 'Linear Draft', desc: 'Same order each round' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSettingsDraftMode(opt.value)}
                          className={`text-left text-xs py-2 px-3 rounded-md border transition-colors ${
                            settingsDraftMode === opt.value
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-border text-text-muted hover:text-text-secondary'
                          }`}
                        >
                          <span className="block font-medium">{opt.label}</span>
                          <span className="block text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selection Cap (limited only) */}
                  {settingsDraftMode === 'limited' && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Selection Cap</label>
                      <select
                        value={settingsSelectionCap}
                        onChange={(e) => setSettingsSelectionCap(e.target.value)}
                        className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                      >
                        {[2, 3, 4, 5, 6, 8, 10].map(n => (
                          <option key={n} value={String(n)}>Max {n} entries per golfer</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Roster Size + Count Best */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Roster Size</label>
                      <select
                        value={settingsRosterSize}
                        onChange={(e) => setSettingsRosterSize(e.target.value)}
                        className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                      >
                        {[5, 6, 7, 8, 10].map(n => (
                          <option key={n} value={String(n)}>{n} golfers</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Count Best</label>
                      <select
                        value={settingsCountBest}
                        onChange={(e) => setSettingsCountBest(e.target.value)}
                        className="w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
                      >
                        {Array.from({ length: parseInt(settingsRosterSize, 10) || 7 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={String(n)}>Best {n} of {settingsRosterSize}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cut Penalty */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Cut Penalty</label>
                    <div className="flex gap-2">
                      {([
                        { value: 'highest_plus_one', label: 'Field High +1' },
                        { value: 'none', label: 'No Penalty' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSettingsCutPenalty(opt.value)}
                          className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                            settingsCutPenalty === opt.value
                              ? 'border-brand bg-brand/10 text-brand'
                              : 'border-border text-text-muted hover:text-text-secondary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Scoring Rules (bracket only) */}
              {effectiveFormat === 'bracket' && (
                <div>
                  <label className="block text-xs text-text-muted mb-2">Scoring Rules</label>

                  {/* Preset buttons */}
                  <div className="flex gap-2 mb-3">
                    {Object.entries(scoringPresets).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSettingsScoringRules({ ...preset.rules })}
                        className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                          activePreset === key
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {/* no-op — values stay as-is, user edits below */}}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                        activePreset === 'custom'
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {activePreset === 'custom' ? (
                    <p className="text-xs text-text-muted mb-2">
                      Custom scoring — adjust individual round values below.
                    </p>
                  ) : activePreset !== 'standard' && (
                    <p className="text-xs text-text-muted mb-2">
                      {scoringPresets[activePreset]?.description}
                    </p>
                  )}

                  {/* Per-round point values */}
                  <div className="space-y-2 bg-surface-inset rounded-md p-3 border border-border">
                    {Object.entries(roundLabels).map(([roundKey, label]) => (
                      <div key={roundKey} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-text-secondary">{label}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={activeScoringRules[roundKey] ?? 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0
                              setSettingsScoringRules((prev) => ({
                                ...prev,
                                [roundKey]: Math.max(0, Math.min(100, val)),
                              }))
                            }}
                            className="w-16 bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-brand/50"
                          />
                          <span className="text-xs text-text-muted">pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings || !settingsName.trim()}
                className="w-full py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Share / Invite */}
          <div className="bg-surface rounded-lg border border-border p-5">
            <h3 className="brand-h3 text-base text-text-primary mb-3">Invite Members</h3>
            <p className="text-text-muted text-sm mb-3">
              Share this code or link with friends to invite them to your pool.
            </p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-surface-inset border border-border rounded-md px-4 py-2.5 text-center">
                <span className="font-mono text-lg text-text-primary tracking-widest">{pool.inviteCode}</span>
              </div>
              <button
                onClick={copyInviteCode}
                className="px-4 py-2.5 text-sm font-medium rounded-md bg-brand hover:bg-brand-hover text-text-primary transition-colors"
              >
                {codeCopied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton
                shareData={{
                  title: `Join ${pool.name} on Rivyls`,
                  text: `Join my ${effectiveFormat} pool "${pool.name}" for ${tournament.name}! Use code: ${pool.inviteCode}`,
                  url: `https://rivyls.com/events/${tournament.slug}/pools/${pool.id}`,
                }}
                ogImageUrl={`https://rivyls.com/api/og/pool?poolId=${pool.id}`}
              />
            </div>
          </div>

          {/* Pool Info */}
          <div className="bg-surface rounded-lg border border-border p-5">
            <h3 className="brand-h3 text-base text-text-primary mb-3">Pool Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Format</span>
                <span className="text-text-secondary capitalize">{effectiveFormat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Status</span>
                <span className="text-text-secondary capitalize">{pool.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Members</span>
                <span className="text-text-secondary">{members.length}{pool.maxEntries ? ` / ${pool.maxEntries}` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Tiebreaker</span>
                <span className="text-text-secondary">{tiebreakerLabels[pool.tiebreaker] || pool.tiebreaker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Lock Time</span>
                <span className="text-text-secondary">
                  {new Date(pool.deadline || tournament.startsAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
