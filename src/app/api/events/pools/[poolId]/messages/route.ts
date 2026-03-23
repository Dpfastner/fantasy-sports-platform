import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const messageLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })

export async function GET(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params
    const admin = createAdminClient()
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id || ''

    const { data: messages } = await admin
      .from('event_pool_messages')
      .select('id, user_id, content, created_at, pinned_at, pinned_by')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: true })
      .limit(200)

    // Get display names
    const userIds = [...new Set((messages || []).map(m => m.user_id))]
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]))
    }

    // Get reactions (grouped by message + emoji with counts)
    const messageIds = (messages || []).map(m => m.id)
    const reactions: Record<string, { emoji: string; count: number; reacted: boolean }[]> = {}
    if (messageIds.length > 0) {
      const { data: reactionRows } = await admin
        .from('event_pool_message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds)

      const grouped: Record<string, Record<string, { count: number; reacted: boolean }>> = {}
      for (const r of reactionRows || []) {
        if (!grouped[r.message_id]) grouped[r.message_id] = {}
        if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = { count: 0, reacted: false }
        grouped[r.message_id][r.emoji].count++
        if (r.user_id === currentUserId) grouped[r.message_id][r.emoji].reacted = true
      }
      for (const [msgId, emojis] of Object.entries(grouped)) {
        reactions[msgId] = Object.entries(emojis).map(([emoji, data]) => ({ emoji, ...data }))
      }
    }

    return NextResponse.json({
      messages: (messages || []).map(m => ({
        id: m.id,
        user_id: m.user_id,
        message: m.content,
        created_at: m.created_at,
        pinned_at: m.pinned_at,
        pinned_by: m.pinned_by,
        display_name: profileMap[m.user_id] || 'Unknown',
      })),
      reactions,
    })
  } catch (err) {
    console.error('Pool messages fetch error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/messages', action: 'fetch' } })
    return NextResponse.json({ error: "Couldn't load messages. Try refreshing the page." }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You need to sign in to do this.' }, { status: 401 })
    }

    const { limited, response } = messageLimiter.check(getClientIp(request))
    if (limited) return response!

    const { content } = await request.json()
    if (!content || typeof content !== 'string' || content.trim().length === 0 || content.length > 2000) {
      return NextResponse.json({ error: 'Invalid message content' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify user is a pool member
    const { data: entry } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!entry) {
      return NextResponse.json({ error: 'You must be a pool member to send messages' }, { status: 403 })
    }

    const { data: message, error } = await admin
      .from('event_pool_messages')
      .insert({ pool_id: poolId, user_id: user.id, content: content.trim() })
      .select('id, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: "Couldn't send message. Try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: message.id })
  } catch (err) {
    console.error('Pool message send error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/messages', action: 'send' } })
    return NextResponse.json({ error: "Couldn't send message. Try again." }, { status: 500 })
  }
}
