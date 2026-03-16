import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()

    const { data: memberRows } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)

    const userIds = (memberRows || []).map(m => m.user_id)
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
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
