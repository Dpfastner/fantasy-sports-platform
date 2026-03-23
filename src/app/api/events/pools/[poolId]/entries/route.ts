import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 5 })

// POST /api/events/pools/[poolId]/entries — add an additional entry to a pool
export async function POST(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { poolId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You need to sign in to do this.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Fetch pool
    const { data: pool } = await admin
      .from('event_pools')
      .select('id, max_entries_per_user, max_entries, status, tournament_id')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    if (pool.status !== 'open') {
      return NextResponse.json({ error: 'This pool is no longer accepting entries' }, { status: 409 })
    }

    // Check user has at least one entry (must be a member first)
    const { count: userEntryCount } = await admin
      .from('event_entries')
      .select('id', { count: 'exact', head: true })
      .eq('pool_id', poolId)
      .eq('user_id', user.id)

    if ((userEntryCount ?? 0) === 0) {
      return NextResponse.json({ error: 'You must join the pool first' }, { status: 400 })
    }

    const perUserLimit = pool.max_entries_per_user ?? 1
    if ((userEntryCount ?? 0) >= perUserLimit) {
      return NextResponse.json({
        error: `You've reached the maximum of ${perUserLimit} entries in this pool`,
      }, { status: 409 })
    }

    // Check total pool capacity
    if (pool.max_entries) {
      const { count: totalCount } = await admin
        .from('event_entries')
        .select('id', { count: 'exact', head: true })
        .eq('pool_id', poolId)

      if ((totalCount ?? 0) >= pool.max_entries) {
        return NextResponse.json({ error: 'This pool is full' }, { status: 409 })
      }
    }

    // Parse optional display name
    let displayName: string | null = null
    try {
      const body = await request.json()
      if (body.displayName && typeof body.displayName === 'string') {
        displayName = body.displayName.trim().slice(0, 50) || null
      }
    } catch {
      // No body or invalid JSON — that's fine
    }

    // Create the entry
    const { data: entry, error: entryError } = await admin
      .from('event_entries')
      .insert({
        pool_id: poolId,
        user_id: user.id,
        display_name: displayName,
      })
      .select('id')
      .single()

    if (entryError) {
      console.error('Entry creation failed:', entryError)
      return NextResponse.json({ error: "Couldn't create entry. Try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true, entryId: entry.id })
  } catch (err) {
    console.error('Add entry error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/[poolId]/entries', action: 'create' } })
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
