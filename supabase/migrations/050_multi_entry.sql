-- Migration 050: Allow multiple entries per user in event pools
-- Adds a pool setting to control how many entries each user can create (default 1).

-- Add per-user entry limit setting to pools
ALTER TABLE event_pools
  ADD COLUMN IF NOT EXISTS max_entries_per_user INT NOT NULL DEFAULT 1;

-- Drop the one-entry-per-user uniqueness constraint
ALTER TABLE event_entries
  DROP CONSTRAINT IF EXISTS event_entries_pool_id_user_id_key;

-- Keep an index for fast lookups (replaces the implicit unique index)
CREATE INDEX IF NOT EXISTS idx_event_entries_pool_user
  ON event_entries(pool_id, user_id);
