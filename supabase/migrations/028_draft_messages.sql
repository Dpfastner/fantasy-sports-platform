-- Phase 24.6: Create draft_messages table
-- Used by draft chat feature via Supabase Realtime (Phase 28.4)

CREATE TABLE IF NOT EXISTS draft_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_draft_messages_draft_created ON draft_messages(draft_id, created_at);

ALTER TABLE draft_messages ENABLE ROW LEVEL SECURITY;

-- League members can read messages for drafts in their leagues
CREATE POLICY "League members can read draft messages"
  ON draft_messages FOR SELECT
  TO authenticated
  USING (
    draft_id IN (
      SELECT d.id FROM drafts d
      JOIN league_members lm ON lm.league_id = d.league_id
      WHERE lm.user_id = auth.uid()
    )
  );

-- Authenticated users can insert their own messages
CREATE POLICY "Users can send draft messages"
  ON draft_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND draft_id IN (
      SELECT d.id FROM drafts d
      JOIN league_members lm ON lm.league_id = d.league_id
      WHERE lm.user_id = auth.uid()
    )
  );

-- Enable Supabase Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE draft_messages;

COMMENT ON TABLE draft_messages IS 'Real-time chat messages during drafts. Delivered via Supabase Realtime subscriptions.';
