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
  | 'system'

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
 * Fire-and-forget — never blocks the calling request.
 */
export function createNotification(params: CreateNotificationParams): void {
  const { userId, leagueId = null, type, title, body, data = {} } = params
  const supabase = createAdminClient()

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

  const recipients = excludeUserId
    ? members.filter(m => m.user_id !== excludeUserId)
    : members

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

  const recipients = members.filter(m => m.user_id !== excludeUserId)
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
