import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { chatMessageSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { checkContent } from '@/lib/moderation/word-filter'

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: messages, error } = await supabase
      .from('league_messages')
      .select('id, message, created_at, user_id')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
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

    // Return in chronological order (oldest first)
    const enriched = (messages || []).reverse().map(m => ({
      ...m,
      display_name: profiles[m.user_id] || 'Unknown',
    }))

    return NextResponse.json({ messages: enriched })
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      )
    }

    logActivity({
      userId: user.id,
      leagueId,
      action: 'chat.message_sent',
      details: { messageId: newMessage.id },
    })

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
