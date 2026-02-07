-- Add double points settings to league_settings
ALTER TABLE league_settings
ADD COLUMN IF NOT EXISTS double_points_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_double_picks_per_season INTEGER DEFAULT 0;

-- Add missing columns to existing weekly_double_picks table
-- (table already exists in 001_initial_schema.sql with fantasy_team_id column)
ALTER TABLE weekly_double_picks
ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS points_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_points DECIMAL(10,2) DEFAULT 0;

COMMENT ON TABLE weekly_double_picks IS 'Tracks which school each team selected for double points each week';
COMMENT ON COLUMN weekly_double_picks.bonus_points IS 'The additional points earned from the 2x multiplier (same as points_earned since it doubles)';
