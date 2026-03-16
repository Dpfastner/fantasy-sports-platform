-- Migration 055: Add JSONB scoring_values column to league_settings
-- This enables sport-agnostic scoring storage alongside existing CFB columns.
-- Existing 21 scoring columns are KEPT for backward compatibility.
-- New leagues write to both JSONB and columns during transition period.

-- Add scoring_values JSONB column
ALTER TABLE league_settings
ADD COLUMN IF NOT EXISTS scoring_values JSONB DEFAULT '{}';

-- Backfill: populate JSONB from existing 21 scoring columns for all existing leagues
UPDATE league_settings
SET scoring_values = jsonb_build_object(
  'points_win', COALESCE(points_win, 1),
  'points_conference_game', COALESCE(points_conference_game, 1),
  'points_over_50', COALESCE(points_over_50, 1),
  'points_shutout', COALESCE(points_shutout, 1),
  'points_ranked_25', COALESCE(points_ranked_25, 1),
  'points_ranked_10', COALESCE(points_ranked_10, 2),
  'points_loss', COALESCE(points_loss, 0),
  'points_conference_game_loss', COALESCE(points_conference_game_loss, 0),
  'points_over_50_loss', COALESCE(points_over_50_loss, 0),
  'points_shutout_loss', COALESCE(points_shutout_loss, 0),
  'points_ranked_25_loss', COALESCE(points_ranked_25_loss, 0),
  'points_ranked_10_loss', COALESCE(points_ranked_10_loss, 0),
  'points_conference_championship_win', COALESCE(points_conference_championship_win, 10),
  'points_conference_championship_loss', COALESCE(points_conference_championship_loss, 0),
  'points_heisman_winner', COALESCE(points_heisman_winner, 10),
  'points_bowl_appearance', COALESCE(points_bowl_appearance, 3),
  'points_playoff_first_round', COALESCE(points_playoff_first_round, 3),
  'points_playoff_quarterfinal', COALESCE(points_playoff_quarterfinal, 4),
  'points_playoff_semifinal', COALESCE(points_playoff_semifinal, 5),
  'points_championship_win', COALESCE(points_championship_win, 20),
  'points_championship_loss', COALESCE(points_championship_loss, 6)
)
WHERE scoring_values = '{}' OR scoring_values IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN league_settings.scoring_values IS 'Sport-agnostic JSONB scoring values. Keys match sport scoring registry field keys. Coexists with individual columns during CFB transition.';
