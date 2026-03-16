-- Phase 43D: Chat sidebar — pinned messages + DM tables

-- Pinned message columns on league_messages
ALTER TABLE league_messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id);

-- Pinned message columns on event_pool_messages
ALTER TABLE event_pool_messages
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id);

-- Direct message tables
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation_created
  ON direct_messages(conversation_id, created_at DESC);

-- RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- conversation_members: users can see their own memberships
CREATE POLICY "Users can view own conversation memberships"
  ON conversation_members FOR SELECT
  USING (user_id = auth.uid());

-- conversation_members: users can view other members of their conversations
CREATE POLICY "Users can view co-members"
  ON conversation_members FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
  ));

-- direct_messages: conversation members can read
CREATE POLICY "Conversation members can read messages"
  ON direct_messages FOR SELECT
  USING (conversation_id IN (
    SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
  ));

-- direct_messages: conversation members can insert
CREATE POLICY "Conversation members can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid()
    )
  );

-- Enable realtime on direct_messages
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
