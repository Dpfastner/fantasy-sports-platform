'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Server action to save an entry's display name.
 * Authenticates the user and verifies entry ownership.
 */
export async function saveEntryName(
  entryId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify entry belongs to user
  const { data: entry } = await admin
    .from('event_entries')
    .select('id, user_id')
    .eq('id', entryId)
    .single()

  if (!entry || entry.user_id !== user.id) {
    return { success: false, error: 'Entry not found' }
  }

  const trimmed = displayName.trim().slice(0, 50)

  await admin
    .from('event_entries')
    .update({
      display_name: trimmed || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)

  return { success: true }
}
