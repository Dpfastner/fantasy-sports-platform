'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BracketConnectors } from './BracketConnectors'
import {
  buildBracketMap,
  getRounds,
  calculateCardPositions,
  calculateBracketHeight,
  CARD_HEIGHT,
} from './bracketUtils'

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
  period?: string | null
  clock?: string | null
  winnerId?: string | null
}

interface TournamentBracketViewProps {
  tournamentId: string
  games: Game[]
  participants: Participant[]
}

const ROUND_LABELS: Record<string, string> = {
  regional_quarterfinal: 'Quarterfinals',
  regional_final: 'Regional Finals',
  semifinal: 'Frozen Four',
  championship: 'Championship',
}

function ResultCard({ game, p1, p2, compact = false }: {
  game: Game
  p1: Participant | null
  p2: Participant | null
  compact?: boolean
}) {
  const isFinal = game.status === 'final' || game.status === 'completed'
  const isLive = game.status === 'live'

  function TeamRow({ participant, score, slot }: {
    participant: Participant | null
    score: number | null
    slot: 1 | 2
  }) {
    const isWinner = isFinal && participant?.id === game.winnerId
    return (
      <div className={`flex items-center gap-1.5 w-full px-2 ${compact ? 'py-1' : 'py-1.5'} ${
        slot === 1 ? 'border-b border-border/50' : ''
      } ${isWinner ? 'bg-success/10' : ''}`}>
        {participant?.seed != null && (
          <span className="text-[10px] text-text-muted w-4 text-center shrink-0">{participant.seed}</span>
        )}
        {!participant && <span className="w-4 shrink-0" />}
        {participant?.logoUrl ? (
          <img src={participant.logoUrl} alt="" className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} shrink-0 object-contain`} />
        ) : participant ? (
          <span className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
        ) : null}
        <span className={`text-xs truncate flex-1 ${participant ? 'text-text-primary' : 'text-text-muted italic'} ${isWinner ? 'font-semibold' : ''}`}>
          {compact ? (participant?.shortName || participant?.name || 'TBD') : (participant?.name || 'TBD')}
        </span>
        {(isLive || isFinal) && score != null && (
          <span className={`text-xs font-semibold tabular-nums shrink-0 ${isWinner ? 'text-success-text' : 'text-text-secondary'}`}>
            {score}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-md border overflow-hidden bg-surface ${
      isLive ? 'border-danger/40' : 'border-border'
    } ${compact ? 'w-[170px]' : 'w-[220px]'}`}>
      {isLive && (
        <div className="flex items-center justify-between px-2 py-0.5 bg-danger/10 border-b border-danger/20">
          <span className="text-[10px] font-semibold text-danger-text uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-text animate-pulse" />
            Live
          </span>
          {game.period && (
            <span className="text-[10px] text-text-muted">{game.period} {game.clock || ''}</span>
          )}
        </div>
      )}
      {isFinal && (
        <div className="px-2 py-0.5 border-b border-border/50 text-center">
          <span className="text-[10px] text-text-muted font-medium">Final</span>
        </div>
      )}
      {!isLive && !isFinal && game.startsAt && (
        <div className="px-2 py-0.5 border-b border-border/50 text-center">
          <span className="text-[10px] text-text-muted">
            {new Date(game.startsAt).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            })}
          </span>
        </div>
      )}
      <TeamRow participant={p1} score={game.participant1Score ?? null} slot={1} />
      <TeamRow participant={p2} score={game.participant2Score ?? null} slot={2} />
    </div>
  )
}

export function TournamentBracketView({ tournamentId, games: initialGames, participants }: TournamentBracketViewProps) {
  const [games, setGames] = useState(initialGames)
  const supabase = createClient()

  const participantMap = useMemo(() => {
    const m: Record<string, Participant> = {}
    for (const p of participants) m[p.id] = p
    return m
  }, [participants])

  // Real-time subscription for game updates
  useEffect(() => {
    const channel = supabase
      .channel(`tournament-bracket-${tournamentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'event_games',
        filter: `tournament_id=eq.${tournamentId}`,
      }, (payload) => {
        const updated = payload.new as Record<string, unknown>
        setGames(prev => prev.map(g =>
          g.id === updated.id ? {
            ...g,
            participant1Id: updated.participant_1_id as string | null,
            participant2Id: updated.participant_2_id as string | null,
            participant1Score: updated.participant_1_score as number | null,
            participant2Score: updated.participant_2_score as number | null,
            status: updated.status as string,
            winnerId: updated.winner_id as string | null,
            period: updated.period as string | null,
            clock: updated.clock as string | null,
          } : g
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, supabase])

  const bracketMap = useMemo(() => buildBracketMap(games), [games])
  const rounds = useMemo(() => getRounds(games), [games])
  const positions = useMemo(() => calculateCardPositions(rounds, bracketMap), [rounds, bracketMap])
  const totalHeight = useMemo(() => calculateBracketHeight(rounds), [rounds])

  const gameMap = useMemo(() => {
    const m: Record<string, Game> = {}
    for (const g of games) m[g.id] = g
    return m
  }, [games])

  // Build connector pairs
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

  // Find champion
  const championshipBracketGame = rounds.length > 0 ? rounds[rounds.length - 1].games[0] : null
  const championshipGame = championshipBracketGame ? gameMap[championshipBracketGame.id] : null
  const champion = championshipGame?.winnerId ? participantMap[championshipGame.winnerId] : null

  return (
    <div>
      {/* Desktop bracket */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div className="flex items-start" style={{ minWidth: 1000, height: totalHeight + 60 }}>
          {rounds.map((round, rIdx) => (
            <div key={round.round} className="flex items-start shrink-0">
              <div className="relative" style={{ width: 230 }}>
                <div className="text-center mb-2">
                  <div className="text-xs font-semibold text-text-secondary">
                    {ROUND_LABELS[round.round] || round.round}
                  </div>
                </div>
                <div className="relative" style={{ height: totalHeight }}>
                  {round.games.map(game => {
                    const g = gameMap[game.id]
                    return (
                      <div key={game.id} className="absolute left-1/2 -translate-x-1/2" style={{ top: positions[game.id] ?? 0 }}>
                        <ResultCard
                          game={g}
                          p1={g?.participant1Id ? participantMap[g.participant1Id] || null : null}
                          p2={g?.participant2Id ? participantMap[g.participant2Id] || null : null}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              {rIdx < rounds.length - 1 && connectorSets[rIdx] && (
                <div style={{ paddingTop: 34 }}>
                  <BracketConnectors pairs={connectorSets[rIdx].pairs} totalHeight={totalHeight} />
                </div>
              )}
            </div>
          ))}

          {/* Champion display */}
          {champion && (
            <div className="flex flex-col items-center justify-center shrink-0 ml-4" style={{ marginTop: totalHeight / 2 - 20 }}>
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Champion</div>
              <div className="border border-brand/30 bg-brand/10 rounded-lg px-4 py-2 text-center">
                {champion.logoUrl && <img src={champion.logoUrl} alt="" className="w-8 h-8 mx-auto mb-1 object-contain" />}
                <div className="text-sm font-semibold text-brand">{champion.name}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile stacked view */}
      <div className="block md:hidden space-y-6">
        {rounds.map(round => (
          <div key={round.round}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              {ROUND_LABELS[round.round] || round.round}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {round.games.map(game => {
                const g = gameMap[game.id]
                return (
                  <ResultCard
                    key={game.id}
                    game={g}
                    p1={g?.participant1Id ? participantMap[g.participant1Id] || null : null}
                    p2={g?.participant2Id ? participantMap[g.participant2Id] || null : null}
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
