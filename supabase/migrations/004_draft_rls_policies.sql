-- RLS policies for draft-related tables

-- Drafts: viewable by league members, updatable by commissioner
CREATE POLICY "Drafts viewable by league members" ON drafts FOR SELECT
    USING (
        league_id IN (SELECT public.get_user_league_ids())
        OR league_id IN (SELECT id FROM leagues WHERE is_public = true)
    );

CREATE POLICY "Commissioners can update drafts" ON drafts FOR UPDATE
    USING (
        league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
    );

CREATE POLICY "Commissioners can insert drafts" ON drafts FOR INSERT
    WITH CHECK (
        league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
    );

-- Draft order: viewable by league members
CREATE POLICY "Draft order viewable by league members" ON draft_order FOR SELECT
    USING (
        draft_id IN (SELECT id FROM drafts WHERE league_id IN (SELECT public.get_user_league_ids()))
    );

CREATE POLICY "Commissioners can manage draft order" ON draft_order FOR ALL
    USING (
        draft_id IN (SELECT id FROM drafts WHERE league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid()))
    );

-- Draft picks: viewable by league members, insertable by team owners
CREATE POLICY "Draft picks viewable by league members" ON draft_picks FOR SELECT
    USING (
        draft_id IN (SELECT id FROM drafts WHERE league_id IN (SELECT public.get_user_league_ids()))
    );

CREATE POLICY "Team owners can make picks" ON draft_picks FOR INSERT
    WITH CHECK (
        fantasy_team_id IN (SELECT id FROM fantasy_teams WHERE user_id = auth.uid())
    );

-- Roster periods: need insert policy for draft picks
DROP POLICY IF EXISTS "Team owners can manage roster" ON roster_periods;

CREATE POLICY "Team owners can manage roster" ON roster_periods FOR INSERT
    WITH CHECK (
        fantasy_team_id IN (SELECT id FROM fantasy_teams WHERE user_id = auth.uid())
    );

CREATE POLICY "Team owners can update roster" ON roster_periods FOR UPDATE
    USING (
        fantasy_team_id IN (SELECT id FROM fantasy_teams WHERE user_id = auth.uid())
    );

CREATE POLICY "Team owners can delete roster" ON roster_periods FOR DELETE
    USING (
        fantasy_team_id IN (SELECT id FROM fantasy_teams WHERE user_id = auth.uid())
    );

-- Enable Realtime for draft tables (run in Supabase Dashboard > Database > Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE drafts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE draft_picks;
