-- Migration: Support all games with at least one FBS team
-- Adds display columns for both teams so UI doesn't need JOINs

-- Make school_ids nullable (NULL when team is not FBS)
ALTER TABLE games
    ALTER COLUMN home_school_id DROP NOT NULL;

ALTER TABLE games
    ALTER COLUMN away_school_id DROP NOT NULL;

-- Add display columns for both teams (always populated)
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS home_team_name TEXT,
    ADD COLUMN IF NOT EXISTS home_team_logo_url TEXT,
    ADD COLUMN IF NOT EXISTS away_team_name TEXT,
    ADD COLUMN IF NOT EXISTS away_team_logo_url TEXT;

-- Ensure at least one team is FBS (has a school_id)
ALTER TABLE games
    ADD CONSTRAINT at_least_one_fbs_team
    CHECK (home_school_id IS NOT NULL OR away_school_id IS NOT NULL);

COMMENT ON COLUMN games.home_team_name IS 'Display name of home team (always populated from ESPN)';
COMMENT ON COLUMN games.home_team_logo_url IS 'Logo URL of home team (always populated from ESPN)';
COMMENT ON COLUMN games.away_team_name IS 'Display name of away team (always populated from ESPN)';
COMMENT ON COLUMN games.away_team_logo_url IS 'Logo URL of away team (always populated from ESPN)';
