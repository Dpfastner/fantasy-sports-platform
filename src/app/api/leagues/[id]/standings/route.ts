import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentWeek } from '@/lib/week'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'

// Create admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

interface StandingsTeam {
  id: string
  name: string
  userId: string
  userName: string | null
  totalPoints: number
  highPointsWinnings: number
  weeklyPoints: Array<{
    week: number
    points: number
    isHighPointsWinner: boolean
    highPointsAmount: number
  }>
  rank: number
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params

    // Verify user is authenticated and is a league member
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()

    // Get league with season info
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, season_id, seasons(year)')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Get current week (respects sandbox override)
    const seasonData = league.seasons as unknown as { year: number } | { year: number }[] | null
    const seasonYear = Array.isArray(seasonData) ? seasonData[0]?.year : seasonData?.year || new Date().getFullYear()
    const currentWeek = await getCurrentWeek(seasonYear)

    // Get all fantasy teams with their points
    const { data: teams, error: teamsError } = await supabase
      .from('fantasy_teams')
      .select(`
        id,
        name,
        user_id,
        total_points,
        high_points_winnings,
        profiles!fantasy_teams_user_id_fkey(display_name, email)
      `)
      .eq('league_id', leagueId)
      .order('total_points', { ascending: false })

    if (teamsError) {
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: teamsError.message },
        { status: 500 }
      )
    }

    // Get weekly points for all teams (only up to simulated week)
    const teamIds = (teams || []).map(t => t.id)
    const { data: weeklyPoints } = await supabase
      .from('fantasy_team_weekly_points')
      .select('fantasy_team_id, week_number, points, is_high_points_winner, high_points_amount')
      .in('fantasy_team_id', teamIds)
      .lte('week_number', currentWeek)
      .order('week_number', { ascending: true })

    // Group weekly points by team and calculate totals from filtered weeks
    const weeklyPointsByTeam = new Map<string, typeof weeklyPoints>()
    const totalPointsByTeam = new Map<string, number>()
    const highPointsWinningsByTeam = new Map<string, number>()
    for (const wp of weeklyPoints || []) {
      if (!weeklyPointsByTeam.has(wp.fantasy_team_id)) {
        weeklyPointsByTeam.set(wp.fantasy_team_id, [])
      }
      weeklyPointsByTeam.get(wp.fantasy_team_id)!.push(wp)
      // Accumulate total points
      const currentTotal = totalPointsByTeam.get(wp.fantasy_team_id) || 0
      totalPointsByTeam.set(wp.fantasy_team_id, currentTotal + Number(wp.points))
      // Accumulate high points winnings
      if (wp.is_high_points_winner) {
        const currentWinnings = highPointsWinningsByTeam.get(wp.fantasy_team_id) || 0
        highPointsWinningsByTeam.set(wp.fantasy_team_id, currentWinnings + Number(wp.high_points_amount))
      }
    }

    // Build standings response with recalculated totals
    const standingsData: StandingsTeam[] = (teams || []).map((team) => {
      // profiles comes as an object when using !inner join
      const profile = team.profiles as unknown as { display_name: string | null; email: string }
      const teamWeeklyPoints = weeklyPointsByTeam.get(team.id) || []

      return {
        id: team.id,
        name: team.name,
        userId: team.user_id,
        userName: profile?.display_name || profile?.email?.split('@')[0] || 'Unknown',
        totalPoints: totalPointsByTeam.get(team.id) || 0,
        highPointsWinnings: highPointsWinningsByTeam.get(team.id) || 0,
        weeklyPoints: teamWeeklyPoints.map(wp => ({
          week: wp.week_number,
          points: Number(wp.points),
          isHighPointsWinner: wp.is_high_points_winner,
          highPointsAmount: Number(wp.high_points_amount),
        })),
        rank: 0, // Will be set after sorting
      }
    })

    // Sort by total points and assign ranks
    standingsData.sort((a, b) => b.totalPoints - a.totalPoints)
    const standings = standingsData.map((team, index) => ({
      ...team,
      rank: index + 1,
    }))

    // Get league settings for high points info
    const { data: settings } = await supabase
      .from('league_settings')
      .select('high_points_enabled, high_points_weekly_amount, high_points_weeks')
      .eq('league_id', leagueId)
      .single()

    return NextResponse.json({
      league: {
        id: league.id,
        name: league.name,
      },
      standings,
      highPointsSettings: settings ? {
        enabled: settings.high_points_enabled,
        weeklyAmount: Number(settings.high_points_weekly_amount),
        weeks: settings.high_points_weeks,
      } : null,
    })
  } catch (error) {
    console.error('Standings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch standings', details: String(error) },
      { status: 500 }
    )
  }
}
