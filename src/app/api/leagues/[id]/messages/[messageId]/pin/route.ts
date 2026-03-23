import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: leagueId, messageId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'You don\'t have permission to do this.' }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Verify commissioner role
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership || (membership.role !== 'commissioner' && membership.role !== 'co_commissioner')) {
      return NextResponse.json({ error: 'Only commissioners can pin messages' }, { status: 403 })
    }

    // Verify the message belongs to this league
    const { data: message } = await supabase
      .from('league_messages')
      .select('id, pinned_at')
      .eq('id', messageId)
      .eq('league_id', leagueId)
      .single()

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.pinned_at) {
      // Unpin
      await supabase
        .from('league_messages')
        .update({ pinned_at: null, pinned_by: null })
        .eq('id', messageId)

      return NextResponse.json({ action: 'unpinned' })
    } else {
      // Unpin any currently pinned message in this league first
      await supabase
        .from('league_messages')
        .update({ pinned_at: null, pinned_by: null })
        .eq('league_id', leagueId)
        .not('pinned_at', 'is', null)

      // Pin the selected message
      await supabase
        .from('league_messages')
        .update({ pinned_at: new Date().toISOString(), pinned_by: user.id })
        .eq('id', messageId)

      return NextResponse.json({ action: 'pinned' })
    }
  } catch (error) {
    Sentry.captureException(error)
    console.error('Pin message error:', error)
    return NextResponse.json({ error: 'Couldn\'t pin/unpin the message. Try again.' }, { status: 500 })
  }
}
