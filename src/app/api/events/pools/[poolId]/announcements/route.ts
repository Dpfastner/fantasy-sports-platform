import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const announcementLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function GET(
  request: Request,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params
    const admin = createAdminClient()

    const { data: announcements } = await admin
      .from('event_pool_announcements')
      .select('id, user_id, content, is_pinned, created_at, updated_at')
      .eq('pool_id', poolId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)

    // Get display names
    const userIds = [...new Set((announcements || []).map(a => a.user_id))]
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]))
    }

    return NextResponse.json({
      announcements: (announcements || []).map(a => ({
        ...a,
        display_name: profileMap[a.user_id] || 'Unknown',
      })),
    })
  } catch (err) {
    console.error('Announcements fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

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

    const { limited, response } = announcementLimiter.check(getClientIp(request))
    if (limited) return response!

    const admin = createAdminClient()

    // Verify creator
    const { data: pool } = await admin
      .from('event_pools')
      .select('created_by')
      .eq('id', poolId)
      .single()

    if (!pool || pool.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the pool creator can post announcements' }, { status: 403 })
    }

    const { content, isPinned } = await request.json()
    if (!content || typeof content !== 'string' || content.trim().length === 0 || content.length > 5000) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    }

    const { data: announcement, error } = await admin
      .from('event_pool_announcements')
      .insert({
        pool_id: poolId,
        user_id: user.id,
        content: content.trim(),
        is_pinned: isPinned || false,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }

    // Log activity
    await admin.from('event_activity_log').insert({
      pool_id: poolId,
      tournament_id: null,
      user_id: user.id,
      action: 'announcement.created',
      details: { announcement_id: announcement.id },
    })

    return NextResponse.json({ success: true, announcementId: announcement.id })
  } catch (err) {
    console.error('Announcement create error:', err)
    Sentry.captureException(err, { tags: { route: 'events/pools/announcements', action: 'create' } })
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Verify creator
    const { data: pool } = await admin
      .from('event_pools')
      .select('created_by')
      .eq('id', poolId)
      .single()

    if (!pool || pool.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the pool creator can delete announcements' }, { status: 403 })
    }

    const { announcementId } = await request.json()
    if (!announcementId) {
      return NextResponse.json({ error: 'Missing announcementId' }, { status: 400 })
    }

    await admin
      .from('event_pool_announcements')
      .delete()
      .eq('id', announcementId)
      .eq('pool_id', poolId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Announcement delete error:', err)
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
  }
}
