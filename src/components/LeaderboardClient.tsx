'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Header } from '@/components/Header'

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

interface LeaderboardClientProps {
  leagueId: string
  leagueName: string
  seasonName: string
  currentWeek: number
  currentUserId: string
  initialTeams: TeamData[]
  initialWeeklyPoints: WeeklyPoints[]
  settings: LeagueSettings | null
  userName?: string | null
  userEmail?: string | null
}

interface IdealTeamSchool {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  total_points: number
}

interface LeagueStats {
  idealTeam: {
    schools: IdealTeamSchool[]
    totalPoints: number
  }
  currentWeekMax: {
    week: number
    maxPoints: number
    topSchools: Array<{ id: string; name: string; points: number }>
  }
}

export default function LeaderboardClient({
  leagueId,
  leagueName,
  seasonName,
  currentWeek,
  currentUserId,
  initialTeams,
  initialWeeklyPoints,
  settings,
  userName,
  userEmail,
}: LeaderboardClientProps) {
  const [teams, setTeams] = useState<TeamData[]>(initialTeams)
  const [weeklyPoints, setWeeklyPoints] = useState<WeeklyPoints[]>(initialWeeklyPoints)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to fantasy_team_weekly_points changes
    const weeklyPointsChannel = supabase
      .channel('leaderboard-weekly-points')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fantasy_team_weekly_points',
          filter: `fantasy_team_id=in.(${initialTeams.map(t => t.id).join(',')})`,
        },
        async (payload) => {
          setIsLive(true)
          setLastUpdate(new Date())

          // Refresh weekly points
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

    // Subscribe to fantasy_teams changes (total_points updates)
    const teamsChannel = supabase
      .channel('leaderboard-teams')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fantasy_teams',
          filter: `league_id=eq.${leagueId}`,
        },
        async (payload) => {
          setIsLive(true)
          setLastUpdate(new Date())

          // Refresh teams
          const { data } = await supabase
            .from('fantasy_teams')
            .select(`
              id,
              name,
              user_id,
              total_points,
              high_points_winnings,
              primary_color,
              secondary_color,
              image_url,
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

  // Fetch league stats (ideal team, max points)
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/leagues/${leagueId}/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }

    fetchStats()
  }, [leagueId])

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

  // Track which weeks have data for display purposes
  const weeksWithData = new Set<number>()
  for (const wp of weeklyPoints) {
    weeksWithData.add(wp.week_number)
  }

  // Regular season weeks (0-16) - always show all weeks up to current week
  const regularWeeks = Array.from({ length: 17 }, (_, i) => i)
    .filter(week => week <= currentWeek)

  // Always show postseason columns (they appear after week 14)
  const showPostseason = currentWeek >= 15

  // Week label helper
  const getWeekLabel = (week: number): string => {
    if (week === 0) return 'W0'
    if (week >= 1 && week <= 16) return `W${week}`
    if (week === 17) return 'Bowls'
    if (week === 18) return 'CFP'
    if (week === 19) return 'Natty'
    return `W${week}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <Header userName={userName} userEmail={userEmail}>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-gray-400 hover:text-white transition-colors text-sm md:text-base truncate max-w-[120px] md:max-w-none"
        >
          {leagueName}
        </Link>
        <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          My Leagues
        </Link>
      </Header>

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              Leaderboard
              {isLive && (
                <span className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-normal text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">
              {seasonName} - Week {currentWeek}
              {lastUpdate && (
                <span className="text-gray-500 text-xs md:text-sm ml-2 hidden sm:inline">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          {settings?.high_points_enabled && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 md:px-4 py-1.5 md:py-2 self-start sm:self-auto">
              <span className="text-yellow-400 text-xs md:text-sm">
                High Points: ${settings.high_points_weekly_amount}/week
              </span>
            </div>
          )}
        </div>

        {/* Main Standings Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
          {/* Mobile hint */}
          <div className="md:hidden px-4 py-2 bg-gray-700/30 text-gray-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Scroll right for weekly breakdown
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-2 md:px-4 py-3 text-left text-gray-400 font-medium sticky left-0 bg-gray-700 z-20 text-sm md:text-base">#</th>
                  <th className="px-2 md:px-4 py-3 text-left text-gray-400 font-medium sticky left-6 md:left-10 bg-gray-700 z-20 text-sm md:text-base min-w-[150px] shadow-[2px_0_8px_rgba(0,0,0,0.3)]">Team</th>
                  <th className="px-2 md:px-4 py-3 text-right text-gray-400 font-medium text-sm md:text-base">Total</th>
                  {/* Regular season weeks */}
                  {regularWeeks.map(week => (
                    <th key={week} className="px-2 md:px-3 py-3 text-center text-gray-400 font-medium text-xs md:text-sm">
                      {getWeekLabel(week)}
                    </th>
                  ))}
                  {/* Postseason columns - show after week 14 */}
                  {showPostseason && (
                    <>
                      <th className="px-2 md:px-3 py-3 text-center text-purple-400 font-medium text-xs md:text-sm">Heis</th>
                      <th className="px-2 md:px-3 py-3 text-center text-green-400 font-medium text-xs md:text-sm">Bowls</th>
                      <th className="px-2 md:px-3 py-3 text-center text-orange-400 font-medium text-xs md:text-sm">CFP</th>
                      <th className="px-2 md:px-3 py-3 text-center text-yellow-300 font-medium text-xs md:text-sm">Natty</th>
                    </>
                  )}
                  {settings?.high_points_enabled && (
                    <th className="px-2 md:px-4 py-3 text-right text-yellow-400 font-medium text-sm md:text-base">HP $</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => {
                  const isCurrentUser = team.user_id === currentUserId
                  const teamWeekly = weeklyPointsMap.get(team.id)

                  // Solid background for sticky cells - slightly tinted for current user
                  const stickyBg = isCurrentUser ? 'bg-[#1e2a3a]' : 'bg-gray-800'

                  return (
                    <tr
                      key={team.id}
                      className={`border-t border-gray-700/50 transition-colors ${
                        isCurrentUser ? 'bg-blue-900/20' : 'hover:bg-gray-700/30'
                      }`}
                    >
                      <td className={`px-2 md:px-4 py-2 md:py-3 text-gray-400 sticky left-0 z-20 text-sm ${stickyBg}`}>
                        {index + 1}
                      </td>
                      <td className={`px-2 md:px-4 py-2 md:py-3 sticky left-6 md:left-10 z-20 min-w-[150px] ${stickyBg} shadow-[2px_0_8px_rgba(0,0,0,0.3)]`}>
                        <div className="flex items-center gap-2 md:gap-3">
                          {team.image_url ? (
                            <img
                              src={team.image_url}
                              alt={team.name}
                              className="w-6 h-6 md:w-8 md:h-8 object-contain rounded flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center text-[10px] md:text-xs font-bold flex-shrink-0"
                              style={{
                                backgroundColor: team.primary_color || '#374151',
                                color: team.secondary_color || '#ffffff',
                              }}
                            >
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm md:text-base truncate max-w-[100px] md:max-w-none">{team.name}</p>
                            <p className="text-gray-500 text-[10px] md:text-xs truncate hidden sm:block">
                              {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                        <span className="text-white font-bold text-base md:text-lg">{team.total_points}</span>
                      </td>
                      {/* Regular season weeks */}
                      {regularWeeks.map(week => {
                        const wp = teamWeekly?.get(week)
                        const isHighPoints = wp?.is_high_points_winner

                        return (
                          <td
                            key={week}
                            className={`px-1 md:px-3 py-2 md:py-3 text-center text-xs md:text-sm transition-colors ${
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
                      {/* Postseason columns */}
                      {showPostseason && (() => {
                        const heisPoints = teamWeekly?.get(20) // Heisman stored as week 20 if applicable
                        const bowlsWp = teamWeekly?.get(17)
                        const cfpWp = teamWeekly?.get(18)
                        const nattyWp = teamWeekly?.get(19)
                        return (
                          <>
                            <td className="px-1 md:px-3 py-2 md:py-3 text-center text-xs md:text-sm">
                              {heisPoints ? (
                                <span className="text-purple-400">{heisPoints.points}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="px-1 md:px-3 py-2 md:py-3 text-center text-xs md:text-sm">
                              {bowlsWp ? (
                                <span className="text-green-400">{bowlsWp.points}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="px-1 md:px-3 py-2 md:py-3 text-center text-xs md:text-sm">
                              {cfpWp ? (
                                <span className="text-orange-400">{cfpWp.points}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="px-1 md:px-3 py-2 md:py-3 text-center text-xs md:text-sm">
                              {nattyWp ? (
                                <span className="text-yellow-300 font-semibold">{nattyWp.points}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          </>
                        )
                      })()}
                      {settings?.high_points_enabled && (
                        <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                          {team.high_points_winnings > 0 ? (
                            <span className="text-yellow-400 font-semibold text-sm md:text-base">
                              ${team.high_points_winnings}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Points Summary */}
        {settings?.high_points_enabled && highPointsWinners.size > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">*</span>
              High Points Winners
            </h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {regularWeeks.map(week => {
                const winners = highPointsWinners.get(week)
                if (!winners || winners.length === 0) return null

                return (
                  <div
                    key={week}
                    className="bg-gray-700/50 rounded-lg p-4 border border-yellow-700/30"
                  >
                    <p className="text-gray-400 text-sm mb-2">{getWeekLabel(week)}</p>
                    {winners.map(winner => {
                      const team = teams.find(t => t.id === winner.teamId)
                      return (
                        <div key={winner.teamId} className="mb-2 last:mb-0">
                          <p className="text-white font-medium text-sm">{team?.name}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">{winner.points} pts</span>
                            <span className="text-yellow-400 text-sm font-semibold">${winner.amount}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats Section (Ideal Team & Max Points) */}
        <div className="mt-8">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showStats ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium">League Insights</span>
          </button>

          {showStats && stats && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Ideal Team */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Ideal Team</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Best possible draft based on season results
                </p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-green-400">{stats.idealTeam.totalPoints}</span>
                  <span className="text-gray-400 ml-2">total points</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.idealTeam.schools.map((school, idx) => (
                    <div
                      key={school.id}
                      className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm w-5">{idx + 1}.</span>
                        {school.logo_url ? (
                          <img src={school.logo_url} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <div className="w-6 h-6 bg-gray-600 rounded-full" />
                        )}
                        <span className="text-white text-sm">{school.name}</span>
                      </div>
                      <span className="text-green-400 font-medium">{school.total_points}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Week Max */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Week {currentWeek} Maximum</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Best possible points this week
                </p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-blue-400">{stats.currentWeekMax.maxPoints}</span>
                  <span className="text-gray-400 ml-2">max points</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.currentWeekMax.topSchools.map((school, idx) => (
                    <div
                      key={school.id}
                      className="flex items-center justify-between p-2 bg-gray-700/30 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm w-5">{idx + 1}.</span>
                        <span className="text-white text-sm">{school.name}</span>
                      </div>
                      <span className="text-blue-400 font-medium">{school.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-900/30 rounded"></div>
            <span>High Points Winner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-900/30 rounded"></div>
            <span>Your Team</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Updates Active</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
