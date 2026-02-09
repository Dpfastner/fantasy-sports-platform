'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  id: string
  name: string
  user_id: string
  total_points: number
  high_points_winnings: number
  primary_color: string
  secondary_color: string
  image_url: string | null
  profiles: { display_name: string | null; email: string } | null
}

interface WeeklyPoints {
  fantasy_team_id: string
  week_number: number
  points: number
  is_high_points_winner: boolean
  high_points_amount: number
}

interface LeagueSettings {
  high_points_enabled: boolean
  high_points_weekly_amount: number
}

interface Props {
  leagueId: string
  currentWeek: number
  currentUserId: string
  initialTeams: TeamData[]
  initialWeeklyPoints: WeeklyPoints[]
  settings: LeagueSettings | null
}

export default function EmbeddedLeaderboard({
  leagueId,
  currentWeek,
  currentUserId,
  initialTeams,
  initialWeeklyPoints,
  settings,
}: Props) {
  const [teams, setTeams] = useState<TeamData[]>(initialTeams)
  const [weeklyPoints, setWeeklyPoints] = useState<WeeklyPoints[]>(initialWeeklyPoints)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to fantasy_team_weekly_points changes
    const weeklyPointsChannel = supabase
      .channel('embedded-leaderboard-weekly-points')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fantasy_team_weekly_points',
          filter: `fantasy_team_id=in.(${initialTeams.map(t => t.id).join(',')})`,
        },
        async () => {
          setIsLive(true)
          setLastUpdate(new Date())

          const teamIds = initialTeams.map(t => t.id)
          const { data } = await supabase
            .from('fantasy_team_weekly_points')
            .select('*')
            .in('fantasy_team_id', teamIds)

          if (data) {
            setWeeklyPoints(data as WeeklyPoints[])
          }
        }
      )
      .subscribe()

    // Subscribe to fantasy_teams changes
    const teamsChannel = supabase
      .channel('embedded-leaderboard-teams')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fantasy_teams',
          filter: `league_id=eq.${leagueId}`,
        },
        async () => {
          setIsLive(true)
          setLastUpdate(new Date())

          const { data } = await supabase
            .from('fantasy_teams')
            .select(`
              id, name, user_id, total_points, high_points_winnings,
              primary_color, secondary_color, image_url,
              profiles!fantasy_teams_user_id_fkey(display_name, email)
            `)
            .eq('league_id', leagueId)
            .order('total_points', { ascending: false })

          if (data) {
            setTeams(data as unknown as TeamData[])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(weeklyPointsChannel)
      supabase.removeChannel(teamsChannel)
    }
  }, [leagueId, initialTeams])

  // Build weekly points map
  const weeklyPointsMap = new Map<string, Map<number, WeeklyPoints>>()
  for (const wp of weeklyPoints) {
    if (!weeklyPointsMap.has(wp.fantasy_team_id)) {
      weeklyPointsMap.set(wp.fantasy_team_id, new Map())
    }
    weeklyPointsMap.get(wp.fantasy_team_id)!.set(wp.week_number, wp)
  }

  // Find high points winners per week
  const highPointsWinners = new Map<number, { teamId: string; points: number; amount: number }[]>()
  for (const wp of weeklyPoints) {
    if (wp.is_high_points_winner) {
      if (!highPointsWinners.has(wp.week_number)) {
        highPointsWinners.set(wp.week_number, [])
      }
      highPointsWinners.get(wp.week_number)!.push({
        teamId: wp.fantasy_team_id,
        points: wp.points,
        amount: wp.high_points_amount,
      })
    }
  }

  // Show all regular season weeks (1-16) plus bonus columns
  const maxRegularWeek = 16
  const weeksToShow = Array.from({ length: Math.max(currentWeek, maxRegularWeek) }, (_, i) => i + 1)

  // Additional scoring columns after regular season
  const bonusColumns = [
    { key: 'bowls', label: 'Bowls' },
    { key: 'playoffs', label: 'CFP' },
    { key: 'heisman', label: 'Heis' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            Leaderboard
            {isLive && (
              <span className="flex items-center gap-1 text-xs font-normal text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
          </h2>
          <p className="text-gray-400 text-sm">
            Week {currentWeek}
            {lastUpdate && (
              <span className="text-gray-500 text-xs ml-2">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        {settings?.high_points_enabled && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-1.5 self-start">
            <span className="text-yellow-400 text-xs">
              High Points: ${settings.high_points_weekly_amount}/week
            </span>
          </div>
        )}
      </div>

      {/* Standings Table */}
      <div className="bg-gray-700/30 rounded-lg overflow-hidden">
        <div className="md:hidden px-4 py-2 bg-gray-700/50 text-gray-400 text-xs flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Scroll right for weekly breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-2 md:px-4 py-3 text-left text-gray-400 font-medium sticky left-0 bg-gray-700/50 z-10 text-sm">#</th>
                <th className="px-2 md:px-4 py-3 text-left text-gray-400 font-medium sticky left-6 md:left-10 bg-gray-700/50 z-10 text-sm">Team</th>
                <th className="px-2 md:px-4 py-3 text-right text-gray-400 font-medium text-sm">Total</th>
                {weeksToShow.map(week => (
                  <th key={week} className="px-2 py-3 text-center text-gray-400 font-medium text-xs whitespace-nowrap">
                    W{week}
                  </th>
                ))}
                {bonusColumns.map(col => (
                  <th key={col.key} className="px-2 py-3 text-center text-purple-400 font-medium text-xs whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => {
                const isCurrentUser = team.user_id === currentUserId
                const teamWeekly = weeklyPointsMap.get(team.id)

                return (
                  <tr
                    key={team.id}
                    className={`border-t border-gray-700/50 transition-colors ${
                      isCurrentUser ? 'bg-blue-900/20' : 'hover:bg-gray-700/30'
                    }`}
                  >
                    <td className="px-2 md:px-4 py-2 text-gray-400 sticky left-0 bg-inherit z-10 text-sm">
                      {index + 1}
                    </td>
                    <td className="px-2 md:px-4 py-2 sticky left-6 md:left-10 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        {team.image_url ? (
                          <img
                            src={team.image_url}
                            alt={team.name}
                            className="w-6 h-6 object-contain rounded flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{
                              backgroundColor: team.primary_color || '#374151',
                              color: team.secondary_color || '#ffffff',
                            }}
                          >
                            {team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate max-w-[100px] md:max-w-none">{team.name}</p>
                          <p className="text-gray-500 text-[10px] truncate hidden sm:block">
                            {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 md:px-4 py-2 text-right">
                      <span className="text-white font-bold">{team.total_points}</span>
                    </td>
                    {weeksToShow.map(week => {
                      const wp = teamWeekly?.get(week)
                      const isHighPoints = wp?.is_high_points_winner

                      return (
                        <td
                          key={week}
                          className={`px-1 py-2 text-center text-xs whitespace-nowrap ${
                            isHighPoints ? 'bg-yellow-900/30' : ''
                          }`}
                        >
                          {wp ? (
                            <span className={isHighPoints ? 'text-yellow-400 font-semibold' : 'text-gray-300'}>
                              {wp.points}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      )
                    })}
                    {/* Bonus columns - placeholder for future data */}
                    {bonusColumns.map(col => (
                      <td key={col.key} className="px-1 py-2 text-center text-xs whitespace-nowrap">
                        <span className="text-gray-600">-</span>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* High Points Summary - Table Format (matching main standings table) */}
      {settings?.high_points_enabled && (
        <div className="bg-gray-700/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700/50">
                  <th className="px-2 md:px-4 py-3 text-left text-gray-400 font-medium sticky left-0 bg-gray-700/50 z-10 text-sm">#</th>
                  <th className="px-2 md:px-4 py-3 text-left text-gray-400 font-medium sticky left-6 md:left-10 bg-gray-700/50 z-10 text-sm">Team</th>
                  <th className="px-2 md:px-4 py-3 text-center text-yellow-400 font-medium text-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-yellow-400/70 leading-none">HP</span>
                      <span>Total</span>
                    </div>
                  </th>
                  {weeksToShow.map(week => (
                    <th key={week} className="px-2 py-3 text-center text-gray-400 font-medium text-xs whitespace-nowrap">
                      W{week}
                    </th>
                  ))}
                  {bonusColumns.map(col => (
                    <th key={col.key} className="px-2 py-3 text-center text-purple-400 font-medium text-xs whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...teams]
                  .sort((a, b) => b.high_points_winnings - a.high_points_winnings)
                  .map((team, index) => {
                    const isCurrentUser = team.user_id === currentUserId
                    const teamWins = weeksToShow.map(week => {
                      const winners = highPointsWinners.get(week)
                      return winners?.find(w => w.teamId === team.id)
                    })
                    const hasAnyWins = teamWins.some(w => w)

                    return (
                      <tr
                        key={team.id}
                        className={`border-t border-gray-700/50 transition-colors ${
                          isCurrentUser ? 'bg-blue-900/20' : hasAnyWins ? 'bg-yellow-900/10' : 'hover:bg-gray-700/30'
                        }`}
                      >
                        <td className="px-2 md:px-4 py-2 text-gray-400 sticky left-0 bg-inherit z-10 text-sm">{index + 1}</td>
                        <td className="px-2 md:px-4 py-2 sticky left-6 md:left-10 bg-inherit z-10">
                          <div className="flex items-center gap-2">
                            {team.image_url ? (
                              <img
                                src={team.image_url}
                                alt={team.name}
                                className="w-6 h-6 object-contain rounded flex-shrink-0"
                              />
                            ) : (
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{
                                  backgroundColor: team.primary_color || '#374151',
                                  color: team.secondary_color || '#ffffff',
                                }}
                              >
                                {team.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-white font-medium text-sm truncate max-w-[100px] md:max-w-none">{team.name}</p>
                              <p className="text-gray-500 text-[10px] truncate hidden sm:block">
                                {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 md:px-4 py-2 text-center">
                          {team.high_points_winnings > 0 ? (
                            <span className="text-yellow-400 font-bold">${team.high_points_winnings}</span>
                          ) : (
                            <span className="text-gray-600">$0</span>
                          )}
                        </td>
                        {weeksToShow.map(week => {
                          const win = teamWins[week - 1]
                          return (
                            <td
                              key={week}
                              className={`px-1 py-2 text-center text-xs whitespace-nowrap ${win ? 'bg-yellow-900/30' : ''}`}
                            >
                              {win ? (
                                <span className="text-yellow-400 font-semibold">${win.amount}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          )
                        })}
                        {/* Bonus columns - placeholder for future data */}
                        {bonusColumns.map(col => (
                          <td key={col.key} className="px-1 py-2 text-center text-xs whitespace-nowrap">
                            <span className="text-gray-600">-</span>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-900/30 rounded"></div>
          <span>High Points</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-900/30 rounded"></div>
          <span>Your Team</span>
        </div>
        {isLive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        )}
      </div>
    </div>
  )
}
