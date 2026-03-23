import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params
    const supabase = createAdminClient()

    // Get unique users with entries in this pool
    const { data: entries } = await supabase
      .from('event_entries')
      .select('user_id')
      .eq('pool_id', poolId)

    const userIds = [...new Set((entries || []).map(e => e.user_id))]
    if (userIds.length === 0) {
      return NextResponse.json({ members: [] })
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', userIds)

    const members = (profiles || []).map(p => ({
      id: p.id,
      display_name: p.display_name || p.email?.split('@')[0] || 'Unknown',
    }))

    return NextResponse.json({ members })
  } catch {
    return NextResponse.json({ error: "Couldn't load members. Try refreshing the page." }, { status: 500 })
  }
}
