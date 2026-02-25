-- ============================================
-- 014a: Fix event bonuses RLS + Add missing indexes
-- ============================================

-- Fix overly permissive RLS on league_school_event_bonuses
-- (Any authenticated user could INSERT/UPDATE/DELETE — restrict to commissioners)
DROP POLICY IF EXISTS "Authenticated users can insert event bonuses" ON league_school_event_bonuses;
DROP POLICY IF EXISTS "Authenticated users can update event bonuses" ON league_school_event_bonuses;
DROP POLICY IF EXISTS "Authenticated users can delete event bonuses" ON league_school_event_bonuses;

CREATE POLICY "Commissioners can insert event bonuses"
    ON league_school_event_bonuses FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = league_school_event_bonuses.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.role IN ('commissioner', 'co_commissioner')
        )
    );

CREATE POLICY "Commissioners can update event bonuses"
    ON league_school_event_bonuses FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = league_school_event_bonuses.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.role IN ('commissioner', 'co_commissioner')
        )
    );

CREATE POLICY "Commissioners can delete event bonuses"
    ON league_school_event_bonuses FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = league_school_event_bonuses.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.role IN ('commissioner', 'co_commissioner')
        )
    );

-- Add missing indexes (14.2)
CREATE INDEX IF NOT EXISTS idx_leagues_created_by ON leagues(created_by);
CREATE INDEX IF NOT EXISTS idx_league_members_league_role ON league_members(league_id, role);
CREATE INDEX IF NOT EXISTS idx_school_weekly_points_game ON school_weekly_points(game_id);
CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_team ON weekly_double_picks(fantasy_team_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_user ON issue_reports(user_id);
