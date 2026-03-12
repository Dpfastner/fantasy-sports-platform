-- ============================================
-- 051: Roster Format Support
-- Adds game_type to pools (multi-format per tournament),
-- expands tournament format constraint, and adds roster pick index.
-- ============================================

-- 1. Add game_type column to event_pools
--    Allows each pool to specify its own game type,
--    enabling multiple formats within a single tournament.
ALTER TABLE event_pools
  ADD COLUMN IF NOT EXISTS game_type TEXT;

-- Backfill existing pools from their tournament's format
UPDATE event_pools p
  SET game_type = t.format
  FROM event_tournaments t
  WHERE p.tournament_id = t.id AND p.game_type IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE event_pools
  ALTER COLUMN game_type SET NOT NULL;

-- Constrain to known game types
ALTER TABLE event_pools
  ADD CONSTRAINT event_pools_game_type_check
  CHECK (game_type IN ('bracket', 'pickem', 'survivor', 'roster'));

-- 2. Expand tournament format to include 'roster' and 'multi'
--    'multi' signals that a tournament supports multiple pool game types.
ALTER TABLE event_tournaments
  DROP CONSTRAINT IF EXISTS event_tournaments_format_check;

ALTER TABLE event_tournaments
  ADD CONSTRAINT event_tournaments_format_check
  CHECK (format IN ('bracket', 'pickem', 'survivor', 'roster', 'multi'));

-- 3. Roster pick uniqueness: one pick per participant per entry
--    Roster picks have game_id IS NULL and week_number IS NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_picks_entry_participant_roster
  ON event_picks(entry_id, participant_id)
  WHERE game_id IS NULL AND week_number IS NULL;
