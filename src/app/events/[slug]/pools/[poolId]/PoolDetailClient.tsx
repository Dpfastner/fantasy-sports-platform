'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { BracketPicker } from './BracketPicker'
import { SurvivorPicker } from './SurvivorPicker'
import { PickemPicker } from './PickemPicker'
import { Leaderboard } from './Leaderboard'
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
  userId: string
  displayName: string
  isActive: boolean
  submittedAt: string | null
  score: number
  rank: number | null
}

interface UserEntry {
  id: string
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
  userEntry: UserEntry | null
  userPicks: UserPick[]
  poolWeeks: PoolWeek[]
  isLoggedIn: boolean
  isCreator: boolean
  userId: string | null
  rulesText: string | null
}

type Tab = 'picks' | 'schedule' | 'leaderboard' | 'chat' | 'activity' | 'members' | 'settings'

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
  userEntry,
  userPicks,
  poolWeeks,
  isLoggedIn,
  isCreator,
  userId,
  rulesText,
}: PoolDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>(userEntry ? 'picks' : 'leaderboard')
  const [showRules, setShowRules] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  // Settings state
  const [settingsName, setSettingsName] = useState(pool.name)
  const [settingsVisibility, setSettingsVisibility] = useState(pool.visibility)
  const [settingsTiebreaker, setSettingsTiebreaker] = useState(pool.tiebreaker)
  const [settingsMaxEntries, setSettingsMaxEntries] = useState(pool.maxEntries?.toString() || '')
  const [settingsScoringRules, setSettingsScoringRules] = useState<Record<string, number> | null>(
    pool.scoringRules && typeof pool.scoringRules === 'object' && Object.keys(pool.scoringRules).length > 0
      ? pool.scoringRules as Record<string, number>
      : null
  )
  const [isSavingSettings, setIsSavingSettings] = useState(false)

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

  const defaultScoringRules: Record<string, number> = {
    regional_quarterfinal: 2, regional_final: 4, semifinal: 8, championship: 16,
  }

  const activeScoringRules = settingsScoringRules || defaultScoringRules

  const activePreset = Object.entries(scoringPresets).find(
    ([, preset]) => JSON.stringify(preset.rules) === JSON.stringify(activeScoringRules)
  )?.[0] || 'custom'

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
          ...(tournament.format === 'bracket' ? { scoringRules: settingsScoringRules } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to save settings', 'error')
        return
      }

      addToast('Settings saved', 'success')
      router.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const tabs: { key: Tab; label: string; requiresMember?: boolean }[] = [
    { key: 'picks', label: tournament.format === 'bracket' ? 'My Bracket' : 'My Picks', requiresMember: true },
    { key: 'schedule', label: 'Schedule' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'chat', label: 'Chat', requiresMember: true },
    { key: 'activity', label: 'Activity' },
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

          {/* Invite Code + Share */}
          <div className="flex items-center gap-2">
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
                text: `Join my ${tournament.format} pool "${pool.name}" for ${tournament.name}! Use code: ${pool.inviteCode}`,
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

      {/* Announcements (always visible at top) */}
      <PoolAnnouncements poolId={pool.id} isCreator={isCreator} />

      {/* Not a member notice */}
      {isLoggedIn && !userEntry && pool.status === 'open' && (
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 mb-6 text-center">
          <p className="text-text-secondary text-sm mb-2">You&apos;re not in this pool yet.</p>
          <p className="text-text-muted text-xs">Use invite code <span className="font-mono font-medium text-brand">{pool.inviteCode}</span> to join from the event page.</p>
        </div>
      )}

      {/* Start Your Bracket CTA — shown when member hasn't submitted picks */}
      {userEntry && !userEntry.submittedAt && pool.status === 'open' && activeTab !== 'picks' && (
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-5 mb-6 text-center">
          <h3 className="brand-h3 text-base text-text-primary mb-1">
            {tournament.format === 'bracket' ? 'Fill out your bracket!' : 'Make your picks!'}
          </h3>
          <p className="text-text-muted text-sm mb-3">
            {pool.deadline
              ? `Picks lock ${new Date(pool.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
              : `Picks lock at first game`
            }
          </p>
          <button
            onClick={() => setActiveTab('picks')}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-brand hover:bg-brand-hover text-text-primary transition-colors"
          >
            {tournament.format === 'bracket' ? 'Start Your Bracket' : 'Make Your Picks'}
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
          if (tab.requiresMember && !userEntry) return null
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
      {activeTab === 'picks' && userEntry && (
        <div>
          {tournament.format === 'bracket' && (
            <BracketPicker
              entryId={userEntry.id}
              tournamentId={tournament.id}
              poolId={pool.id}
              poolStatus={pool.status}
              games={games}
              participants={participants}
              existingPicks={userPicks}
              tiebreakerType={pool.tiebreaker}
              existingTiebreaker={userEntry.tiebreakerPrediction}
              submittedAt={userEntry.submittedAt}
              scoringRules={pool.scoringRules}
            />
          )}
          {tournament.format === 'survivor' && (
            <SurvivorPicker
              entryId={userEntry.id}
              tournamentId={tournament.id}
              poolId={pool.id}
              poolStatus={pool.status}
              participants={participants}
              existingPicks={userPicks}
              poolWeeks={poolWeeks}
              isActive={userEntry.isActive}
              games={games}
            />
          )}
          {tournament.format === 'pickem' && (
            <PickemPicker
              entryId={userEntry.id}
              tournamentId={tournament.id}
              poolId={pool.id}
              poolStatus={pool.status}
              games={games}
              participants={participants}
              existingPicks={userPicks}
              submittedAt={userEntry.submittedAt}
            />
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <ScheduleView
          games={games}
          participants={participants}
          format={tournament.format}
        />
      )}

      {activeTab === 'leaderboard' && (
        <Leaderboard
          members={members}
          format={tournament.format}
          poolStatus={pool.status}
        />
      )}

      {activeTab === 'chat' && userEntry && (
        <PoolChat poolId={pool.id} userId={userId} />
      )}

      {activeTab === 'activity' && (
        <PoolActivityFeed poolId={pool.id} tournamentId={tournament.id} />
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
                  <span className="text-text-primary text-sm font-medium">{member.displayName}</span>
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
                      if (!confirm(`Remove ${member.displayName} from the pool?`)) return
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

              {/* Scoring Rules (bracket only) */}
              {tournament.format === 'bracket' && (
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
                      onClick={() => setSettingsScoringRules(null)}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                        !settingsScoringRules
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      Default
                    </button>
                  </div>

                  {activePreset !== 'custom' && activePreset !== 'standard' && settingsScoringRules && (
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
                                ...(prev || defaultScoringRules),
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
                  text: `Join my ${tournament.format} pool "${pool.name}" for ${tournament.name}! Use code: ${pool.inviteCode}`,
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
                <span className="text-text-secondary capitalize">{tournament.format}</span>
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
