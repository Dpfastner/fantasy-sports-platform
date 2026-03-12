import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updatePoolSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  visibility: z.enum(['public', 'private']).optional(),
  tiebreaker: z.enum(['none', 'championship_score', 'first_match_score', 'most_upsets', 'random']).optional(),
  maxEntries: z.number().int().min(2).max(1000).nullable().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
      return NextResponse.json({ error: 'Only the pool creator can edit settings' }, { status: 403 })
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('event_pools')
      .update(updates)
      .eq('id', poolId)

    if (updateError) {
      console.error('Pool update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update pool' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Pool settings error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/[poolId]', action: 'update' } })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
