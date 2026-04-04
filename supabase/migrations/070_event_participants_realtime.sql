-- Migration 070: Enable realtime for event_participants table
-- Needed for golf leaderboard live updates (metadata contains scores).

ALTER PUBLICATION supabase_realtime ADD TABLE event_participants;
