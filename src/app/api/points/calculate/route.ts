import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  calculateAllPoints,
  calculateSeasonPoints,
  calculateWeeklySchoolPoints,
  calculateFantasyTeamPoints,
} from '@/lib/points/calculator'

// Create admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

interface CalculatePointsRequest {
  year?: number
  week?: number
  startWeek?: number
  endWeek?: number
  leagueId?: string
  mode?: 'week' | 'season' | 'league'
}

export async function POST(request: Request) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.SYNC_API_KEY

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CalculatePointsRequest = await request.json().catch(() => ({}))
    const year = body.year || new Date().getFullYear()
    const mode = body.mode || 'week'

    const supabase = getSupabaseAdmin()

    // Get season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('year', year)
      .single()

    if (!season) {
      return NextResponse.json(
        { error: `Season ${year} not found` },
        { status: 404 }
      )
    }

    // Calculate current week if not provided
    const currentDate = new Date()
    const seasonStart = new Date(Date.UTC(year, 7, 24)) // August 24 UTC
    const weeksDiff = Math.floor(
      (currentDate.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    )
    const defaultWeek = Math.max(0, Math.min(weeksDiff + 1, 22))

    if (mode === 'season') {
      // Calculate entire season (week 22 = Heisman)
      const startWeek = body.startWeek ?? 0
      const endWeek = body.endWeek ?? 22

      const result = await calculateSeasonPoints(season.id, startWeek, endWeek, supabase)

      return NextResponse.json({
        success: true,
        mode: 'season',
        year,
        startWeek,
        endWeek,
        ...result,
      })
    } else if (mode === 'league' && body.leagueId) {
      // Calculate for a specific league
      const week = body.week ?? defaultWeek

      // First ensure school points are calculated
      const schoolResult = await calculateWeeklySchoolPoints(season.id, week, supabase)

      // Then calculate for the specific league
      const teamResult = await calculateFantasyTeamPoints(body.leagueId, week, supabase)

      return NextResponse.json({
        success: true,
        mode: 'league',
        year,
        week,
        leagueId: body.leagueId,
        schoolPointsCalculated: schoolResult.calculated,
        teamsUpdated: teamResult.teamsUpdated,
        highPointsWinner: teamResult.highPointsWinner,
        errors: [...schoolResult.errors, ...teamResult.errors],
      })
    } else {
      // Calculate single week (default)
      const week = body.week ?? defaultWeek

      const result = await calculateAllPoints(season.id, week, supabase)

      return NextResponse.json({
        success: true,
        mode: 'week',
        year,
        week,
        ...result,
      })
    }
  } catch (error) {
    console.error('Points calculation error:', error)
    return NextResponse.json(
      { error: 'Points calculation failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Points calculation endpoint',
    usage: 'POST with Authorization: Bearer <SYNC_API_KEY>',
    modes: {
      week: {
        description: 'Calculate points for a single week',
        params: '{ year?, week?, mode: "week" }',
        example: { year: 2025, week: 3, mode: 'week' },
      },
      season: {
        description: 'Calculate points for entire season (backfill, week 22 = Heisman)',
        params: '{ year?, startWeek?, endWeek?, mode: "season" }',
        example: { year: 2025, startWeek: 0, endWeek: 22, mode: 'season' },
      },
      league: {
        description: 'Calculate points for a specific league',
        params: '{ year?, week?, leagueId, mode: "league" }',
        example: { year: 2025, week: 3, leagueId: 'uuid', mode: 'league' },
      },
    },
  })
}
