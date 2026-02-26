import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { calculateCurrentWeek } from '@/lib/constants/season'

interface SchoolStats {
  id: string
  name: string
  abbreviation: string | null
  logo_url: string | null
  conference: string
  total_points: number
  weeks_with_points: number
}

interface WeekMaxPoints {
  week: number
  maxPoints: number
  topSchools: Array<{
    id: string
    name: string
    points: number
  }>
}

export async function GET(
  request: NextRequest,
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

    const supabase = createAdminClient()

    // Get league with season and settings
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select(`
        id,
        season_id,
        league_settings (
          schools_per_team,
          max_school_selections_total
        )
      `)
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    const settings = Array.isArray(league.league_settings)
      ? league.league_settings[0]
      : league.league_settings

    const schoolsPerTeam = settings?.schools_per_team || 12
    const maxSelections = settings?.max_school_selections_total || 3

    // Get all school weekly points for this season
    // Note: Must specify limit > 1000 to override Supabase default limit
    const { data: schoolPoints, error: pointsError } = await supabase
      .from('school_weekly_points')
      .select(`
        school_id,
        week_number,
        total_points
      `)
      .eq('season_id', league.season_id)
      .limit(5000)

    if (pointsError) {
      return NextResponse.json(
        { error: 'Failed to fetch school points' },
        { status: 500 }
      )
    }

    // Get school info
    const schoolIds = [...new Set(schoolPoints?.map(p => p.school_id) || [])]
    const { data: schools } = await supabase
      .from('schools')
      .select('id, name, abbreviation, logo_url, conference')
      .in('id', schoolIds.length > 0 ? schoolIds : ['none'])

    const schoolsMap = new Map(schools?.map(s => [s.id, s]) || [])

    // Calculate total points per school
    const schoolTotals = new Map<string, { points: number; weeks: number }>()
    for (const sp of schoolPoints || []) {
      const current = schoolTotals.get(sp.school_id) || { points: 0, weeks: 0 }
      schoolTotals.set(sp.school_id, {
        points: current.points + Number(sp.total_points),
        weeks: current.weeks + 1,
      })
    }

    // Convert to array and sort by total points
    const schoolStats: SchoolStats[] = []
    for (const [schoolId, stats] of schoolTotals) {
      const school = schoolsMap.get(schoolId)
      if (school) {
        schoolStats.push({
          id: schoolId,
          name: school.name,
          abbreviation: school.abbreviation,
          logo_url: school.logo_url,
          conference: school.conference,
          total_points: stats.points,
          weeks_with_points: stats.weeks,
        })
      }
    }

    schoolStats.sort((a, b) => b.total_points - a.total_points)

    // Calculate ideal team (top N schools by total points)
    // Account for max selections per school across all teams
    const idealTeam = schoolStats.slice(0, schoolsPerTeam)
    const idealTeamPoints = idealTeam.reduce((sum, s) => sum + s.total_points, 0)

    // Calculate current week
    const { data: season } = await supabase
      .from('seasons')
      .select('year')
      .eq('id', league.season_id)
      .single()

    const year = season?.year || new Date().getFullYear()
    const currentWeek = calculateCurrentWeek(year)

    // Calculate max points for current week
    const currentWeekPoints = new Map<string, number>()
    for (const sp of schoolPoints || []) {
      if (sp.week_number === currentWeek) {
        currentWeekPoints.set(sp.school_id, Number(sp.total_points))
      }
    }

    // Get top schools for current week
    const currentWeekSchools = [...currentWeekPoints.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, schoolsPerTeam)
      .map(([id, points]) => ({
        id,
        name: schoolsMap.get(id)?.name || 'Unknown',
        points,
      }))

    const currentWeekMaxPoints = currentWeekSchools.reduce((sum, s) => sum + s.points, 0)

    // Calculate week-by-week max points
    const weeklyMaxPoints: WeekMaxPoints[] = []
    const weeks = [...new Set(schoolPoints?.map(p => p.week_number) || [])]
      .sort((a, b) => a - b)

    for (const week of weeks) {
      const weekPoints = new Map<string, number>()
      for (const sp of schoolPoints || []) {
        if (sp.week_number === week) {
          weekPoints.set(sp.school_id, Number(sp.total_points))
        }
      }

      const topSchools = [...weekPoints.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, schoolsPerTeam)
        .map(([id, points]) => ({
          id,
          name: schoolsMap.get(id)?.name || 'Unknown',
          points,
        }))

      weeklyMaxPoints.push({
        week,
        maxPoints: topSchools.reduce((sum, s) => sum + s.points, 0),
        topSchools,
      })
    }

    return NextResponse.json({
      leagueId,
      seasonId: league.season_id,
      currentWeek,
      schoolsPerTeam,

      // Ideal team stats
      idealTeam: {
        schools: idealTeam,
        totalPoints: idealTeamPoints,
      },

      // Current week max
      currentWeekMax: {
        week: currentWeek,
        maxPoints: currentWeekMaxPoints,
        topSchools: currentWeekSchools,
      },

      // Weekly max points breakdown
      weeklyMaxPoints,

      // All schools ranked
      allSchoolsRanked: schoolStats,
    })
  } catch (error) {
    console.error('Stats calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
