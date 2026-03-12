-- Add customization columns to event_entries (bracket name, colors, logo)
ALTER TABLE event_entries
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1a1a1a',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS image_url TEXT;
