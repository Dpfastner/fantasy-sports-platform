import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

// GET /api/conversations — list user's conversations with last message preview
export async function GET() {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    // Get user's conversations
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const convIds = memberships.map(m => m.conversation_id)

    // Get other members' info for each conversation
    const { data: otherMembers } = await supabase
      .from('conversation_members')
      .select('conversation_id, user_id, profiles(display_name, email)')
      .in('conversation_id', convIds)
      .neq('user_id', user.id)

    // Build conversation list
    const conversations = (otherMembers || []).map((om: { conversation_id: string; user_id: string; profiles: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null }) => {
      const profile = Array.isArray(om.profiles) ? om.profiles[0] : om.profiles
      return {
        id: om.conversation_id,
        partnerId: om.user_id,
        partnerName: profile?.display_name || profile?.email?.split('@')[0] || 'User',
      }
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Conversations GET error:', error)
    return NextResponse.json({ error: "Couldn't load conversations. Try refreshing the page." }, { status: 500 })
  }
}

// POST /api/conversations — start a new DM (finds or creates conversation)
export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { userId: partnerId } = await request.json()
    if (!partnerId || typeof partnerId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (partnerId === user.id) {
      return NextResponse.json({ error: 'Cannot start conversation with yourself' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if partner exists
    const { data: partner } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .eq('id', partnerId)
      .single()

    if (!partner) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if conversation already exists between these two users
    const { data: myConvs } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (myConvs && myConvs.length > 0) {
      const myConvIds = myConvs.map(c => c.conversation_id)
      const { data: partnerInMyConvs } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', partnerId)
        .in('conversation_id', myConvIds)

      if (partnerInMyConvs && partnerInMyConvs.length > 0) {
        return NextResponse.json({
          conversationId: partnerInMyConvs[0].conversation_id,
          created: false,
        })
      }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select('id')
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Couldn't create conversation. Try again." }, { status: 500 })
    }

    // Add both members
    const { error: membersError } = await supabase
      .from('conversation_members')
      .insert([
        { conversation_id: conversation.id, user_id: user.id },
        { conversation_id: conversation.id, user_id: partnerId },
      ])

    if (membersError) {
      return NextResponse.json({ error: "Couldn't create conversation. Try again." }, { status: 500 })
    }

    return NextResponse.json({
      conversationId: conversation.id,
      created: true,
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Conversations POST error:', error)
    return NextResponse.json({ error: "Couldn't create conversation. Try again." }, { status: 500 })
  }
}
