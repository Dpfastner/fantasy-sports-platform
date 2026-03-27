import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

// GET /api/users/blocked — list blocked users with profile info
export async function GET() {
  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const supabase = createAdminClient()

    const { data: blocks, error } = await supabase
      .from('blocked_users')
      .select('id, blocked_id, created_at, profiles!blocked_users_blocked_id_fkey(display_name, email)')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Couldn't load blocked users. Try again.", details: error.message },
        { status: 500 }
      )
    }

    const blockedUsers = (blocks || []).map((b: { id: string; blocked_id: string; created_at: string; profiles: { display_name: string | null; email: string } | { display_name: string | null; email: string }[] | null }) => {
      const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
      return {
        id: b.blocked_id,
        display_name: profile?.display_name || profile?.email?.split('@')[0] || 'Unknown',
        blocked_at: b.created_at,
      }
    })

    return NextResponse.json({ blockedUsers })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Blocked users GET error:', error)
    return NextResponse.json({ error: "Couldn't load blocked users. Try again." }, { status: 500 })
  }
}
