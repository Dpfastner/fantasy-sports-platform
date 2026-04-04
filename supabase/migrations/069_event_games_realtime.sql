-- Migration 065: Enable realtime for event_games table
-- Allows live score updates to push to all connected clients via Supabase Realtime.
-- This replaces the expensive client-side polling that burned 75% of Vercel CPU.

ALTER PUBLICATION supabase_realtime ADD TABLE event_games;
