'use server'

import { createClient } from '@/lib/supabase/server'
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
