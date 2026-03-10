-- Phase 28.5.2: Account Deletion Safety
-- Soft-delete teams instead of hard-deleting them when a user deletes their account.
-- This preserves league standings, draft history, trade history, and weekly points.

-- 1. Add soft-delete flag
ALTER TABLE fantasy_teams
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- 2. Make user_id nullable (deleted teams have no owner)
ALTER TABLE fantasy_teams
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Change FK from CASCADE to SET NULL so deleting a profile
--    doesn't cascade-delete the team row
ALTER TABLE fantasy_teams
  DROP CONSTRAINT IF EXISTS fantasy_teams_user_id_fkey;
ALTER TABLE fantasy_teams
  ADD CONSTRAINT fantasy_teams_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Partial index for efficient filtering of active teams
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_active
  ON fantasy_teams (league_id) WHERE is_deleted = false;
