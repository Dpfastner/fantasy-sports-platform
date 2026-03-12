import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/server'

// Configure VAPID once at module level
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@rivyls.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
  type?: string
}

/**
 * Send push notifications to all of a user's subscribed devices.
 * Fire-and-forget. Cleans up expired/invalid subscriptions automatically.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  const supabase = createAdminClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subscriptions || subscriptions.length === 0) return

  const jsonPayload = JSON.stringify(payload)
  const deadIds: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          jsonPayload
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          deadIds.push(sub.id)
        } else {
          console.error(`[push] Failed to send to ${sub.endpoint.slice(0, 50)}...`, statusCode || String(err))
        }
      }
    })
  )

  // Clean up dead subscriptions
  if (deadIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', deadIds)
  }
}

/**
 * Send push to multiple users at once (used by notifyLeagueMembers).
 * Fire-and-forget.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(userIds.map(uid => sendPushToUser(uid, payload)))
}
