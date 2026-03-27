import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { chatMessageSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { checkContent } from '@/lib/moderation/word-filter'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

// GET /api/conversations/[id]/messages — fetch messages (last 50)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    // Verify user is a conversation member
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
    }

    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select('id, message, created_at, user_id, reply_to_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: "Couldn't load messages. Try refreshing the page.", details: error.message },
        { status: 500 }
      )
    }

    // Enrich with display names
    const userIds = [...new Set((messages || []).map(m => m.user_id))]
    let profiles: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds)
      if (profilesData) {
        profiles = Object.fromEntries(
          profilesData.map(p => [p.id, p.display_name || p.email?.split('@')[0] || 'Unknown'])
        )
      }
    }

    // Fetch reply-to messages
    const replyToIds = [...new Set((messages || []).map(m => m.reply_to_id).filter(Boolean))] as string[]
    let replyToMap: Record<string, { id: string; user_id: string; message: string; display_name: string }> = {}
    if (replyToIds.length > 0) {
      const { data: replyMessages } = await supabase
        .from('direct_messages')
        .select('id, user_id, message')
        .in('id', replyToIds)

      if (replyMessages) {
        const replyUserIds = [...new Set(replyMessages.map(m => m.user_id).filter(uid => !profiles[uid]))]
        if (replyUserIds.length > 0) {
          const { data: replyProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, email')
            .in('id', replyUserIds)
          if (replyProfiles) {
            for (const p of replyProfiles) {
              profiles[p.id] = p.display_name || p.email?.split('@')[0] || 'Unknown'
            }
          }
        }

        replyToMap = Object.fromEntries(
          replyMessages.map(m => [m.id, {
            id: m.id,
            user_id: m.user_id,
            message: m.message,
            display_name: profiles[m.user_id] || 'Unknown',
          }])
        )
      }
    }

    // Return in chronological order (oldest first)
    const enriched = (messages || []).reverse().map(m => ({
      ...m,
      display_name: profiles[m.user_id] || 'Unknown',
      reply_to: m.reply_to_id ? replyToMap[m.reply_to_id] || null : null,
    }))

    return NextResponse.json({ messages: enriched })
  } catch (error) {
    Sentry.captureException(error)
    console.error('DM messages GET error:', error)
    return NextResponse.json({ error: "Couldn't load messages. Try refreshing the page." }, { status: 500 })
  }
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: conversationId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    // Verify user is a conversation member
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
    }

    // Check if either user has blocked the other
    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)

    if (otherMembers && otherMembers.length > 0) {
      const otherId = otherMembers[0].user_id
      const { data: blockCheck } = await supabase
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`)
        .limit(1)

      if (blockCheck && blockCheck.length > 0) {
        return NextResponse.json({ error: 'Cannot send messages to this user.' }, { status: 403 })
      }
    }

    const rawBody = await request.json()
    const validation = validateBody(chatMessageSchema, rawBody)
    if (!validation.success) return validation.response

    const { message, replyToId } = validation.data

    // Content moderation
    const contentCheck = checkContent(message)
    if (!contentCheck.allowed) {
      return NextResponse.json({ error: contentCheck.reason }, { status: 400 })
    }

    const insertData: Record<string, string> = {
      conversation_id: conversationId,
      user_id: user.id,
      message,
    }
    if (replyToId) {
      insertData.reply_to_id = replyToId
    }

    const { data: newMessage, error } = await supabase
      .from('direct_messages')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Couldn't send message. Try again.", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    Sentry.captureException(error)
    console.error('DM messages POST error:', error)
    return NextResponse.json({ error: "Couldn't send message. Try again." }, { status: 500 })
  }
}
