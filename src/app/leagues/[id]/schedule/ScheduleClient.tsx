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
  selectedWeek: number | string
  initialGames: Game[]
  rosterSchoolIds: string[]
  weeksWithGames: number[]
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
  weeksWithGames,
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
          // Refetch games based on selection type
          let query = supabase
            .from('games')
            .select('*')
            .eq('season_id', seasonId)

          if (typeof selectedWeek === 'string') {
            if (selectedWeek === 'bowls') {
              query = query.gte('week_number', 17)
            } else if (selectedWeek === 'cfp') {
              query = query.eq('is_playoff_game', true)
            } else if (selectedWeek === 'natty') {
              query = query.eq('playoff_round', 'championship')
            }
          } else {
            query = query.eq('week_number', selectedWeek)
          }

          const { data } = await query
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

  const handleWeekChange = (value: string) => {
    router.push(`/leagues/${leagueId}/schedule?week=${value}`)
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

  // Week label helper
  const getWeekLabel = (week: number | string): string => {
    if (typeof week === 'string') {
      if (week === 'bowls') return 'Bowl Games'
      if (week === 'cfp') return 'CFP Bracket Games'
      if (week === 'natty') return 'National Championship'
      return week
    }
    if (week === 0) return 'Week 0 (Early)'
    if (week >= 1 && week <= 14) return `Week ${week}`
    if (week === 15) return 'Week 15 (Conf Champs)'
    if (week === 16) return 'Week 16 (Army-Navy)'
    return `Week ${week}`
  }

  // Regular season weeks (0-16)
  const regularWeeks = Array.from({ length: 17 }, (_, i) => i).filter(week =>
    week <= currentWeek || weeksWithGames.includes(week)
  )

  // Check if there are postseason games
  const hasPostseasonGames = weeksWithGames.some(w => w >= 17)

  // Postseason categories
  const postseasonCategories = hasPostseasonGames ? [
    { value: 'bowls', label: 'Bowl Games (All)' },
    { value: 'cfp', label: 'CFP Bracket Games' },
    { value: 'natty', label: 'National Championship' },
  ] : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={userName} userEmail={userEmail}>
        <Link
          href={`/leagues/${leagueId}/team`}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          My Roster
        </Link>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-text-secondary hover:text-text-primary transition-colors"
        >
          {leagueName}
        </Link>
        <Link href="/dashboard" className="text-text-secondary hover:text-text-primary transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-1">Schedule</h1>
          <p className="text-text-secondary">{seasonName}</p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border">
          <Link
            href={`/leagues/${leagueId}`}
            className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
          >
            League Home
          </Link>
          <Link
            href={`/leagues/${leagueId}/transactions`}
            className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
          >
            Add/Drop
          </Link>
          <Link
            href={`/leagues/${leagueId}/stats`}
            className="bg-surface hover:bg-surface-subtle text-text-primary text-sm py-2 px-4 rounded-lg transition-colors"
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
                ? 'bg-brand text-text-primary'
                : 'bg-surface text-text-secondary hover:bg-surface-subtle'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveView('bracket')}
            className={`flex-1 py-3 px-4 text-sm font-medium rounded-r-lg transition-colors ${
              activeView === 'bracket'
                ? 'bg-accent text-text-primary'
                : 'bg-surface text-text-secondary hover:bg-surface-subtle'
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
            onChange={(e) => handleWeekChange(e.target.value)}
            className="bg-surface text-text-primary text-sm rounded-lg px-4 py-2 border border-border focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <optgroup label="Regular Season">
              {regularWeeks.map((week) => (
                <option key={week} value={week}>
                  {getWeekLabel(week)}{week === currentWeek ? ' (Current)' : ''}
                </option>
              ))}
            </optgroup>
            {postseasonCategories.length > 0 && (
              <optgroup label="Postseason">
                {postseasonCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-brand text-text-primary'
                  : 'bg-surface text-text-secondary hover:bg-surface-subtle'
              }`}
            >
              All Games ({games.length})
            </button>
            <button
              onClick={() => setFilter('roster')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === 'roster'
                  ? 'bg-info text-text-primary'
                  : 'bg-surface text-text-secondary hover:bg-surface-subtle'
              }`}
            >
              My Roster ({rosterGamesCount})
            </button>
            <button
              onClick={() => setFilter('ranked')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === 'ranked'
                  ? 'bg-accent text-text-primary'
                  : 'bg-surface text-text-secondary hover:bg-surface-subtle'
              }`}
            >
              Ranked
            </button>
            {liveGamesCount > 0 && (
              <button
                onClick={() => setFilter('live')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                  filter === 'live'
                    ? 'bg-danger text-text-primary'
                    : 'bg-surface text-text-secondary hover:bg-surface-subtle'
                }`}
              >
                <span className="w-2 h-2 bg-danger rounded-full animate-pulse"></span>
                Live ({liveGamesCount})
              </button>
            )}
          </div>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div className="bg-surface rounded-lg p-8 text-center">
            <p className="text-text-secondary">No games found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...gamesByDate.entries()].map(([date, dateGames]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-text-secondary mb-3">
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
                        className={`bg-surface rounded-lg p-4 border ${
                          isLive
                            ? 'border-danger/50 bg-danger/10'
                            : isRosterGame
                            ? 'border-info/30'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Away Team */}
                          <div className={`flex items-center gap-3 flex-1 ${awayWon ? '' : isCompleted ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-2">
                              {game.away_rank && game.away_rank <= 25 && (
                                <span className="text-xs text-warning-text font-medium w-4">
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
                                <div className="w-8 h-8 bg-surface-subtle rounded-full" />
                              )}
                            </div>
                            <div>
                              <p className={`font-medium ${
                                isAwayRoster ? 'text-info-text' : 'text-text-primary'
                              } ${awayWon ? 'text-success-text' : ''}`}>
                                {game.away_team_name || 'TBD'}
                              </p>
                            </div>
                          </div>

                          {/* Score / Time */}
                          <div className="flex flex-col items-center px-4 min-w-[100px]">
                            {isLive ? (
                              <>
                                <div className="flex items-center gap-3 text-xl font-bold">
                                  <span className={game.possession_team_id === game.away_school_id ? 'text-warning-text' : 'text-text-primary'}>
                                    {game.away_score ?? 0}
                                    {game.possession_team_id === game.away_school_id && <span className="text-xs ml-0.5">\u25C0</span>}
                                  </span>
                                  <span className="text-text-muted">-</span>
                                  <span className={game.possession_team_id === game.home_school_id ? 'text-warning-text' : 'text-text-primary'}>
                                    {game.possession_team_id === game.home_school_id && <span className="text-xs mr-0.5">\u25B6</span>}
                                    {game.home_score ?? 0}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-danger-text">
                                  <span className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse"></span>
                                  {game.quarter && game.clock
                                    ? `Q${game.quarter} ${game.clock}`
                                    : 'LIVE'}
                                </div>
                                {game.down_distance && (
                                  <div className={`text-xs mt-0.5 ${game.is_red_zone ? 'text-danger-text font-medium' : 'text-text-secondary'}`}>
                                    {game.is_red_zone && '\u{1F3C8} '}
                                    {game.down_distance}
                                  </div>
                                )}
                              </>
                            ) : isCompleted ? (
                              <>
                                <div className="flex items-center gap-3 text-xl font-bold">
                                  <span className={awayWon ? 'text-success-text' : 'text-text-secondary'}>
                                    {game.away_score}
                                  </span>
                                  <span className="text-text-muted">-</span>
                                  <span className={homeWon ? 'text-success-text' : 'text-text-secondary'}>
                                    {game.home_score}
                                  </span>
                                </div>
                                <span className="text-xs text-text-muted">Final</span>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-text-secondary">
                                  {game.game_time
                                    ? new Date(`2000-01-01T${game.game_time}`).toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })
                                    : 'TBD'}
                                </span>
                                {game.broadcast && (
                                  <span className="text-xs text-text-muted">{game.broadcast}</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Home Team */}
                          <div className={`flex items-center gap-3 flex-1 justify-end ${homeWon ? '' : isCompleted ? 'opacity-60' : ''}`}>
                            <div className="text-right">
                              <p className={`font-medium ${
                                isHomeRoster ? 'text-info-text' : 'text-text-primary'
                              } ${homeWon ? 'text-success-text' : ''}`}>
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
                                <div className="w-8 h-8 bg-surface-subtle rounded-full" />
                              )}
                              {game.home_rank && game.home_rank <= 25 && (
                                <span className="text-xs text-warning-text font-medium w-4">
                                  #{game.home_rank}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Game Info */}
                        {(game.is_conference_game || game.is_playoff_game || game.bowl_name) && (
                          <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs">
                            {game.is_conference_game && (
                              <span className="bg-highlight-row text-brand-text px-2 py-0.5 rounded">
                                Conference
                              </span>
                            )}
                            {game.is_playoff_game && (
                              <span className="bg-accent/20 text-accent-text px-2 py-0.5 rounded">
                                CFP
                              </span>
                            )}
                            {game.bowl_name && (
                              <span className="text-text-muted">{game.bowl_name}</span>
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
        <div className="mt-6 flex items-center gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border border-info/30 rounded"></div>
            <span>My Roster</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-danger rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-warning-text">#</span>
            <span>Ranked</span>
          </div>
        </div>
        </>
        )}

        {/* CFP Bracket View */}
        {activeView === 'bracket' && (
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
              <span className="text-accent-text">🏆</span>
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
