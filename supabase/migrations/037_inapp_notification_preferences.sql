-- Phase 28: In-app notification preferences
-- Let users control which in-app (bell icon) notifications they receive

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS inapp_draft BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_game_results BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_trades BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_transactions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_announcements BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_chat_mentions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inapp_league_activity BOOLEAN NOT NULL DEFAULT true;
