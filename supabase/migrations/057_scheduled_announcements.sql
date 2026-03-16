-- Phase 43D: Scheduled bulletin board posts

ALTER TABLE league_announcements
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN league_announcements.scheduled_at IS 'If set, post is hidden until this time. NULL means published immediately.';
