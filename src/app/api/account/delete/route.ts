import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Delete the authenticated user's account.
 * Soft-deletes fantasy teams (renames to "Deleted Team", freezes roster,
 * cancels pending trades) so league history is preserved.
 * Anonymizes profile, deletes league memberships and auth user record.
 */
export async function DELETE() {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const supabase = createAdminClient()

  try {
    // 1. Reassign commissioner role if user is a league commissioner
    const { data: commissionerLeagues } = await supabase
      .from('leagues')
      .select('id, co_commissioner_id')
      .eq('commissioner_id', user.id)

    if (commissionerLeagues && commissionerLeagues.length > 0) {
      for (const league of commissionerLeagues) {
        if (league.co_commissioner_id) {
          // Promote co-commissioner
          await supabase
            .from('leagues')
            .update({
              commissioner_id: league.co_commissioner_id,
              co_commissioner_id: null,
            })
            .eq('id', league.id)
        } else {
          // Find another member to make commissioner
          const { data: members } = await supabase
            .from('league_members')
            .select('user_id')
            .eq('league_id', league.id)
            .neq('user_id', user.id)
            .limit(1)

          if (members && members.length > 0) {
            await supabase
              .from('leagues')
              .update({ commissioner_id: members[0].user_id })
              .eq('id', league.id)
          }
          // If no other members, the league will be orphaned (acceptable)
        }
      }
    }

    // 2. Delete non-league user data
    // Note: tos_agreements is intentionally NOT deleted here.
    // Privacy Policy Section 5 requires 7-year retention of consent records.
    // The FK is ON DELETE SET NULL so records survive auth user deletion.
    for (const table of ['activity_log', 'user_badges', 'notification_preferences']) {
      await supabase.from(table).delete().eq('user_id', user.id)
    }

    // 3. Soft-delete fantasy teams — preserve all league history
    const { data: teams } = await supabase
      .from('fantasy_teams')
      .select('id')
      .eq('user_id', user.id)

    if (teams && teams.length > 0) {
      const teamIds = teams.map(t => t.id)

      // Cancel any pending trades involving these teams
      await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('status', 'pending')
        .in('proposer_team_id', teamIds)
      await supabase
        .from('trades')
        .update({ status: 'cancelled' })
        .eq('status', 'pending')
        .in('receiver_team_id', teamIds)

      // Soft-delete: rename, unlink owner, mark deleted
      await supabase
        .from('fantasy_teams')
        .update({
          name: 'Deleted Team',
          user_id: null,
          is_deleted: true,
          image_url: null,
        })
        .in('id', teamIds)
    }

    // Delete league memberships
    await supabase.from('league_members').delete().eq('user_id', user.id)

    // 3. Anonymize profile (keep row for referential integrity, clear PII)
    await supabase
      .from('profiles')
      .update({
        display_name: 'Deleted User',
        email: `deleted-${user.id.slice(0, 8)}@rivyls.com`,
        avatar_url: null,
        timezone: null,
      })
      .eq('id', user.id)

    // 4. Delete the auth user (this also invalidates all sessions)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
