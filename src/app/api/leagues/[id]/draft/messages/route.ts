import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { draftChatMessageSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { checkContent } from '@/lib/moderation/word-filter'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

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
    const validation = validateBody(draftChatMessageSchema, rawBody)
    if (!validation.success) return validation.response

    const { message, draftId } = validation.data

    // Content moderation
    const contentCheck = checkContent(message)
    if (!contentCheck.allowed) {
      return NextResponse.json({ error: contentCheck.reason }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify draft belongs to this league
    const { data: draft } = await supabase
      .from('drafts')
      .select('id')
      .eq('id', draftId)
      .eq('league_id', leagueId)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const { data: newMessage, error } = await supabase
      .from('draft_messages')
      .insert({
        draft_id: draftId,
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

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Draft messages POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
