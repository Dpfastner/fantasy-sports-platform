import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Create admin client that bypasses RLS for delete operations
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration for admin operations')
  }

  return createAdminClient(url, key)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await request.json()
    if (!leagueId) {
      return NextResponse.json({ error: 'League ID required' }, { status: 400 })
    }

    // Verify user is commissioner
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'commissioner') {
      return NextResponse.json({ error: 'Only commissioners can reset the draft' }, { status: 403 })
    }

    // Get the draft ID
    const { data: draft } = await supabase
      .from('drafts')
      .select('id')
      .eq('league_id', leagueId)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Get all team IDs in the league (for clearing rosters)
    const { data: teams } = await supabase
      .from('fantasy_teams')
      .select('id')
      .eq('league_id', leagueId)

    const teamIds = teams?.map(t => t.id) || []

    // Use admin client for delete operations (bypasses RLS)
    // Delete draft picks
    const { error: picksError, count: picksDeleted } = await supabaseAdmin
      .from('draft_picks')
      .delete()
      .eq('draft_id', draft.id)

    if (picksError) {
      console.error('Error deleting draft picks:', picksError)
    } else {
      console.log('Deleted draft picks:', picksDeleted)
    }

    // Delete draft order
    const { error: orderError, count: orderDeleted } = await supabaseAdmin
      .from('draft_order')
      .delete()
      .eq('draft_id', draft.id)

    if (orderError) {
      console.error('Error deleting draft order:', orderError)
    } else {
      console.log('Deleted draft order entries:', orderDeleted)
    }

    // Delete roster periods for all teams in the league
    if (teamIds.length > 0) {
      const { error: rosterError, count: rostersDeleted } = await supabaseAdmin
        .from('roster_periods')
        .delete()
        .in('fantasy_team_id', teamIds)

      if (rosterError) {
        console.error('Error deleting roster periods:', rosterError)
      } else {
        console.log('Deleted roster periods:', rostersDeleted)
      }
    }

    // Reset draft state (use admin client to ensure it works)
    const { error: draftError } = await supabaseAdmin
      .from('drafts')
      .update({
        status: 'not_started',
        current_round: 1,
        current_pick: 1,
        current_team_id: null,
        pick_deadline: null,
        started_at: null,
        completed_at: null
      })
      .eq('id', draft.id)

    if (draftError) {
      console.error('Error resetting draft state:', draftError)
      return NextResponse.json({ error: 'Failed to reset draft: ' + draftError.message }, { status: 500 })
    }

    // Reset team draft positions (optional - they can re-randomize)
    // We'll leave draft_position intact so manual order is preserved

    return NextResponse.json({
      success: true,
      message: 'Draft reset successfully',
      cleared: {
        picks: true,
        order: true,
        rosters: teamIds.length
      }
    })

  } catch (error) {
    console.error('Reset draft error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to reset draft: ${errorMessage}` },
      { status: 500 }
    )
  }
}
