import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 3 })

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You need to sign in to do this.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify league exists and user is creator
    const { data: league } = await admin
      .from('leagues')
      .select('id, name, created_by')
      .eq('id', id)
      .single()

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Check if user is league creator or an admin
    const { data: profile } = await admin
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.tier === 'admin'

    if (league.created_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Only the league creator can delete this league' }, { status: 403 })
    }

    // Helper to delete from a table and log errors without stopping
    const safeDelete = async (table: string, column: string, value: string) => {
      const { error } = await admin.from(table).delete().eq(column, value)
      if (error) {
        console.error(`Error deleting ${table}:`, error)
        Sentry.captureException(error, { tags: { route: 'leagues/[id]/delete', action: 'delete', table } })
      }
    }

    // Get IDs needed for child-table deletes
    const { data: drafts } = await admin
      .from('drafts')
      .select('id')
      .eq('league_id', id)
    const draftIds = (drafts || []).map(d => d.id)

    const { data: teams } = await admin
      .from('fantasy_teams')
      .select('id')
      .eq('league_id', id)
    const teamIds = (teams || []).map(t => t.id)

    const { data: trades } = await admin
      .from('trades')
      .select('id')
      .eq('league_id', id)
    const tradeIds = (trades || []).map(t => t.id)

    const { data: leagueMessages } = await admin
      .from('league_messages')
      .select('id')
      .eq('league_id', id)
    const messageIds = (leagueMessages || []).map(m => m.id)

    const { data: memberRows } = await admin
      .from('league_members')
      .select('user_id')
      .eq('league_id', id)
    const memberUserIds = (memberRows || []).map(m => m.user_id)

    // Cascade delete child tables first

    // 1. Draft-related tables
    if (draftIds.length > 0) {
      for (const draftId of draftIds) {
        await safeDelete('draft_picks', 'draft_id', draftId)
        await safeDelete('draft_order', 'draft_id', draftId)
        await safeDelete('draft_messages', 'draft_id', draftId)
      }
    }
    await safeDelete('drafts', 'league_id', id)

    // 2. Scoring-related tables
    await safeDelete('roster_periods', 'league_id', id)
    await safeDelete('school_weekly_points', 'league_id', id)
    await safeDelete('fantasy_team_weekly_points', 'league_id', id)
    await safeDelete('double_points_picks', 'league_id', id)

    // 3. Transaction-related tables
    await safeDelete('transactions', 'league_id', id)

    // 4. Trade-related tables
    if (tradeIds.length > 0) {
      for (const tradeId of tradeIds) {
        await safeDelete('trade_items', 'trade_id', tradeId)
      }
    }
    await safeDelete('trades', 'league_id', id)

    // 5. Teams
    if (teamIds.length > 0) {
      for (const teamId of teamIds) {
        await safeDelete('fantasy_teams', 'id', teamId)
      }
    }

    // 6. Members
    await safeDelete('league_members', 'league_id', id)

    // 7. Settings and seasons
    await safeDelete('league_settings', 'league_id', id)
    await safeDelete('league_seasons', 'league_id', id)

    // 8. Messages and reactions
    if (messageIds.length > 0) {
      for (const msgId of messageIds) {
        await safeDelete('league_message_reactions', 'message_id', msgId)
      }
      // Delete pinned messages that reference these message IDs
      for (const msgId of messageIds) {
        await safeDelete('pinned_messages', 'message_id', msgId)
      }
    }
    await safeDelete('league_messages', 'league_id', id)

    // 9. Notification preferences for league members
    if (memberUserIds.length > 0) {
      for (const uid of memberUserIds) {
        // Only delete notification_preferences scoped to this league
        const { error } = await admin
          .from('notification_preferences')
          .delete()
          .eq('user_id', uid)
          .eq('league_id', id)
        if (error) {
          console.error('Error deleting notification_preferences:', error)
          Sentry.captureException(error, { tags: { route: 'leagues/[id]/delete', action: 'delete', table: 'notification_preferences' } })
        }
      }
    }

    // 10. Finally, delete the league itself
    const { error: leagueErr } = await admin
      .from('leagues')
      .delete()
      .eq('id', id)

    if (leagueErr) {
      console.error('Error deleting league:', leagueErr)
      Sentry.captureException(leagueErr, { tags: { route: 'leagues/[id]/delete', action: 'delete', table: 'leagues' } })
      return NextResponse.json({ error: "Couldn't delete league. Try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('League delete error:', err)
    Sentry.captureException(err, { tags: { route: 'leagues/[id]/delete', action: 'delete' } })
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
