-- ============================================
-- 014e: Premium-ready schema (schema only, no UI)
-- ============================================

-- Add tier to profiles (14.8)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
    tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'founding_commissioner'));

-- Create feature flags tables (14.9)
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    tier_required TEXT NOT NULL DEFAULT 'free' CHECK (tier_required IN ('free', 'pro')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, feature_flag_id)
);

-- Add referred_by to profiles (14.10)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
    referred_by UUID REFERENCES profiles(id);

-- Create notification preferences (14.12)
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email_game_results BOOLEAN NOT NULL DEFAULT true,
    email_draft_reminders BOOLEAN NOT NULL DEFAULT true,
    email_transaction_confirmations BOOLEAN NOT NULL DEFAULT true,
    email_league_announcements BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create watchlists (14.14)
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_watchlists_user ON watchlists(user_id);

-- Add auction draft type (14.15)
ALTER TYPE draft_type ADD VALUE IF NOT EXISTS 'auction';

-- Add scoring preset (14.16)
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS
    scoring_preset TEXT DEFAULT 'custom';

-- Enable RLS on new tables
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- RLS: feature flags are public read
CREATE POLICY "Anyone can view feature flags" ON feature_flags FOR SELECT USING (true);

-- RLS: users see their own feature flag overrides
CREATE POLICY "Users see own feature flags" ON user_feature_flags FOR SELECT
    USING (auth.uid() = user_id);

-- RLS: users manage their own notification preferences
CREATE POLICY "Users manage own notifications" ON notification_preferences FOR ALL
    USING (auth.uid() = user_id);

-- RLS: users manage their own watchlists
CREATE POLICY "Users manage own watchlists" ON watchlists FOR ALL
    USING (auth.uid() = user_id);
