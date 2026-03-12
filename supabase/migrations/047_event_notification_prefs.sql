-- ============================================
-- 047: Add event-specific notification preferences
-- ============================================

-- In-app notification preference for event games
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS inapp_events BOOLEAN NOT NULL DEFAULT true;

-- Push notification preference for event games
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS push_events BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN notification_preferences.inapp_events IS 'In-app notifications for event games (eliminations, picks, results)';
COMMENT ON COLUMN notification_preferences.push_events IS 'Push notifications for event games (eliminations, deadline reminders)';
