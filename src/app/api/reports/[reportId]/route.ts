import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const { reportId } = await params
  const isAdmin = ADMIN_USER_IDS.includes(user.id)
  const admin = createAdminClient()

  // Fetch ticket
  const { data: ticket, error } = await admin
    .from('issue_reports')
    .select('*, profiles!issue_reports_user_id_fkey(display_name, email)')
    .eq('id', reportId)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Non-admin can only view own tickets
  if (!isAdmin && ticket.user_id !== user.id) {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
  }

  // Fetch responses
  const { data: responses } = await admin
    .from('ticket_responses')
    .select('*, profiles(display_name, email)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ticket, responses: responses || [] })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  if (!ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
  }

  const { reportId } = await params
  const body = await request.json()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {}
  if (body.status && ['new', 'in_progress', 'resolved'].includes(body.status)) {
    updates.status = body.status
    if (body.status === 'resolved') updates.resolved_at = new Date().toISOString()
    else updates.resolved_at = null
  }
  if (body.priority && ['low', 'normal', 'high', 'urgent'].includes(body.priority)) {
    updates.priority = body.priority
  }
  if (typeof body.admin_notes === 'string') {
    updates.admin_notes = body.admin_notes
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid updates' }, { status: 400 })
  }

  const { error } = await admin
    .from('issue_reports')
    .update(updates)
    .eq('id', reportId)

  if (error) {
    return NextResponse.json({ error: "Couldn't update ticket. Try again." }, { status: 500 })
  }

  // Notify user on status changes
  if (body.status && ['in_progress', 'resolved'].includes(body.status)) {
    const { data: ticket } = await admin
      .from('issue_reports')
      .select('user_id')
      .eq('id', reportId)
      .single()

    if (ticket?.user_id) {
      const { createNotification } = await import('@/lib/notifications')
      const statusLabel = body.status === 'resolved' ? 'resolved' : 'being looked into'
      createNotification({
        userId: ticket.user_id,
        type: 'support_response',
        title: 'Ticket Update',
        body: `Your support ticket is ${statusLabel}.`,
        data: { reportId },
      })

      if (body.status === 'resolved') {
        const { data: profile } = await admin
          .from('profiles')
          .select('email')
          .eq('id', ticket.user_id)
          .single()

        if (profile?.email) {
          const { sendUserEmail } = await import('@/lib/email')
          const ticketUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rivyls.com'}/tickets/${reportId}`
          sendUserEmail(
            profile.email,
            'Your Rivyls support ticket has been resolved',
            `<p>Your support ticket has been resolved.</p>
             <p>If you have any follow-up questions, you can reply directly on your ticket.</p>
             <p><a href="${ticketUrl}" style="color:#4F46E5;">View your ticket</a></p>
             <p style="color:#888;font-size:12px;margin-top:24px;">— The Rivyls Team</p>`
          )
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}
