import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ poolId: string; messageId: string }> }
) {
  try {
    const { poolId, messageId } = await params

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You need to sign in to do this.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify user is the pool creator
    const { data: pool } = await admin
      .from('event_pools')
      .select('created_by')
      .eq('id', poolId)
      .single()

    if (!pool || pool.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the pool creator can pin messages' }, { status: 403 })
    }

    // Verify the message belongs to this pool
    const { data: message } = await admin
      .from('event_pool_messages')
      .select('id, pinned_at')
      .eq('id', messageId)
      .eq('pool_id', poolId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.pinned_at) {
      // Unpin
      await admin
        .from('event_pool_messages')
        .update({ pinned_at: null, pinned_by: null })
        .eq('id', messageId)

      return NextResponse.json({ action: 'unpinned' })
    } else {
      // Unpin any currently pinned message in this pool first
      await admin
        .from('event_pool_messages')
        .update({ pinned_at: null, pinned_by: null })
        .eq('pool_id', poolId)
        .not('pinned_at', 'is', null)

      // Pin the selected message
      await admin
        .from('event_pool_messages')
        .update({ pinned_at: new Date().toISOString(), pinned_by: user.id })
        .eq('id', messageId)

      return NextResponse.json({ action: 'pinned' })
    }
  } catch (error) {
    Sentry.captureException(error)
    console.error('Pool pin message error:', error)
    return NextResponse.json({ error: "Couldn't pin/unpin the message. Try again." }, { status: 500 })
  }
}
