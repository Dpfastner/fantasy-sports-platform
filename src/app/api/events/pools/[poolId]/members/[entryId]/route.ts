import { NextResponse } from 'next/server'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ poolId: string; entryId: string }> }
) {
  try {
    const { poolId, entryId } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify user is pool creator
    const { data: pool } = await admin
      .from('event_pools')
      .select('created_by, tournament_id')
      .eq('id', poolId)
      .single()

    if (!pool || pool.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the pool creator can remove members' }, { status: 403 })
    }

    // Get the entry to remove
    const { data: entry } = await admin
      .from('event_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .eq('pool_id', poolId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Cannot remove yourself (the creator)
    if (entry.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the pool' }, { status: 400 })
    }

    // Delete picks first, then the entry
    await admin.from('event_picks').delete().eq('entry_id', entryId)
    await admin.from('event_entries').delete().eq('id', entryId)

    // Log activity
    await admin.from('event_activity_log').insert({
      pool_id: poolId,
      tournament_id: pool.tournament_id,
      user_id: user.id,
      action: 'member.removed',
      details: { removed_user_id: entry.user_id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove member error:', err)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
