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
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('season_id', seasonId)
      .eq('is_playoff_game', true)
      .not('playoff_round', 'is', null)
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })

    if (data) {
      // Filter to only CFP games (12-team format: 11 total games max)
      const cfpGames = data.filter(game => {
        const round = game.playoff_round?.toLowerCase()
        const bowl = game.bowl_name?.toLowerCase() || ''
        // Only include games with explicit playoff_round or known CFP bowl names
        return round === 'first_round' ||
               round === 'quarterfinal' ||
               round === 'semifinal' ||
               round === 'championship' ||
               bowl.includes('national championship') ||
               bowl.includes('cotton bowl') ||
               bowl.includes('orange bowl') ||
               bowl.includes('sugar bowl') ||
               bowl.includes('rose bowl') ||
               bowl.includes('peach bowl') ||
               bowl.includes('fiesta bowl')
      })
      setGames(cfpGames.slice(0, 11)) // Max 11 games in 12-team CFP
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

    // Ensure proper ordering and fill in bye placeholders
    rounds.first_round = ensureFirstRoundSlots(rounds.first_round)
    rounds.quarterfinal = ensureQuarterfinalSlots(rounds.quarterfinal)
    rounds.semifinal = ensureSemifinalSlots(rounds.semifinal)
    rounds.championship = ensureChampionshipSlot(rounds.championship)

    setBracketGames(rounds)
  }

  const determineRound = (game: PlayoffGame): RoundType => {
    const bowlName = game.bowl_name?.toLowerCase() || ''
    const playoffRound = game.playoff_round?.toLowerCase() || ''

    if (playoffRound === 'championship' || bowlName.includes('national championship')) {
      return 'championship'
    }
    if (playoffRound === 'semifinal' || bowlName.includes('semifinal') ||
        bowlName.includes('cotton bowl') || bowlName.includes('orange bowl') ||
        bowlName.includes('sugar bowl') || bowlName.includes('rose bowl')) {
      return 'semifinal'
    }
    if (playoffRound === 'quarterfinal' || bowlName.includes('quarterfinal') ||
        bowlName.includes('peach bowl') || bowlName.includes('fiesta bowl')) {
      return 'quarterfinal'
    }
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
    // 4 first round games expected (seeds 5v12, 6v11, 7v10, 8v9)
    while (games.length < 4) {
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
    return (
      <div
        className={`flex items-center gap-2 p-2 ${
          team.isWinner ? 'bg-green-900/30 border-green-500' :
          team.isOnRoster ? 'bg-purple-900/20 border-purple-500' :
          'bg-gray-700/50 border-gray-600'
        } border-l-2`}
      >
        {team.seed && (
          <span className="text-xs text-gray-400 w-4">{team.seed}</span>
        )}
        {team.logo ? (
          <img src={team.logo} alt="" className="w-6 h-6 object-contain" />
        ) : (
          <div className="w-6 h-6 bg-gray-600 rounded" />
        )}
        <span className={`flex-1 text-sm truncate ${
          team.isOnRoster ? 'text-purple-300 font-medium' : 'text-white'
        }`}>
          {team.name}
        </span>
        {team.score !== null && team.score !== undefined && (
          <span className={`text-sm font-bold ${
            team.isWinner ? 'text-green-400' : 'text-gray-400'
          }`}>
            {team.score}
          </span>
        )}
        {isLive && (
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    )
  }

  const renderMatchup = (bracketGame: BracketGame) => {
    const isLive = bracketGame.game?.status === 'live'
    const gameInfo = bracketGame.game

    return (
      <div className="w-48">
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          {renderTeamSlot(bracketGame.topTeam, isLive)}
          <div className="border-t border-gray-600" />
          {renderTeamSlot(bracketGame.bottomTeam, isLive)}
        </div>
        {gameInfo && (
          <div className="text-center mt-1">
            {gameInfo.status === 'live' ? (
              <span className="text-xs text-yellow-400 animate-pulse">
                Q{gameInfo.quarter} {gameInfo.clock}
              </span>
            ) : gameInfo.status === 'completed' ? (
              <span className="text-xs text-green-400">Final</span>
            ) : (
              <span className="text-xs text-gray-500">
                {new Date(`${gameInfo.game_date}T${gameInfo.game_time || '12:00:00'}`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
            {gameInfo.bowl_name && (
              <p className="text-xs text-gray-500 truncate">{gameInfo.bowl_name}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Playoff Bracket</h2>
        <div className="animate-pulse flex gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-4">
              {[1, 2, 3, 4].slice(0, 5 - i).map(j => (
                <div key={j} className="w-48 h-20 bg-gray-700 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Playoff Bracket</h2>
        <p className="text-gray-400">Playoff games have not been scheduled yet.</p>
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
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">College Football Playoff</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-purple-500/30 border border-purple-500 rounded" />
            <span className="text-gray-400">On Roster</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500/30 border border-green-500 rounded" />
            <span className="text-gray-400">Winner</span>
          </span>
        </div>
      </div>

      {/* Roster Schools in Playoffs Summary */}
      {rosterSchoolsInfo.length > 0 && (
        <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400 font-medium">Your Schools in the Playoffs</span>
            <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {rosterSchoolsInfo.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {rosterSchoolsInfo.map((school) => (
              <div
                key={school.id}
                className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-purple-500/30"
              >
                {school.logo ? (
                  <img src={school.logo} alt="" className="w-6 h-6 object-contain" />
                ) : (
                  <div className="w-6 h-6 bg-gray-600 rounded" />
                )}
                <span className="text-purple-300 text-sm font-medium">{school.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket layout - horizontal scroll on mobile */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {/* First Round */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 text-center">First Round</h3>
            <div className="space-y-8">
              {bracketGames.first_round.map((game, idx) => (
                <div key={idx}>{renderMatchup(game)}</div>
              ))}
            </div>
          </div>

          {/* Quarterfinals */}
          <div className="space-y-4 pt-8">
            <h3 className="text-sm font-medium text-gray-400 text-center">Quarterfinals</h3>
            <div className="space-y-16">
              {bracketGames.quarterfinal.map((game, idx) => (
                <div key={idx}>{renderMatchup(game)}</div>
              ))}
            </div>
          </div>

          {/* Semifinals */}
          <div className="space-y-4 pt-24">
            <h3 className="text-sm font-medium text-gray-400 text-center">Semifinals</h3>
            <div className="space-y-32">
              {bracketGames.semifinal.map((game, idx) => (
                <div key={idx}>{renderMatchup(game)}</div>
              ))}
            </div>
          </div>

          {/* Championship */}
          <div className="space-y-4 pt-40">
            <h3 className="text-sm font-medium text-gray-400 text-center">Championship</h3>
            <div>
              {bracketGames.championship.map((game, idx) => (
                <div key={idx}>{renderMatchup(game)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
