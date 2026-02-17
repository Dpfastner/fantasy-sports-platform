'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/Header'
import { PlayoffBracket } from '@/components/PlayoffBracket'

interface Game {
  id: string
  game_date: string
  game_time: string | null
  week_number: number
  status: string
  home_school_id: string | null
  away_school_id: string | null
  home_team_name: string | null
  away_team_name: string | null
  home_team_logo_url: string | null
  away_team_logo_url: string | null
  home_score: number | null
  away_score: number | null
  home_rank: number | null
  away_rank: number | null
  is_conference_game: boolean
  is_playoff_game: boolean
  bowl_name: string | null
  quarter: string | null
  clock: string | null
  broadcast: string | null
  possession_team_id: string | null
  down_distance: string | null
  is_red_zone: boolean
}

interface Props {
  leagueId: string
  leagueName: string
  seasonId: string
  seasonName: string
  year: number
  currentWeek: number
  selectedWeek: number
  initialGames: Game[]
  rosterSchoolIds: string[]
  userName?: string | null
  userEmail?: string | null
}

export default function ScheduleClient({
  leagueId,
  leagueName,
  seasonId,
  seasonName,
  year,
  currentWeek,
  selectedWeek,
  initialGames,
  rosterSchoolIds,
  userName,
  userEmail,
}: Props) {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>(initialGames)
  const [filter, setFilter] = useState<'all' | 'roster' | 'ranked' | 'live'>('all')
  const [activeView, setActiveView] = useState<'schedule' | 'bracket'>('schedule')

  // Update games when initialGames prop changes (after navigation)
  useEffect(() => {
    setGames(initialGames)
  }, [initialGames])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to real-time game updates
    const channel = supabase
      .channel('schedule-games')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `season_id=eq.${seasonId}`,
        },
        async () => {
          // Refetch games on any change
          const { data } = await supabase
            .from('games')
            .select('*')
            .eq('season_id', seasonId)
            .eq('week_number', selectedWeek)
            .order('game_date', { ascending: true })
            .order('game_time', { ascending: true })

          if (data) {
            setGames(data)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [seasonId, selectedWeek])

  const handleWeekChange = (week: number) => {
    router.push(`/leagues/${leagueId}/schedule?week=${week}`)
  }

  // Filter games
  const filteredGames = games.filter(game => {
    if (filter === 'roster') {
      return rosterSchoolIds.includes(game.home_school_id || '') ||
             rosterSchoolIds.includes(game.away_school_id || '')
    }
    if (filter === 'ranked') {
      return game.home_rank !== null || game.away_rank !== null
    }
    if (filter === 'live') {
      return game.status === 'live'
    }
    return true
  })

  // Group games by date
  const gamesByDate = new Map<string, Game[]>()
  for (const game of filteredGames) {
    const date = game.game_date
    if (!gamesByDate.has(date)) {
      gamesByDate.set(date, [])
    }
    gamesByDate.get(date)!.push(game)
  }

  const liveGamesCount = games.filter(g => g.status === 'live').length
  const rosterGamesCount = games.filter(g =>
    rosterSchoolIds.includes(g.home_school_id || '') ||
    rosterSchoolIds.includes(g.away_school_id || '')
  ).length

  // Weeks 1-15 regular season + weeks 16-20 postseason/bowls
  const weeks = Array.from({ length: 20 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Header userName={userName} userEmail={userEmail}>
        <Link
          href={`/leagues/${leagueId}/team`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          My Roster
        </Link>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {leagueName}
        </Link>
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Schedule</h1>
          <p className="text-gray-400">{seasonName}</p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-gray-700">
          <Link
            href={`/leagues/${leagueId}`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Home
          </Link>
          <Link
            href={`/leagues/${leagueId}/transactions`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Add/Drop
          </Link>
          <Link
            href={`/leagues/${leagueId}/stats`}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Stats
          </Link>
        </div>

        {/* Schedule / Bracket Toggle */}
        <div className="flex mb-6">
          <button
            onClick={() => setActiveView('schedule')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-l-lg transition-colors ${
              activeView === 'schedule'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveView('bracket')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
              activeView === 'bracket'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            CFP Bracket
          </button>
        </div>

        {activeView === 'schedule' && (
        <>
        {/* Week Selector and Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <select
            value={selectedWeek}
            onChange={(e) => handleWeekChange(parseInt(e.target.value))}
            className="bg-gray-700 text-white text-sm rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {weeks.map((week) => (
              <option key={week} value={week}>
                Week {week} {week === currentWeek ? '(Current)' : ''}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              All Games ({games.length})
            </button>
            <button
              onClick={() => setFilter('roster')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === 'roster'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              My Roster ({rosterGamesCount})
            </button>
            <button
              onClick={() => setFilter('ranked')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === 'ranked'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Ranked
            </button>
            {liveGamesCount > 0 && (
              <button
                onClick={() => setFilter('live')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                  filter === 'live'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Live ({liveGamesCount})
              </button>
            )}
          </div>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No games found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...gamesByDate.entries()].map(([date, dateGames]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <div className="space-y-2">
                  {dateGames.map((game) => {
                    const isHomeRoster = rosterSchoolIds.includes(game.home_school_id || '')
                    const isAwayRoster = rosterSchoolIds.includes(game.away_school_id || '')
                    const isRosterGame = isHomeRoster || isAwayRoster
                    const isLive = game.status === 'live'
                    const isCompleted = game.status === 'completed'
                    const homeWon = isCompleted && (game.home_score || 0) > (game.away_score || 0)
                    const awayWon = isCompleted && (game.away_score || 0) > (game.home_score || 0)

                    return (
                      <div
                        key={game.id}
                        className={`bg-gray-800 rounded-lg p-4 border ${
                          isLive
                            ? 'border-red-500/50 bg-red-900/10'
                            : isRosterGame
                            ? 'border-purple-500/30'
                            : 'border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Away Team */}
                          <div className={`flex items-center gap-3 flex-1 ${awayWon ? '' : isCompleted ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-2">
                              {game.away_rank && game.away_rank <= 25 && (
                                <span className="text-xs text-yellow-400 font-medium w-4">
                                  #{game.away_rank}
                                </span>
                              )}
                              {game.away_team_logo_url ? (
                                <img
                                  src={game.away_team_logo_url}
                                  alt=""
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-600 rounded-full" />
                              )}
                            </div>
                            <div>
                              <p className={`font-medium ${
                                isAwayRoster ? 'text-purple-300' : 'text-white'
                              } ${awayWon ? 'text-green-400' : ''}`}>
                                {game.away_team_name || 'TBD'}
                              </p>
                            </div>
                          </div>

                          {/* Score / Time */}
                          <div className="flex flex-col items-center px-4 min-w-[100px]">
                            {isLive ? (
                              <>
                                <div className="flex items-center gap-3 text-xl font-bold">
                                  <span className={game.possession_team_id === game.away_school_id ? 'text-yellow-400' : 'text-white'}>
                                    {game.away_score ?? 0}
                                    {game.possession_team_id === game.away_school_id && <span className="text-xs ml-0.5">\u25C0</span>}
                                  </span>
                                  <span className="text-gray-500">-</span>
                                  <span className={game.possession_team_id === game.home_school_id ? 'text-yellow-400' : 'text-white'}>
                                    {game.possession_team_id === game.home_school_id && <span className="text-xs mr-0.5">\u25B6</span>}
                                    {game.home_score ?? 0}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-red-400">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                  {game.quarter && game.clock
                                    ? `Q${game.quarter} ${game.clock}`
                                    : 'LIVE'}
                                </div>
                                {game.down_distance && (
                                  <div className={`text-xs mt-0.5 ${game.is_red_zone ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                                    {game.is_red_zone && '\u{1F3C8} '}
                                    {game.down_distance}
                                  </div>
                                )}
                              </>
                            ) : isCompleted ? (
                              <>
                                <div className="flex items-center gap-3 text-xl font-bold">
                                  <span className={awayWon ? 'text-green-400' : 'text-gray-400'}>
                                    {game.away_score}
                                  </span>
                                  <span className="text-gray-500">-</span>
                                  <span className={homeWon ? 'text-green-400' : 'text-gray-400'}>
                                    {game.home_score}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">Final</span>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-gray-400">
                                  {game.game_time
                                    ? new Date(`2000-01-01T${game.game_time}`).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })
                                    : 'TBD'}
                                </span>
                                {game.broadcast && (
                                  <span className="text-xs text-gray-500">{game.broadcast}</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Home Team */}
                          <div className={`flex items-center gap-3 flex-1 justify-end ${homeWon ? '' : isCompleted ? 'opacity-60' : ''}`}>
                            <div className="text-right">
                              <p className={`font-medium ${
                                isHomeRoster ? 'text-purple-300' : 'text-white'
                              } ${homeWon ? 'text-green-400' : ''}`}>
                                {game.home_team_name || 'TBD'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {game.home_team_logo_url ? (
                                <img
                                  src={game.home_team_logo_url}
                                  alt=""
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-600 rounded-full" />
                              )}
                              {game.home_rank && game.home_rank <= 25 && (
                                <span className="text-xs text-yellow-400 font-medium w-4">
                                  #{game.home_rank}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Game Info */}
                        {(game.is_conference_game || game.is_playoff_game || game.bowl_name) && (
                          <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2 text-xs">
                            {game.is_conference_game && (
                              <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                                Conference
                              </span>
                            )}
                            {game.is_playoff_game && (
                              <span className="bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded">
                                CFP
                              </span>
                            )}
                            {game.bowl_name && (
                              <span className="text-gray-500">{game.bowl_name}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-purple-500/30 rounded"></div>
            <span>My Roster</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">#</span>
            <span>Ranked</span>
          </div>
        </div>
        </>
        )}

        {/* CFP Bracket View */}
        {activeView === 'bracket' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="text-orange-400">🏆</span>
              College Football Playoff Bracket
            </h2>
            <PlayoffBracket
              seasonId={seasonId}
              rosterSchoolIds={rosterSchoolIds}
              leagueId={leagueId}
            />
          </div>
        )}
      </main>
    </div>
  )
}
