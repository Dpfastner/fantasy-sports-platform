-- Phase 25.7b: Emoji reactions on league chat messages
-- Fixed emoji set: 👍 👎 😂 🔥 ❤️ 😮 🏈 🏆 🎉

CREATE TABLE IF NOT EXISTS league_message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES league_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON league_message_reactions(message_id);

ALTER TABLE league_message_reactions ENABLE ROW LEVEL SECURITY;

-- League members can read reactions (joins through league_messages -> league_members)
CREATE POLICY "League members can read reactions"
  ON league_message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT id FROM league_messages WHERE league_id IN (
        SELECT league_id FROM league_members WHERE user_id = auth.uid()
      )
    )
  );

-- Members can add their own reactions
CREATE POLICY "Members can add reactions"
  ON league_message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Members can remove their own reactions
CREATE POLICY "Members can remove own reactions"
  ON league_message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable Supabase Realtime for live reaction updates
ALTER PUBLICATION supabase_realtime ADD TABLE league_message_reactions;
