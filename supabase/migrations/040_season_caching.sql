-- Phase 31: Historical Season Caching
-- Makes leagues persistent across seasons. Auto-archive sets leagues dormant.
-- Commissioners can reactivate for a new season with same members.

-- 1. Add status column to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
COMMENT ON COLUMN leagues.status IS 'active = in-season, dormant = season archived';

-- 2. Add season_id to fantasy_team_weekly_points
ALTER TABLE fantasy_team_weekly_points
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- 3. Add season_id to weekly_double_picks
ALTER TABLE weekly_double_picks
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- 4. Add season_id to roster_periods
ALTER TABLE roster_periods
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- 5. Add season_id to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- 6. Add season_id to league_seasons (archive table)
ALTER TABLE league_seasons
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);

-- 7. Add commissioner_nudged_at to league_members (for nudge rate limiting)
ALTER TABLE league_members
  ADD COLUMN IF NOT EXISTS commissioner_nudged_at TIMESTAMPTZ;

-- 8. Backfill season_id from fantasy_teams -> leagues -> season_id
UPDATE fantasy_team_weekly_points ftwp
SET season_id = l.season_id
FROM fantasy_teams ft
JOIN leagues l ON ft.league_id = l.id
WHERE ftwp.fantasy_team_id = ft.id
  AND ftwp.season_id IS NULL;

UPDATE weekly_double_picks wdp
SET season_id = l.season_id
FROM fantasy_teams ft
JOIN leagues l ON ft.league_id = l.id
WHERE wdp.fantasy_team_id = ft.id
  AND wdp.season_id IS NULL;

UPDATE roster_periods rp
SET season_id = l.season_id
FROM fantasy_teams ft
JOIN leagues l ON ft.league_id = l.id
WHERE rp.fantasy_team_id = ft.id
  AND rp.season_id IS NULL;

UPDATE transactions t
SET season_id = l.season_id
FROM fantasy_teams ft
JOIN leagues l ON ft.league_id = l.id
WHERE t.fantasy_team_id = ft.id
  AND t.season_id IS NULL;

UPDATE league_seasons ls
SET season_id = l.season_id
FROM leagues l
WHERE ls.league_id = l.id
  AND ls.season_id IS NULL;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_ftwp_season ON fantasy_team_weekly_points(season_id);
CREATE INDEX IF NOT EXISTS idx_wdp_season ON weekly_double_picks(season_id);
CREATE INDEX IF NOT EXISTS idx_rp_season ON roster_periods(season_id);
CREATE INDEX IF NOT EXISTS idx_tx_season ON transactions(season_id);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);
