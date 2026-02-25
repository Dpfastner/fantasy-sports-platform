-- ============================================
-- 014h: Waitlist table for landing page email capture
-- ============================================

CREATE TABLE waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    source TEXT,
    referral_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No client access — managed by admin client only
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
