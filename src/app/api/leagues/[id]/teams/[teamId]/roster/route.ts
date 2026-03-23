import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentWeek } from '@/lib/week'
import { getLeagueYear } from '@/lib/league-helpers'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId, teamId } = await params
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Verify team belongs to this league
    const { data: team } = await supabase
      .from('fantasy_teams')
      .select('id, league_id')
      .eq('id', teamId)
      .eq('league_id', leagueId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this league' }, { status: 404 })
    }

    // Get current week
    const { data: league } = await supabase
      .from('leagues')
      .select('season_id, seasons(year)')
      .eq('id', leagueId)
      .single()

    const year = getLeagueYear(league?.seasons)
    const currentWeek = await getCurrentWeek(year)

    // Fetch active roster
    const { data: roster } = await supabase
      .from('roster_periods')
      .select(`
        school_id,
        slot_number,
        schools (
          id, name, abbreviation, logo_url, conference
        )
      `)
      .eq('fantasy_team_id', teamId)
      .lte('start_week', currentWeek)
      .or(`end_week.is.null,end_week.gt.${currentWeek}`)
      .order('slot_number', { ascending: true })

    return NextResponse.json({ roster: roster || [] })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Fetch team roster error:', error)
    return NextResponse.json(
      { error: 'Couldn\'t load the roster. Try refreshing the page.' },
      { status: 500 }
    )
  }
}
