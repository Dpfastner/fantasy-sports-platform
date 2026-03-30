-- Migration 067: Add new badge definitions
-- founding_member: Manually granted to early platform members
-- frozen_four_champion: Winner of Frozen Four bracket pool (requires metadata: year, pool_name)
-- first_rivyls_champion: Historical first-ever Rivyls competition winner

INSERT INTO badge_definitions (slug, category, label, description, fallback_icon, color, bg_color, sort_order, requires_metadata, is_active)
VALUES
  ('founding_member', 'distinction', 'Founding Member', 'Among the first members of the Rivyls community', 'flag', '#F59E0B', '#1A0F28', 5, false, true),
  ('frozen_four_champion', 'achievement', 'Frozen Four Champion', 'Won a Frozen Four bracket pool', 'trophy', '#F59E0B', '#1A0F28', 10, true, true),
  ('first_rivyls_champion', 'distinction', 'First Rivyls Champion', 'The first-ever Rivyls competition winner', 'crown', '#F59E0B', '#1A0F28', 1, false, true);
