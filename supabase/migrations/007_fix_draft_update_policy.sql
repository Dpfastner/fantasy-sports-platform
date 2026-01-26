-- Fix draft update policy to allow any league member to advance picks
-- Previously only commissioners could update drafts, but members need to advance the pick after making a selection

-- Drop the commissioner-only policy
DROP POLICY IF EXISTS "Commissioners can update drafts" ON drafts;

-- Create a new policy that allows any league member to update drafts
-- This is needed because when a member makes a pick, they need to advance the draft to the next pick
CREATE POLICY "League members can update drafts" ON drafts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_id = drafts.league_id
            AND user_id = auth.uid()
        )
    );
