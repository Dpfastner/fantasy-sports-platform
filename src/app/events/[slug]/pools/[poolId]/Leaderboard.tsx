'use client'

interface Member {
  id: string
  userId: string
  displayName: string
  isActive: boolean
  submittedAt: string | null
  score: number
  rank: number | null
}

interface LeaderboardProps {
  members: Member[]
  format: string
  poolStatus: string
}

export function Leaderboard({ members, format, poolStatus }: LeaderboardProps) {
  // Sort: active first, then by score descending, then by submission time
  const sorted = [...members].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    if (a.score !== b.score) return b.score - a.score
    if (a.submittedAt && b.submittedAt) {
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    }
    return a.submittedAt ? -1 : 1
  })

  const showScores = poolStatus === 'locked' || poolStatus === 'completed' || sorted.some(m => m.score > 0)

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-6 text-center">
          <p className="text-text-muted">No entries yet.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem] gap-2 px-3 py-2 bg-surface-inset border-b border-border text-xs text-text-muted uppercase tracking-wide">
            <span className="text-right">#</span>
            <span>Player</span>
            <span className="text-right">{showScores ? 'Score' : 'Status'}</span>
            <span className="text-right">Submitted</span>
          </div>

          {/* Rows */}
          {sorted.map((member, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3 && showScores && member.score > 0
            return (
              <div
                key={member.id}
                className={`grid grid-cols-[2rem_1fr_4rem_5rem] sm:grid-cols-[2.5rem_1fr_5rem_6rem] gap-2 px-3 py-2.5 border-b border-border-subtle last:border-0 ${
                  !member.isActive ? 'opacity-50' : ''
                }`}
              >
                <span className={`text-right text-sm ${
                  isTop3 ? 'font-bold text-brand' : 'text-text-muted'
                }`}>
                  {rank}
                </span>
                <div className="min-w-0">
                  <span className="text-sm text-text-primary truncate block">{member.displayName}</span>
                  {!member.isActive && format === 'survivor' && (
                    <span className="text-xs text-danger-text">Eliminated</span>
                  )}
                </div>
                <span className={`text-right text-sm ${
                  showScores && member.score > 0 ? 'text-text-primary font-medium' : 'text-text-muted'
                }`}>
                  {showScores ? member.score : member.submittedAt ? 'Ready' : '—'}
                </span>
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
