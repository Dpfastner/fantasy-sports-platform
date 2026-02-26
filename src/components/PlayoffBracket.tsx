'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PlayoffGame {
  id: string
  game_date: string
  game_time: string | null
  status: string
  home_school_id: string | null
  away_school_id: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  home_team_name: string | null
  away_team_name: string | null
  home_team_logo_url: string | null
  away_team_logo_url: string | null
  bowl_name: string | null
  quarter: string | null
  clock: string | null
  playoff_round: string | null
}

interface Props {
  seasonId: string
  rosterSchoolIds?: string[]
  leagueId?: string
}

type RoundType = 'first_round' | 'quarterfinal' | 'semifinal' | 'championship'

interface BracketSlot {
  seed?: number
  schoolId?: string | null
  name?: string
  logo?: string | null
  score?: number | null
  isWinner?: boolean
  isOnRoster?: boolean
  gameStatus?: string
  isBye?: boolean
}

interface BracketGame {
  game?: PlayoffGame
  topTeam: BracketSlot
  bottomTeam: BracketSlot
  round: RoundType
  position: number
}

export function PlayoffBracket({ seasonId, rosterSchoolIds = [], leagueId }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<PlayoffGame[]>([])
  const [bracketGames, setBracketGames] = useState<Record<RoundType, BracketGame[]>>({
    first_round: [],
    quarterfinal: [],
    semifinal: [],
    championship: []
  })

  useEffect(() => {
    loadPlayoffGames()

    // Set up real-time subscription for live games
    const channel = supabase
      .channel('playoff-games')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `season_id=eq.${seasonId}`
        },
        (payload) => {
          if (payload.new?.is_playoff_game) {
            setGames(prev => prev.map(g =>
              g.id === payload.new.id ? { ...g, ...payload.new } : g
            ))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [seasonId])

  useEffect(() => {
    if (games.length > 0) {
      organizeBracket()
    }
  }, [games])

  const loadPlayoffGames = async () => {
    setLoading(true)
    // Query for playoff games - more lenient to catch all possible playoff indicators
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_playoff_game', true)
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })

    if (data && data.length > 0) {
      // Filter to only CFP games (12-team format: 11 total games max)
      // Only include games that have an explicit playoff_round set
      const cfpGames = data.filter(game => {
        const round = game.playoff_round?.toLowerCase() || ''

        // Only include games with explicit CFP round set
        // This excludes regular bowl games that aren't part of the CFP
        return round === 'first_round' || round === 'quarterfinal' ||
               round === 'semifinal' || round === 'championship'
      })

      setGames(cfpGames.slice(0, 11))
    } else {
      setGames([])
    }
    setLoading(false)
  }

  const organizeBracket = () => {
    // CFP 12-team format:
    // First Round (4 games): Seeds 5-12 play (top 4 get byes)
    // Quarterfinals (4 games): Winners + bye teams
    // Semifinals (2 games): Quarterfinal winners
    // Championship (1 game): Semifinal winners

    const rounds: Record<RoundType, BracketGame[]> = {
      first_round: [],
      quarterfinal: [],
      semifinal: [],
      championship: []
    }

    // Group games by round based on bowl_name or playoff_round field
    for (const game of games) {
      const round = determineRound(game)
      const bracketGame = createBracketGame(game, round)
      rounds[round].push(bracketGame)
    }

    // Detect bye teams: seeds 1-4 appear in quarterfinals but NOT in first round
    const firstRoundSchoolIds = new Set<string>()
    for (const g of rounds.first_round) {
      if (g.game?.home_school_id) firstRoundSchoolIds.add(g.game.home_school_id)
      if (g.game?.away_school_id) firstRoundSchoolIds.add(g.game.away_school_id)
    }

    // For each quarterfinal game, find bye teams (seed 1-4, not in first round)
    // and create first-round bye entries so the bracket shows them properly
    const byeTeams: BracketSlot[] = []
    for (const qf of rounds.quarterfinal) {
      for (const slot of [qf.topTeam, qf.bottomTeam]) {
        if (slot.seed && slot.seed <= 4 && slot.schoolId && !firstRoundSchoolIds.has(slot.schoolId)) {
          byeTeams.push({ ...slot })
        }
      }
    }

    // Interleave bye entries with actual first-round games (bye above its paired game)
    if (byeTeams.length > 0) {
      const actualGames = [...rounds.first_round]
      const combined: BracketGame[] = []
      for (let i = 0; i < Math.max(byeTeams.length, actualGames.length); i++) {
        if (i < byeTeams.length) {
          const bt = byeTeams[i]
          combined.push({
            topTeam: {
              seed: bt.seed,
              schoolId: bt.schoolId,
              name: bt.name || 'TBD',
              logo: bt.logo,
              isOnRoster: bt.isOnRoster,
            },
            bottomTeam: { name: 'BYE', isBye: true },
            round: 'first_round',
            position: combined.length,
          })
        }
        if (i < actualGames.length) {
          combined.push(actualGames[i])
        }
      }
      rounds.first_round = combined
    }

    // Ensure proper ordering and fill in bye placeholders
    rounds.first_round = ensureFirstRoundSlots(rounds.first_round)
    rounds.quarterfinal = ensureQuarterfinalSlots(rounds.quarterfinal)
    rounds.semifinal = ensureSemifinalSlots(rounds.semifinal)
    rounds.championship = ensureChampionshipSlot(rounds.championship)

    setBracketGames(rounds)
  }

  const determineRound = (game: PlayoffGame): RoundType => {
    // Use the playoff_round field set by the sync API
    const round = game.playoff_round?.toLowerCase() || ''

    if (round === 'championship') return 'championship'
    if (round === 'semifinal') return 'semifinal'
    if (round === 'quarterfinal') return 'quarterfinal'
    return 'first_round'
  }

  const createBracketGame = (game: PlayoffGame, round: RoundType): BracketGame => {
    const homeIsWinner = game.status === 'completed' &&
      (game.home_score || 0) > (game.away_score || 0)
    const awayIsWinner = game.status === 'completed' &&
      (game.away_score || 0) > (game.home_score || 0)

    return {
      game,
      topTeam: {
        seed: game.away_rank || undefined,
        schoolId: game.away_school_id,
        name: game.away_team_name || 'TBD',
        logo: game.away_team_logo_url,
        score: game.away_score,
        isWinner: awayIsWinner,
        isOnRoster: rosterSchoolIds.includes(game.away_school_id || ''),
        gameStatus: game.status
      },
      bottomTeam: {
        seed: game.home_rank || undefined,
        schoolId: game.home_school_id,
        name: game.home_team_name || 'TBD',
        logo: game.home_team_logo_url,
        score: game.home_score,
        isWinner: homeIsWinner,
        isOnRoster: rosterSchoolIds.includes(game.home_school_id || ''),
        gameStatus: game.status
      },
      round,
      position: 0
    }
  }

  const ensureFirstRoundSlots = (games: BracketGame[]): BracketGame[] => {
    // If byes are present, expect 8 entries (4 bye + 4 games). Otherwise 4 games.
    const hasByes = games.some(g => g.bottomTeam.isBye || g.topTeam.isBye)
    const targetSlots = hasByes ? 8 : 4
    while (games.length < targetSlots) {
      games.push({
        topTeam: { name: 'TBD' },
        bottomTeam: { name: 'TBD' },
        round: 'first_round',
        position: games.length
      })
    }
    return games.map((g, i) => ({ ...g, position: i }))
  }

  const ensureQuarterfinalSlots = (games: BracketGame[]): BracketGame[] => {
    while (games.length < 4) {
      games.push({
        topTeam: { name: 'TBD' },
        bottomTeam: { name: 'TBD' },
        round: 'quarterfinal',
        position: games.length
      })
    }
    return games.map((g, i) => ({ ...g, position: i }))
  }

  const ensureSemifinalSlots = (games: BracketGame[]): BracketGame[] => {
    while (games.length < 2) {
      games.push({
        topTeam: { name: 'TBD' },
        bottomTeam: { name: 'TBD' },
        round: 'semifinal',
        position: games.length
      })
    }
    return games.map((g, i) => ({ ...g, position: i }))
  }

  const ensureChampionshipSlot = (games: BracketGame[]): BracketGame[] => {
    if (games.length === 0) {
      games.push({
        topTeam: { name: 'TBD' },
        bottomTeam: { name: 'TBD' },
        round: 'championship',
        position: 0
      })
    }
    return games
  }

  const renderTeamSlot = (team: BracketSlot, isLive: boolean = false) => {
    // BYE opponent slot - dimmed row
    if (team.isBye && team.name === 'BYE') {
      return (
        <div className="flex items-center gap-2 p-2 bg-surface/30 border-l-2 border-border">
          <span className="text-sm text-text-muted italic">BYE</span>
        </div>
      )
    }

    return (
      <div
        className={`flex items-center gap-2 p-2 ${
          team.isWinner ? 'bg-success/20 border-success' :
          team.isOnRoster ? 'bg-info/10 border-info' :
          'bg-surface-inset border-border'
        } border-l-2`}
      >
        {team.seed && (
          <span className="text-xs text-text-secondary w-4">{team.seed}</span>
        )}
        {team.logo ? (
          <img src={team.logo} alt="" className="w-6 h-6 object-contain" />
        ) : (
          <div className="w-6 h-6 bg-surface-subtle rounded" />
        )}
        <span className={`flex-1 text-sm truncate ${
          team.isOnRoster ? 'text-info-text font-medium' : 'text-text-primary'
        }`}>
          {team.name}
        </span>
        {team.score !== null && team.score !== undefined && (
          <span className={`text-sm font-bold ${
            team.isWinner ? 'text-success-text' : 'text-text-secondary'
          }`}>
            {team.score}
          </span>
        )}
        {isLive && (
          <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
        )}
      </div>
    )
  }

  const renderMatchup = (bracketGame: BracketGame) => {
    const isLive = bracketGame.game?.status === 'live'
    const gameInfo = bracketGame.game

    return (
      <div className="w-48">
        <div className="bg-surface rounded-lg overflow-hidden border border-border">
          {renderTeamSlot(bracketGame.topTeam, isLive)}
          <div className="border-t border-border" />
          {renderTeamSlot(bracketGame.bottomTeam, isLive)}
        </div>
        {gameInfo && (
          <div className="text-center mt-1">
            {gameInfo.status === 'live' ? (
              <span className="text-xs text-warning-text animate-pulse">
                Q{gameInfo.quarter} {gameInfo.clock}
              </span>
            ) : gameInfo.status === 'completed' ? (
              <span className="text-xs text-success-text">Final</span>
            ) : (
              <span className="text-xs text-text-muted">
                {new Date(`${gameInfo.game_date}T${gameInfo.game_time || '12:00:00'}`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
            {gameInfo.bowl_name && (
              <p className="text-xs text-text-muted truncate">{gameInfo.bowl_name}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Playoff Bracket</h2>
        <div className="animate-pulse flex gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-4">
              {[1, 2, 3, 4].slice(0, 5 - i).map(j => (
                <div key={j} className="w-48 h-20 bg-surface rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Playoff Bracket</h2>
        <p className="text-text-secondary">Playoff games have not been scheduled yet.</p>
      </div>
    )
  }

  // Find roster schools that are in the playoffs
  const rosterSchoolsInPlayoffs = new Set<string>()
  const rosterSchoolsInfo: { id: string; name: string; logo: string | null }[] = []

  for (const game of games) {
    if (game.home_school_id && rosterSchoolIds.includes(game.home_school_id)) {
      if (!rosterSchoolsInPlayoffs.has(game.home_school_id)) {
        rosterSchoolsInPlayoffs.add(game.home_school_id)
        rosterSchoolsInfo.push({
          id: game.home_school_id,
          name: game.home_team_name || 'Unknown',
          logo: game.home_team_logo_url
        })
      }
    }
    if (game.away_school_id && rosterSchoolIds.includes(game.away_school_id)) {
      if (!rosterSchoolsInPlayoffs.has(game.away_school_id)) {
        rosterSchoolsInPlayoffs.add(game.away_school_id)
        rosterSchoolsInfo.push({
          id: game.away_school_id,
          name: game.away_team_name || 'Unknown',
          logo: game.away_team_logo_url
        })
      }
    }
  }

  return (
    <div className="bg-surface rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-text-primary">College Football Playoff</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-info/30 border border-info rounded" />
            <span className="text-text-secondary">On Roster</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-success/30 border border-success rounded" />
            <span className="text-text-secondary">Winner</span>
          </span>
        </div>
      </div>

      {/* Roster Schools in Playoffs Summary */}
      {rosterSchoolsInfo.length > 0 && (
        <div className="mb-6 p-4 bg-info/10 border border-info/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-info-text font-medium">Your Schools in the Playoffs</span>
            <span className="bg-info text-text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {rosterSchoolsInfo.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {rosterSchoolsInfo.map((school) => (
              <div
                key={school.id}
                className="flex items-center gap-2 bg-surface/50 px-3 py-2 rounded-lg border border-info/30"
              >
                {school.logo ? (
                  <img src={school.logo} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <div className="w-6 h-6 bg-surface-subtle rounded" />
                )}
                <span className="text-info-text text-sm font-medium">{school.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket layout - horizontal scroll on mobile */}
      {(() => {
        const hasByes = bracketGames.first_round.length > 4
        return (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max">
              {/* First Round */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-secondary text-center">First Round</h3>
                {hasByes ? (
                  <div className="space-y-6">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className="space-y-1">
                        {bracketGames.first_round[i * 2] && renderMatchup(bracketGames.first_round[i * 2])}
                        {bracketGames.first_round[i * 2 + 1] && renderMatchup(bracketGames.first_round[i * 2 + 1])}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {bracketGames.first_round.map((game, idx) => (
                      <div key={idx}>{renderMatchup(game)}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quarterfinals */}
              <div className={`space-y-4 ${hasByes ? 'pt-14' : 'pt-8'}`}>
                <h3 className="text-sm font-medium text-text-secondary text-center">Quarterfinals</h3>
                <div className={hasByes ? 'space-y-28' : 'space-y-16'}>
                  {bracketGames.quarterfinal.map((game, idx) => (
                    <div key={idx}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>

              {/* Semifinals */}
              <div className={`space-y-4 ${hasByes ? 'pt-32' : 'pt-24'}`}>
                <h3 className="text-sm font-medium text-text-secondary text-center">Semifinals</h3>
                <div className={hasByes ? 'space-y-64' : 'space-y-32'}>
                  {bracketGames.semifinal.map((game, idx) => (
                    <div key={idx}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>

              {/* Championship */}
              <div className={`space-y-4 ${hasByes ? 'pt-56' : 'pt-40'}`}>
                <h3 className="text-sm font-medium text-text-secondary text-center">Championship</h3>
                <div>
                  {bracketGames.championship.map((game, idx) => (
                    <div key={idx}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
