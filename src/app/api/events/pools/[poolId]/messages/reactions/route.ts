import { NextResponse } from 'next/server'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(
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

    const { messageId, emoji } = await request.json()
    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Missing messageId or emoji' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify membership
    const { data: entry } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!entry) {
      return NextResponse.json({ error: 'Not a pool member' }, { status: 403 })
    }

    // Toggle: if reaction exists, remove it; otherwise add it
    const { data: existing } = await admin
      .from('event_pool_message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle()

    if (existing) {
      await admin.from('event_pool_message_reactions').delete().eq('id', existing.id)
      return NextResponse.json({ action: 'removed' })
    } else {
      await admin.from('event_pool_message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
      return NextResponse.json({ action: 'added' })
    }
  } catch (err) {
    console.error('Reaction error:', err)
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 })
  }
}
