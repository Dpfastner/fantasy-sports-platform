import { createAdminClient } from '@/lib/supabase/server'

/**
 * All trackable user actions in the platform.
 */
export type ActivityAction =
  // Auth
  | 'user.signup'
  | 'login.success'
  // Leagues
  | 'league.created'
  | 'league.joined'
  | 'league.reactivated'
  | 'league.settings_changed'
  // Draft
  | 'draft.started'
  | 'draft.completed'
  | 'draft.reset'
  | 'draft.pick_made'
  | 'draft.pick_skipped'
  | 'draft.paused'
  | 'draft.resumed'
  // Roster
  | 'transaction.completed'
  // Trades
  | 'trade.proposed'
  | 'trade.accepted'
  | 'trade.rejected'
  | 'trade.cancelled'
  | 'trade.vetoed'
  | 'trade.executed'
  | 'trade.expired'
  | 'trade.countered'
  | 'double_points.pick_made'
  | 'double_points.pick_removed'
  | 'team.edited'
  // Members (commissioner actions)
  | 'member.role_changed'
  | 'member.removed'
  | 'member.payment_toggled'
  | 'second_owner.added'
  | 'second_owner.removed'
  // Profile
  | 'profile.updated'
  | 'profile.email_changed'
  // Admin / Badges
  | 'badge.granted'
  | 'badge.revoked'
  // Announcements
  | 'announcement.created'
  | 'announcement.updated'
  | 'announcement.deleted'
  // Chat
  | 'chat.message_sent'
  // Events
  | 'event.tournament_viewed'
  | 'event.pool_created'
  | 'event.pool_joined'
  | 'event.picks_submitted'
  | 'event.picks_updated'
  | 'event.bracket_completed'
  | 'event.survivor_pick_made'
  | 'event.leaderboard_viewed'
  | 'event.draft_started'
  | 'event.draft_pick'
  // Support
  | 'support.response_sent'
  | 'support.ticket_viewed'
  // Other
  | 'invite_code.looked_up'
  | 'issue_report.submitted'

interface LogActivityParams {
  userId: string | null
  leagueId?: string | null
  action: ActivityAction
  details?: Record<string, unknown>
}

/**
 * Log a user action to the activity_log table.
 *
 * Fire-and-forget — this never blocks the calling request.
 * Uses the admin client to bypass RLS (activity_log has no user INSERT policy).
 */
export function logActivity(params: LogActivityParams): void {
  const { userId, leagueId = null, action, details = {} } = params
  const supabase = createAdminClient()

  supabase
    .from('activity_log')
    .insert({
      user_id: userId,
      league_id: leagueId,
      action,
      details,
    })
    .then(({ error }) => {
      if (error) {
        console.error(`[activity_log] Failed to log ${action}:`, error.message)
      }
    })
}
