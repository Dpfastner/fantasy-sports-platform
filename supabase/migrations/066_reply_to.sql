-- Add reply_to_id column to all chat tables for reply/quote system

ALTER TABLE league_messages ADD COLUMN reply_to_id UUID REFERENCES league_messages(id) ON DELETE SET NULL;
ALTER TABLE event_pool_messages ADD COLUMN reply_to_id UUID REFERENCES event_pool_messages(id) ON DELETE SET NULL;
ALTER TABLE direct_messages ADD COLUMN reply_to_id UUID REFERENCES direct_messages(id) ON DELETE SET NULL;
