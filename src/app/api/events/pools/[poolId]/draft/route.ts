import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import { eventRosterDraftPickSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { generateDraftOrder, getDraftMode, type RosterScoringRules } from '@/lib/events/shared'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

interface RouteContext {
  params: Promise<{ poolId: string }>
}

// GET /api/events/pools/[poolId]/draft — Get draft state + order
export async function GET(request: Request, context: RouteContext) {
  try {
    const { poolId } = await context.params
    const admin = createAdminClient()

    const { data: draft } = await admin
      .from('event_pool_drafts')
      .select('*')
      .eq('pool_id', poolId)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'No draft found for this pool' }, { status: 404 })
    }

    const { data: order } = await admin
      .from('event_pool_draft_order')
      .select('id, entry_id, round, pick_number, position_in_round')
      .eq('draft_id', draft.id)
      .order('pick_number', { ascending: true })

    // Get picks already made
    const { data: picks } = await admin
      .from('event_picks')
      .select('entry_id, participant_id, picked_at')
      .in('entry_id', (order || []).map(o => o.entry_id))
      .is('game_id', null)
      .is('week_number', null)
      .order('picked_at', { ascending: true })

    return NextResponse.json({
      draft,
      order: order || [],
      picks: picks || [],
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'events/pools/draft', method: 'GET' } })
    return NextResponse.json({ error: 'Failed to fetch draft state' }, { status: 500 })
  }
}

// POST /api/events/pools/[poolId]/draft — Actions: start, pick, pause, resume
export async function POST(request: Request, context: RouteContext) {
  try {
    const { poolId } = await context.params
    const ip = getClientIp(request)
    const { limited, response: limitResponse } = limiter.check(ip)
    if (limited) return limitResponse!

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const rawBody = await request.json()
    const action = rawBody.action as string

    // Load pool
    const { data: pool } = await admin
      .from('event_pools')
      .select('id, tournament_id, scoring_rules, created_by, status')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
    }

    const draftMode = getDraftMode(pool.scoring_rules as Record<string, unknown>)
    if (draftMode !== 'snake_draft' && draftMode !== 'linear_draft') {
      return NextResponse.json({ error: 'This pool does not use a live draft' }, { status: 400 })
    }

    if (action === 'start') {
      return handleStartDraft(pool, user.id, admin, draftMode)
    } else if (action === 'pick') {
      return handleDraftPick(rawBody, pool, user.id, admin)
    } else if (action === 'pause') {
      return handlePauseDraft(pool, user.id, admin)
    } else if (action === 'resume') {
      return handleResumeDraft(pool, user.id, admin)
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'events/pools/draft', method: 'POST' } })
    return NextResponse.json({ error: 'Draft action failed' }, { status: 500 })
  }
}

