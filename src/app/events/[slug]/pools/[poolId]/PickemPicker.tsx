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
  startsAt: string
  status: string
  result: Record<string, unknown> | null
}

interface UserPick {
  id: string
  gameId: string | null
  participantId: string
  weekNumber: number | null
}

interface PickemPickerProps {
  entryId: string
  tournamentId: string
  poolId: string
  poolStatus: string
  games: Game[]
  participants: Participant[]
  existingPicks: UserPick[]
  submittedAt: string | null
}

export function PickemPicker({
  entryId,
  tournamentId,
  poolId,
  poolStatus,
  games,
  participants,
  existingPicks,
  submittedAt,
}: PickemPickerProps) {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Build picks map: gameId -> participantId
  const initialPicksMap: Record<string, string> = {}
  for (const pick of existingPicks) {
    if (pick.gameId) initialPicksMap[pick.gameId] = pick.participantId
  }
  const [picks, setPicks] = useState<Record<string, string>>(initialPicksMap)

  const participantMap = useMemo(() => {
    const m: Record<string, Participant> = {}
    for (const p of participants) m[p.id] = p
    return m
  }, [participants])

  // Group games by round
  const roundGroups = useMemo(() => {
    const groups: Record<string, Game[]> = {}
    for (const game of games) {
      if (!groups[game.round]) groups[game.round] = []
      groups[game.round].push(game)
    }
    return groups
  }, [games])

  const roundOrder = Object.keys(roundGroups)
  const isLocked = poolStatus !== 'open'
  const totalGames = games.filter(g => g.participant1Id && g.participant2Id).length
  const pickedCount = Object.keys(picks).length

  const handlePick = (gameId: string, participantId: string) => {
    if (isLocked) return
    setPicks(prev => {
      if (prev[gameId] === participantId) {
        const next = { ...prev }
        delete next[gameId]
        return next
      }
      return { ...prev, [gameId]: participantId }
    })
  }

  const handleSubmit = async () => {
    if (pickedCount === 0) {
      addToast('Make at least one pick before submitting', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const pickArray = Object.entries(picks).map(([gameId, participantId]) => ({
        gameId,
        participantId,
      }))

      const res = await fetch('/api/events/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, picks: pickArray }),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to submit picks', 'error')
        return
      }

      addToast(`Picks saved! ${data.pickCount} picks submitted.`, 'success')
      track('event_pickem_submitted', { pickCount: data.pickCount })
      trackEventActivity('pick.submitted', poolId, tournamentId, { pickCount: data.pickCount })
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-text-muted">
          {pickedCount} / {totalGames} matchups picked
          {submittedAt && (
            <span className="ml-2 text-success-text">
              &middot; Last saved {new Date(submittedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {!isLocked && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || pickedCount === 0}
            className="px-4 py-2 text-sm font-medium rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : submittedAt ? 'Update Picks' : 'Submit Picks'}
          </button>
        )}
      </div>

      {isLocked && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4 text-sm text-warning-text">
          This pool is locked. Picks can no longer be changed.
        </div>
      )}

      {/* Rounds */}
      <div className="space-y-6">
        {roundOrder.map((round) => (
          <div key={round}>
            <h3 className="brand-h3 text-base text-text-primary mb-3">{round}</h3>
            <div className="space-y-3">
              {roundGroups[round].map((game) => {
                const p1 = game.participant1Id ? participantMap[game.participant1Id] : null
                const p2 = game.participant2Id ? participantMap[game.participant2Id] : null
                const picked = picks[game.id]
                const hasResult = game.status === 'final' && game.result
                const winnerId = hasResult ? (game.result as Record<string, string>)?.winner_id : null

                if (!p1 && !p2) return null

                return (
                  <div key={game.id} className="bg-surface rounded-lg border border-border overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_1fr]">
                      {/* Participant 1 */}
                      <button
                        onClick={() => p1 && handlePick(game.id, p1.id)}
                        disabled={isLocked || !p1}
                        className={`p-3 text-center transition-colors ${
                          picked === p1?.id
                            ? winnerId
                              ? winnerId === p1?.id
                                ? 'bg-success/10'
                                : 'bg-danger/10'
                              : 'bg-brand/10'
                            : 'hover:bg-surface-subtle'
                        }`}
                      >
                        <span className={`text-sm block truncate ${
                          picked === p1?.id ? 'font-medium text-text-primary' : 'text-text-secondary'
                        }`}>
                          {p1?.name || 'TBD'}
                        </span>
                        {p1?.shortName && (
                          <span className="text-xs text-text-muted">{p1.shortName}</span>
                        )}
                        {picked === p1?.id && (
                          <svg className="w-4 h-4 text-brand mx-auto mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>

                      {/* VS divider */}
                      <div className="flex items-center justify-center px-3 border-x border-border bg-surface-inset">
                        <span className="text-xs text-text-muted font-medium">
                          {game.status === 'final' ? 'Final' : 'vs'}
                        </span>
                      </div>

                      {/* Participant 2 */}
                      <button
                        onClick={() => p2 && handlePick(game.id, p2.id)}
                        disabled={isLocked || !p2}
                        className={`p-3 text-center transition-colors ${
                          picked === p2?.id
                            ? winnerId
                              ? winnerId === p2?.id
                                ? 'bg-success/10'
                                : 'bg-danger/10'
                              : 'bg-brand/10'
                            : 'hover:bg-surface-subtle'
                        }`}
                      >
                        <span className={`text-sm block truncate ${
                          picked === p2?.id ? 'font-medium text-text-primary' : 'text-text-secondary'
                        }`}>
                          {p2?.name || 'TBD'}
                        </span>
                        {p2?.shortName && (
                          <span className="text-xs text-text-muted">{p2.shortName}</span>
                        )}
                        {picked === p2?.id && (
                          <svg className="w-4 h-4 text-brand mx-auto mt-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom submit */}
      {!isLocked && pickedCount > 0 && (
        <div className="sticky bottom-4 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 text-sm font-medium rounded-lg bg-brand text-text-primary hover:bg-brand-hover transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : `${submittedAt ? 'Update' : 'Submit'} Picks (${pickedCount}/${totalGames})`}
          </button>
        </div>
      )}
    </div>
  )
}
