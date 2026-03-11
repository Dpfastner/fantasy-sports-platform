import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { notifyLeagueMembers } from '@/lib/notifications'
import { logActivity } from '@/lib/activity'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params

    // Auth
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const admin = createAdminClient()

    // Verify commissioner
    const { data: membership } = await admin
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'commissioner' && membership.role !== 'co_commissioner')) {
      return NextResponse.json({ error: 'Only commissioners can reactivate leagues' }, { status: 403 })
    }

    // Verify league is dormant
    const { data: league } = await admin
      .from('leagues')
      .select('id, name, status, sport_id')
      .eq('id', leagueId)
      .single()

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    if (league.status !== 'dormant') {
      return NextResponse.json({ error: 'League is not dormant' }, { status: 400 })
    }

    // Get season from request body
    const body = await request.json()
    const { seasonId } = body

    if (!seasonId) {
      return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
    }

    // Verify the season exists and matches the sport
    const { data: season } = await admin
      .from('seasons')
      .select('id, year, name, sport_id')
      .eq('id', seasonId)
      .single()

    if (!season || season.sport_id !== league.sport_id) {
      return NextResponse.json({ error: 'Invalid season for this sport' }, { status: 400 })
    }

    // 1. Soft-delete old fantasy teams
    await admin
      .from('fantasy_teams')
      .update({ is_deleted: true })
      .eq('league_id', leagueId)
      .eq('is_deleted', false)

    // 2. Get all current league members
    const { data: members } = await admin
      .from('league_members')
      .select('user_id, role')
      .eq('league_id', leagueId)

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No members found' }, { status: 400 })
    }

    // 3. Get old team names to preserve them
    const { data: oldTeams } = await admin
      .from('fantasy_teams')
      .select('user_id, name, primary_color, secondary_color, image_url')
      .eq('league_id', leagueId)
      .eq('is_deleted', true)
      .order('created_at', { ascending: false })

    const oldTeamMap = new Map<string, { name: string; primary_color: string; secondary_color: string; image_url: string | null }>()
    for (const t of oldTeams || []) {
      if (t.user_id && !oldTeamMap.has(t.user_id)) {
        oldTeamMap.set(t.user_id, {
          name: t.name,
          primary_color: t.primary_color,
          secondary_color: t.secondary_color,
          image_url: t.image_url,
        })
      }
    }

    // 4. Create new fantasy teams for all members
    const newTeams = members.map(m => {
      const old = oldTeamMap.get(m.user_id)
      return {
        league_id: leagueId,
        user_id: m.user_id,
        name: old?.name || 'My Team',
        primary_color: old?.primary_color || '#4F46E5',
        secondary_color: old?.secondary_color || '#FFFFFF',
        image_url: old?.image_url || null,
      }
    })

    const { error: teamsError } = await admin
      .from('fantasy_teams')
      .insert(newTeams)

    if (teamsError) {
      return NextResponse.json(
        { error: 'Failed to create teams', details: teamsError.message },
        { status: 500 }
      )
    }

    // 5. Update league: set active + new season
    const { error: updateError } = await admin
      .from('leagues')
      .update({ status: 'active', season_id: seasonId })
      .eq('id', leagueId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update league', details: updateError.message },
        { status: 500 }
      )
    }

    // 6. Reset league settings
    await admin
      .from('league_settings')
      .update({
        draft_date: null,
        settings_locked: false,
        manual_draft_order: null,
      })
      .eq('league_id', leagueId)

    // 7. Create new draft record
    await admin
      .from('drafts')
      .insert({
        league_id: leagueId,
        status: 'not_started',
        current_round: 1,
        current_pick: 1,
      })

    // 8. Notify all members
    await notifyLeagueMembers({
      leagueId,
      excludeUserId: user.id,
      type: 'system',
      title: 'League Reactivated!',
      body: `${league.name} has been reactivated for the ${season.name} season. Get ready for the draft!`,
      data: { leagueId },
    })

    // 9. Log activity
    logActivity({
      userId: user.id,
      leagueId,
      action: 'league.reactivated',
      details: { seasonId, seasonName: season.name, seasonYear: season.year },
    })

    return NextResponse.json({
      success: true,
      seasonYear: season.year,
      seasonName: season.name,
    })
  } catch (error) {
    console.error('Reactivate error:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate league', details: String(error) },
      { status: 500 }
    )
  }
}
