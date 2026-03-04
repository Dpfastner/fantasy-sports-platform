import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { announcementUpdateSchema } from '@/lib/api/schemas'
import { logActivity } from '@/lib/activity'
import { checkContent } from '@/lib/moderation/word-filter'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const { id: leagueId, announcementId } = await params

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
        { error: 'Only commissioners can update announcements' },
        { status: 403 }
      )
    }

    const rawBody = await request.json()
    const validation = validateBody(announcementUpdateSchema, rawBody)
    if (!validation.success) return validation.response

    const updates = validation.data

    // Content moderation check on updated fields
    if (updates.title) {
      const titleCheck = checkContent(updates.title)
      if (!titleCheck.allowed) {
        return NextResponse.json({ error: titleCheck.reason }, { status: 400 })
      }
    }
    if (updates.body) {
      const bodyCheck = checkContent(updates.body)
      if (!bodyCheck.allowed) {
        return NextResponse.json({ error: bodyCheck.reason }, { status: 400 })
      }
    }

    const { data: announcement, error } = await supabase
      .from('league_announcements')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', announcementId)
      .eq('league_id', leagueId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update announcement', details: error.message },
        { status: 500 }
      )
    }

    logActivity({
      userId: user.id,
      leagueId,
      action: 'announcement.updated',
      details: { announcementId, updates: Object.keys(updates) },
    })

    return NextResponse.json({ success: true, announcement })
  } catch (error) {
    console.error('Announcement PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) {
  try {
    const { id: leagueId, announcementId } = await params

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
        { error: 'Only commissioners can delete announcements' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('league_announcements')
      .delete()
      .eq('id', announcementId)
      .eq('league_id', leagueId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete announcement', details: error.message },
        { status: 500 }
      )
    }

    logActivity({
      userId: user.id,
      leagueId,
      action: 'announcement.deleted',
      details: { announcementId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Announcement DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
