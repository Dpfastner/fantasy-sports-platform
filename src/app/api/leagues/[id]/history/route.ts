import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { getLeagueYear } from '@/lib/league-helpers'
import { getCurrentWeek } from '@/lib/week'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: seasons, error } = await supabase
      .from('league_seasons')
      .select('id, league_id, season_year, final_standings, champion_user_id, archived_at, created_at')
      .eq('league_id', leagueId)
      .order('season_year', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch history', details: error.message },
        { status: 500 }
      )
    }

    // Get champion profile info
    const championIds = (seasons || [])
      .map(s => s.champion_user_id)
      .filter((id): id is string => !!id)

    let championProfiles: Record<string, string> = {}
    if (championIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', championIds)

      championProfiles = Object.fromEntries(
        (profiles || []).map(p => [p.id, p.display_name || p.email?.split('@')[0] || 'Unknown'])
      )
    }

    return NextResponse.json({
      seasons: (seasons || []).map(s => ({
        ...s,
        championName: s.champion_user_id ? championProfiles[s.champion_user_id] || 'Unknown' : null,
      })),
    })
  } catch (error) {
    console.error('History GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    // Verify commissioner role
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'commissioner' && membership.role !== 'co-commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can archive seasons' },
        { status: 403 }
      )
    }

    // Get league with season info
    const { data: league } = await supabase
      .from('leagues')
      .select('id, name, season_id, seasons(year, name)')
      .eq('id', leagueId)
      .single()

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const seasonYear = getLeagueYear(league.seasons)
    const currentWeek = await getCurrentWeek(seasonYear)

    // Check if already archived for this year
    const { data: existing } = await supabase
      .from('league_seasons')
      .select('id')
      .eq('league_id', leagueId)
      .eq('season_year', seasonYear)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This season has already been archived' },
        { status: 409 }
      )
    }

    // Fetch current standings (same logic as standings route)
    const { data: teams } = await supabase
      .from('fantasy_teams')
      .select(`
        id,
        name,
        user_id,
        profiles!fantasy_teams_user_id_fkey(display_name, email)
      `)
      .eq('league_id', leagueId)

    const teamIds = (teams || []).map(t => t.id)

    const { data: weeklyPoints } = await supabase
      .from('fantasy_team_weekly_points')
      .select('fantasy_team_id, week_number, points')
      .in('fantasy_team_id', teamIds.length > 0 ? teamIds : ['none'])
      .lte('week_number', currentWeek)

    // Calculate totals
    const totalsByTeam = new Map<string, number>()
    for (const wp of weeklyPoints || []) {
      const current = totalsByTeam.get(wp.fantasy_team_id) || 0
      totalsByTeam.set(wp.fantasy_team_id, current + Number(wp.points))
    }

    // Build standings
    const standings = (teams || []).map(team => {
      const profile = team.profiles as unknown as { display_name: string | null; email: string }
      return {
        teamId: team.id,
        teamName: team.name,
        userId: team.user_id,
        userName: profile?.display_name || profile?.email?.split('@')[0] || 'Unknown',
        totalPoints: totalsByTeam.get(team.id) || 0,
        rank: 0,
      }
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((team, index) => ({ ...team, rank: index + 1 }))

    const championUserId = standings.length > 0 ? standings[0].userId : null

    // Insert archive
    const { error: insertError } = await supabase
      .from('league_seasons')
      .insert({
        league_id: leagueId,
        season_year: seasonYear,
        final_standings: standings,
        champion_user_id: championUserId,
        archived_at: new Date().toISOString(),
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'This season has already been archived' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to archive season', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, seasonYear, champion: standings[0] || null })
  } catch (error) {
    console.error('History POST error:', error)
    return NextResponse.json(
      { error: 'Failed to archive season' },
      { status: 500 }
    )
  }
}
