-- Migration 063: Enable Realtime on event_entries for live score updates
-- The Rivalry Board needs to update when gameday-sync recalculates total_points.
-- Without this, Supabase Realtime subscriptions on event_entries don't fire.

ALTER PUBLICATION supabase_realtime ADD TABLE event_entries;
