'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logActivity, type ActivityAction } from '@/lib/activity'

/**
 * Server action wrapper for client components to log activity.
 * Authenticates the user server-side before logging.
 */
export async function trackActivity(
  action: ActivityAction,
  leagueId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  logActivity({
    userId: user.id,
    leagueId: leagueId ?? null,
    action,
    details,
  })
}

/**
 * Server action for client components to log event-specific activity.
 * Writes to event_activity_log AND platform activity_log for unified analytics.
 */
export async function trackEventActivity(
  action: string,
  poolId?: string | null,
  tournamentId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()

  // Write to event_activity_log (game-specific)
  admin
    .from('event_activity_log')
    .insert({
      pool_id: poolId ?? null,
      tournament_id: tournamentId ?? null,
      user_id: user.id,
      action,
      details: details ?? {},
    })
    .then(({ error }) => {
      if (error) {
        console.error(`[event_activity_log] Failed to log ${action}:`, error.message)
      }
    })

  // Also write to platform activity_log for unified analytics
  // Map event actions to platform ActivityAction type
  const platformAction = mapEventToPlatformAction(action)
  if (platformAction) {
    logActivity({
      userId: user.id,
      leagueId: null,
      action: platformAction,
      details: {
        ...details,
        poolId: poolId ?? undefined,
        tournamentId: tournamentId ?? undefined,
      },
    })
  }
}

function mapEventToPlatformAction(action: string): ActivityAction | null {
  const mapping: Record<string, ActivityAction> = {
    'pool.created': 'event.pool_created',
    'pool.joined': 'event.pool_joined',
    'pick.submitted': 'event.picks_submitted',
    'pick.updated': 'event.picks_updated',
    'bracket.completed': 'event.bracket_completed',
    'survivor.pick_made': 'event.survivor_pick_made',
    'tournament.viewed': 'event.tournament_viewed',
    'leaderboard.viewed': 'event.leaderboard_viewed',
  }
  return mapping[action] ?? null
}
