import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { reactionToggleSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 60 })

// GET — reaction detail: who reacted with what
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const url = new URL(request.url)
    const messageId = url.searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'messageId required' }, { status: 400 })
    }

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: reactions } = await supabase
      .from('league_message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId)

    // Get display names
    const userIds = [...new Set((reactions || []).map(r => r.user_id))]
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

    const detail = (reactions || []).map(r => ({
      emoji: r.emoji,
      userId: r.user_id,
      displayName: profiles[r.user_id] || 'Unknown',
    }))

    return NextResponse.json({ reactions: detail })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Couldn\'t load reaction details. Try refreshing the page.' }, { status: 500 })
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
    const validation = validateBody(reactionToggleSchema, rawBody)
    if (!validation.success) return validation.response

    const { messageId, emoji } = validation.data

    const supabase = createAdminClient()

    // Verify the message belongs to this league
    const { data: message } = await supabase
      .from('league_messages')
      .select('id')
      .eq('id', messageId)
      .eq('league_id', leagueId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('league_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    if (existing) {
      // Remove reaction
      await supabase
        .from('league_message_reactions')
        .delete()
        .eq('id', existing.id)

      return NextResponse.json({ action: 'removed' })
    } else {
      // Add reaction
      const { error } = await supabase
        .from('league_message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        })

      if (error) {
        return NextResponse.json(
          { error: 'Couldn\'t add your reaction. Try again.', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ action: 'added' })
    }
  } catch (error) {
    Sentry.captureException(error)
    console.error('Reactions POST error:', error)
    return NextResponse.json(
      { error: 'Couldn\'t add your reaction. Try again.' },
      { status: 500 }
    )
  }
}
