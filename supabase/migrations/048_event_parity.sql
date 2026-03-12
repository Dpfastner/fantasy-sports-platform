-- Migration 048: Event Pool Feature Parity
-- Adds live game tracking columns, chat, announcements, member management, scoring customization

-- ============================================
-- 1. Live game columns on event_games
-- ============================================
ALTER TABLE event_games ADD COLUMN IF NOT EXISTS period TEXT;          -- "1st", "2nd", "3rd", "OT" for hockey; "1st Half"/"2nd Half" for rugby
ALTER TABLE event_games ADD COLUMN IF NOT EXISTS clock TEXT;           -- "12:34" time remaining
ALTER TABLE event_games ADD COLUMN IF NOT EXISTS live_status TEXT;     -- for golf: "Thru 12", "F", "-4"; generic status text
ALTER TABLE event_games ADD COLUMN IF NOT EXISTS result JSONB DEFAULT '{}';  -- structured result data for scoring

-- ============================================
-- 2. Pool chat messages
-- ============================================
CREATE TABLE IF NOT EXISTS event_pool_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES event_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_pool_messages_pool ON event_pool_messages(pool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_pool_messages_user ON event_pool_messages(user_id);

-- ============================================
-- 3. Pool chat message reactions
-- ============================================
CREATE TABLE IF NOT EXISTS event_pool_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES event_pool_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_event_pool_reactions_message ON event_pool_message_reactions(message_id);

-- ============================================
-- 4. Pool announcements
-- ============================================
CREATE TABLE IF NOT EXISTS event_pool_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES event_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_pool_announcements_pool ON event_pool_announcements(pool_id, created_at DESC);

-- ============================================
-- 5. Entry fee and prize pool on event_pools
-- ============================================
ALTER TABLE event_pools ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(10,2);
ALTER TABLE event_pools ADD COLUMN IF NOT EXISTS prize_pool NUMERIC(10,2);

-- ============================================
-- 6. Role column on event_entries
-- ============================================
ALTER TABLE event_entries ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'member'));

-- Update existing creator entries
UPDATE event_entries e
SET role = 'creator'
FROM event_pools p
WHERE e.pool_id = p.id AND e.user_id = p.created_by AND e.role = 'member';

-- ============================================
-- 7. RLS policies for new tables
-- ============================================

-- Pool messages: members can read, authenticated can insert (membership checked in API)
ALTER TABLE event_pool_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pool messages" ON event_pool_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert messages" ON event_pool_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Message reactions
ALTER TABLE event_pool_message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reactions" ON event_pool_message_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON event_pool_message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON event_pool_message_reactions FOR DELETE USING (auth.uid() = user_id);

-- Announcements: anyone can read, creator checks in API
ALTER TABLE event_pool_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read announcements" ON event_pool_announcements FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create announcements" ON event_pool_announcements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own announcements" ON event_pool_announcements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own announcements" ON event_pool_announcements FOR DELETE USING (auth.uid() = user_id);
