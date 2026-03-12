import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
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
    console.error('Pool activity fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
