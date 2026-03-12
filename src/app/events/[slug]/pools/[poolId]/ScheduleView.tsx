'use client'

import { useState } from 'react'
import { TournamentBracketView } from './TournamentBracketView'

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
  liveStatus?: string | null
  winnerId?: string | null
}

interface ScheduleViewProps {
  games: Game[]
  participants: Participant[]
  format: string
  tournamentId?: string
}

const roundLabels: Record<string, string> = {
  regional_quarterfinal: 'Regional Quarterfinals',
  regional_final: 'Regional Finals',
  semifinal: 'Frozen Four Semifinals',
  championship: 'Championship',
  third_place: 'Third Place',
}

function getStatusBadge(game: Game) {
  if (game.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger/20 text-danger-text">
        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
        LIVE {game.period && `- ${game.period}`} {game.clock && game.clock}
      </span>
    )
  }
  if (game.status === 'completed' || game.status === 'final') {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-inset text-text-muted">
        Final
      </span>
    )
  }
  if (game.startsAt) {
    return (
      <span className="text-[10px] text-text-muted">
        {new Date(game.startsAt).toLocaleString('en-US', {
          month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })}
      </span>
    )
  }
  return <span className="text-[10px] text-text-muted">TBD</span>
}

export function ScheduleView({ games, participants, format, tournamentId }: ScheduleViewProps) {
  const [view, setView] = useState<'list' | 'bracket'>('list')
  const participantMap = new Map(participants.map(p => [p.id, p]))

  // Group games by round
  const gamesByRound = new Map<string, Game[]>()
  for (const game of games) {
    const round = game.round || 'other'
    if (!gamesByRound.has(round)) gamesByRound.set(round, [])
    gamesByRound.get(round)!.push(game)
  }

  // Sort rounds in logical order
  const roundOrder = [
    'regional_quarterfinal', 'regional_final',
    'semifinal', 'championship', 'third_place',
    'Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5',
  ]
  const sortedRounds = [...gamesByRound.keys()].sort((a, b) => {
    const ai = roundOrder.indexOf(a)
    const bi = roundOrder.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  if (games.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted text-sm">No games scheduled yet.</p>
      </div>
    )
  }

  const showBracketToggle = format === 'bracket' && tournamentId

  return (
    <div className="space-y-6">
      {/* Schedule/Bracket toggle */}
      {showBracketToggle && (
        <div className="flex">
          <button
            onClick={() => setView('list')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-l-lg transition-colors ${
              view === 'list' ? 'bg-brand text-text-primary' : 'bg-surface text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setView('bracket')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
              view === 'bracket' ? 'bg-accent text-text-primary' : 'bg-surface text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            Bracket
          </button>
        </div>
      )}

      {/* Bracket view */}
      {view === 'bracket' && tournamentId ? (
        <TournamentBracketView
          tournamentId={tournamentId}
          games={games}
          participants={participants}
        />
      ) : (
        <>
      {sortedRounds.map(round => {
        const roundGames = gamesByRound.get(round) || []
        const label = roundLabels[round] || round.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

        return (
          <div key={round}>
            <h3 className="brand-h3 text-sm text-text-secondary mb-3">{label}</h3>
            <div className="space-y-2">
              {roundGames.sort((a, b) => a.gameNumber - b.gameNumber).map(game => {
                const p1 = game.participant1Id ? participantMap.get(game.participant1Id) : null
                const p2 = game.participant2Id ? participantMap.get(game.participant2Id) : null
                const isLive = game.status === 'live'
                const isFinal = game.status === 'completed' || game.status === 'final'

                return (
                  <div
                    key={game.id}
                    className={`bg-surface rounded-lg border p-3 ${
                      isLive ? 'border-danger/30 bg-danger/5' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-text-muted">Game {game.gameNumber}</span>
                      {getStatusBadge(game)}
                    </div>

                    {/* Matchup */}
                    <div className="space-y-1.5">
                      {/* Team 1 */}
                      <div className={`flex items-center justify-between ${
                        isFinal && game.winnerId === game.participant1Id ? 'text-text-primary font-medium' : 'text-text-secondary'
                      }`}>
                        <div className="flex items-center gap-2">
                          {p1?.seed && (
                            <span className="text-[10px] text-text-muted w-4 text-right">{p1.seed}</span>
                          )}
                          <span className="text-sm">{p1?.name || 'TBD'}</span>
                          {isFinal && game.winnerId === game.participant1Id && (
                            <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {(isLive || isFinal) && game.participant1Score != null && (
                          <span className={`text-sm font-mono ${isLive ? 'text-text-primary font-semibold' : ''}`}>
                            {game.participant1Score}
                          </span>
                        )}
                      </div>

                      {/* Team 2 */}
                      <div className={`flex items-center justify-between ${
                        isFinal && game.winnerId === game.participant2Id ? 'text-text-primary font-medium' : 'text-text-secondary'
                      }`}>
                        <div className="flex items-center gap-2">
                          {p2?.seed && (
                            <span className="text-[10px] text-text-muted w-4 text-right">{p2.seed}</span>
                          )}
                          <span className="text-sm">{p2?.name || 'TBD'}</span>
                          {isFinal && game.winnerId === game.participant2Id && (
                            <svg className="w-3.5 h-3.5 text-success" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {(isLive || isFinal) && game.participant2Score != null && (
                          <span className={`text-sm font-mono ${isLive ? 'text-text-primary font-semibold' : ''}`}>
                            {game.participant2Score}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Golf live status */}
                    {game.liveStatus && (
                      <div className="mt-2 text-xs text-text-muted border-t border-border pt-1.5">
                        {game.liveStatus}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
        </>
      )}
    </div>
  )
}
