import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { eventPoolCreateSchema, eventPoolJoinSchema } from '@/lib/api/schemas'
import { notifyPoolMembers } from '@/lib/notifications'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'

const createLimiter = createRateLimiter({ windowMs: 60_000, max: 5 })
const joinLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

// GET /api/events/pools?tournamentId=xxx
// Returns pools the user is in, or public pools for a tournament
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournamentId')

    if (!tournamentId) {
      // Return user's pools across all tournaments
      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const admin = createAdminClient()

      // Get pool IDs where user has entries
      const { data: entries } = await admin
        .from('event_entries')
        .select('pool_id')
        .eq('user_id', user.id)

      if (!entries?.length) {
        return NextResponse.json({ pools: [] })
      }

      const poolIds = entries.map(e => e.pool_id)
      const { data: pools } = await admin
        .from('event_pools')
        .select('*, event_tournaments(id, name, slug, sport, format, status, starts_at, ends_at, bracket_size, image_url)')
        .in('id', poolIds)
        .order('created_at', { ascending: false })

      // Get entry counts per pool
      const { data: entryCounts } = await admin
        .from('event_entries')
        .select('pool_id')
        .in('pool_id', poolIds)

      const countMap: Record<string, number> = {}
      for (const e of entryCounts || []) {
        countMap[e.pool_id] = (countMap[e.pool_id] || 0) + 1
      }

      return NextResponse.json({
        pools: (pools || []).map(p => ({
          ...p,
          entry_count: countMap[p.id] || 0,
        })),
      })
    }

    // Return pools for a specific tournament
    const admin = createAdminClient()

    let query = admin
      .from('event_pools')
      .select('id, name, created_by, visibility, status, tiebreaker, max_entries, created_at, invite_code, scoring_rules')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false })

    if (!user) {
      // Anonymous: only public pools
      query = query.eq('visibility', 'public')
    }

    const { data: pools, error } = await query

    if (error) {
      console.error('Failed to fetch pools:', error)
      return NextResponse.json({ error: 'Failed to fetch pools' }, { status: 500 })
    }

    // Filter: show public pools + pools user is in + pools user created
    let filteredPools = pools || []
    if (user) {
      const { data: userEntries } = await admin
        .from('event_entries')
        .select('pool_id')
        .eq('user_id', user.id)

      const userPoolIds = new Set((userEntries || []).map(e => e.pool_id))

      filteredPools = filteredPools.filter(
        p => p.visibility === 'public' || p.created_by === user.id || userPoolIds.has(p.id)
      )
    }

    // Get entry counts
    const poolIds = filteredPools.map(p => p.id)
    const { data: entryCounts } = await admin
      .from('event_entries')
      .select('pool_id')
      .in('pool_id', poolIds.length ? poolIds : ['__none__'])

    const countMap: Record<string, number> = {}
    for (const e of entryCounts || []) {
      countMap[e.pool_id] = (countMap[e.pool_id] || 0) + 1
    }

    return NextResponse.json({
      pools: filteredPools.map(p => ({
        ...p,
        entry_count: countMap[p.id] || 0,
        is_member: user ? true : false, // filtered above
      })),
    })
  } catch (err) {
    console.error('Pools fetch error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools', action: 'fetch' } })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// POST /api/events/pools
