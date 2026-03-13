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
                const p = participantMap[picksByWeek[w.week_number]]
                const resolved = w.resolution_status === 'resolved'
                // If still active after this resolved week, the pick survived
                const survived = resolved && isActive
                return (
                  <div
                    key={w.week_number}
                    className={`flex items-center justify-between text-xs px-3 py-2 rounded-md border ${
                      resolved
                        ? 'border-success/30 bg-success/5'
                        : 'border-border bg-surface-inset'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted font-medium w-8">R{w.week_number}</span>
                      <span className="text-text-secondary">{p?.name || '?'}</span>
                    </div>
                    {resolved && (
                      <span className={`font-medium ${survived ? 'text-success-text' : 'text-danger-text'}`}>
                        {survived ? 'W' : 'L'}
                      </span>
                    )}
                    {!resolved && (
                      <span className="text-text-muted">Pending</span>
                    )}
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
              return (
                <div key={game.id} className="bg-surface-inset rounded-md p-2 text-sm flex items-center justify-between">
                  <span className="text-text-secondary">{p1?.name || 'TBD'}</span>
                  <span className="text-text-muted text-xs">vs</span>
                  <span className="text-text-secondary">{p2?.name || 'TBD'}</span>
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
              className={`p-3 rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-brand bg-brand/10 ring-1 ring-brand'
                  : isUsed
                  ? 'border-border bg-surface-inset opacity-40 cursor-not-allowed'
                  : 'border-border bg-surface hover:border-brand/40 hover:bg-surface-subtle'
              }`}
            >
              <span className={`text-sm font-medium block truncate ${
                isSelected ? 'text-brand' : isUsed ? 'text-text-muted line-through' : 'text-text-primary'
              }`}>
                {p.name}
              </span>
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
