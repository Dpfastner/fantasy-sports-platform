-- Add co-commissioner role and second owner for teams

-- Add co_commissioner to the league_role enum
ALTER TYPE league_role ADD VALUE IF NOT EXISTS 'co_commissioner';

-- Add second owner to fantasy_teams
ALTER TABLE fantasy_teams ADD COLUMN IF NOT EXISTS second_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Update RLS to allow co-commissioners to manage league
DROP POLICY IF EXISTS "Commissioners can update leagues" ON leagues;
CREATE POLICY "Commissioners can update leagues" ON leagues FOR UPDATE
    USING (
        created_by = auth.uid()
        OR id IN (
            SELECT league_id FROM league_members
            WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
        )
    );

-- Allow co-commissioners to update league settings
DROP POLICY IF EXISTS "Commissioners can update league settings" ON league_settings;
CREATE POLICY "Commissioners can update league settings" ON league_settings FOR UPDATE
    USING (
        league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
        OR league_id IN (
            SELECT league_id FROM league_members
            WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
        )
    );

-- Allow co-commissioners to manage members
DROP POLICY IF EXISTS "Commissioners can manage members" ON league_members;
CREATE POLICY "Commissioners can manage members" ON league_members FOR UPDATE
    USING (
        league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
        OR league_id IN (
            SELECT lm.league_id FROM league_members lm
            WHERE lm.user_id = auth.uid() AND lm.role IN ('commissioner', 'co_commissioner')
        )
    );

-- Allow commissioners to delete members (remove from league)
CREATE POLICY "Commissioners can remove members" ON league_members FOR DELETE
    USING (
        user_id = auth.uid()  -- Users can remove themselves
        OR league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
        OR league_id IN (
            SELECT lm.league_id FROM league_members lm
            WHERE lm.user_id = auth.uid() AND lm.role IN ('commissioner', 'co_commissioner')
        )
    );
