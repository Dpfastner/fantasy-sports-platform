import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { autoGrantFoundingCommissioner } from '@/lib/badges-auto'

/**
 * POST /api/badges/auto-grant
 * Called after a user creates their first league or pool.
 * Grants Founding Commissioner badge if they don't already have it.
 * Auth: requires authenticated user (grants to self only).
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await autoGrantFoundingCommissioner(user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Badge grant failed' }, { status: 500 })
  }
}
