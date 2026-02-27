import { createAdminClient } from '@/lib/supabase/server'
import type { UserBadgeWithDefinition } from '@/types/database'

/**
 * Fetch all active badges for a user, with definitions joined.
 */
export async function getUserBadges(userId: string): Promise<UserBadgeWithDefinition[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_badges')
    .select('id, user_id, badge_definition_id, metadata, granted_at, badge_definitions(*)')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('granted_at', { ascending: true })
  return (data || []) as unknown as UserBadgeWithDefinition[]
}

/**
 * Fetch badges for multiple users (batch for member lists).
 * Returns a Map keyed by user_id.
 */
export async function getUsersBadges(userIds: string[]): Promise<Map<string, UserBadgeWithDefinition[]>> {
  if (userIds.length === 0) return new Map()

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_badges')
    .select('id, user_id, badge_definition_id, metadata, granted_at, badge_definitions(*)')
    .in('user_id', userIds)
    .is('revoked_at', null)

  const map = new Map<string, UserBadgeWithDefinition[]>()
  for (const badge of (data || [])) {
    const typed = badge as unknown as UserBadgeWithDefinition
    const existing = map.get(typed.user_id) || []
    existing.push(typed)
    map.set(typed.user_id, existing)
  }
  return map
}
