-- Phase 45b: Stripe integration — donations table + stripe_customer_id on profiles

-- Add stripe_customer_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Users can read their own donations
CREATE POLICY "Users can view own donations"
  ON donations FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhook)
CREATE POLICY "Service role can manage donations"
  ON donations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add supporter badge definition
INSERT INTO badge_definitions (slug, label, description, category, fallback_icon, color, bg_color, sort_order)
VALUES (
  'supporter',
  'Supporter',
  'Made a voluntary contribution to support the platform',
  'distinction',
  'heart',
  '#F59E0B',
  'rgba(245,158,11,0.2)',
  15
)
ON CONFLICT (slug) DO NOTHING;

-- Updated_at trigger
CREATE TRIGGER set_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
