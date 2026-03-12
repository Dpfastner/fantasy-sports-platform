import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { pushUnsubscribeSchema } from '@/lib/api/schemas'
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

  const parsed = pushUnsubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const { endpoint } = parsed.data
  const supabase = createAdminClient()

  // Remove the subscription
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  // Check if user has any remaining subscriptions
  const { count } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // If no subscriptions remain, disable push
  if ((count ?? 0) === 0) {
    await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user.id, push_enabled: false },
        { onConflict: 'user_id' }
      )
  }

  return NextResponse.json({ success: true })
}
