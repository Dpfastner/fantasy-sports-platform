-- Migration 062: Enable realtime for event pool chat tables
-- These tables were created in 048 but never added to the realtime publication,
-- so Supabase realtime subscriptions (postgres_changes) receive no events.

ALTER PUBLICATION supabase_realtime ADD TABLE event_pool_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE event_pool_message_reactions;
