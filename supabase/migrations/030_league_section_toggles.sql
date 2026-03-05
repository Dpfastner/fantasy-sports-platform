-- Add visibility toggle columns for league home page sections
ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS show_announcements BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_chat BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_activity_feed BOOLEAN NOT NULL DEFAULT true;
