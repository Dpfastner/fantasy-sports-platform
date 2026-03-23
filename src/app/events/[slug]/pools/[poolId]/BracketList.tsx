'use client'

import { useMemo } from 'react'
import { BracketGameCard } from './BracketGameCard'
import { getRounds, type BracketMap } from './bracketUtils'
import type { SlotResult } from './useBracketPicks'

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
  getParticipantForSlot: (gameId: string, slot: 1 | 2) => SlotResult
}

const ROUND_LABELS: Record<string, string> = {
  regional_quarterfinal: 'Quarterfinals',
  regional_final: 'Regional Finals',
  semifinal: 'Frozen Four',
  championship: 'Championship',
}

/**
 * Mobile bracket view — horizontally scrollable bracket layout with
 * interactive game cards. Matches the mini bracket visual treatment
 * from TournamentBracketView while keeping pick interactivity.
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
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2" style={{ minWidth: `${rounds.length * 186}px` }}>
        {rounds.map(round => (
          <div key={round.round} className="flex flex-col" style={{ width: 180 }}>
            {/* Round header */}
            <div className="text-center mb-2">
              <p className="text-xs text-text-muted whitespace-nowrap font-semibold">
                {ROUND_LABELS[round.round] || round.round}
              </p>
              {scoringRules[round.round] != null && (
                <p className="text-[10px] text-text-muted">
                  {scoringRules[round.round]} pt{scoringRules[round.round] !== 1 ? 's' : ''} each
                </p>
              )}
            </div>

            {/* Games — vertically centered within the column */}
            <div className="flex-1 flex flex-col justify-around gap-1">
              {round.games.map(game => {
                const g = gameMap[game.id]
                const slot1 = getParticipantForSlot(game.id, 1)
                const slot2 = getParticipantForSlot(game.id, 2)
                return (
                  <BracketGameCard
                    key={game.id}
                    gameId={game.id}
                    participant1={slot1.participant}
                    participant2={slot2.participant}
                    eliminated1={slot1.eliminated}
                    eliminated2={slot2.eliminated}
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
    </div>
  )
}
