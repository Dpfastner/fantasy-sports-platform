-- Allow league members to see all members in their leagues
-- Previously, users could only see their own membership row

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own memberships" ON league_members;

-- Create new policy that lets users see all members in leagues they belong to
CREATE POLICY "League members can view fellow members" ON league_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR league_id IN (SELECT public.get_user_league_ids())
    );
