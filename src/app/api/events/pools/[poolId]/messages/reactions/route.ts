import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

// GET — reaction detail: who reacted with what
export async function GET(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    await params
    const url = new URL(request.url)
    const messageId = url.searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: reactions } = await admin
      .from('event_pool_message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId)

    const userIds = [...new Set((reactions || []).map(r => r.user_id))]
    let profiles: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await admin
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)
      if (profilesData) {
        profiles = Object.fromEntries(
          profilesData.map(p => [p.id, p.display_name || p.email?.split('@')[0] || 'Unknown'])
        )
      }
    }

    const detail = (reactions || []).map(r => ({
      emoji: r.emoji,
      userId: r.user_id,
      displayName: profiles[r.user_id] || 'Unknown',
    }))

    return NextResponse.json({ reactions: detail })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to fetch reaction details' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { poolId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messageId, emoji } = await request.json()
    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Missing messageId or emoji' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify membership
    const { data: entry } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!entry) {
      return NextResponse.json({ error: 'Not a pool member' }, { status: 403 })
    }

    // Toggle: if reaction exists, remove it; otherwise add it
    const { data: existing } = await admin
      .from('event_pool_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      await admin.from('event_pool_message_reactions').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed' })
    } else {
      await admin.from('event_pool_message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
      return NextResponse.json({ action: 'added' })
    }
  } catch (err) {
    Sentry.captureException(err)
    console.error('Reaction error:', err)
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}
