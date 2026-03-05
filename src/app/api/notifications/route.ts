import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    // Fetch last 50 notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, data, league_id, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      )
    }

    // Count unread
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: count || 0,
    })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const body = await request.json()
    const { ids, all, markUnread } = body as { ids?: string[]; all?: boolean; markUnread?: boolean }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    if (all) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to mark all as read', details: error.message },
          { status: 500 }
        )
      }
    } else if (ids && ids.length > 0) {
      const updateValue = markUnread ? null : now
      const query = supabase
        .from('notifications')
        .update({ read_at: updateValue })
        .eq('user_id', user.id)
        .in('id', ids)

      const { error } = await query

      if (error) {
        return NextResponse.json(
          { error: `Failed to mark as ${markUnread ? 'unread' : 'read'}`, details: error.message },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json({ error: 'Provide ids or all: true' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
