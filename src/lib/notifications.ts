import { createAdminClient } from '@/lib/supabase/server'
import { sendPushToUser, sendPushToUsers } from '@/lib/push'

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
  | 'event_eliminated'
  | 'event_survived'
  | 'event_deadline'
  | 'event_results'
  | 'event_pool_joined'
  | 'event_tournament_starting'
  | 'support_response'
  | 'badge_awarded'
  | 'system'

/**
 * Maps notification types to in-app preference column names.
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
  event_eliminated: 'inapp_events',
  event_survived: 'inapp_events',
  event_deadline: 'inapp_events',
  event_results: 'inapp_events',
  event_pool_joined: 'inapp_events',
  event_tournament_starting: 'inapp_events',
}

/**
 * Maps notification types to push preference column names.
 * 'system' push is always delivered if push_enabled is true.
 */
const TYPE_TO_PUSH_PREF: Record<string, string> = {
  draft_started: 'push_draft',
  draft_your_turn: 'push_draft',
  draft_pick_made: 'push_draft',
  draft_completed: 'push_draft',
  game_results: 'push_game_results',
  trade_proposed: 'push_trades',
  trade_accepted: 'push_trades',
  trade_rejected: 'push_trades',
  trade_cancelled: 'push_trades',
  trade_vetoed: 'push_trades',
  trade_expired: 'push_trades',
  trade_expiring: 'push_trades',
  transaction_completed: 'push_transactions',
  announcement_posted: 'push_announcements',
  chat_mention: 'push_chat_mentions',
  league_joined: 'push_league_activity',
  event_eliminated: 'push_events',
  event_survived: 'push_events',
  event_deadline: 'push_events',
  event_results: 'push_events',
  event_pool_joined: 'push_events',
  event_tournament_starting: 'push_events',
}

/**
 * Build an absolute URL for a notification's navigation target.
 * Server-side equivalent of getNotificationHref() in NotificationBell.tsx.
 */
function buildNotificationUrl(
  type: string,
  data: Record<string, unknown>,
  leagueId?: string | null
): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rivyls.com'
  const lid = (data?.leagueId as string) || leagueId
  if (!lid) return `${base}/dashboard`

  switch (type) {
    case 'draft_started':
    case 'draft_your_turn':
      return `${base}/leagues/${lid}/draft`
    case 'draft_completed':
    case 'league_joined':
      return `${base}/leagues/${lid}`
    case 'announcement_posted':
      return `${base}/leagues/${lid}`
    case 'transaction_completed':
      return `${base}/leagues/${lid}/transactions`
    case 'trade_accepted':
      return `${base}/leagues/${lid}/team`
    case 'trade_proposed':
    case 'trade_rejected':
    case 'trade_cancelled':
    case 'trade_vetoed':
    case 'trade_expired':
    case 'trade_expiring':
      return `${base}/leagues/${lid}/team`
    case 'game_results':
      return `${base}/leagues/${lid}`
    case 'event_eliminated':
    case 'event_survived':
    case 'event_results':
    case 'event_deadline':
    case 'event_pool_joined':
    case 'event_tournament_starting': {
      const poolId = data?.poolId as string
      const slug = data?.tournamentSlug as string
      if (poolId && slug) return `${base}/events/${slug}/pools/${poolId}`
      return `${base}/events`
    }
    case 'support_response': {
      const reportId = data?.reportId as string
      if (reportId) return `${base}/tickets/${reportId}`
      return `${base}/tickets`
    }
    case 'badge_awarded': {
      const badgeId = data?.badgeId as string
      if (badgeId) return `${base}/profile?celebrate=${badgeId}`
      return `${base}/profile`
    }
    default:
      return `${base}/dashboard`
  }
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

/**
 * Send a push notification to a user if push_enabled is true
 * and the per-type push preference is not disabled.
 * Fire-and-forget.
 */
function maybeSendPush(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown>,
  leagueId?: string | null
): void {
  const pushPrefColumn = TYPE_TO_PUSH_PREF[type]
  const selectColumns = pushPrefColumn ? `push_enabled, ${pushPrefColumn}` : 'push_enabled'
  const supabase = createAdminClient()
  Promise.resolve(
    supabase
      .from('notification_preferences')
      .select(selectColumns)
      .eq('user_id', userId)
      .maybeSingle()
  )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(({ data: pref }: { data: any }) => {
      if (pref?.push_enabled !== true) return
      // Check per-type push preference (default true if column missing)
      if (pushPrefColumn && pref[pushPrefColumn] === false) return
      const url = buildNotificationUrl(type, data, leagueId)
      sendPushToUser(userId, { title, body, url, type, icon: '/icon-192.png' })
    })
    .catch(() => {
      // Push is best-effort, don't fail the notification
    })
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
 * Also sends a browser push notification if enabled.
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
        } else {
          // Send push notification (fire-and-forget)
          maybeSendPush(userId, type, title, body, data, leagueId)
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
 * Also sends browser push notifications to enabled users.
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
  } else {
    // Send push to recipients with push_enabled + per-type pref (fire-and-forget)
    const recipientIds = recipients.map(r => r.user_id)
    const pushPrefColumn = TYPE_TO_PUSH_PREF[type]
    const pushSelectCols = pushPrefColumn ? `user_id, ${pushPrefColumn}` : 'user_id'
    Promise.resolve(
      supabase
        .from('notification_preferences')
        .select(pushSelectCols)
        .in('user_id', recipientIds)
        .eq('push_enabled', true)
    )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data: pushPrefs }: { data: any[] | null }) => {
        if (!pushPrefs || pushPrefs.length === 0) return
        // Filter out users who disabled this specific push type
        const pushRecipients = pushPrefColumn
          ? pushPrefs.filter(p => p[pushPrefColumn] !== false)
          : pushPrefs
        if (pushRecipients.length > 0) {
          const url = buildNotificationUrl(type, data, leagueId)
          sendPushToUsers(
            pushRecipients.map(p => p.user_id),
            { title, body, url, type, icon: '/icon-192.png' }
          )
        }
      })
      .catch(() => {
        // Push is best-effort
      })
  }
}

