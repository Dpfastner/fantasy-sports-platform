-- Masters-specific badge definitions for 2026.
-- Green Jacket: awarded to the pool champion after Round 4.
-- Augusta Patron: awarded to any user who joins a Masters pool.

INSERT INTO badge_definitions (slug, category, label, description, fallback_icon, color, bg_color, sort_order, requires_metadata, is_active)
VALUES
  ('masters_champion', 'achievement', 'Green Jacket', 'Won a Masters roster pool on Rivyls', 'trophy', '#166534', 'rgba(22,101,52,0.15)', 10, true, true),
  ('masters_patron', 'participation', 'Augusta Patron', 'Joined a Masters pool on Rivyls', 'ticket', '#166534', 'rgba(22,101,52,0.15)', 50, true, true)
ON CONFLICT (slug) DO NOTHING;
