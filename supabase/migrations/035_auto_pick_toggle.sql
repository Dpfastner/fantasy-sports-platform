-- Auto-pick toggle: let users enable/disable auto-pick mode per team
ALTER TABLE fantasy_teams ADD COLUMN IF NOT EXISTS auto_pick_enabled BOOLEAN NOT NULL DEFAULT false;
