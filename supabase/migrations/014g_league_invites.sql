-- ============================================
-- 014g: League invites table
-- ============================================

CREATE TABLE league_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_league_invites_code ON league_invites(code);
CREATE INDEX idx_league_invites_league ON league_invites(league_id);

ALTER TABLE league_invites ENABLE ROW LEVEL SECURITY;

-- Anyone can look up an invite by code (for joining)
CREATE POLICY "Anyone can view invites" ON league_invites FOR SELECT USING (true);

-- Commissioners can manage invites
CREATE POLICY "Commissioners manage invites" ON league_invites FOR ALL
    USING (EXISTS (
        SELECT 1 FROM league_members
        WHERE league_members.league_id = league_invites.league_id
        AND league_members.user_id = auth.uid()
        AND league_members.role IN ('commissioner', 'co_commissioner')
    ));
