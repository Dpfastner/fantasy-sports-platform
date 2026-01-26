-- Add update/insert policies for draft management
-- Commissioners need to be able to start, pause, and update draft status

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Commissioners can update drafts" ON drafts;
DROP POLICY IF EXISTS "Commissioners can insert draft order" ON draft_order;
DROP POLICY IF EXISTS "Commissioners can delete draft order" ON draft_order;
DROP POLICY IF EXISTS "Team owners can update their team draft position" ON fantasy_teams;

-- Policy: Commissioners can update drafts
CREATE POLICY "Commissioners can update drafts" ON drafts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_id = drafts.league_id
            AND user_id = auth.uid()
            AND role = 'commissioner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_id = drafts.league_id
            AND user_id = auth.uid()
            AND role = 'commissioner'
        )
    );

-- Policy: Commissioners can insert draft order
CREATE POLICY "Commissioners can insert draft order" ON draft_order FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM drafts d
            JOIN league_members lm ON lm.league_id = d.league_id
            WHERE d.id = draft_order.draft_id
            AND lm.user_id = auth.uid()
            AND lm.role = 'commissioner'
        )
    );

-- Policy: Commissioners can delete draft order (for resetting)
CREATE POLICY "Commissioners can delete draft order" ON draft_order FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM drafts d
            JOIN league_members lm ON lm.league_id = d.league_id
            WHERE d.id = draft_order.draft_id
            AND lm.user_id = auth.uid()
            AND lm.role = 'commissioner'
        )
    );

-- Also allow league members to update their team's draft position (for manual ordering)
CREATE POLICY "Team owners can update their team draft position" ON fantasy_teams FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
