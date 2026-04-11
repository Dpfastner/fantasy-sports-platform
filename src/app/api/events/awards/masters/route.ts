import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * POST /api/events/awards/masters
 *
 * Persist a round award (pimento cheese or crow's nest) to event_activity_log.
 * Idempotent — checks for existing award before inserting.
 *
 * Body: { tournamentId, poolId, roundNumber, action, entryId, entryName, roundToPar }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tournamentId, poolId, roundNumber, action, entryId, entryName, roundToPar } = body

    if (!tournamentId || !poolId || !roundNumber || !action || !entryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['masters.pimento_cheese', 'masters.crows_nest'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Idempotent: check if award already exists for this pool + round + action
    const { data: existing } = await admin
      .from('event_activity_log')
      .select('id')
      .eq('pool_id', poolId)
      .eq('action', action)
      .contains('details', { round: roundNumber })
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ message: 'Award already recorded', existing: true })
    }

    // Insert the award
    const { error } = await admin.from('event_activity_log').insert({
      pool_id: poolId,
      tournament_id: tournamentId,
      action,
      details: {
        round: roundNumber,
        entry_id: entryId,
        entry_name: entryName,
        round_to_par: roundToPar,
      },
    })

    if (error) {
      console.error('Failed to persist Masters award:', error)
      return NextResponse.json({ error: 'Failed to save award' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Award recorded', action, round: roundNumber })
  } catch (err) {
    console.error('Masters award route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
