'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { trackEventActivity } from '@/app/actions/activity'
import { saveEntryName } from '@/app/actions/entry'
import { track } from '@vercel/analytics'
import { useBracketPicks } from './useBracketPicks'
import { BracketGrid } from './BracketGrid'
import { BracketList } from './BracketList'
import { CopyBracketButton } from './CopyBracketButton'

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
  winnerId?: string | null
  period?: string | null
  clock?: string | null
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
  scoringRules?: Record<string, unknown> | null
  existingDisplayName?: string | null
}

const DEFAULT_SCORING: Record<string, number> = {
  regional_quarterfinal: 2,
  regional_final: 4,
  semifinal: 8,
  championship: 16,
}

const ROUND_LABELS: Record<string, string> = {
  regional_quarterfinal: 'Regional Quarterfinals',
  regional_final: 'Regional Finals',
  semifinal: 'Frozen Four Semifinals',
  championship: 'Championship',
  round_1: 'Round 1',
  round_2: 'Round 2',
  round_3: 'Round 3',
  round_4: 'Round 4',
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
  scoringRules,
  existingDisplayName,
}: BracketPickerProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bracketName, setBracketName] = useState(existingDisplayName || '')

  // Reset name when switching entries
  useEffect(() => {
    setBracketName(existingDisplayName || '')
  }, [existingDisplayName])

  const isLocked = poolStatus !== 'open'

  // Resolve scoring rules — use pool's custom rules or defaults
  const roundScoring: Record<string, number> = useMemo(() => {
    if (scoringRules && typeof scoringRules === 'object' && Object.keys(scoringRules).length > 0) {
      return scoringRules as Record<string, number>
    }
    return DEFAULT_SCORING
  }, [scoringRules])

  // Bracket picks hook — handles propagation, cascade clearing, dirty tracking
  const {
    picks,
    bracketMap,
    handlePick,
    loadPicks,
    getParticipantForSlot,
    pickedCount,
    totalGames,
  } = useBracketPicks({
    games,
    participants,
    existingPicks,
    isLocked,
  })

  // Tiebreaker state — use string to allow clearing input
  const [tiebreaker, setTiebreaker] = useState(
    existingTiebreaker || { team1_score: 0 as number | '', team2_score: 0 as number | '' },
  )

  // Scoring breakdown for results display
  const scoringBreakdown = useMemo(() => {
    let totalEarned = 0
    let totalPossible = 0
    let correctCount = 0
    let incorrectCount = 0
    const perGame: Record<string, { earned: number; possible: number; correct: boolean | null }> = {}

    for (const game of games) {
      const pts = roundScoring[game.round] || 0
      const winnerId = game.winnerId || (game.result as Record<string, string>)?.winner_id || null
      const isFinal = game.status === 'final' || game.status === 'completed'
      const picked = picks[game.id]

      totalPossible += pts

      if (isFinal && winnerId && picked) {
        const isCorrect = picked === winnerId
        perGame[game.id] = { earned: isCorrect ? pts : 0, possible: pts, correct: isCorrect }
        if (isCorrect) {
          totalEarned += pts
          correctCount++
        } else {
          incorrectCount++
        }
      } else {
        perGame[game.id] = { earned: 0, possible: pts, correct: null }
      }
    }

    return { totalEarned, totalPossible, correctCount, incorrectCount, perGame }
  }, [games, picks, roundScoring])

  const hasAnyResults = games.some(g => g.status === 'final' || g.status === 'completed')

  // Group games by round for scoring summary
  const roundGroups = useMemo(() => {
    const groups: Record<string, Game[]> = {}
    for (const game of games) {
      if (!groups[game.round]) groups[game.round] = []
      groups[game.round].push(game)
    }
    return groups
  }, [games])

  const tiebreakerRequired = tiebreakerType !== 'none'
  const tiebreakerMissing = tiebreakerRequired && tiebreaker.team1_score === 0 && tiebreaker.team2_score === 0

  const handleSubmit = async () => {
    if (pickedCount === 0) {
      addToast('Make at least one pick before submitting', 'error')
      return
    }

    if (tiebreakerMissing) {
      addToast('Please fill out the tiebreaker prediction before submitting', 'error')
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

      if (bracketName.trim()) {
        body.displayName = bracketName.trim()
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
        addToast(data.error || 'Couldn\'t submit your picks. Try again.', 'error')
        return
      }

      addToast(`Bracket saved! ${data.pickCount} picks submitted.`, 'success')
      track('event_bracket_submitted', { pickCount: data.pickCount })
      trackEventActivity('bracket.completed', poolId, tournamentId, { pickCount: data.pickCount })
      router.refresh()
    } catch {
      addToast('Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Bracket name — auto-saves on blur */}
      {!isLocked && (
        <div className="mb-3">
          <input
            type="text"
            value={bracketName}
            onChange={e => setBracketName(e.target.value.slice(0, 50))}
            onBlur={async () => {
              const trimmed = bracketName.trim()
              if (trimmed === (existingDisplayName || '')) return
              const result = await saveEntryName(entryId, trimmed)
              if (result.success) {
                addToast('Bracket name saved', 'success')
              }
            }}
            placeholder="Name your bracket"
            className="w-full sm:w-64 px-3 py-1.5 text-sm rounded-md border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      )}

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
        <div className="flex items-center gap-2">
          {!isLocked && (
            <CopyBracketButton
              tournamentId={tournamentId}
              poolId={poolId}
              onCopy={loadPicks}
              disabled={isSubmitting}
            />
          )}
          {!isLocked && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || pickedCount === 0}
              className="px-4 py-2 text-sm font-medium rounded-md bg-brand text-text-primary hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : submittedAt ? 'Update Bracket' : 'Submit Bracket'}
            </button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-4 text-sm text-warning-text">
          This pool is locked. Picks can no longer be changed.
        </div>
      )}

      {/* Scoring Summary */}
      {hasAnyResults && (
        <div className="bg-surface rounded-lg border border-border p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">Scoring Breakdown</h3>
            <span className="text-lg font-bold text-brand">{scoringBreakdown.totalEarned} pts</span>
          </div>
          <div className="flex gap-4 text-xs text-text-muted">
            <span className="text-success-text">{scoringBreakdown.correctCount} correct</span>
            <span className="text-danger-text">{scoringBreakdown.incorrectCount} incorrect</span>
            <span>{totalGames - scoringBreakdown.correctCount - scoringBreakdown.incorrectCount} remaining</span>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1">
            {Object.entries(roundScoring).map(([round, pts]) => {
              const roundGames = roundGroups[round] || []
              const roundCorrect = roundGames.filter(g => scoringBreakdown.perGame[g.id]?.correct === true).length
              const roundTotal = roundGames.length
              if (roundTotal === 0) return null
              const label = ROUND_LABELS[round] || round.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              return (
                <div key={round} className="flex-1 bg-surface-inset rounded px-2 py-1.5 text-center">
                  <div className="text-[10px] text-text-muted truncate">{label}</div>
                  <div className="text-xs font-medium text-text-primary">{roundCorrect}/{roundTotal}</div>
                  <div className="text-[10px] text-text-muted">{pts} pt{pts !== 1 ? 's' : ''} each</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Visual Bracket — Desktop */}
      <div className="hidden md:block">
        <BracketGrid
          games={games}
          participants={participants}
          picks={picks}
          bracketMap={bracketMap}
          scoringRules={roundScoring}
          isLocked={isLocked}
          onPick={handlePick}
          getParticipantForSlot={getParticipantForSlot}
        />
      </div>

      {/* Stacked Rounds — Mobile */}
      <div className="block md:hidden">
        <BracketList
          games={games}
          picks={picks}
          bracketMap={bracketMap}
          scoringRules={roundScoring}
          isLocked={isLocked}
          onPick={handlePick}
          getParticipantForSlot={getParticipantForSlot}
        />
      </div>

      {/* Tiebreaker */}
      {tiebreakerType === 'championship_score' && !isLocked && (
        <div className={`mt-6 bg-surface rounded-lg border p-4 ${
          tiebreakerMissing && pickedCount > 0 ? 'border-warning' : 'border-border'
        }`}>
          <h3 className="text-sm font-medium text-text-primary mb-2">
            Tiebreaker: Predict Championship Score
            <span className="text-warning-text text-xs ml-1">(required)</span>
          </h3>
          {tiebreakerMissing && pickedCount > 0 && (
            <p className="text-xs text-warning-text mb-2">Fill this out before submitting your bracket</p>
          )}
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={99}
              value={tiebreaker.team1_score}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') { setTiebreaker(prev => ({ ...prev, team1_score: '' })); return }
                const val = parseInt(raw)
                if (!isNaN(val)) setTiebreaker(prev => ({ ...prev, team1_score: Math.min(99, val) }))
              }}
              onBlur={() => { if (tiebreaker.team1_score === '') setTiebreaker(prev => ({ ...prev, team1_score: 0 })) }}
              inputMode="numeric"
              className="w-16 bg-surface-inset border border-border rounded-md px-2 py-1.5 text-sm text-center text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
            <span className="text-text-muted text-sm">—</span>
            <input
              type="number"
              min={0}
              max={99}
              value={tiebreaker.team2_score}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') { setTiebreaker(prev => ({ ...prev, team2_score: '' })); return }
                const val = parseInt(raw)
                if (!isNaN(val)) setTiebreaker(prev => ({ ...prev, team2_score: Math.min(99, val) }))
              }}
              onBlur={() => { if (tiebreaker.team2_score === '') setTiebreaker(prev => ({ ...prev, team2_score: 0 })) }}
              inputMode="numeric"
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
            className="w-full py-3 text-sm font-medium rounded-lg bg-brand text-text-primary hover:bg-brand-hover transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : `${submittedAt ? 'Update' : 'Submit'} Bracket (${pickedCount}/${totalGames})`}
          </button>
        </div>
      )}
    </div>
  )
}
