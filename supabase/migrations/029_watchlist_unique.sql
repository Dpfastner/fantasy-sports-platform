-- Add unique constraint to prevent duplicate watchlist entries
CREATE UNIQUE INDEX idx_watchlists_unique
  ON watchlists(user_id, school_id, league_id);
