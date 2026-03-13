-- 053: Event soft-delete safety
-- Change ON DELETE CASCADE to ON DELETE SET NULL for event tables
-- so that user account deletion preserves pool and leaderboard data.

-- Pool creator: SET NULL instead of CASCADE (pool survives if creator deletes account)
ALTER TABLE event_pools
  DROP CONSTRAINT IF EXISTS event_pools_created_by_fkey,
  ALTER COLUMN created_by DROP NOT NULL,
  ADD CONSTRAINT event_pools_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Entry user_id: SET NULL instead of CASCADE (entries stay on leaderboard)
ALTER TABLE event_entries
  DROP CONSTRAINT IF EXISTS event_entries_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD CONSTRAINT event_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add soft-delete flag for entries
ALTER TABLE event_entries
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Chat messages: SET NULL instead of CASCADE (preserve chat history)
ALTER TABLE event_pool_messages
  DROP CONSTRAINT IF EXISTS event_pool_messages_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL,
  ADD CONSTRAINT event_pool_messages_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
