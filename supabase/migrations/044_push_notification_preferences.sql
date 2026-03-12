-- Phase 34: Per-type push notification preferences
-- Mirrors inapp_* columns so users can control which push notifications they receive

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS push_draft BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_game_results BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_trades BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_transactions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_announcements BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_chat_mentions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_league_activity BOOLEAN NOT NULL DEFAULT true;
