import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { watchlistReorderSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const rawBody = await request.json()
    const validation = validateBody(watchlistReorderSchema, rawBody)
    if (!validation.success) return validation.response

    const { leagueId, order } = validation.data
    const supabase = createAdminClient()

    // Set priorities for schools in the order array
    for (const item of order) {
      await supabase
        .from('watchlists')
        .update({ priority: item.priority })
        .eq('user_id', user.id)
        .eq('school_id', item.schoolId)
        .eq('league_id', leagueId)
    }

    // Clear priority for any watchlist entries NOT in the order array
    // (removed from queue but still watchlisted)
    const orderedSchoolIds = order.map(o => o.schoolId)

    if (orderedSchoolIds.length > 0) {
      // Set priority = null for watchlist items not in the new order
      const { data: allWatchlist } = await supabase
        .from('watchlists')
        .select('id, school_id, priority')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .not('priority', 'is', null)

      if (allWatchlist) {
        for (const item of allWatchlist) {
          if (!orderedSchoolIds.includes(item.school_id)) {
            await supabase
              .from('watchlists')
              .update({ priority: null })
              .eq('id', item.id)
          }
        }
      }
    } else {
      // Empty order = clear all priorities
      await supabase
        .from('watchlists')
        .update({ priority: null })
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .not('priority', 'is', null)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watchlist reorder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
