'use client'

import { useState } from 'react'
import { useToast } from '@/components/Toast'
import { BracketPicker } from './BracketPicker'
import { SurvivorPicker } from './SurvivorPicker'
import { PickemPicker } from './PickemPicker'
import { Leaderboard } from './Leaderboard'

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
  startsAt: string
  status: string
  result: Record<string, unknown> | null
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
}

type Tab = 'picks' | 'leaderboard' | 'members'

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
}: PoolDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>(userEntry ? 'picks' : 'leaderboard')
  const [codeCopied, setCodeCopied] = useState(false)
  const { addToast } = useToast()

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'picks', label: tournament.format === 'bracket' ? 'My Bracket' : tournament.format === 'survivor' ? 'My Picks' : 'My Picks' },
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'members', label: `Members (${members.length})` },
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
            </div>
            <p className="text-text-muted text-sm">
              {tournament.name} &middot; {members.length} member{members.length !== 1 ? 's' : ''}
              {pool.maxEntries && ` / ${pool.maxEntries} max`}
            </p>
          </div>

          {/* Invite Code */}
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
      </div>

      {/* Not a member notice */}
      {isLoggedIn && !userEntry && pool.status === 'open' && (
        <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 mb-6 text-center">
          <p className="text-text-secondary text-sm mb-2">You&apos;re not in this pool yet.</p>
          <p className="text-text-muted text-xs">Use invite code <span className="font-mono font-medium text-brand">{pool.inviteCode}</span> to join from the event page.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => {
          // Hide picks tab if not a member
          if (tab.key === 'picks' && !userEntry) return null
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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

      {activeTab === 'leaderboard' && (
        <Leaderboard
          members={members}
          format={tournament.format}
          poolStatus={pool.status}
        />
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
              <div className="text-right">
                {member.submittedAt ? (
                  <span className="text-xs text-success-text">Picks in</span>
                ) : (
                  <span className="text-xs text-text-muted">No picks yet</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
