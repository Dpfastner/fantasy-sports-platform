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
    // CFP 12-team format bracket positions (top to bottom):
    // First Round: #8v9, #5v12, #6v11, #7v10
    // Byes: #1 (above 8v9), #4 (above 5v12), #3 (above 6v11), #2 (above 7v10)
    // QF: #1vR1w, #4vR1w, #3vR1w, #2vR1w
    // SF: QF1vQF2 (top half), QF3vQF4 (bottom half)

    const FIRST_ROUND_PAIRS = [[8, 9], [5, 12], [6, 11], [7, 10]]
    const BYE_SEED_POS: Record<number, number> = { 1: 0, 4: 1, 3: 2, 2: 3 }
    const TOP_HALF_SEEDS = new Set([1, 4, 5, 8, 9, 12])

    const rounds: Record<RoundType, BracketGame[]> = {
      first_round: [],
      quarterfinal: [],
      semifinal: [],
      championship: []
    }

    // Group games by round
    for (const game of games) {
      const round = determineRound(game)
      const bracketGame = createBracketGame(game, round)
      rounds[round].push(bracketGame)
    }

    // ── Sort first-round games by ESPN seed pair ──
    const getFirstRoundPos = (g: BracketGame): number => {
      const seeds = [g.topTeam.seed, g.bottomTeam.seed].filter(Boolean) as number[]
      for (let i = 0; i < FIRST_ROUND_PAIRS.length; i++) {
        if (seeds.some(s => FIRST_ROUND_PAIRS[i].includes(s))) return i
      }
      return 99
    }
    rounds.first_round.sort((a, b) => getFirstRoundPos(a) - getFirstRoundPos(b))

    // ── Detect and position bye teams ──
    const firstRoundSchoolIds = new Set<string>()
    for (const g of rounds.first_round) {
      if (g.game?.home_school_id) firstRoundSchoolIds.add(g.game.home_school_id)
      if (g.game?.away_school_id) firstRoundSchoolIds.add(g.game.away_school_id)
    }

    const byeTeams: { slot: BracketSlot; position: number }[] = []
    for (const qf of rounds.quarterfinal) {
      for (const slot of [qf.topTeam, qf.bottomTeam]) {
        if (slot.seed && slot.seed <= 4 && slot.schoolId && !firstRoundSchoolIds.has(slot.schoolId)) {
          byeTeams.push({ slot: { ...slot }, position: BYE_SEED_POS[slot.seed] ?? byeTeams.length })
        }
      }
    }
    byeTeams.sort((a, b) => a.position - b.position)

    // Interleave byes with sorted first-round games (bye above its paired game)
    if (byeTeams.length > 0) {
      const sortedGames = [...rounds.first_round]
      const combined: BracketGame[] = []
      for (let i = 0; i < Math.max(byeTeams.length, sortedGames.length); i++) {
        if (i < byeTeams.length) {
          const bt = byeTeams[i]
          combined.push({
            topTeam: {
              seed: bt.slot.seed,
              schoolId: bt.slot.schoolId,
              name: bt.slot.name || 'TBD',
              logo: bt.slot.logo,
              isOnRoster: bt.slot.isOnRoster,
            },
            bottomTeam: { name: 'BYE', isBye: true },
            round: 'first_round',
            position: combined.length,
          })
        }
        if (i < sortedGames.length) {
          combined.push(sortedGames[i])
        }
      }
      rounds.first_round = combined
    }

    // ── Sort quarterfinals by bye seed position ──
    const getQFPos = (g: BracketGame): number => {
      const seeds = [g.topTeam.seed, g.bottomTeam.seed].filter(Boolean) as number[]
      for (const s of seeds) {
        if (s >= 1 && s <= 4 && BYE_SEED_POS[s] !== undefined) return BYE_SEED_POS[s]
      }
      return 99
    }
    rounds.quarterfinal.sort((a, b) => getQFPos(a) - getQFPos(b))

    // ── Sort semifinals: top half vs bottom half ──
    const getSFPos = (g: BracketGame): number => {
      const seeds = [g.topTeam.seed, g.bottomTeam.seed].filter(Boolean) as number[]
      for (const s of seeds) {
        if (TOP_HALF_SEEDS.has(s)) return 0
      }
      return 1
    }
    rounds.semifinal.sort((a, b) => getSFPos(a) - getSFPos(b))

    // Ensure proper slot counts and fill TBD placeholders
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

    const homeSlot: BracketSlot = {
      seed: game.home_rank || undefined,
      schoolId: game.home_school_id,
      name: game.home_team_name || 'TBD',
      logo: game.home_team_logo_url,
      score: game.home_score,
      isWinner: homeIsWinner,
      isOnRoster: rosterSchoolIds.includes(game.home_school_id || ''),
      gameStatus: game.status
    }

    const awaySlot: BracketSlot = {
      seed: game.away_rank || undefined,
      schoolId: game.away_school_id,
      name: game.away_team_name || 'TBD',
      logo: game.away_team_logo_url,
      score: game.away_score,
      isWinner: awayIsWinner,
      isOnRoster: rosterSchoolIds.includes(game.away_school_id || ''),
      gameStatus: game.status
    }

    // Higher seed (lower number) goes on top
    const homeSeed = game.home_rank || 99
    const awaySeed = game.away_rank || 99

    return {
      game,
      topTeam: homeSeed <= awaySeed ? homeSlot : awaySlot,
      bottomTeam: homeSeed <= awaySeed ? awaySlot : homeSlot,
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
          team.isOnRoster ? 'bg-surface border-info' :
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
      <div className="w-36 md:w-48">
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
                <div key={j} className="w-36 md:w-48 h-20 bg-surface rounded" />
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
        <div className="mb-6 p-4 bg-surface border border-info/30 rounded-lg">
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

      {/* Scroll hint for mobile */}
      <div className="md:hidden px-4 py-2 bg-surface-inset text-text-secondary text-xs flex items-center gap-2 rounded-lg mb-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        Scroll right to see full bracket
      </div>

      {/* Bracket layout - horizontal scroll on mobile */}
      {(() => {
        const hasByes = bracketGames.first_round.length > 4
        return (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 md:gap-8 min-w-max items-stretch">
              {/* First Round — sets the overall height */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary text-center mb-4">First Round</h3>
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

              {/* Quarterfinals — flex-centered to align with first round pairs */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-text-secondary text-center mb-4">Quarterfinals</h3>
                <div className="flex-1 flex flex-col justify-around">
                  {bracketGames.quarterfinal.map((game, idx) => (
                    <div key={idx}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>

              {/* Semifinals — flex-centered to align with QF pairs */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-text-secondary text-center mb-4">Semifinals</h3>
                <div className="flex-1 flex flex-col justify-around">
                  {bracketGames.semifinal.map((game, idx) => (
                    <div key={idx}>{renderMatchup(game)}</div>
                  ))}
                </div>
              </div>

              {/* Championship — flex-centered */}
              <div className="flex flex-col">
                <h3 className="text-sm font-medium text-text-secondary text-center mb-4">Championship</h3>
                <div className="flex-1 flex flex-col justify-around">
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
