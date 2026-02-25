-- ============================================
-- 014d: Create activity log table for audit trail
-- ============================================

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for querying by league and user
CREATE INDEX idx_activity_log_league ON activity_log(league_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- League members can view their league's activity
CREATE POLICY "League members can view activity"
    ON activity_log FOR SELECT
    USING (
        league_id IS NULL
        OR EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = activity_log.league_id
            AND league_members.user_id = auth.uid()
        )
    );

-- Only server (admin client) inserts activity — no user INSERT policy needed
