import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { archiveLeagueSeason } from '@/lib/archive-season'

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

    if (!membership || (membership.role !== 'commissioner' && membership.role !== 'co_commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can archive seasons' },
        { status: 403 }
      )
    }

    const result = await archiveLeagueSeason(supabase, leagueId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'ALREADY_ARCHIVED') {
      return NextResponse.json(
        { error: 'This season has already been archived' },
        { status: 409 }
      )
    }
    console.error('History POST error:', error)
    return NextResponse.json(
      { error: 'Failed to archive season' },
      { status: 500 }
    )
  }
}
