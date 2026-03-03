-- Phase 23.3: Create tos_agreements table for logging user consent
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tos_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tos_version TEXT NOT NULL,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up user's agreements
CREATE INDEX idx_tos_agreements_user_id ON tos_agreements(user_id);
CREATE INDEX idx_tos_agreements_version ON tos_agreements(tos_version);

-- RLS: users can read their own rows; inserts via admin client (service role bypasses RLS)
ALTER TABLE tos_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tos_agreements"
  ON tos_agreements FOR SELECT
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE tos_agreements IS 'Logs user consent to Terms of Service versions. Required for legal compliance (CCPA/GDPR).';
