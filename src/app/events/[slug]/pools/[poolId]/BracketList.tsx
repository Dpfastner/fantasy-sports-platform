'use client'

import { useMemo } from 'react'
import { BracketGameCard } from './BracketGameCard'
import { getRounds, type BracketMap } from './bracketUtils'

interface Game {
  id: string
  gameNumber: number
  round: string
  participant1Id: string | null
  participant2Id: string | null
  participant1Score?: number | null
  participant2Score?: number | null
  status: string
  winnerId?: string | null
  period?: string | null
  clock?: string | null
  startsAt?: string | null
}

interface Participant {
  id: string
  name: string
  shortName: string | null
  seed: number | null
  logoUrl: string | null
}

interface BracketListProps {
  games: Game[]
  picks: Record<string, string>
  bracketMap: BracketMap
  scoringRules: Record<string, number>
  isLocked: boolean
  onPick: (gameId: string, participantId: string) => void
  getParticipantForSlot: (gameId: string, slot: 1 | 2) => Participant | null
}

const ROUND_LABELS: Record<string, string> = {
  regional_quarterfinal: 'Quarterfinals',
  regional_final: 'Regional Finals',
  semifinal: 'Frozen Four',
  championship: 'Championship',
}

/**
 * Mobile stacked bracket view — rounds displayed vertically with same
 * pick propagation as the grid view.
 */
export function BracketList({
  games,
  picks,
  bracketMap,
  scoringRules,
  isLocked,
  onPick,
  getParticipantForSlot,
}: BracketListProps) {
  const rounds = useMemo(() => getRounds(games), [games])

  const gameMap = useMemo(() => {
    const m: Record<string, Game> = {}
    for (const g of games) m[g.id] = g
    return m
  }, [games])

  return (
    <div className="space-y-6">
      {rounds.map(round => (
        <div key={round.round}>
          {/* Round header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {ROUND_LABELS[round.round] || round.round}
            </h3>
            {scoringRules[round.round] != null && (
              <span className="text-xs text-text-muted">
                {scoringRules[round.round]} pt{scoringRules[round.round] !== 1 ? 's' : ''} each
              </span>
            )}
          </div>

          {/* Games */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {round.games.map(game => {
              const g = gameMap[game.id]
              return (
                <BracketGameCard
                  key={game.id}
                  gameId={game.id}
                  participant1={getParticipantForSlot(game.id, 1)}
                  participant2={getParticipantForSlot(game.id, 2)}
                  pickedId={picks[game.id] || null}
                  winnerId={g?.winnerId || null}
                  status={g?.status || 'scheduled'}
                  score1={g?.participant1Score ?? null}
                  score2={g?.participant2Score ?? null}
                  period={g?.period || null}
                  clock={g?.clock || null}
                  startsAt={g?.startsAt || null}
                  roundPoints={scoringRules[round.round] || 0}
                  isLocked={isLocked}
                  onPick={onPick}
                  compact
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
