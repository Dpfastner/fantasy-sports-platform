import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'
import { validateBody } from '@/lib/api/validation'
import { ticketResponseSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activity'

const getLimiter = createRateLimiter({ windowMs: 60_000, max: 30 })
const postLimiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { limited, response } = getLimiter.check(getClientIp(request))
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const { reportId } = await params
  const isAdmin = ADMIN_USER_IDS.includes(user.id)
  const admin = createAdminClient()

  // Verify access
  if (!isAdmin) {
    const { data: ticket } = await admin
      .from('issue_reports')
      .select('user_id')
      .eq('id', reportId)
      .single()

    if (!ticket || ticket.user_id !== user.id) {
      return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
    }
  }

  const { data: responses } = await admin
    .from('ticket_responses')
    .select('*, profiles(display_name, email)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ responses: responses || [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { limited, response } = postLimiter.check(getClientIp(request))
  if (limited) return response!

  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const { user } = authResult

  const rawBody = await request.json()
  const validation = validateBody(ticketResponseSchema, rawBody)
  if (!validation.success) return validation.response

  const { content } = validation.data
  const { reportId } = await params
  const isAdmin = ADMIN_USER_IDS.includes(user.id)
  const admin = createAdminClient()

  // Fetch the ticket to verify access and get user_id for notifications
  const { data: ticket, error: ticketError } = await admin
    .from('issue_reports')
    .select('id, user_id, status')
    .eq('id', reportId)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Non-admin can only respond to own tickets
  if (!isAdmin && ticket.user_id !== user.id) {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
  }

  // Insert response
  const { data: inserted, error: insertError } = await admin
    .from('ticket_responses')
    .insert({
      report_id: reportId,
      user_id: user.id,
      content,
      is_admin: isAdmin,
    })
    .select('id, created_at')
    .single()

  if (insertError) {
    console.error('[ticket_responses] Insert failed:', insertError.message)
    return NextResponse.json({ error: "Couldn't send response. Try again." }, { status: 500 })
  }

  // Update denormalized counters on issue_reports
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = {
    response_count: (ticket as Record<string, unknown>).response_count
      ? undefined // will use raw SQL increment below
      : 1,
    last_response_at: now,
  }

  // Use RPC-style increment or just refetch and set
  // Simpler: just count responses
  const { count } = await admin
    .from('ticket_responses')
    .select('id', { count: 'exact', head: true })
    .eq('report_id', reportId)

  await admin
    .from('issue_reports')
    .update({
      response_count: count || 1,
      last_response_at: now,
      // If ticket was resolved and user replies, reopen it
      ...((!isAdmin && ticket.status === 'resolved') ? { status: 'new' } : {}),
    })
    .eq('id', reportId)

  // Notify the other party
  if (isAdmin && ticket.user_id) {
    // Admin responded → notify the user
    createNotification({
      userId: ticket.user_id,
      type: 'support_response',
      title: 'Support Response',
      body: 'The Rivyls team responded to your support ticket.',
      data: { reportId },
    })

    // Email the user
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
        'Rivyls Support — New response to your ticket',
        `<p>The Rivyls team responded to your support ticket.</p>
         <p style="margin:16px 0;padding:12px;background:#f5f5f5;border-radius:8px;font-size:14px;">${content.slice(0, 300)}${content.length > 300 ? '...' : ''}</p>
         <p><a href="${ticketUrl}" style="color:#4F46E5;">View full conversation</a></p>
         <p style="color:#888;font-size:12px;margin-top:24px;">— The Rivyls Team</p>`
      )
    }
  }

  logActivity({
    userId: user.id,
    action: 'support.response_sent',
    details: { reportId, isAdmin },
  })

  return NextResponse.json({ success: true, response: inserted })
}
