'use client'

import Link from 'next/link'
import { EntryAvatar } from '@/components/EntryAvatar'

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

interface LeaderboardProps {
  members: Member[]
  format: string
  poolStatus: string
  tiebreaker?: string
  onViewEntry?: (entryId: string) => void
}

function formatGolfScore(score: number): string {
  if (score === 0) return 'E'
  if (score > 0) return `+${score}`
  return String(score)
}

export function Leaderboard({ members, format, poolStatus, tiebreaker, onViewEntry }: LeaderboardProps) {
  const isRoster = format === 'roster'
  const isSurvivor = format === 'survivor'
  const hasTiebreaker = tiebreaker && tiebreaker !== 'none'

  // Sort: active first, then by score (or rounds survived for survivor)
  const sorted = [...members].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    if (isSurvivor) {
      // Survivor: more rounds survived = better
      const aRounds = a.roundsSurvived || 0
      const bRounds = b.roundsSurvived || 0
      if (aRounds !== bRounds) return bRounds - aRounds
      // Tiebreaker: lower total predicted score = closer to conservative prediction
      if (hasTiebreaker && a.tiebreakerPrediction && b.tiebreakerPrediction) {
        const aTotal = a.tiebreakerPrediction.team1_score + a.tiebreakerPrediction.team2_score
        const bTotal = b.tiebreakerPrediction.team1_score + b.tiebreakerPrediction.team2_score
        if (aTotal !== bTotal) return aTotal - bTotal
      }
      // Members with a tiebreaker prediction rank above those without
      if (hasTiebreaker) {
        if (a.tiebreakerPrediction && !b.tiebreakerPrediction) return -1
        if (!a.tiebreakerPrediction && b.tiebreakerPrediction) return 1
      }
    } else {
      if (a.score !== b.score) return isRoster ? a.score - b.score : b.score - a.score
      if (!isRoster && a.maxPossible !== b.maxPossible) return b.maxPossible - a.maxPossible
    }
    if (a.submittedAt && b.submittedAt) {
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    }
    return a.submittedAt ? -1 : 1
  })

  const showScores = poolStatus === 'locked' || poolStatus === 'completed' || sorted.some(m => m.score !== 0 || m.maxPossible > 0)
  const showMaxPossible = !isRoster && !isSurvivor && showScores && sorted.some(m => m.maxPossible !== m.score)

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-8 text-center">
          <p className="text-text-muted">No entries yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className={`grid gap-2 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide ${
            isSurvivor
              ? hasTiebreaker
                ? 'grid-cols-[2rem_1fr_3rem_3rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4rem_4rem_5rem]'
                : 'grid-cols-[2rem_1fr_4rem_4rem] sm:grid-cols-[2.5rem_1fr_5rem_5rem]'
              : showMaxPossible
              ? 'grid-cols-[2rem_1fr_3rem_3rem_5rem] sm:grid-cols-[2.5rem_1fr_4rem_4rem_6rem]'
              : 'grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem]'
          }`}>
            <span className="text-right">#</span>
            <span>Player</span>
            {isSurvivor ? (
              <>
                <span className="text-right">Rounds</span>
                <span className="text-right">Status</span>
                {hasTiebreaker && <span className="text-right">TB</span>}
              </>
            ) : (
              <>
                <span className="text-right">{showScores ? (isRoster ? 'Score' : 'Pts') : 'Status'}</span>
                {showMaxPossible && <span className="text-right">Max</span>}
                <span className="text-right">Submitted</span>
              </>
            )}
          </div>

          {/* Rows */}
          {sorted.map((member, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3 && showScores && member.score > 0
            return (
              <div
                key={member.id}
                className={`grid gap-2 px-3 py-2.5 border-b border-border-subtle last:border-0 ${
                  isSurvivor
                    ? hasTiebreaker
                      ? 'grid-cols-[2rem_1fr_3rem_3rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4rem_4rem_5rem]'
                      : 'grid-cols-[2rem_1fr_4rem_4rem] sm:grid-cols-[2.5rem_1fr_5rem_5rem]'
                    : showMaxPossible
                    ? 'grid-cols-[2rem_1fr_3rem_3rem_5rem] sm:grid-cols-[2.5rem_1fr_4rem_4rem_6rem]'
                    : 'grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem]'
                } ${!member.isActive && !isSurvivor ? 'opacity-50' : ''}`}
              >
                <span className={`text-right text-sm ${
                  isTop3 ? 'font-bold text-brand' : 'text-text-muted'
                }`}>
                  {rank}
                </span>
                <div className="min-w-0 flex items-center gap-2">
                  <EntryAvatar imageUrl={member.imageUrl} primaryColor={member.primaryColor} showBorder />
                  <div className="min-w-0">
                    {member.entryName ? (
                      <>
                        <button
                          onClick={() => onViewEntry?.(member.id)}
                          className="text-sm font-medium text-text-primary truncate hover:underline text-left block w-full"
                        >
                          {member.entryName}
                        </button>
                        {member.userId ? (
                          <Link href={`/profile/${member.userId}`} className="text-xs text-text-muted truncate hover:underline block">{member.userName}</Link>
                        ) : (
                          <span className="text-xs text-text-muted truncate italic block">{member.userName}</span>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => onViewEntry?.(member.id)}
                        className="text-sm text-text-primary truncate hover:underline text-left"
                      >
                        {member.displayName}
                      </button>
                    )}
                    {member.championPick && (
                      <span className="text-[10px] text-text-muted truncate block" title={`Champion: ${member.championPick.participantName}`}>
                        <span className="inline-block mr-0.5">&#127942;</span>{member.championPick.participantName}
                      </span>
                    )}
                  </div>
                </div>
                {isSurvivor ? (
                  <>
                    <span className="text-right text-sm text-text-primary font-medium">
                      {member.roundsSurvived || 0}
                    </span>
                    <span className={`text-right text-xs font-medium ${
                      member.isActive ? 'text-success-text' : 'text-danger-text'
                    }`}>
                      {member.isActive ? 'Alive' : 'Eliminated'}
                    </span>
                    {hasTiebreaker && (
                      <span className="text-right text-xs text-text-muted">
                        {member.tiebreakerPrediction
                          ? `${member.tiebreakerPrediction.team1_score}-${member.tiebreakerPrediction.team2_score}`
                          : '—'}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className={`text-right text-sm ${
                      showScores && member.score !== 0 ? 'text-text-primary font-medium' : 'text-text-muted'
                    }`}>
                      {showScores
                        ? (isRoster ? formatGolfScore(member.score) : member.score)
                        : member.submittedAt ? 'Ready' : '—'}
                    </span>
                    {showMaxPossible && (
                      <span className="text-right text-sm text-text-muted">
                        {member.maxPossible}
                      </span>
                    )}
                    <span className="text-right text-xs text-text-muted">
                      {member.submittedAt
                        ? new Date(member.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '—'}
                    </span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
