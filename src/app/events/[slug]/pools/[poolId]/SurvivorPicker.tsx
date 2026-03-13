'use client'

import { useState, useMemo } from 'react'
import { useToast } from '@/components/Toast'
import { trackEventActivity } from '@/app/actions/activity'
import { track } from '@vercel/analytics'

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
  winnerId?: string | null
  startsAt: string
  status: string
  result: Record<string, unknown> | null
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

interface SurvivorPickerProps {
  entryId: string
  tournamentId: string
  poolId: string
  poolStatus: string
  participants: Participant[]
  existingPicks: UserPick[]
  poolWeeks: PoolWeek[]
  isActive: boolean
  games: Game[]
}

export function SurvivorPicker({
  entryId,
  tournamentId,
  poolId,
  poolStatus,
  participants,
  existingPicks,
  poolWeeks,
  isActive,
  games,
}: SurvivorPickerProps) {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Find current active week (first unresolved week with deadline in the future)
  const now = new Date()
  const currentWeek = poolWeeks.find(
    w => w.resolution_status !== 'resolved' && new Date(w.deadline) > now
  )

  // Map of weekNumber -> participantId for existing picks
  const picksByWeek = useMemo(() => {
    const m: Record<number, string> = {}
    for (const pick of existingPicks) {
      if (pick.weekNumber != null) m[pick.weekNumber] = pick.participantId
    }
    return m
  }, [existingPicks])

  // Set of already-used participant IDs (excluding current week)
  const usedParticipantIds = useMemo(() => {
    const s = new Set<string>()
    for (const pick of existingPicks) {
      if (pick.weekNumber != null && pick.weekNumber !== currentWeek?.week_number) {
        s.add(pick.participantId)
      }
    }
    return s
  }, [existingPicks, currentWeek])

  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(
    currentWeek ? picksByWeek[currentWeek.week_number] || null : null
  )

  const participantMap = useMemo(() => {
    const m: Record<string, Participant> = {}
    for (const p of participants) m[p.id] = p
    return m
  }, [participants])

  // Get games for the current week/round
  const currentRoundGames = useMemo(() => {
    if (!currentWeek) return []
    const weekNum = currentWeek.week_number
    return games.filter(g => g.round === `Round ${weekNum}` || g.round === `round_${weekNum}`)
  }, [games, currentWeek])

  // Map: find the game a picked participant was in for a given round
  const findGameForPick = (weekNumber: number, participantId: string): Game | undefined => {
    return games.find(g =>
      (g.round === `Round ${weekNumber}` || g.round === `round_${weekNumber}`) &&
      (g.participant1Id === participantId || g.participant2Id === participantId)
    )
  }

  const handleSubmit = async () => {
    if (!currentWeek || !selectedParticipant) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/events/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          weekNumber: currentWeek.week_number,
          participantId: selectedParticipant,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to submit pick', 'error')
        return
      }

      addToast(`Pick saved: ${data.participant}`, 'success')
      track('event_survivor_pick', { week: currentWeek.week_number })
      trackEventActivity('survivor.pick_made', poolId, tournamentId, { week: currentWeek.week_number })
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isActive) {
    return (
      <div className="bg-danger/5 border border-danger/20 rounded-lg p-6 text-center">
        <p className="text-danger-text font-medium mb-1">You&apos;ve been eliminated</p>
        <p className="text-text-muted text-sm">Better luck next time!</p>
      </div>
    )
  }

  if (!currentWeek) {
    return (
      <div className="bg-surface rounded-lg border border-border p-6 text-center">
        <p className="text-text-secondary">No active week to pick for right now.</p>
        {poolWeeks.length > 0 && (
          <p className="text-text-muted text-sm mt-1">
            All {poolWeeks.length} weeks have been completed or haven&apos;t opened yet.
          </p>
        )}
      </div>
    )
  }

  const deadlineDate = new Date(currentWeek.deadline)
  const hoursUntilDeadline = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
  const isUrgent = hoursUntilDeadline < 24

  return (
    <div>
      {/* Week header */}
      <div className="bg-surface rounded-lg border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="brand-h3 text-base text-text-primary">Round {currentWeek.week_number}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isUrgent ? 'bg-danger/20 text-danger-text' : 'bg-surface-inset text-text-muted'
          }`}>
            Deadline: {deadlineDate.toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
            })}
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Pick one team to win. If they lose, you&apos;re eliminated. You can&apos;t use the same team twice.
        </p>
      </div>

      {/* Previous picks with W/L history */}
      {existingPicks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-text-muted mb-2 uppercase tracking-wide">Pick History</h4>
          <div className="space-y-1.5">
            {poolWeeks
              .filter(w => w.week_number < currentWeek.week_number && picksByWeek[w.week_number])
              .map(w => {
                const pickedId = picksByWeek[w.week_number]
                const p = participantMap[pickedId]
                const resolved = w.resolution_status === 'resolved'
                const game = findGameForPick(w.week_number, pickedId)
                const isFinal = game && (game.status === 'completed' || game.status === 'final')
                const pickedWon = isFinal && game.winnerId === pickedId
                const pickedLost = isFinal && game.winnerId != null && game.winnerId !== pickedId
                const isDraw = isFinal && !game.winnerId

                // Find opponent
                const opponentId = game
                  ? (game.participant1Id === pickedId ? game.participant2Id : game.participant1Id)
                  : null
                const opponent = opponentId ? participantMap[opponentId] : null

                // Get scores oriented: picked team first
                let pickedScore: number | null = null
                let opponentScore: number | null = null
                if (game && game.participant1Score != null && game.participant2Score != null) {
                  if (game.participant1Id === pickedId) {
                    pickedScore = game.participant1Score
                    opponentScore = game.participant2Score
                  } else {
                    pickedScore = game.participant2Score
                    opponentScore = game.participant1Score
                  }
                }

                return (
                  <div
                    key={w.week_number}
                    className={`px-3 py-2 rounded-md border text-xs ${
                      pickedWon ? 'border-success/30 bg-success/5'
                        : pickedLost || isDraw ? 'border-danger/30 bg-danger/5'
                        : resolved ? 'border-success/30 bg-success/5'
                        : 'border-border bg-surface-inset'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted font-medium w-8">R{w.week_number}</span>
                        {p?.logoUrl && (
                          <img src={p.logoUrl} alt="" className="w-5 h-5 rounded-sm object-contain" />
                        )}
                        <span className={pickedWon ? 'text-success-text font-medium' : 'text-text-secondary'}>
                          {p?.name || '?'}
                        </span>
                        {isFinal && pickedScore != null && opponentScore != null && (
                          <span className="text-text-muted">
                            {pickedScore} - {opponentScore}
                          </span>
                        )}
                        {opponent && (
                          <span className="text-text-muted">
                            {isFinal ? 'vs' : 'vs'} {opponent.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {pickedWon && (
                          <span className="flex items-center gap-1 text-success-text font-medium">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                            Win
                          </span>
                        )}
                        {(pickedLost || isDraw) && (
                          <span className="flex items-center gap-1 text-danger-text font-medium">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                            </svg>
                            {isDraw ? 'Draw' : 'Loss'}
                          </span>
                        )}
                        {!isFinal && !resolved && (
                          <span className="text-text-muted">Pending</span>
                        )}
                        {!isFinal && resolved && (
                          <span className="text-text-muted">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Current week games */}
      {currentRoundGames.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-text-muted mb-2 uppercase tracking-wide">This Round&apos;s Matches</h4>
          <div className="space-y-2">
            {currentRoundGames.map(game => {
              const p1 = game.participant1Id ? participantMap[game.participant1Id] : null
              const p2 = game.participant2Id ? participantMap[game.participant2Id] : null
              const isFinal = game.status === 'completed' || game.status === 'final'
              const isLive = game.status === 'live'
              const hasScores = game.participant1Score != null && game.participant2Score != null
              const p1Won = isFinal && game.winnerId === game.participant1Id
              const p2Won = isFinal && game.winnerId === game.participant2Id
              return (
                <div key={game.id} className={`rounded-md p-2.5 text-sm border ${
                  isLive ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface-inset'
                }`}>
                  {/* Status badge */}
                  <div className="flex justify-end mb-1">
                    {isLive && (
                      <span className="text-[10px] font-medium text-danger-text bg-danger/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse" />LIVE
                      </span>
                    )}
                    {isFinal && <span className="text-[10px] text-text-muted">Final</span>}
                    {!isFinal && !isLive && (
                      <span className="text-[10px] text-text-muted">
                        {new Date(game.startsAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {/* Team 1 */}
                  <div className={`flex items-center justify-between mb-1 ${p1Won ? 'text-success-text font-medium' : isFinal && !p1Won ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {p1?.logoUrl && <img src={p1.logoUrl} alt="" className="w-4 h-4 rounded-sm object-contain" />}
                      <span>{p1?.name || 'TBD'}</span>
                      {p1Won && (
                        <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {(isLive || isFinal) && hasScores && (
                      <span className="font-mono text-sm">{game.participant1Score}</span>
                    )}
                  </div>
                  {/* Team 2 */}
                  <div className={`flex items-center justify-between ${p2Won ? 'text-success-text font-medium' : isFinal && !p2Won ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {p2?.logoUrl && <img src={p2.logoUrl} alt="" className="w-4 h-4 rounded-sm object-contain" />}
                      <span>{p2?.name || 'TBD'}</span>
                      {p2Won && (
                        <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {(isLive || isFinal) && hasScores && (
                      <span className="font-mono text-sm">{game.participant2Score}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team selection */}
      <h4 className="text-xs text-text-muted mb-2 uppercase tracking-wide">Select Your Pick</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {participants.map((p) => {
          const isUsed = usedParticipantIds.has(p.id)
          const isSelected = selectedParticipant === p.id
          return (
            <button
              key={p.id}
              onClick={() => !isUsed && setSelectedParticipant(isSelected ? null : p.id)}
              disabled={isUsed || poolStatus !== 'open'}
              className={`p-3 min-h-[44px] rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-brand bg-brand/10 ring-1 ring-brand'
                  : isUsed
                  ? 'border-border bg-surface-inset opacity-40 cursor-not-allowed'
                  : 'border-border bg-surface hover:border-brand/40 hover:bg-surface-subtle'
              }`}
            >
              <div className="flex items-center gap-2">
                {p.logoUrl && (
                  <img src={p.logoUrl} alt="" className="w-5 h-5 rounded-sm object-contain" />
                )}
                <span className={`text-sm font-medium truncate ${
                  isSelected ? 'text-brand' : isUsed ? 'text-text-muted line-through' : 'text-text-primary'
                }`}>
                  {p.name}
                </span>
              </div>
              {p.shortName && (
                <span className="text-xs text-text-muted">{p.shortName}</span>
              )}
              {isUsed && <span className="text-xs text-text-muted block">Used</span>}
            </button>
          )
        })}
      </div>

      {/* Submit */}
      {poolStatus === 'open' && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedParticipant}
          className="w-full py-3 text-sm font-medium rounded-lg bg-brand text-text-primary hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? 'Saving...'
            : picksByWeek[currentWeek.week_number]
            ? 'Update Pick'
            : 'Lock In Pick'}
        </button>
      )}
    </div>
  )
}