async function handleStartDraft(
  pool: { id: string; tournament_id: string; scoring_rules: unknown; created_by: string },
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
  draftMode: 'snake_draft' | 'linear_draft'
) {
  // Only pool creator can start
  if (pool.created_by !== userId) {
    return NextResponse.json({ error: 'Only the pool creator can start the draft' }, { status: 403 })
  }

  // Check if draft already exists
  const { data: existing } = await admin
    .from('event_pool_drafts')
    .select('id, status')
    .eq('pool_id', pool.id)
    .single()

  if (existing?.status === 'in_progress') {
    return NextResponse.json({ error: 'Draft is already in progress' }, { status: 409 })
  }

  // Get all entries
  const { data: entries } = await admin
    .from('event_entries')
    .select('id')
    .eq('pool_id', pool.id)
    .order('created_at', { ascending: true })

  if (!entries || entries.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 entries to start a draft' }, { status: 400 })
  }

  const scoringRules = (pool.scoring_rules || {}) as Partial<RosterScoringRules>
  const rosterSize = scoringRules.roster_size || 7
  const timerSeconds = scoringRules.draft_timer_seconds || 120

  // Shuffle entry order randomly
  const entryIds = entries.map(e => e.id)
  for (let i = entryIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[entryIds[i], entryIds[j]] = [entryIds[j], entryIds[i]]
  }

  // Generate draft order
  const orderSlots = generateDraftOrder(entryIds, rosterSize, draftMode)

  // Create or update draft record
  let draftId: string
  if (existing) {
    const { error } = await admin
      .from('event_pool_drafts')
      .update({
        status: 'in_progress',
        current_round: 1,
        current_pick: 1,
        current_entry_id: orderSlots[0].entryId,
        pick_deadline: new Date(Date.now() + timerSeconds * 1000).toISOString(),
        started_at: new Date().toISOString(),
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to start draft' }, { status: 500 })
    }
    draftId = existing.id

    // Clear old order
    await admin.from('event_pool_draft_order').delete().eq('draft_id', draftId)
  } else {
    const { data: newDraft, error } = await admin
      .from('event_pool_drafts')
      .insert({
        pool_id: pool.id,
        status: 'in_progress',
        current_round: 1,
        current_pick: 1,
        current_entry_id: orderSlots[0].entryId,
        pick_deadline: new Date(Date.now() + timerSeconds * 1000).toISOString(),
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !newDraft) {
      return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
    }
    draftId = newDraft.id
  }

  // Clear any existing picks for all entries (fresh draft)
  const allEntryIds = entries.map(e => e.id)
  await admin
    .from('event_picks')
    .delete()
    .in('entry_id', allEntryIds)
    .is('game_id', null)
    .is('week_number', null)

  // Insert draft order
  const orderRows = orderSlots.map(slot => ({
    draft_id: draftId,
    entry_id: slot.entryId,
    round: slot.round,
    pick_number: slot.pickNumber,
    position_in_round: slot.positionInRound,
  }))

  const { error: orderError } = await admin
    .from('event_pool_draft_order')
    .insert(orderRows)

  if (orderError) {
    console.error('Draft order insert failed:', orderError)
    return NextResponse.json({ error: 'Failed to set draft order' }, { status: 500 })
  }

  logActivity({ userId, action: 'event.draft_started', details: { poolId: pool.id, mode: draftMode, entries: entryIds.length } })

  await admin.from('event_activity_log').insert({
    pool_id: pool.id,
    tournament_id: pool.tournament_id,
    user_id: userId,
    action: 'draft.started',
    details: { mode: draftMode, entry_count: entryIds.length },
  })

  return NextResponse.json({ success: true, draftId, totalPicks: orderSlots.length })
}

async function handleDraftPick(
  rawBody: unknown,
  pool: { id: string; tournament_id: string; scoring_rules: unknown },
  userId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  const validation = validateBody(eventRosterDraftPickSchema, rawBody)
  if (!validation.success) return validation.response

  const { entryId, participantId, pickNumber } = validation.data

  // Verify the user owns this entry
  const { data: entry } = await admin
    .from('event_entries')
    .select('id, user_id')
    .eq('id', entryId)
    .eq('pool_id', pool.id)
    .single()

  if (!entry || entry.user_id !== userId) {
    return NextResponse.json({ error: 'Not your entry' }, { status: 403 })
  }

  // Get draft state
  const { data: draft } = await admin
    .from('event_pool_drafts')
    .select('*')
    .eq('pool_id', pool.id)
    .single()

  if (!draft || draft.status !== 'in_progress') {
    return NextResponse.json({ error: 'Draft is not in progress' }, { status: 409 })
  }

  // Verify it's this entry's turn
  if (draft.current_pick !== pickNumber || draft.current_entry_id !== entryId) {
    return NextResponse.json({ error: 'Not your turn to pick' }, { status: 409 })
  }

  // Verify participant exists in tournament
  const { data: participant } = await admin
    .from('event_participants')
    .select('id, name')
    .eq('id', participantId)
    .eq('tournament_id', pool.tournament_id)
    .single()

  if (!participant) {
    return NextResponse.json({ error: 'Invalid participant' }, { status: 400 })
  }

  // Verify participant hasn't been picked already in this draft
  const { data: allEntries } = await admin
    .from('event_entries')
    .select('id')
    .eq('pool_id', pool.id)

  if (allEntries) {
    const { data: existingPick } = await admin
      .from('event_picks')
      .select('id')
      .in('entry_id', allEntries.map(e => e.id))
      .eq('participant_id', participantId)
      .is('game_id', null)
      .is('week_number', null)
      .limit(1)
      .single()

    if (existingPick) {
      return NextResponse.json({ error: `${participant.name} has already been drafted` }, { status: 409 })
    }
  }

  // Make the pick
  const { error: pickError } = await admin
    .from('event_picks')
    .insert({
      entry_id: entryId,
      participant_id: participantId,
      picked_at: new Date().toISOString(),
    })

  if (pickError) {
    console.error('Draft pick insert failed:', pickError)
    return NextResponse.json({ error: 'Failed to record pick' }, { status: 500 })
  }

  // Advance to next pick
  const { data: nextSlot } = await admin
    .from('event_pool_draft_order')
    .select('entry_id, round, pick_number')
    .eq('draft_id', draft.id)
    .eq('pick_number', pickNumber + 1)
    .single()

  const scoringRules = (pool.scoring_rules || {}) as Partial<RosterScoringRules>
  const timerSeconds = scoringRules.draft_timer_seconds || 120

  if (nextSlot) {
    // Advance
    await admin
      .from('event_pool_drafts')
      .update({
        current_pick: nextSlot.pick_number,
        current_round: nextSlot.round,
        current_entry_id: nextSlot.entry_id,
        pick_deadline: new Date(Date.now() + timerSeconds * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id)
  } else {
    // Draft complete
    await admin
      .from('event_pool_drafts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_entry_id: null,
        pick_deadline: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id)

    // Update submitted_at for all entries
    if (allEntries) {
      await admin
        .from('event_entries')
        .update({
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', allEntries.map(e => e.id))
    }

    await admin.from('event_activity_log').insert({
      pool_id: pool.id,
      tournament_id: pool.tournament_id,
      user_id: userId,
      action: 'draft.completed',
      details: { total_picks: pickNumber },
    })
  }

  logActivity({ userId, action: 'event.draft_pick', details: { poolId: pool.id, participantId, pickNumber } })

  return NextResponse.json({
    success: true,
    pickNumber,
    participantName: participant.name,
    isComplete: !nextSlot,
    nextPick: nextSlot ? { pickNumber: nextSlot.pick_number, round: nextSlot.round, entryId: nextSlot.entry_id } : null,
  })
}

async function handlePauseDraft(
  pool: { id: string; created_by: string },
  userId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  if (pool.created_by !== userId) {
    return NextResponse.json({ error: 'Only the pool creator can pause the draft' }, { status: 403 })
  }

  const { error } = await admin
    .from('event_pool_drafts')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('pool_id', pool.id)
    .eq('status', 'in_progress')

  if (error) {
    return NextResponse.json({ error: 'Failed to pause draft' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

async function handleResumeDraft(
  pool: { id: string; created_by: string; scoring_rules: unknown },
  userId: string,
  admin: ReturnType<typeof createAdminClient>
) {
  if (pool.created_by !== userId) {
    return NextResponse.json({ error: 'Only the pool creator can resume the draft' }, { status: 403 })
  }

  const scoringRules = (pool.scoring_rules || {}) as Partial<RosterScoringRules>
  const timerSeconds = scoringRules.draft_timer_seconds || 120

  const { error } = await admin
    .from('event_pool_drafts')
    .update({
      status: 'in_progress',
      pick_deadline: new Date(Date.now() + timerSeconds * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('pool_id', pool.id)
    .eq('status', 'paused')

  if (error) {
    return NextResponse.json({ error: 'Failed to resume draft' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
