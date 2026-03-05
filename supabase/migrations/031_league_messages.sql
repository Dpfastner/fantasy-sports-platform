-- Phase 25.7: Create league_messages table for league chat
-- Real-time message board on league home page via Supabase Realtime

CREATE TABLE IF NOT EXISTS league_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_league_messages_league_created ON league_messages(league_id, created_at DESC);

ALTER TABLE league_messages ENABLE ROW LEVEL SECURITY;

-- League members can read messages for their leagues
CREATE POLICY "League members can read messages"
  ON league_messages FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- League members can send messages (own user_id only)
CREATE POLICY "League members can send messages"
  ON league_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- Enable Supabase Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE league_messages;

COMMENT ON TABLE league_messages IS 'Real-time chat messages on league home page. Delivered via Supabase Realtime subscriptions.';
