import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { pushSubscribeSchema } from '@/lib/api/schemas'
import { createRateLimiter } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(
    request.headers.get('x-forwarded-for') || 'unknown'
  )
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = pushSubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
  }

  const { endpoint, keys } = parsed.data
  const supabase = createAdminClient()

  // Upsert subscription (same user + endpoint = update keys)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: request.headers.get('user-agent') || null,
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) {
    console.error('[push] Failed to save subscription:', error.message)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  // Enable push in notification preferences
  await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: user.id, push_enabled: true },
      { onConflict: 'user_id' }
    )

  return NextResponse.json({ success: true })
}
