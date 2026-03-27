import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

// POST /api/users/[userId]/block — block a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { userId: blockedId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    if (blockedId === user.id) {
      return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the target user exists
    const { data: target } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blockedId)
      .single()

    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'User is already blocked.' }, { status: 409 })
    }

    // Insert block
    const { error } = await supabase
      .from('blocked_users')
      .insert({ blocker_id: user.id, blocked_id: blockedId })

    if (error) {
      return NextResponse.json(
        { error: "Couldn't block user. Try again.", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Block user POST error:', error)
    return NextResponse.json({ error: "Couldn't block user. Try again." }, { status: 500 })
  }
}

// DELETE /api/users/[userId]/block — unblock a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { userId: blockedId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId)

    if (error) {
      return NextResponse.json(
        { error: "Couldn't unblock user. Try again.", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Unblock user DELETE error:', error)
    return NextResponse.json({ error: "Couldn't unblock user. Try again." }, { status: 500 })
  }
}
