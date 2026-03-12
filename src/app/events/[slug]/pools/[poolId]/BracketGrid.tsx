'use client'

import { useMemo } from 'react'
import { BracketGameCard } from './BracketGameCard'
import { BracketConnectors } from './BracketConnectors'
import {
  getRounds,
  calculateCardPositions,
  calculateBracketHeight,
  type BracketMap,
  CARD_HEIGHT,
} from './bracketUtils'

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

interface BracketGridProps {
  games: Game[]
  participants: Participant[]
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

export function BracketGrid({
  games,
  picks,
  bracketMap,
  scoringRules,
  isLocked,
  onPick,
  getParticipantForSlot,
}: BracketGridProps) {
  const rounds = useMemo(() => getRounds(games), [games])
  const positions = useMemo(
    () => calculateCardPositions(rounds, bracketMap),
    [rounds, bracketMap],
  )
  const totalHeight = useMemo(
    () => calculateBracketHeight(rounds),
    [rounds],
  )

  const gameMap = useMemo(() => {
    const m: Record<string, Game> = {}
    for (const g of games) m[g.id] = g
    return m
  }, [games])

  // Build connector pairs for each round transition
  const connectorSets = useMemo(() => {
    const sets: { pairs: { fromY1: number; fromY2: number; toY: number }[] }[] = []

    for (let r = 1; r < rounds.length; r++) {
      const pairs: { fromY1: number; fromY2: number; toY: number }[] = []
      for (const game of rounds[r].games) {
        const feed = bracketMap[game.id]
        if (feed.feedsFrom.length === 2) {
          pairs.push({
            fromY1: positions[feed.feedsFrom[0]] ?? 0,
            fromY2: positions[feed.feedsFrom[1]] ?? 0,
            toY: positions[game.id] ?? 0,
          })
        }
      }
      sets.push({ pairs })
    }

    return sets
  }, [rounds, bracketMap, positions])

  // Find the championship winner for the trophy display
  const championshipGame = rounds.length > 0 ? rounds[rounds.length - 1].games[0] : null
  const championPick = championshipGame ? picks[championshipGame.id] : null

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start" style={{ minWidth: 1000, height: totalHeight + 60 }}>
        {rounds.map((round, rIdx) => (
          <div key={round.round} className="flex items-start shrink-0">
            {/* Round column */}
            <div className="relative" style={{ width: 230 }}>
              {/* Round header */}
              <div className="text-center mb-2">
                <div className="text-xs font-semibold text-text-secondary">
                  {ROUND_LABELS[round.round] || round.round}
                </div>
                {scoringRules[round.round] != null && (
                  <div className="text-[10px] text-text-muted">
                    {scoringRules[round.round]} pt{scoringRules[round.round] !== 1 ? 's' : ''} each
                  </div>
                )}
              </div>

              {/* Game cards positioned absolutely */}
              <div className="relative" style={{ height: totalHeight }}>
                {round.games.map(game => {
                  const g = gameMap[game.id]
                  const p1 = getParticipantForSlot(game.id, 1)
                  const p2 = getParticipantForSlot(game.id, 2)

                  return (
                    <div
                      key={game.id}
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{ top: positions[game.id] ?? 0 }}
                    >
                      <BracketGameCard
                        gameId={game.id}
                        participant1={p1}
                        participant2={p2}
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
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Connectors (between rounds, not after last) */}
            {rIdx < rounds.length - 1 && connectorSets[rIdx] && (
              <div style={{ paddingTop: 34 }}>
                <BracketConnectors
                  pairs={connectorSets[rIdx].pairs}
                  totalHeight={totalHeight}
                />
              </div>
            )}
          </div>
        ))}

        {/* Champion display */}
        {championPick && (
          <div className="flex flex-col items-center justify-center shrink-0 ml-4" style={{ marginTop: totalHeight / 2 - 20 }}>
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Champion</div>
            <div className="bg-brand/10 border border-brand/30 rounded-lg px-4 py-2 text-center">
              <div className="text-sm font-semibold text-brand">
                {getParticipantForSlot(championshipGame!.id, picks[championshipGame!.id] === getParticipantForSlot(championshipGame!.id, 1)?.id ? 1 : 2)?.name || 'TBD'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
