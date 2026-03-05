import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { reactionToggleSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 60 })

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
          { error: 'Failed to add reaction', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ action: 'added' })
    }
  } catch (error) {
    console.error('Reactions POST error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle reaction' },
      { status: 500 }
    )
  }
}
