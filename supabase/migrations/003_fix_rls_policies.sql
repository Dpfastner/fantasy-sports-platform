-- Fix RLS infinite recursion issues
-- Run this after 001_initial_schema.sql if you encounter recursion errors

-- Drop problematic policies
DROP POLICY IF EXISTS "League members viewable by league members" ON league_members;
DROP POLICY IF EXISTS "Commissioners can manage members" ON league_members;
DROP POLICY IF EXISTS "Users can join leagues" ON league_members;
DROP POLICY IF EXISTS "Users can leave leagues" ON league_members;
DROP POLICY IF EXISTS "Leagues viewable by members" ON leagues;
DROP POLICY IF EXISTS "Commissioners can update leagues" ON leagues;
DROP POLICY IF EXISTS "League settings viewable by members" ON league_settings;
DROP POLICY IF EXISTS "Commissioners can update league settings" ON league_settings;
DROP POLICY IF EXISTS "Fantasy teams viewable by league members" ON fantasy_teams;

-- Create security definer functions to check membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_league_member(check_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = check_league_id
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_league_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT league_id FROM public.league_members WHERE user_id = auth.uid();
$$;

-- League members policies (no self-reference)
CREATE POLICY "Users can view own memberships" ON league_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can join leagues" ON league_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave leagues" ON league_members FOR DELETE
    USING (user_id = auth.uid());

CREATE POLICY "Commissioners can manage members" ON league_members FOR UPDATE
    USING (league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid()));

-- Leagues policies using helper function
CREATE POLICY "Leagues viewable by members" ON leagues FOR SELECT
    USING (
        is_public = true
        OR created_by = auth.uid()
        OR id IN (SELECT public.get_user_league_ids())
    );

CREATE POLICY "Commissioners can update leagues" ON leagues FOR UPDATE
    USING (created_by = auth.uid());

-- Fantasy teams policy using helper function
CREATE POLICY "Fantasy teams viewable by league members" ON fantasy_teams FOR SELECT
    USING (
        user_id = auth.uid()
        OR league_id IN (SELECT public.get_user_league_ids())
    );

-- League settings policy using helper function
CREATE POLICY "League settings viewable by members" ON league_settings FOR SELECT
    USING (
        league_id IN (SELECT id FROM leagues WHERE is_public = true)
        OR league_id IN (SELECT id FROM leagues WHERE created_by = auth.uid())
        OR league_id IN (SELECT public.get_user_league_ids())
    );
