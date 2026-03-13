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
    .select('*, profiles(display_name, email)')
    .eq('id', reportId)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Non-admin can only view own tickets
  if (!isAdmin && ticket.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
