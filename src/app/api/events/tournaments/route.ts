import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

// GET /api/events/tournaments
// Returns all active/upcoming tournaments
export async function GET(request: Request) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const supabase = await createServerClient()

    const { data: tournaments, error } = await supabase
      .from('event_tournaments')
      .select('*')
      .in('status', ['upcoming', 'active'])
      .order('starts_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch tournaments:', error)
      return NextResponse.json({ error: "Couldn't load tournaments. Try refreshing the page." }, { status: 500 })
    }

    return NextResponse.json({ tournaments })
  } catch (err) {
    console.error('Tournaments fetch error:', err)
    Sentry.captureException(err, { tags: { route: 'events/tournaments', action: 'fetch' } })
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
