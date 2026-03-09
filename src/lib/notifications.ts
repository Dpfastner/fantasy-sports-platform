import { createAdminClient } from '@/lib/supabase/server'

/**
 * All notification types in the platform.
 */
export type NotificationType =
  | 'draft_started'
  | 'draft_your_turn'
  | 'draft_pick_made'
  | 'draft_completed'
  | 'announcement_posted'
  | 'league_joined'
  | 'transaction_completed'
  | 'chat_mention'
  | 'game_results'
  | 'trade_proposed'
  | 'trade_accepted'
  | 'trade_rejected'
  | 'trade_cancelled'
  | 'trade_vetoed'
  | 'trade_expired'
  | 'trade_expiring'
  | 'system'

/**
 * Maps notification types to preference column names.
 * 'system' is always delivered (no user toggle).
 */
const TYPE_TO_PREF: Record<string, string> = {
  draft_started: 'inapp_draft',
  draft_your_turn: 'inapp_draft',
  draft_pick_made: 'inapp_draft',
  draft_completed: 'inapp_draft',
  game_results: 'inapp_game_results',
  trade_proposed: 'inapp_trades',
  trade_accepted: 'inapp_trades',
  trade_rejected: 'inapp_trades',
  trade_cancelled: 'inapp_trades',
  trade_vetoed: 'inapp_trades',
  trade_expired: 'inapp_trades',
  trade_expiring: 'inapp_trades',
  transaction_completed: 'inapp_transactions',
  announcement_posted: 'inapp_announcements',
  chat_mention: 'inapp_chat_mentions',
  league_joined: 'inapp_league_activity',
}

/**
 * Check if a user has opted out of a notification type.
 * Returns true if the notification should be delivered.
 */
async function shouldDeliver(userId: string, type: NotificationType): Promise<boolean> {
  const prefColumn = TYPE_TO_PREF[type]
  if (!prefColumn) return true // system notifications always deliver

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('notification_preferences')
    .select(prefColumn)
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return true // no preferences row = all defaults (true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)[prefColumn] !== false
}

interface CreateNotificationParams {
  userId: string
  leagueId?: string | null
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Create a single notification for a user.
 * Respects user in-app notification preferences.
 * Fire-and-forget — never blocks the calling request.
 */
export function createNotification(params: CreateNotificationParams): void {
  const { userId, leagueId = null, type, title, body, data = {} } = params
  const supabase = createAdminClient()

  shouldDeliver(userId, type).then(deliver => {
    if (!deliver) return

    supabase
      .from('notifications')
      .insert({
        user_id: userId,
        league_id: leagueId,
        type,
        title,
        body,
        data,
      })
      .then(({ error }) => {
        if (error) {
          console.error(`[notifications] Failed to create ${type}:`, error.message)
        }
      })
  }).catch(err => {
    console.error(`[notifications] Preference check failed for ${type}:`, err)
    // Fail open: deliver the notification anyway
    supabase
      .from('notifications')
      .insert({ user_id: userId, league_id: leagueId, type, title, body, data })
      .then(({ error }) => {
        if (error) console.error(`[notifications] Fallback insert failed:`, error.message)
      })
  })
}

interface NotifyLeagueMembersParams {
  leagueId: string
  excludeUserId?: string | null
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Send a notification to all members of a league, optionally excluding a user.
 * Respects user in-app notification preferences.
 * Fire-and-forget.
 */
export async function notifyLeagueMembers(params: NotifyLeagueMembersParams): Promise<void> {
  const { leagueId, excludeUserId, type, title, body, data = {} } = params
  const supabase = createAdminClient()

  const { data: members, error } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (error || !members) {
    console.error('[notifications] Failed to fetch league members:', error?.message)
    return
  }

  const candidates = excludeUserId
    ? members.filter(m => m.user_id !== excludeUserId)
    : members

  if (candidates.length === 0) return

  // Check preferences for all candidates
  const prefColumn = TYPE_TO_PREF[type]
  let recipients = candidates

  if (prefColumn) {
    const userIds = candidates.map(m => m.user_id)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, inapp_draft, inapp_game_results, inapp_trades, inapp_transactions, inapp_announcements, inapp_chat_mentions, inapp_league_activity')
      .in('user_id', userIds)

    if (prefs && prefs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optedOut = new Set(
        prefs.filter(p => (p as any)[prefColumn] === false).map(p => p.user_id)
      )
      recipients = candidates.filter(m => !optedOut.has(m.user_id))
    }
  }

  if (recipients.length === 0) return

  const rows = recipients.map(m => ({
    user_id: m.user_id,
    league_id: leagueId,
    type,
    title,
    body,
    data,
  }))

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(rows)

  if (insertError) {
    console.error(`[notifications] Failed to notify league members (${type}):`, insertError.message)
  }
}

/**
 * Send draft_pick_made notifications with throttle.
 * Skips users who already have >= 3 unread draft_pick_made notifications for this draft.
 * Respects user in-app notification preferences.
 */
export async function notifyDraftPickThrottled(params: {
  leagueId: string
  draftId: string
  excludeUserId: string
  title: string
  body: string
}): Promise<void> {
  const { leagueId, draftId, excludeUserId, title, body } = params
  const supabase = createAdminClient()

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members) return

  const candidates = members.filter(m => m.user_id !== excludeUserId)
  if (candidates.length === 0) return

  // Check in-app draft preference for all candidates
  const userIds = candidates.map(m => m.user_id)
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('user_id, inapp_draft')
    .in('user_id', userIds)

  const optedOut = new Set(
    (prefs || []).filter(p => p.inapp_draft === false).map(p => p.user_id)
  )
  const recipients = candidates.filter(m => !optedOut.has(m.user_id))
  if (recipients.length === 0) return

  // Check unread counts for each recipient
  const rows: {
    user_id: string
    league_id: string
    type: string
    title: string
    body: string
    data: Record<string, unknown>
  }[] = []

  for (const member of recipients) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', member.user_id)
      .eq('type', 'draft_pick_made')
      .is('read_at', null)
      .contains('data', { draftId })

    if ((count ?? 0) < 3) {
      rows.push({
        user_id: member.user_id,
        league_id: leagueId,
        type: 'draft_pick_made',
        title,
        body,
        data: { leagueId, draftId },
      })
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('notifications').insert(rows)
    if (error) {
      console.error('[notifications] Failed to send throttled draft notifications:', error.message)
    }
  }
}
