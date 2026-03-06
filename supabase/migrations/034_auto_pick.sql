-- Phase 26.1: Auto-pick support
-- Adds priority ordering to watchlists (for draft queue) and auto-pick tracking to draft_picks

-- Add priority column for draft queue ordering
-- NULL priority = regular watchlist entry (not in draft queue)
-- Non-null priority = in draft queue, lower number = higher priority (1 = first pick)
ALTER TABLE watchlists ADD COLUMN IF NOT EXISTS priority INTEGER;

-- Index for fast priority-ordered lookups during auto-pick
CREATE INDEX IF NOT EXISTS idx_watchlists_priority
  ON watchlists(user_id, league_id, priority) WHERE priority IS NOT NULL;

-- Track whether a draft pick was made by auto-pick (for "Auto" badge in UI)
ALTER TABLE draft_picks ADD COLUMN IF NOT EXISTS is_auto_pick BOOLEAN NOT NULL DEFAULT false;