// Create a new pool OR join an existing pool
// Body with tournamentId + name = create
// Body with inviteCode = join
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const rawBody = await request.json()

    // Determine action: create or join
    if (rawBody.inviteCode) {
      // ── JOIN ──
      const { limited, response } = joinLimiter.check(getClientIp(request))
      if (limited) return response!

      const validation = validateBody(eventPoolJoinSchema, rawBody)
      if (!validation.success) return validation.response

      const { inviteCode, displayName } = validation.data
      const admin = createAdminClient()

      // Look up pool by invite code
      const { data: pool, error: lookupError } = await admin
        .from('event_pools')
        .select('id, name, tournament_id, max_entries, max_entries_per_user, status')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (lookupError || !pool) {
        return NextResponse.json({ error: 'Pool not found. Check your invite code.' }, { status: 404 })
      }

      if (pool.status !== 'open') {
        return NextResponse.json({ error: 'This pool is no longer accepting entries' }, { status: 409 })
      }

      // Check per-user entry limit
      const { count: userEntryCount } = await admin
        .from('event_entries')
        .select('id', { count: 'exact', head: true })
        .eq('pool_id', pool.id)
        .eq('user_id', user.id)

      const perUserLimit = pool.max_entries_per_user ?? 1
      if ((userEntryCount ?? 0) >= perUserLimit) {
        const msg = perUserLimit === 1
          ? 'You are already in this pool'
          : `You've reached the maximum of ${perUserLimit} entries in this pool`
        return NextResponse.json({ error: msg }, { status: 409 })
      }

      // Check max entries
      if (pool.max_entries) {
        const { count } = await admin
          .from('event_entries')
          .select('id', { count: 'exact', head: true })
          .eq('pool_id', pool.id)

        if ((count ?? 0) >= pool.max_entries) {
          return NextResponse.json({ error: 'This pool is full' }, { status: 409 })
        }
      }

      // Create entry
      const { data: entry, error: entryError } = await admin
        .from('event_entries')
        .insert({
          pool_id: pool.id,
          user_id: user.id,
          display_name: displayName?.trim() || null,
        })
        .select('id')
        .single()

      if (entryError) {
        console.error('Entry creation failed:', entryError)
        return NextResponse.json({ error: 'Failed to join pool' }, { status: 500 })
      }

      // Log activity
      await admin.from('event_activity_log').insert({
        pool_id: pool.id,
        tournament_id: pool.tournament_id,
        user_id: user.id,
        action: 'pool.joined',
        details: { display_name: displayName?.trim() || null },
      })
      logActivity({ userId: user.id, action: 'event.pool_joined', details: { poolId: pool.id, tournamentId: pool.tournament_id } })

      // Notify other pool members (fire-and-forget)
      const { data: tournament } = await admin
        .from('event_tournaments')
        .select('slug')
        .eq('id', pool.tournament_id)
        .single()
      const joinName = displayName?.trim() || user.email?.split('@')[0] || 'Someone'
      notifyPoolMembers({
        poolId: pool.id,
        excludeUserId: user.id,
        type: 'event_pool_joined',
        title: `${joinName} joined ${pool.name}`,
        body: `A new member has joined your pool.`,
        data: { poolId: pool.id, tournamentSlug: tournament?.slug },
      })

      return NextResponse.json({
        success: true,
        poolId: pool.id,
        entryId: entry.id,
      })
    }

    // ── CREATE ──
    const { limited, response } = createLimiter.check(getClientIp(request))
    if (limited) return response!

    const validation = validateBody(eventPoolCreateSchema, rawBody)
    if (!validation.success) return validation.response

    const { tournamentId, name, visibility, scoringRules, tiebreaker, deadline, maxEntries, maxEntriesPerUser, leagueId } = validation.data
    const admin = createAdminClient()

    // Verify tournament exists and is upcoming/active
    const { data: tournament, error: tournamentError } = await admin
      .from('event_tournaments')
      .select('id, format, status')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    if (tournament.status === 'completed' || tournament.status === 'cancelled') {
      return NextResponse.json({ error: 'This tournament is no longer accepting pools' }, { status: 409 })
    }

    // Generate invite code
    const { data: inviteResult } = await admin.rpc('generate_event_invite_code')
    const inviteCode = inviteResult || Math.random().toString(36).substring(2, 10).toUpperCase()

    // Create pool
    const { data: pool, error: poolError } = await admin
      .from('event_pools')
      .insert({
        tournament_id: tournamentId,
        league_id: leagueId || null,
        name: name.trim(),
        created_by: user.id,
        visibility,
        invite_code: inviteCode,
        scoring_rules: scoringRules || {},
        tiebreaker,
        deadline: deadline || null,
        max_entries: maxEntries || null,
        max_entries_per_user: maxEntriesPerUser || 1,
      })
      .select('id, invite_code')
      .single()

    if (poolError) {
      console.error('Pool creation failed:', poolError)
      return NextResponse.json({ error: 'Failed to create pool' }, { status: 500 })
    }

    // Auto-join the creator
    await admin.from('event_entries').insert({
      pool_id: pool.id,
      user_id: user.id,
    })

    // If survivor format, create pool_weeks from tournament config
    if (tournament.format === 'survivor') {
      const { data: tournamentFull } = await admin
        .from('event_tournaments')
        .select('total_weeks, config')
        .eq('id', tournamentId)
        .single()

      if (tournamentFull?.total_weeks) {
        const weekRows = []
        const config = (tournamentFull.config || {}) as Record<string, unknown>
        const weekDeadlines = (config.week_deadlines || []) as string[]

        for (let w = 1; w <= tournamentFull.total_weeks; w++) {
          weekRows.push({
            pool_id: pool.id,
            week_number: w,
            deadline: weekDeadlines[w - 1] || deadline || new Date().toISOString(),
          })
        }

        await admin.from('event_pool_weeks').insert(weekRows)
      }
    }

    // Log activity
    await admin.from('event_activity_log').insert({
      pool_id: pool.id,
      tournament_id: tournamentId,
      user_id: user.id,
      action: 'pool.created',
      details: { name: name.trim(), format: tournament.format, visibility },
    })
    logActivity({ userId: user.id, action: 'event.pool_created', details: { poolId: pool.id, tournamentId, format: tournament.format } })

    return NextResponse.json({
      success: true,
      poolId: pool.id,
      inviteCode: pool.invite_code,
    })
  } catch (err) {
    console.error('Pool create/join error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools', action: 'create_or_join' } })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
