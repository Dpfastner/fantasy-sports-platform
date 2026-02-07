-- Add double points settings to league_settings
ALTER TABLE league_settings
ADD COLUMN IF NOT EXISTS double_points_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_double_picks_per_season INTEGER DEFAULT 0;

-- Create weekly_double_picks table if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_double_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id),
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_earned DECIMAL(10,2) DEFAULT 0,
  bonus_points DECIMAL(10,2) DEFAULT 0,
  UNIQUE(team_id, week_number)
);

-- Enable RLS on weekly_double_picks
ALTER TABLE weekly_double_picks ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_team ON weekly_double_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_week ON weekly_double_picks(week_number);

-- RLS policies for weekly_double_picks
CREATE POLICY "Users can view double picks in their leagues" ON weekly_double_picks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN league_members lm ON t.league_id = lm.league_id
      WHERE t.id = weekly_double_picks.team_id
      AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can insert their double picks" ON weekly_double_picks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = weekly_double_picks.team_id
      AND (t.owner_id = auth.uid() OR t.second_owner_id = auth.uid())
    )
  );

CREATE POLICY "Team owners can update their double picks" ON weekly_double_picks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = weekly_double_picks.team_id
      AND (t.owner_id = auth.uid() OR t.second_owner_id = auth.uid())
    )
  );

COMMENT ON TABLE weekly_double_picks IS 'Tracks which school each team selected for double points each week';
COMMENT ON COLUMN weekly_double_picks.bonus_points IS 'The additional points earned from the 2x multiplier (same as points_earned since it doubles)';
