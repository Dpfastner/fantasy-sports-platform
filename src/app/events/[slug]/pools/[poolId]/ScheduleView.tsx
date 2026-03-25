'use client'

import { useState } from 'react'
import { TournamentBracketView } from './TournamentBracketView'
import { StandingsTable } from './StandingsTable'

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
  sport?: string
}

const roundLabels: Record<string, string> = {
  regional_quarterfinal: 'Regional Quarterfinals',
  regional_final: 'Regional Finals',
  semifinal: 'Frozen Four Semifinals',
  championship: 'Championship',
  third_place: 'Third Place',
}


export function ScheduleView({ games, participants, format, tournamentId, sport }: ScheduleViewProps) {
  const [view, setView] = useState<'list' | 'bracket' | 'table'>('list')
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
    'round_1', 'round_2', 'round_3', 'round_4', 'round_5',
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
      <div className="bg-surface rounded-lg p-8 text-center">
        <p className="text-text-secondary">No games scheduled yet.</p>
        <p className="text-text-muted text-sm mt-1">Games will appear here when the schedule is set.</p>
      </div>
    )
  }

  const showBracketToggle = format === 'bracket' && tournamentId
  const showTableToggle = sport === 'rugby' && tournamentId

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

      {/* Schedule/Table toggle for rugby */}
      {showTableToggle && (
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
            onClick={() => setView('table')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
              view === 'table' ? 'bg-accent text-text-primary' : 'bg-surface text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            Table
          </button>
        </div>
      )}

      {/* Table view */}
      {view === 'table' && tournamentId ? (
        <StandingsTable tournamentId={tournamentId} />
      ) : view === 'bracket' && tournamentId ? (
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
            <h3 className="text-sm font-semibold text-text-secondary mb-3">{label}</h3>
            <div className="space-y-2">
              {roundGames.sort((a, b) => a.gameNumber - b.gameNumber).map(game => {
                const p1 = game.participant1Id ? participantMap.get(game.participant1Id) : null
                const p2 = game.participant2Id ? participantMap.get(game.participant2Id) : null
                const isLive = game.status === 'live'
                const isFinal = game.status === 'completed' || game.status === 'final'
                const p1Won = isFinal && game.winnerId === game.participant1Id
                const p2Won = isFinal && game.winnerId === game.participant2Id
                const hasScores = game.participant1Score != null && game.participant2Score != null

                return (
                  <div
                    key={game.id}
                    className={`bg-surface rounded-lg border overflow-hidden ${
                      isLive ? 'border-danger/30' : 'border-border'
                    }`}
                  >
                    {/* Status bar */}
                    <div className={`px-3 py-1.5 text-center border-b ${
                      isLive ? 'bg-danger/5 border-danger/20' : 'bg-surface-inset border-border'
                    }`}>
                      <span className="text-[10px] text-text-muted">Game {game.gameNumber}</span>
                      {isLive ? (
                        <div className="flex items-center justify-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-danger-text">
                            <span className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse" />
                            LIVE
                          </span>
                          {(game.period || game.clock) && (
                            <span className="text-[10px] text-text-muted">
                              {game.period}{game.period && game.clock && ' · '}{game.clock}
                            </span>
                          )}
                        </div>
                      ) : isFinal ? (
                        <div className="text-[10px] font-medium text-text-muted mt-0.5">Final</div>
                      ) : (
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {game.startsAt ? new Date(game.startsAt).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit',
                          }) : 'TBD'}
                        </div>
                      )}
                    </div>

                    {/* Horizontal matchup: Team 1 | vs | Team 2 */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
                      {/* Team 1 — left */}
                      <div className={`flex flex-col items-center justify-center gap-1 p-3 min-h-[80px] ${
                        p1Won ? 'bg-success/5' : ''
                      }`}>
                        {p1?.logoUrl && <img src={p1.logoUrl} alt="" className="w-8 h-8 rounded-sm object-contain" />}
                        {p1?.seed ? <span className="text-[9px] text-text-muted">#{p1.seed}</span> : null}
                        <span className={`text-xs font-medium text-center leading-tight ${
                          p1Won ? 'text-success-text'
                            : isFinal && !p1Won ? 'opacity-50 text-text-muted'
                            : 'text-text-primary'
                        }`}>
                          {p1?.name || 'TBD'}
                        </span>
                        {(isLive || isFinal) && hasScores && (
                          <span className={`text-lg font-mono font-bold tabular-nums ${
                            isLive ? 'text-text-primary' : p1Won ? 'text-success-text' : 'text-text-muted'
                          }`}>
                            {game.participant1Score}
                          </span>
                        )}
                        {p1Won && (
                          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Center divider */}
                      <div className="flex items-center justify-center px-1">
                        <span className="text-[10px] text-text-muted font-medium">vs</span>
                      </div>

                      {/* Team 2 — right */}
                      <div className={`flex flex-col items-center justify-center gap-1 p-3 min-h-[80px] ${
                        p2Won ? 'bg-success/5' : ''
                      }`}>
                        {p2?.logoUrl && <img src={p2.logoUrl} alt="" className="w-8 h-8 rounded-sm object-contain" />}
                        {p2?.seed ? <span className="text-[9px] text-text-muted">#{p2.seed}</span> : null}
                        <span className={`text-xs font-medium text-center leading-tight ${
                          p2Won ? 'text-success-text'
                            : isFinal && !p2Won ? 'opacity-50 text-text-muted'
                            : 'text-text-primary'
                        }`}>
                          {p2?.name || 'TBD'}
                        </span>
                        {(isLive || isFinal) && hasScores && (
                          <span className={`text-lg font-mono font-bold tabular-nums ${
                            isLive ? 'text-text-primary' : p2Won ? 'text-success-text' : 'text-text-muted'
                          }`}>
                            {game.participant2Score}
                          </span>
                        )}
                        {p2Won && (
                          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Golf live status */}
                    {game.liveStatus && (
                      <div className="text-xs text-text-muted border-t border-border px-3 py-1.5">
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
