import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { z } from 'zod'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })
const deleteLimiter = createRateLimiter({ windowMs: 60_000, max: 3 })

const updatePoolSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  tiebreaker: z.enum(['none', 'championship_score', 'first_match_score', 'most_upsets', 'random']).optional(),
  maxEntries: z.number().int().min(2).max(1000).nullable().optional(),
  maxEntriesPerUser: z.number().int().min(1).max(10).optional(),
  scoringRules: z.record(z.string(), z.number().min(0).max(100)).nullable().optional(),
})

export async function PATCH(
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

    // Verify pool exists and user is creator
    const { data: pool } = await admin
      .from('event_pools')
      .select('id, created_by, status')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    if (pool.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the pool host can edit settings' }, { status: 403 })
    }

    const rawBody = await request.json()
    const parsed = updatePoolSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Invalid input',
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim()
    if (parsed.data.visibility !== undefined) updates.visibility = parsed.data.visibility
    if (parsed.data.tiebreaker !== undefined) updates.tiebreaker = parsed.data.tiebreaker
    if (parsed.data.maxEntries !== undefined) updates.max_entries = parsed.data.maxEntries
    if (parsed.data.maxEntriesPerUser !== undefined) updates.max_entries_per_user = parsed.data.maxEntriesPerUser
    if (parsed.data.scoringRules !== undefined) updates.scoring_rules = parsed.data.scoringRules ?? {}

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('event_pools')
      .update(updates)
      .eq('id', poolId)

    if (updateError) {
      console.error('Pool update failed:', updateError)
      return NextResponse.json({ error: "Couldn't update pool. Try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Pool settings error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/[poolId]', action: 'update' } })
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { limited, response } = deleteLimiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { poolId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'You need to sign in to do this.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify pool exists and user is creator
    const { data: pool } = await admin
      .from('event_pools')
      .select('id, created_by')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    // Check if user is pool creator or an admin
    const { data: profile } = await admin
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.tier === 'admin'

    if (pool.created_by !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Only the pool creator can delete this pool' }, { status: 403 })
    }

    // Get all entry IDs for this pool (needed to delete picks)
    const { data: entries } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', poolId)

    const entryIds = (entries || []).map(e => e.id)

    // Cascade delete child tables first, continue on error for each step
    // 1. Delete picks (via entry IDs)
    if (entryIds.length > 0) {
      const { error: picksErr } = await admin
        .from('event_picks')
        .delete()
        .in('entry_id', entryIds)
      if (picksErr) {
        console.error('Error deleting event_picks:', picksErr)
        Sentry.captureException(picksErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_picks' } })
      }
    }

    // 2. Delete entries
    const { error: entriesErr } = await admin
      .from('event_entries')
      .delete()
      .eq('pool_id', poolId)
    if (entriesErr) {
      console.error('Error deleting event_entries:', entriesErr)
      Sentry.captureException(entriesErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_entries' } })
    }

    // 3. Delete activity log
    const { error: activityErr } = await admin
      .from('event_activity_log')
      .delete()
      .eq('pool_id', poolId)
    if (activityErr) {
      console.error('Error deleting event_activity_log:', activityErr)
      Sentry.captureException(activityErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_activity_log' } })
    }

    // 4. Delete pool message reactions (via message IDs)
    const { data: messages } = await admin
      .from('pool_messages')
      .select('id')
      .eq('pool_id', poolId)

    const messageIds = (messages || []).map(m => m.id)
    if (messageIds.length > 0) {
      const { error: reactionsErr } = await admin
        .from('pool_message_reactions')
        .delete()
        .in('message_id', messageIds)
      if (reactionsErr) {
        console.error('Error deleting pool_message_reactions:', reactionsErr)
        Sentry.captureException(reactionsErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'pool_message_reactions' } })
      }
    }

    // 5. Delete pool messages
    const { error: messagesErr } = await admin
      .from('pool_messages')
      .delete()
      .eq('pool_id', poolId)
    if (messagesErr) {
      console.error('Error deleting pool_messages:', messagesErr)
      Sentry.captureException(messagesErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'pool_messages' } })
    }

    // 6. Delete pool weeks
    const { error: weeksErr } = await admin
      .from('event_pool_weeks')
      .delete()
      .eq('pool_id', poolId)
    if (weeksErr) {
      console.error('Error deleting event_pool_weeks:', weeksErr)
      Sentry.captureException(weeksErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_pool_weeks' } })
    }

    // 7. Delete draft order and drafts
    const { data: drafts } = await admin
      .from('event_pool_drafts')
      .select('id')
      .eq('pool_id', poolId)

    const draftIds = (drafts || []).map(d => d.id)
    if (draftIds.length > 0) {
      const { error: draftOrderErr } = await admin
        .from('event_pool_draft_order')
        .delete()
        .in('draft_id', draftIds)
      if (draftOrderErr) {
        console.error('Error deleting event_pool_draft_order:', draftOrderErr)
        Sentry.captureException(draftOrderErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_pool_draft_order' } })
      }
    }

    const { error: draftsErr } = await admin
      .from('event_pool_drafts')
      .delete()
      .eq('pool_id', poolId)
    if (draftsErr) {
      console.error('Error deleting event_pool_drafts:', draftsErr)
      Sentry.captureException(draftsErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_pool_drafts' } })
    }

    // 8. Finally, delete the pool itself
    const { error: poolErr } = await admin
      .from('event_pools')
      .delete()
      .eq('id', poolId)

    if (poolErr) {
      console.error('Error deleting event_pools:', poolErr)
      Sentry.captureException(poolErr, { tags: { route: 'events/pools/[poolId]', action: 'delete', table: 'event_pools' } })
      return NextResponse.json({ error: "Couldn't delete pool. Try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Pool delete error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/[poolId]', action: 'delete' } })
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
