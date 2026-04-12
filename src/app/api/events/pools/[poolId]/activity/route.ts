import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })
const postLimiter = createRateLimiter({ windowMs: 60_000, max: 20 })

export async function GET(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { poolId } = await params
    const admin = createAdminClient()

    // Get pool's tournament_id
    const { data: pool } = await admin
      .from('event_pools')
      .select('tournament_id')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    // Fetch activity for this pool
    const { data: events } = await admin
      .from('event_activity_log')
      .select('id, action, details, created_at, user_id')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Get display names for user_ids
    const userIds = [...new Set((events || []).map(e => e.user_id).filter(Boolean))]
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]))
    }

    return NextResponse.json({
      events: (events || []).map(e => ({
        ...e,
        display_name: e.user_id ? profileMap[e.user_id] || null : null,
      })),
    })
  } catch (err) {
    Sentry.captureException(err)
    console.error('Pool activity fetch error:', err)
    return NextResponse.json({ error: "Couldn't load activity. Try refreshing the page." }, { status: 500 })
  }
}

/**
 * POST /api/events/pools/[poolId]/activity
 * Persist a Sunday Roar moment (or other client-side event) to event_activity_log.
 * Idempotent — checks for existing moment_id before inserting.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { limited, response } = postLimiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { poolId } = await params
    const body = await request.json()
    const { action, details } = body

    if (!action || !details) {
      return NextResponse.json({ error: 'Missing action or details' }, { status: 400 })
    }

    // Only allow specific actions from the client
    const allowedActions = ['masters.sunday_roar']
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: 'Action not allowed' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get pool's tournament_id
    const { data: pool } = await admin
      .from('event_pools')
      .select('tournament_id')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    // Idempotent: check if this moment already exists (by moment_id in details)
    if (details.moment_id) {
      const { data: existing } = await admin
        .from('event_activity_log')
        .select('id')
        .eq('pool_id', poolId)
        .eq('action', action)
        .contains('details', { moment_id: details.moment_id })
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json({ message: 'Already recorded' })
      }
    }

    // Get authenticated user (optional — roar moments are pool-level, not user-specific)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await admin.from('event_activity_log').insert({
      pool_id: poolId,
      tournament_id: pool.tournament_id,
      user_id: user?.id || null,
      action,
      details,
    })

    if (error) {
      console.error('Activity log insert error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
