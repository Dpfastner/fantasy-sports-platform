'use client'

import Link from 'next/link'

interface Member {
  id: string
  userId: string
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

interface LeaderboardProps {
  members: Member[]
  format: string
  poolStatus: string
}

export function Leaderboard({ members, format, poolStatus }: LeaderboardProps) {
  // Sort: active first, then by score descending, then by max possible, then by submission time
  const sorted = [...members].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    if (a.score !== b.score) return b.score - a.score
    if (a.maxPossible !== b.maxPossible) return b.maxPossible - a.maxPossible
    if (a.submittedAt && b.submittedAt) {
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    }
    return a.submittedAt ? -1 : 1
  })

  const showScores = poolStatus === 'locked' || poolStatus === 'completed' || sorted.some(m => m.score > 0)
  const showMaxPossible = showScores && sorted.some(m => m.maxPossible !== m.score)

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-6 text-center">
          <p className="text-text-muted">No entries yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className={`grid gap-2 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide ${
            showMaxPossible
              ? 'grid-cols-[2rem_1fr_3rem_3rem_5rem] sm:grid-cols-[2.5rem_1fr_4rem_4rem_6rem]'
              : 'grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem]'
          }`}>
            <span className="text-right">#</span>
            <span>Player</span>
            <span className="text-right">{showScores ? 'Pts' : 'Status'}</span>
            {showMaxPossible && <span className="text-right">Max</span>}
            <span className="text-right">Submitted</span>
          </div>

          {/* Rows */}
          {sorted.map((member, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3 && showScores && member.score > 0
            return (
              <div
                key={member.id}
                className={`grid gap-2 px-3 py-2.5 border-b border-border-subtle last:border-0 ${
                  showMaxPossible
                    ? 'grid-cols-[2rem_1fr_3rem_3rem_5rem] sm:grid-cols-[2.5rem_1fr_4rem_4rem_6rem]'
                    : 'grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem]'
                } ${!member.isActive ? 'opacity-50' : ''}`}
              >
                <span className={`text-right text-sm ${
                  isTop3 ? 'font-bold text-brand' : 'text-text-muted'
                }`}>
                  {rank}
                </span>
                <div className="min-w-0 flex items-center gap-2">
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                  ) : member.primaryColor && member.primaryColor !== '#1a1a1a' ? (
                    <span className="w-5 h-5 rounded-full shrink-0 border border-border" style={{ backgroundColor: member.primaryColor }} />
                  ) : null}
                  <Link href={`/profile/${member.userId}`} className="text-sm text-text-primary truncate hover:underline">{member.displayName}</Link>
                  {!member.isActive && format === 'survivor' && (
                    <span className="text-xs text-danger-text">Eliminated</span>
                  )}
                </div>
                <span className={`text-right text-sm ${
                  showScores && member.score > 0 ? 'text-text-primary font-medium' : 'text-text-muted'
                }`}>
                  {showScores ? member.score : member.submittedAt ? 'Ready' : '—'}
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
