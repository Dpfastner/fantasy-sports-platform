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

interface BracketPickerProps {
  entryId: string
  tournamentId: string
  poolId: string
  poolStatus: string
  games: Game[]
  participants: Participant[]
  existingPicks: UserPick[]
  tiebreakerType: string
  existingTiebreaker: { team1_score: number; team2_score: number } | null
  submittedAt: string | null
}

export function BracketPicker({
  entryId,
  tournamentId,
  poolId,
  poolStatus,
  games,
  participants,
  existingPicks,
  tiebreakerType,
  existingTiebreaker,
  submittedAt,
}: BracketPickerProps) {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Build picks map: gameId -> participantId
  const initialPicksMap: Record<string, string> = {}
  for (const pick of existingPicks) {
    if (pick.gameId) initialPicksMap[pick.gameId] = pick.participantId
  }
  const [picks, setPicks] = useState<Record<string, string>>(initialPicksMap)

  // Tiebreaker state
  const [tiebreaker, setTiebreaker] = useState(existingTiebreaker || { team1_score: 0, team2_score: 0 })

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
  const totalGames = games.length
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

      const body: Record<string, unknown> = {
        entryId,
        picks: pickArray,
      }

      if (tiebreakerType === 'championship_score') {
        body.tiebreakerPrediction = tiebreaker
      }

      const res = await fetch('/api/events/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Failed to submit picks', 'error')
        return
      }

      addToast(`Bracket saved! ${data.pickCount} picks submitted.`, 'success')
      track('event_bracket_submitted', { pickCount: data.pickCount })
      trackEventActivity('bracket.completed', poolId, tournamentId, { pickCount: data.pickCount })
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getParticipantForSlot = (participantId: string | null) => {
    if (!participantId) return null
    return participantMap[participantId] || null
  }

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-text-muted">
          {pickedCount} / {totalGames} games picked
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
            className="px-4 py-2 text-sm font-medium rounded-md bg-brand text-brand-text hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : submittedAt ? 'Update Bracket' : 'Submit Bracket'}
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
                const p1 = getParticipantForSlot(game.participant1Id)
                const p2 = getParticipantForSlot(game.participant2Id)
                const picked = picks[game.id]
                const hasResult = game.status === 'final' && game.result
                const winnerId = hasResult ? (game.result as Record<string, string>)?.winner_id : null

                return (
                  <div
                    key={game.id}
                    className="bg-surface rounded-lg border border-border overflow-hidden"
                  >
                    <div className="text-xs text-text-muted px-3 py-1.5 bg-surface-inset border-b border-border flex justify-between">
                      <span>Game {game.gameNumber}</span>
                      {game.status === 'final' && <span className="text-success-text">Final</span>}
                    </div>

                    {/* Participant 1 */}
                    <button
                      onClick={() => p1 && handlePick(game.id, p1.id)}
                      disabled={isLocked || !p1}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                        picked === p1?.id
                          ? winnerId
                            ? winnerId === p1?.id
                              ? 'bg-success/10 border-l-2 border-l-success'
                              : 'bg-danger/10 border-l-2 border-l-danger'
                            : 'bg-brand/10 border-l-2 border-l-brand'
                          : 'hover:bg-surface-subtle'
                      } ${!p1 ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p1?.seed && <span className="text-xs text-text-muted w-4 text-right shrink-0">{p1.seed}</span>}
                        <span className={`text-sm truncate ${picked === p1?.id ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                          {p1?.name || 'TBD'}
                        </span>
                      </div>
                      {picked === p1?.id && (
                        <svg className="w-4 h-4 text-brand shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    <div className="border-t border-border-subtle" />

                    {/* Participant 2 */}
                    <button
                      onClick={() => p2 && handlePick(game.id, p2.id)}
                      disabled={isLocked || !p2}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                        picked === p2?.id
                          ? winnerId
                            ? winnerId === p2?.id
                              ? 'bg-success/10 border-l-2 border-l-success'
                              : 'bg-danger/10 border-l-2 border-l-danger'
                            : 'bg-brand/10 border-l-2 border-l-brand'
                          : 'hover:bg-surface-subtle'
                      } ${!p2 ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {p2?.seed && <span className="text-xs text-text-muted w-4 text-right shrink-0">{p2.seed}</span>}
                        <span className={`text-sm truncate ${picked === p2?.id ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                          {p2?.name || 'TBD'}
                        </span>
                      </div>
                      {picked === p2?.id && (
                        <svg className="w-4 h-4 text-brand shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tiebreaker */}
      {tiebreakerType === 'championship_score' && !isLocked && (
        <div className="mt-6 bg-surface rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2">Tiebreaker: Predict Championship Score</h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={99}
              value={tiebreaker.team1_score}
              onChange={(e) => setTiebreaker(prev => ({ ...prev, team1_score: parseInt(e.target.value) || 0 }))}
              className="w-16 bg-surface-inset border border-border rounded-md px-2 py-1.5 text-sm text-center text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <span className="text-text-muted text-sm">—</span>
            <input
              type="number"
              min={0}
              max={99}
              value={tiebreaker.team2_score}
              onChange={(e) => setTiebreaker(prev => ({ ...prev, team2_score: parseInt(e.target.value) || 0 }))}
              className="w-16 bg-surface-inset border border-border rounded-md px-2 py-1.5 text-sm text-center text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
        </div>
      )}

      {/* Bottom submit */}
      {!isLocked && pickedCount > 0 && (
        <div className="sticky bottom-4 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 text-sm font-medium rounded-lg bg-brand text-brand-text hover:bg-brand-hover transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : `${submittedAt ? 'Update' : 'Submit'} Bracket (${pickedCount}/${totalGames})`}
          </button>
        </div>
      )}
    </div>
  )
}
