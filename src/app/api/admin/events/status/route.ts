import { NextResponse } from 'next/server'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'

const ADMIN_USER_IDS = [
  '5ab25825-1e29-4949-b798-61a8724170d6',
]

/**
 * POST /api/admin/events/status
 * Update tournament or pool status from the admin dashboard.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { type, id, status } = body

  if (!type || !id || !status) {
    return NextResponse.json({ error: 'Missing type, id, or status' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (type === 'tournament') {
    const validStatuses = ['upcoming', 'active', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const { error } = await admin
      .from('event_tournaments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If completing a tournament, trigger champion badges
    if (status === 'completed') {
      try {
        const { autoGrantChampionBadges } = await import('@/lib/badges-auto')
        await autoGrantChampionBadges(id)
      } catch (err) {
        console.error('Champion badge error:', err)
        // Don't fail the status update if badges fail
      }
    }

    return NextResponse.json({ success: true, type, id, status })
  }

  if (type === 'pool') {
    const validStatuses = ['open', 'locked', 'scoring', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const { error } = await admin
      .from('event_pools')
      .update({ status })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, type, id, status })
  }

  return NextResponse.json({ error: 'Invalid type. Must be "tournament" or "pool"' }, { status: 400 })
}
