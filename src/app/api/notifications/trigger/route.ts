import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import {
  createNotification,
  notifyLeagueMembers,
} from '@/lib/notifications'
import type { NotificationType } from '@/lib/notifications'

const limiter = createRateLimiter({ windowMs: 60_000, max: 60 })

const ALLOWED_TYPES: NotificationType[] = [
  'draft_started',
  'draft_your_turn',
  'draft_completed',
]

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { type, leagueId, draftId, title, body: notifBody, targetUserId } = body as {
      type: NotificationType
      leagueId: string
      draftId?: string
      title: string
      body: string
      targetUserId?: string
    }

    if (!type || !leagueId || !title || !notifBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
    }

    const data = { leagueId, ...(draftId ? { draftId } : {}) }

    switch (type) {
      case 'draft_started':
      case 'draft_completed':
        // Notify all league members
        notifyLeagueMembers({
          leagueId,
          excludeUserId: null,
          type,
          title,
          body: notifBody,
          data,
        })
        break

      case 'draft_your_turn':
        // Notify specific user
        if (targetUserId) {
          createNotification({
            userId: targetUserId,
            leagueId,
            type,
            title,
            body: notifBody,
            data,
          })
        }
        break

    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification trigger error:', error)
    return NextResponse.json(
      { error: "Couldn't send notification. Try again." },
      { status: 500 }
    )
  }
}
