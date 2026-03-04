import { createAdminClient } from '@/lib/supabase/server'

/**
 * Delete announcements (and future messages) older than the given cutoff date.
 * Used for season-based data retention — typically called with the current
 * season start date so only the active season's content is preserved.
 */
export async function cleanupOldContent(cutoffDate: string): Promise<{
  announcementsDeleted: number
  messagesDeleted: number
}> {
  const supabase = createAdminClient()

  // Delete old announcements
  const { count: announcementsDeleted } = await supabase
    .from('league_announcements')
    .delete({ count: 'exact' })
    .lt('created_at', cutoffDate)

  // Delete old league messages (table may not exist yet — 25.7)
  let messagesDeleted = 0
  try {
    const { count } = await supabase
      .from('league_messages')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate)
    messagesDeleted = count || 0
  } catch {
    // Table doesn't exist yet — that's fine
  }

  return {
    announcementsDeleted: announcementsDeleted || 0,
    messagesDeleted,
  }
}
