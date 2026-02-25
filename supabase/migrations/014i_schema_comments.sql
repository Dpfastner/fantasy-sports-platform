-- ============================================
-- 014i: Document denormalization decisions
-- ============================================

COMMENT ON COLUMN games.home_team_name IS 'Denormalized: FCS opponents have no school record. Display name stored for games with non-FBS teams.';
COMMENT ON COLUMN games.home_team_logo_url IS 'Denormalized: FCS opponent logo URL.';
COMMENT ON COLUMN games.away_team_name IS 'Denormalized: FCS opponents have no school record.';
COMMENT ON COLUMN games.away_team_logo_url IS 'Denormalized: FCS opponent logo URL.';
COMMENT ON COLUMN fantasy_teams.total_points IS 'Denormalized: sum of fantasy_team_weekly_points.points. Reconciled nightly by /api/cron/reconcile.';
COMMENT ON COLUMN fantasy_teams.high_points_winnings IS 'Denormalized: sum of weekly high_points_amount. Reconciled nightly.';
