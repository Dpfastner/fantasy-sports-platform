-- Phase 34b: Default push_enabled to true for new signups
-- Existing users who already have a notification_preferences row get updated too

ALTER TABLE notification_preferences
  ALTER COLUMN push_enabled SET DEFAULT true;

UPDATE notification_preferences
  SET push_enabled = true
  WHERE push_enabled = false;
