import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { announcementCreateSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { checkContent } from '@/lib/moderation/word-filter'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

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

    const { data: announcements, error } = await supabase
      .from('league_announcements')
      .select('id, title, body, pinned, created_at, updated_at, commissioner_id')
      .eq('league_id', leagueId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch announcements', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ announcements: announcements || [] })
  } catch (error) {
    console.error('Announcements GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    // Verify user is commissioner
    const supabase = createAdminClient()
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'commissioner' && membership.role !== 'co-commissioner')) {
      return NextResponse.json(
        { error: 'Only commissioners can create announcements' },
        { status: 403 }
      )
    }

    const rawBody = await request.json()
    const validation = validateBody(announcementCreateSchema, rawBody)
    if (!validation.success) return validation.response

    const { title, body, pinned } = validation.data

    // Content moderation check
    const titleCheck = checkContent(title)
    if (!titleCheck.allowed) {
      return NextResponse.json({ error: titleCheck.reason }, { status: 400 })
    }
    const bodyCheck = checkContent(body)
    if (!bodyCheck.allowed) {
      return NextResponse.json({ error: bodyCheck.reason }, { status: 400 })
    }

    const { data: announcement, error } = await supabase
      .from('league_announcements')
      .insert({
        league_id: leagueId,
        commissioner_id: user.id,
        title,
        body,
        pinned,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create announcement', details: error.message },
        { status: 500 }
      )
    }

    logActivity({
      userId: user.id,
      leagueId,
      action: 'announcement.created',
      details: { announcementId: announcement.id, title },
    })

    return NextResponse.json({ success: true, announcement })
  } catch (error) {
    console.error('Announcement POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
