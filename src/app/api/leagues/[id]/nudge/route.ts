import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 3 })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId } = await params

    // Auth
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const admin = createAdminClient()

    // Verify user is a league member
    const { data: membership } = await admin
      .from('league_members')
      .select('role, commissioner_nudged_at')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a league member' }, { status: 403 })
    }

    // Commissioners can't nudge themselves
    if (membership.role === 'commissioner' || membership.role === 'co_commissioner') {
      return NextResponse.json({ error: 'Commissioners cannot nudge themselves' }, { status: 400 })
    }

    // Verify league is dormant
    const { data: league } = await admin
      .from('leagues')
      .select('id, name, status')
      .eq('id', leagueId)
      .single()

    if (!league || league.status !== 'dormant') {
      return NextResponse.json({ error: 'League is not dormant' }, { status: 400 })
    }

    // Rate limit: once per 24 hours per user
    if (membership.commissioner_nudged_at) {
      const lastNudge = new Date(membership.commissioner_nudged_at)
      const hoursSince = (Date.now() - lastNudge.getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince)
        return NextResponse.json(
          { error: `You can nudge again in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}` },
          { status: 429 }
        )
      }
    }

    // Get all commissioners
    const { data: commissioners } = await admin
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId)
      .in('role', ['commissioner', 'co_commissioner'])

    if (!commissioners || commissioners.length === 0) {
      return NextResponse.json({ error: 'No commissioners found' }, { status: 400 })
    }

    // Get the nudging user's display name
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, email')
      .eq('id', user.id)
      .single()

    const userName = profile?.display_name || profile?.email?.split('@')[0] || 'A member'

    // Send notification to each commissioner (fire-and-forget)
    for (const commish of commissioners) {
      createNotification({
        userId: commish.user_id,
        leagueId,
        type: 'system',
        title: 'Season Reminder',
        body: `${userName} is asking you to reactivate ${league.name} for a new season!`,
        data: { leagueId, nudgedBy: user.id },
      })
    }

    // Update the nudge timestamp
    await admin
      .from('league_members')
      .update({ commissioner_nudged_at: new Date().toISOString() })
      .eq('league_id', leagueId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Nudge error:', error)
    return NextResponse.json(
      { error: 'Failed to send nudge', details: String(error) },
      { status: 500 }
    )
  }
}
