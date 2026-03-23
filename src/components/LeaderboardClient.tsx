'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { useToast } from '@/components/Toast'
import { ensureContrast } from '@/lib/color-utils'
import { fetchWithRetry } from '@/lib/api/fetch'
import { ShareButton } from '@/components/ShareButton'
import {
  REGULAR_WEEK_COUNT,
  POSTSEASON_START,
  WEEK_BOWLS,
  WEEK_CFP_R1,
  WEEK_CFP_QF,
  WEEK_CFP_SF,
  WEEK_CHAMPIONSHIP,
  WEEK_HEISMAN,
  getWeekLabel as getWeekLabelFn,
} from '@/lib/constants/season'

interface TeamData {
  id: string
  name: string
  user_id: string | null
  total_points: number
  high_points_winnings: number
  primary_color: string
  secondary_color: string
  image_url: string | null
  is_deleted: boolean
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
  variant?: 'full' | 'embedded'
  leagueName?: string
  seasonName?: string
  currentWeek: number
  currentUserId: string
  initialTeams: TeamData[]
  initialWeeklyPoints: WeeklyPoints[]
  settings: LeagueSettings | null
  userName?: string | null
  userEmail?: string | null
  /** Sport slug for multi-sport week labels. Defaults to college_football (CFB). */
  sportSlug?: string
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
  variant = 'full',
  leagueName,
  seasonName,
  currentWeek,
  currentUserId,
  initialTeams,
  initialWeeklyPoints,
  settings,
  userName,
  userEmail,
  sportSlug: _sportSlug = 'college_football',
}: LeaderboardClientProps) {
  const [teams, setTeams] = useState<TeamData[]>(initialTeams)
  const [weeklyPoints, setWeeklyPoints] = useState<WeeklyPoints[]>(initialWeeklyPoints)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [showStats, setShowStats] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to fantasy_team_weekly_points changes
    const channelPrefix = variant === 'embedded' ? 'embedded-' : ''
    const weeklyPointsChannel = supabase
      .channel(`${channelPrefix}leaderboard-weekly-points`)
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
      .channel(`${channelPrefix}leaderboard-teams`)
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
              is_deleted,
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
  }, [leagueId, initialTeams, variant])

  // Fetch league stats (ideal team, max points) - only for full variant
  useEffect(() => {
    if (variant !== 'full') return

    async function fetchStats() {
      try {
        const response = await fetchWithRetry(`/api/leagues/${leagueId}/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        addToast('Failed to load league stats.', 'error')
      }
    }

    fetchStats()
  }, [leagueId, variant])

  // Build weekly points map
  const weeklyPointsMap = useMemo(() => {
    const map = new Map<string, Map<number, WeeklyPoints>>()
    for (const wp of weeklyPoints) {
      if (!map.has(wp.fantasy_team_id)) {
        map.set(wp.fantasy_team_id, new Map())
      }
      map.get(wp.fantasy_team_id)!.set(wp.week_number, wp)
    }
    return map
  }, [weeklyPoints])

  // Find high points winners per week
  const highPointsWinners = useMemo(() => {
    const winners = new Map<number, { teamId: string; points: number; amount: number }[]>()
    for (const wp of weeklyPoints) {
      if (wp.is_high_points_winner) {
        if (!winners.has(wp.week_number)) {
          winners.set(wp.week_number, [])
        }
        winners.get(wp.week_number)!.push({
          teamId: wp.fantasy_team_id,
          points: wp.points,
          amount: wp.high_points_amount,
        })
      }
    }
    return winners
  }, [weeklyPoints])

  // Track which weeks have data for display purposes
  const weeksWithData = useMemo(() => {
    const weeks = new Set<number>()
    for (const wp of weeklyPoints) {
      weeks.add(wp.week_number)
    }
    return weeks
  }, [weeklyPoints])

  // Regular season weeks (0-16) - always show all weeks up to current week
  const regularWeeks = useMemo(() =>
    Array.from({ length: REGULAR_WEEK_COUNT }, (_, i) => i)
      .filter(week => week <= currentWeek),
    [currentWeek]
  )

  // Always show postseason columns (they appear after week 14)
  const showPostseason = currentWeek >= POSTSEASON_START

  // Week label helper
  const getWeekLabel = (week: number): string => getWeekLabelFn(week, 'leaderboard')

  // Helper to render postseason cells for a team row
  const renderPostseasonCells = (teamWeekly: Map<number, WeeklyPoints> | undefined, compact?: boolean) => {
    const px = compact ? 'px-1' : 'px-1 md:px-3'
    const py = compact ? 'py-2' : 'py-2 md:py-3'
    const heisPoints = teamWeekly?.get(WEEK_HEISMAN)
    const bowlsWp = teamWeekly?.get(WEEK_BOWLS)
    const cfpR1 = teamWeekly?.get(WEEK_CFP_R1)
    const cfpQF = teamWeekly?.get(WEEK_CFP_QF)
    const cfpSF = teamWeekly?.get(WEEK_CFP_SF)
    const cfpTotal = (cfpR1?.points || 0) + (cfpQF?.points || 0) + (cfpSF?.points || 0)
    const nattyWp = teamWeekly?.get(WEEK_CHAMPIONSHIP)
    return (
      <>
        <td className={`${px} ${py} text-center text-xs ${compact ? 'whitespace-nowrap' : 'md:text-sm'}`}>
          {heisPoints ? <span className="text-info-text">{heisPoints.points}</span> : <span className="text-text-muted">-</span>}
        </td>
        <td className={`${px} ${py} text-center text-xs ${compact ? 'whitespace-nowrap' : 'md:text-sm'}`}>
          {bowlsWp ? <span className="text-success-text">{bowlsWp.points}</span> : <span className="text-text-muted">-</span>}
        </td>
        <td className={`${px} ${py} text-center text-xs ${compact ? 'whitespace-nowrap' : 'md:text-sm'}`}>
          {cfpTotal > 0 ? <span className="text-accent-text">{cfpTotal}</span> : <span className="text-text-muted">-</span>}
        </td>
        <td className={`${px} ${py} text-center text-xs ${compact ? 'whitespace-nowrap' : 'md:text-sm'}`}>
          {nattyWp ? <span className="text-warning-text font-semibold">{nattyWp.points}</span> : <span className="text-text-muted">-</span>}
        </td>
      </>
    )
  }

  // --- Embedded variant ---
  if (variant === 'embedded') {
    return (
      <div className="space-y-6 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              Rivalry Board
              {isLive && (
                <span className="flex items-center gap-1 text-xs font-normal text-success-text">
                  <span className="w-2 h-2 bg-live-indicator rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </h2>
            <p className="text-text-secondary text-sm">
              Week {currentWeek}
              {lastUpdate && (
                <span className="text-text-muted text-xs ml-2">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {settings?.high_points_enabled && (
              <div className="bg-highlight-special border border-warning rounded-lg px-3 py-1.5">
                <span className="text-warning-text text-xs">
                  High Points: ${settings.high_points_weekly_amount}/week
                </span>
              </div>
            )}
            {currentWeek > 1 && (
              <ShareButton
                shareData={{
                  title: `${leagueName || 'League'} — Week ${currentWeek} Recap`,
                  text: `Check out the Week ${currentWeek} standings!`,
                  url: `${typeof window !== 'undefined' ? window.location.origin : ''}/leagues/${leagueId}/leaderboard`,
                }}
                ogImageUrl={`/api/og/recap?leagueId=${leagueId}&week=${currentWeek}`}
                label="Share Recap"
                className="text-xs"
              />
            )}
          </div>
        </div>

        {/* All-zeros encouragement */}
        {teams.every(t => t.total_points === 0) && currentWeek <= 1 && (
          <div className="bg-brand/10 border border-brand/30 rounded-lg p-4 mb-4">
            <p className="text-brand-text text-sm">
              Scores will update when games begin. Check back once the season kicks off!
            </p>
          </div>
        )}

        {/* Standings Table */}
        <div className="bg-surface-subtle rounded-lg overflow-hidden">
          <div className="md:hidden px-4 py-2 bg-surface-inset text-text-secondary text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Scroll right for weekly breakdown
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max">
              <thead>
                <tr className="bg-surface-inset">
                  <th className="px-2 md:px-4 py-3 text-left text-text-secondary font-medium sticky left-0 z-20 text-sm" style={{ backgroundColor: 'var(--palette-border)' }}>#</th>
                  <th className="px-2 md:px-4 py-3 text-left text-text-secondary font-medium sticky left-6 md:left-10 z-20 text-sm" style={{ backgroundColor: 'var(--palette-border)' }}>Team</th>
                  <th className="px-2 md:px-4 py-3 text-right text-text-secondary font-medium text-sm">Total</th>
                  {regularWeeks.map(week => (
                    <th key={week} className="px-2 py-3 text-center text-text-secondary font-medium text-xs whitespace-nowrap">
                      {getWeekLabel(week)}
                    </th>
                  ))}
                  {showPostseason && (
                    <>
                      <th className="px-2 py-3 text-center text-info-text font-medium text-xs whitespace-nowrap">Heis</th>
                      <th className="px-2 py-3 text-center text-success-text font-medium text-xs whitespace-nowrap">Bowls</th>
                      <th className="px-2 py-3 text-center text-accent-text font-medium text-xs whitespace-nowrap">CFP</th>
                      <th className="px-2 py-3 text-center text-warning-text font-medium text-xs whitespace-nowrap">Natty</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => {
                  const isCurrentUser = team.user_id === currentUserId
                  const teamWeekly = weeklyPointsMap.get(team.id)
                  const stickyBgColor = isCurrentUser ? 'var(--palette-sticky-bg-highlight)' : 'var(--palette-sticky-bg)'
                  return (
                    <tr
                      key={team.id}
                      className={`border-t border-border-subtle transition-colors ${
                        team.is_deleted ? 'opacity-50' : isCurrentUser ? 'bg-highlight-row' : 'hover:bg-surface-subtle'
                      }`}
                    >
                      <td className="px-2 md:px-4 py-2 text-text-secondary sticky left-0 z-10 text-sm" style={{ backgroundColor: stickyBgColor }}>
                        {index + 1}
                      </td>
                      <td className="px-2 md:px-4 py-2 sticky left-6 md:left-10 z-10" style={{ backgroundColor: stickyBgColor }}>
                        <div className="flex items-center gap-2">
                          {team.is_deleted ? (
                            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 bg-border text-text-muted">
                              --
                            </div>
                          ) : team.image_url ? (
                            <img src={team.image_url} alt={team.name} className="w-6 h-6 object-contain rounded flex-shrink-0" />
                          ) : (
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: team.primary_color || '#374151', color: ensureContrast(team.primary_color || '#374151', team.secondary_color || '#ffffff') }}
                            >
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            {team.is_deleted ? (
                              <span className="text-text-muted font-medium text-sm">Deleted Team</span>
                            ) : (
                              <>
                                <Link href={`/leagues/${leagueId}/team/${team.id}`} className="text-text-primary font-medium text-sm truncate max-w-[100px] md:max-w-none hover:underline block">{team.name}</Link>
                                <Link href={`/profile/${team.user_id}`} className="text-text-muted text-xs truncate block hover:underline">
                                  {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 text-right">
                        <span className="text-text-primary font-bold">{team.total_points}</span>
                      </td>
                      {regularWeeks.map(week => {
                        const wp = teamWeekly?.get(week)
                        const isHighPoints = wp?.is_high_points_winner
                        return (
                          <td key={week} className={`px-1 py-2 text-center text-xs whitespace-nowrap ${isHighPoints ? 'bg-highlight-special' : ''}`}>
                            {wp ? (
                              <span className={isHighPoints ? 'text-warning-text font-semibold' : 'text-text-secondary'}>{wp.points}</span>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                        )
                      })}
                      {showPostseason && renderPostseasonCells(teamWeekly, true)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* High Points Summary - Table Format */}
        {settings?.high_points_enabled && (
          <div className="bg-surface-subtle rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-max">
                <thead>
                  <tr className="bg-surface-inset">
                    <th className="px-2 md:px-4 py-3 text-left text-text-secondary font-medium sticky left-0 z-20 text-sm" style={{ backgroundColor: 'var(--palette-border)' }}>#</th>
                    <th className="px-2 md:px-4 py-3 text-left text-text-secondary font-medium sticky left-6 md:left-10 z-20 text-sm" style={{ backgroundColor: 'var(--palette-border)' }}>Team</th>
                    <th className="px-2 md:px-4 py-3 text-center text-warning-text font-medium text-sm">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-warning-text/70 leading-none">HP</span>
                        <span>Total</span>
                      </div>
                    </th>
                    {regularWeeks.map(week => (
                      <th key={week} className="px-2 py-3 text-center text-text-secondary font-medium text-xs whitespace-nowrap">
                        {getWeekLabel(week)}
                      </th>
                    ))}
                    {showPostseason && (
                      <>
                        <th className="px-2 py-3 text-center text-info-text font-medium text-xs whitespace-nowrap">Heis</th>
                        <th className="px-2 py-3 text-center text-success-text font-medium text-xs whitespace-nowrap">Bowls</th>
                        <th className="px-2 py-3 text-center text-accent-text font-medium text-xs whitespace-nowrap">CFP</th>
                        <th className="px-2 py-3 text-center text-warning-text font-medium text-xs whitespace-nowrap">Natty</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...teams]
                    .sort((a, b) => b.high_points_winnings - a.high_points_winnings)
                    .map((team, index) => {
                      const isCurrentUser = team.user_id === currentUserId
                      const getWinForWeek = (week: number) => {
                        const winners = highPointsWinners.get(week)
                        return winners?.find(w => w.teamId === team.id)
                      }
                      const hasAnyWins = regularWeeks.some(week => getWinForWeek(week))
                      const hpStickyBgColor = isCurrentUser ? 'var(--palette-sticky-bg-highlight)' : hasAnyWins ? 'var(--palette-sticky-bg-highlight)' : 'var(--palette-sticky-bg)'
                      return (
                        <tr
                          key={team.id}
                          className={`border-t border-border-subtle transition-colors ${
                            isCurrentUser ? 'bg-highlight-row' : hasAnyWins ? 'bg-highlight-special' : 'hover:bg-surface-subtle'
                          }`}
                        >
                          <td className="px-2 md:px-4 py-2 text-text-secondary sticky left-0 z-10 text-sm" style={{ backgroundColor: hpStickyBgColor }}>{index + 1}</td>
                          <td className="px-2 md:px-4 py-2 sticky left-6 md:left-10 z-10" style={{ backgroundColor: hpStickyBgColor }}>
                            <div className="flex items-center gap-2">
                              {team.is_deleted ? (
                                <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 bg-border text-text-muted">--</div>
                              ) : team.image_url ? (
                                <img src={team.image_url} alt={team.name} className="w-6 h-6 object-contain rounded flex-shrink-0" />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: team.primary_color || '#374151', color: ensureContrast(team.primary_color || '#374151', team.secondary_color || '#ffffff') }}
                                >
                                  {team.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                {team.is_deleted ? (
                                  <span className="text-text-muted font-medium text-sm">Deleted Team</span>
                                ) : (
                                  <>
                                    <Link href={`/leagues/${leagueId}/team/${team.id}`} className="text-text-primary font-medium text-sm truncate max-w-[100px] md:max-w-none hover:underline block">{team.name}</Link>
                                    <Link href={`/profile/${team.user_id}`} className="text-text-muted text-xs truncate block hover:underline">
                                      {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 md:px-4 py-2 text-center">
                            {team.high_points_winnings > 0 ? (
                              <span className="text-warning-text font-bold">${team.high_points_winnings}</span>
                            ) : (
                              <span className="text-text-muted">$0</span>
                            )}
                          </td>
                          {regularWeeks.map(week => {
                            const win = getWinForWeek(week)
                            return (
                              <td key={week} className={`px-1 py-2 text-center text-xs whitespace-nowrap ${win ? 'bg-highlight-special' : ''}`}>
                                {win ? (
                                  <span className="text-warning-text font-semibold">${win.amount}</span>
                                ) : (
                                  <span className="text-text-muted">-</span>
                                )}
                              </td>
                            )
                          })}
                          {showPostseason && (
                            <>
                              <td className="px-1 py-2 text-center text-xs whitespace-nowrap"><span className="text-text-muted">-</span></td>
                              <td className="px-1 py-2 text-center text-xs whitespace-nowrap"><span className="text-text-muted">-</span></td>
                              <td className="px-1 py-2 text-center text-xs whitespace-nowrap"><span className="text-text-muted">-</span></td>
                              <td className="px-1 py-2 text-center text-xs whitespace-nowrap"><span className="text-text-muted">-</span></td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-highlight-special rounded"></div>
            <span>High Points</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-highlight-row rounded"></div>
            <span>Your Team</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-live-indicator rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- Full variant ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
      <Header userName={userName} userEmail={userEmail} userId={currentUserId} />

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary flex items-center gap-2 md:gap-3">
              Rivalry Board
              {isLive && (
                <span className="flex items-center gap-1 md:gap-2 text-xs md:text-sm font-normal text-success-text">
                  <span className="w-2 h-2 bg-live-indicator rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </h1>
            <p className="text-text-secondary mt-1 text-sm md:text-base">
              {seasonName} - Week {currentWeek}
              {lastUpdate && (
                <span className="text-text-muted text-xs md:text-sm ml-2 hidden sm:inline">
                  Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {settings?.high_points_enabled && (
              <div className="bg-highlight-special border border-warning rounded-lg px-3 md:px-4 py-1.5 md:py-2">
                <span className="text-warning-text text-xs md:text-sm">
                  High Points: ${settings.high_points_weekly_amount}/week
                </span>
              </div>
            )}
            {currentWeek > 1 && (
              <ShareButton
                shareData={{
                  title: `${leagueName || 'League'} — Week ${currentWeek} Recap`,
                  text: `Check out the Week ${currentWeek} standings!`,
                  url: `${typeof window !== 'undefined' ? window.location.origin : ''}/leagues/${leagueId}/leaderboard`,
                }}
                ogImageUrl={`/api/og/recap?leagueId=${leagueId}&week=${currentWeek}`}
                label="Share Recap"
              />
            )}
          </div>
        </div>

        {/* Main Standings Table */}
        <div className="bg-surface rounded-lg overflow-hidden mb-8">
          {/* Mobile hint */}
          <div className="md:hidden px-4 py-2 bg-surface-subtle text-text-secondary text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Scroll right for weekly breakdown
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max">
              <thead>
                <tr className="bg-surface">
                  <th className="px-2 md:px-4 py-3 text-left text-text-secondary font-medium sticky left-0 z-30 text-sm md:text-base isolate" style={{ backgroundColor: 'var(--palette-border)' }}>#</th>
                  <th className="px-2 md:px-4 py-3 text-left text-text-secondary font-medium sticky left-6 md:left-10 z-30 text-sm md:text-base min-w-[150px] shadow-[2px_0_8px_rgba(0,0,0,0.3)] isolate" style={{ backgroundColor: 'var(--palette-border)' }}>Team</th>
                  <th className="px-2 md:px-4 py-3 text-right text-text-secondary font-medium text-sm md:text-base">Total</th>
                  {/* Regular season weeks */}
                  {regularWeeks.map(week => (
                    <th key={week} className="px-2 md:px-3 py-3 text-center text-text-secondary font-medium text-xs md:text-sm">
                      {getWeekLabel(week)}
                    </th>
                  ))}
                  {/* Postseason columns - show after week 14 */}
                  {showPostseason && (
                    <>
                      <th className="px-2 md:px-3 py-3 text-center text-info-text font-medium text-xs md:text-sm">Heis</th>
                      <th className="px-2 md:px-3 py-3 text-center text-success-text font-medium text-xs md:text-sm">Bowls</th>
                      <th className="px-2 md:px-3 py-3 text-center text-accent-text font-medium text-xs md:text-sm">CFP</th>
                      <th className="px-2 md:px-3 py-3 text-center text-warning-text font-medium text-xs md:text-sm">Natty</th>
                    </>
                  )}
                  {settings?.high_points_enabled && (
                    <th className="px-2 md:px-4 py-3 text-right text-warning-text font-medium text-sm md:text-base" title="High Points: weekly bonus for the highest-scoring team">HP $</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => {
                  const isCurrentUser = team.user_id === currentUserId
                  const teamWeekly = weeklyPointsMap.get(team.id)

                  // Solid background color for sticky cells - CSS variables for palette compatibility
                  const stickyBgColor = isCurrentUser ? 'var(--palette-sticky-bg-highlight)' : 'var(--palette-sticky-bg)'

                  return (
                    <tr
                      key={team.id}
                      className={`border-t border-border-subtle transition-colors ${
                        team.is_deleted ? 'opacity-50' : isCurrentUser ? 'bg-highlight-row' : 'hover:bg-surface-subtle'
                      }`}
                    >
                      <td
                        className="px-2 md:px-4 py-2 md:py-3 text-text-secondary sticky left-0 z-20 text-sm"
                        style={{ backgroundColor: stickyBgColor }}
                      >
                        {index + 1}
                      </td>
                      <td
                        className="px-2 md:px-4 py-2 md:py-3 sticky left-6 md:left-10 z-20 min-w-[150px] shadow-[2px_0_8px_rgba(0,0,0,0.3)]"
                        style={{ backgroundColor: stickyBgColor }}
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          {team.is_deleted ? (
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center text-xs md:text-xs font-bold flex-shrink-0 bg-border text-text-muted">
                              --
                            </div>
                          ) : team.image_url ? (
                            <img
                              src={team.image_url}
                              alt={team.name}
                              className="w-6 h-6 md:w-8 md:h-8 object-contain rounded flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-6 h-6 md:w-8 md:h-8 rounded flex items-center justify-center text-xs md:text-xs font-bold flex-shrink-0"
                              style={{
                                backgroundColor: team.primary_color || '#374151',
                                color: ensureContrast(team.primary_color || '#374151', team.secondary_color || '#ffffff'),
                              }}
                            >
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            {team.is_deleted ? (
                              <span className="text-text-muted font-medium text-sm md:text-base">Deleted Team</span>
                            ) : (
                              <>
                                <Link href={`/leagues/${leagueId}/team/${team.id}`} className="text-text-primary font-medium text-sm md:text-base truncate max-w-[100px] md:max-w-none hover:underline block">{team.name}</Link>
                                <Link href={`/profile/${team.user_id}`} className="text-text-muted text-xs md:text-xs truncate block hover:underline">
                                  {team.profiles?.display_name || team.profiles?.email?.split('@')[0]}
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                        <span className="text-text-primary font-bold text-base md:text-lg">{team.total_points}</span>
                      </td>
                      {/* Regular season weeks */}
                      {regularWeeks.map(week => {
                        const wp = teamWeekly?.get(week)
                        const isHighPoints = wp?.is_high_points_winner

                        return (
                          <td
                            key={week}
                            className={`px-1 md:px-3 py-2 md:py-3 text-center text-xs md:text-sm transition-colors ${
                              isHighPoints ? 'bg-highlight-special' : ''
                            }`}
                          >
                            {wp ? (
                              <span className={isHighPoints ? 'text-warning-text font-semibold' : 'text-text-secondary'}>
                                {wp.points}
                              </span>
                            ) : (
                              <span className="text-text-muted">-</span>
                            )}
                          </td>
                        )
                      })}
                      {/* Postseason columns */}
                      {showPostseason && renderPostseasonCells(teamWeekly)}
                      {settings?.high_points_enabled && (
                        <td className="px-2 md:px-4 py-2 md:py-3 text-right">
                          {team.high_points_winnings > 0 ? (
                            <span className="text-warning-text font-semibold text-sm md:text-base">
                              ${team.high_points_winnings}
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
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
          <div className="bg-surface rounded-lg p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="text-warning-text">*</span>
              High Points Winners
            </h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {regularWeeks.map(week => {
                const winners = highPointsWinners.get(week)
                if (!winners || winners.length === 0) return null

                return (
                  <div
                    key={week}
                    className="bg-surface-inset rounded-lg p-4 border border-warning/30"
                  >
                    <p className="text-text-secondary text-sm mb-2">{getWeekLabel(week)}</p>
                    {winners.map(winner => {
                      const team = teams.find(t => t.id === winner.teamId)
                      return (
                        <div key={winner.teamId} className="mb-2 last:mb-0">
                          {team?.is_deleted ? (
                            <span className="text-text-muted font-medium text-sm block">Deleted Team</span>
                          ) : (
                            <Link href={`/leagues/${leagueId}/team/${team?.id}`} className="text-text-primary font-medium text-sm hover:underline block">{team?.name}</Link>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-text-secondary text-xs">{winner.points} pts</span>
                            <span className="text-warning-text text-sm font-semibold">${winner.amount}</span>
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
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4"
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
              <div className="bg-surface rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Ideal Team</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Best possible draft based on season results
                </p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-success-text">{stats.idealTeam.totalPoints}</span>
                  <span className="text-text-secondary ml-2">total points</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.idealTeam.schools.map((school, idx) => (
                    <div
                      key={school.id}
                      className="flex items-center justify-between p-2 bg-surface-subtle rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted text-sm w-5">{idx + 1}.</span>
                        {school.logo_url ? (
                          <img src={school.logo_url} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <div className="w-6 h-6 bg-surface-subtle rounded-full" />
                        )}
                        <span className="text-text-primary text-sm">{school.name}</span>
                      </div>
                      <span className="text-success-text font-medium">{school.total_points}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Week Max */}
              <div className="bg-surface rounded-lg p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Week {currentWeek} Maximum</h3>
                <p className="text-text-secondary text-sm mb-4">
                  Best possible points this week
                </p>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-brand-text">{stats.currentWeekMax.maxPoints}</span>
                  <span className="text-text-secondary ml-2">max points</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.currentWeekMax.topSchools.map((school, idx) => (
                    <div
                      key={school.id}
                      className="flex items-center justify-between p-2 bg-surface-subtle rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-text-muted text-sm w-5">{idx + 1}.</span>
                        <span className="text-text-primary text-sm">{school.name}</span>
                      </div>
                      <span className="text-brand-text font-medium">{school.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-highlight-special rounded"></div>
            <span>High Points Winner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-highlight-row rounded"></div>
            <span>Your Team</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-live-indicator rounded-full animate-pulse"></div>
              <span>Live Updates Active</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
