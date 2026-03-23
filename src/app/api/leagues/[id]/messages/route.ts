import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { chatMessageSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { checkContent } from '@/lib/moderation/word-filter'
import { createNotification } from '@/lib/notifications'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: messages, error } = await supabase
      .from('league_messages')
      .select('id, message, created_at, user_id, pinned_at, pinned_by')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Couldn\'t load messages. Try refreshing the page.', details: error.message },
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

    // Fetch reactions for these messages
    const messageIds = (messages || []).map(m => m.id)
    let reactions: Record<string, { emoji: string; count: number; reacted: boolean }[]> = {}
    if (messageIds.length > 0) {
      const { data: reactionRows } = await supabase
        .from('league_message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds)

      if (reactionRows) {
        const grouped: Record<string, Record<string, { count: number; reacted: boolean }>> = {}
        for (const r of reactionRows) {
          if (!grouped[r.message_id]) grouped[r.message_id] = {}
          if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = { count: 0, reacted: false }
          grouped[r.message_id][r.emoji].count++
          if (r.user_id === user.id) grouped[r.message_id][r.emoji].reacted = true
        }
        for (const [msgId, emojis] of Object.entries(grouped)) {
          reactions[msgId] = Object.entries(emojis).map(([emoji, data]) => ({ emoji, ...data }))
        }
      }
    }

    // Return in chronological order (oldest first)
    const enriched = (messages || []).reverse().map(m => ({
      ...m,
      display_name: profiles[m.user_id] || 'Unknown',
    }))

    return NextResponse.json({ messages: enriched, reactions })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Messages GET error:', error)
    return NextResponse.json(
      { error: 'Couldn\'t load messages. Try refreshing the page.' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const rawBody = await request.json()
    const validation = validateBody(chatMessageSchema, rawBody)
    if (!validation.success) return validation.response

    const { message } = validation.data

    // Content moderation
    const contentCheck = checkContent(message)
    if (!contentCheck.allowed) {
      return NextResponse.json({ error: contentCheck.reason }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: newMessage, error } = await supabase
      .from('league_messages')
      .insert({
        league_id: leagueId,
        user_id: user.id,
        message,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Couldn\'t send your message. Try again.', details: error.message },
        { status: 500 }
      )
    }

    logActivity({
      userId: user.id,
      leagueId,
      action: 'chat.message_sent',
      details: { messageId: newMessage.id },
    })

    // Parse @mentions and send notifications
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g
    let mentionMatch
    const hasMentions = mentionPattern.test(message)
    if (hasMentions) {
      // Get sender's display name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .single()
      const senderName = senderProfile?.display_name || senderProfile?.email?.split('@')[0] || 'Someone'

      mentionPattern.lastIndex = 0
      while ((mentionMatch = mentionPattern.exec(message)) !== null) {
        const mentionedName = mentionMatch[1]
        const mentionedUserId = mentionMatch[2]
        if (mentionedUserId !== user.id) {
          createNotification({
            userId: mentionedUserId,
            leagueId,
            type: 'chat_mention',
            title: 'You were mentioned in chat',
            body: `${senderName} mentioned you: "${message.slice(0, 100)}"`,
            data: { mentionedBy: user.id, mentionedName, messageId: newMessage.id },
          })
        }
      }
    }

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Messages POST error:', error)
    return NextResponse.json(
      { error: 'Couldn\'t send your message. Try again.' },
      { status: 500 }
    )
  }
}