/**
 * Send draft_pick_made notifications with throttle.
 * Skips users who already have >= 3 unread draft_pick_made notifications for this draft.
 * Respects user in-app notification preferences.
 * Also sends push notifications to throttle-eligible users.
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
    if (!error) {
      // Send push to recipients with push_enabled + push_draft (fire-and-forget)
      const rowUserIds = rows.map(r => r.user_id)
      Promise.resolve(
        supabase
          .from('notification_preferences')
          .select('user_id, push_draft')
          .in('user_id', rowUserIds)
          .eq('push_enabled', true)
      )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data: pushPrefs }: { data: any[] | null }) => {
          if (!pushPrefs || pushPrefs.length === 0) return
          const pushRecipients = pushPrefs.filter((p: any) => p.push_draft !== false)
          if (pushRecipients.length > 0) {
            const url = buildNotificationUrl('draft_pick_made', { leagueId, draftId }, leagueId)
            sendPushToUsers(
              pushRecipients.map(p => p.user_id),
              { title, body, url, type: 'draft_pick_made', icon: '/icon-192.png' }
            )
          }
        })
        .catch(() => {
          // Push is best-effort
        })
    } else {
      console.error('[notifications] Failed to send throttled draft notifications:', error.message)
    }
  }
}

/**
 * Send a notification to all members of an event pool, optionally excluding a user.
 * Respects user in-app notification preferences.
 * Fire-and-forget.
 */
export async function notifyPoolMembers(params: {
  poolId: string
  excludeUserId?: string | null
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  const { poolId, excludeUserId, type, title, body, data = {} } = params
  const supabase = createAdminClient()

  const { data: entries, error } = await supabase
    .from('event_entries')
    .select('user_id')
    .eq('pool_id', poolId)

  if (error || !entries) {
    console.error('[notifications] Failed to fetch pool members:', error?.message)
    return
  }

  const candidates = excludeUserId
    ? entries.filter(e => e.user_id !== excludeUserId)
    : entries

  if (candidates.length === 0) return

  // Check preferences
  const prefColumn = TYPE_TO_PREF[type]
  let recipients = candidates

  if (prefColumn) {
    const userIds = candidates.map(e => e.user_id)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, inapp_events')
      .in('user_id', userIds)

    if (prefs && prefs.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const optedOut = new Set(
        prefs.filter(p => (p as any)[prefColumn] === false).map(p => p.user_id)
      )
      recipients = candidates.filter(e => !optedOut.has(e.user_id))
    }
  }

  if (recipients.length === 0) return

  const rows = recipients.map(e => ({
    user_id: e.user_id,
    league_id: null,
    type,
    title,
    body,
    data: { ...data, poolId },
  }))

  const { error: insertError } = await supabase.from('notifications').insert(rows)
  if (insertError) {
    console.error(`[notifications] Failed to notify pool members (${type}):`, insertError.message)
  } else {
    // Push notifications (fire-and-forget)
    const recipientIds = recipients.map(r => r.user_id)
    const pushPrefColumn = TYPE_TO_PUSH_PREF[type]
    Promise.resolve(
      supabase
        .from('notification_preferences')
        .select('user_id, push_events')
        .in('user_id', recipientIds)
        .eq('push_enabled', true)
    )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data: pushPrefs }: { data: any[] | null }) => {
        if (!pushPrefs || pushPrefs.length === 0) return
        const pushRecipients = pushPrefColumn
          ? pushPrefs.filter(p => (p as any)[pushPrefColumn] !== false)
          : pushPrefs
        if (pushRecipients.length > 0) {
          const url = buildNotificationUrl(type, { ...data, poolId }, null)
          sendPushToUsers(
            pushRecipients.map(p => p.user_id),
            { title, body, url, type, icon: '/icon-192.png' }
          )
        }
      })
      .catch(() => {
        // Push is best-effort
      })
  }
}
