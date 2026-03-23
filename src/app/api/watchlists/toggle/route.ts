import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { watchlistToggleSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 })

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const rawBody = await request.json()
    const validation = validateBody(watchlistToggleSchema, rawBody)
    if (!validation.success) return validation.response

    const { schoolId, leagueId } = validation.data
    const supabase = createAdminClient()

    // Check if already watchlisted
    const { data: existing } = await supabase
      .from('watchlists')
      .select('id, priority')
      .eq('user_id', user.id)
      .eq('school_id', schoolId)
      .eq('league_id', leagueId)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('watchlists')
        .delete()
        .eq('id', existing.id)

      // If removed school was in the draft queue, renumber remaining items
      if (existing.priority !== null) {
        const { data: remaining } = await supabase
          .from('watchlists')
          .select('id, priority')
          .eq('user_id', user.id)
          .eq('league_id', leagueId)
          .not('priority', 'is', null)
          .order('priority')

        if (remaining) {
          for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].priority !== i + 1) {
              await supabase
                .from('watchlists')
                .update({ priority: i + 1 })
                .eq('id', remaining[i].id)
            }
          }
        }
      }

      return NextResponse.json({ watchlisted: false })
    } else {
      await supabase
        .from('watchlists')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          league_id: leagueId,
        })

      return NextResponse.json({ watchlisted: true })
    }
  } catch (error) {
    console.error('Watchlist toggle error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Try again.' },
      { status: 500 }
    )
  }
}
