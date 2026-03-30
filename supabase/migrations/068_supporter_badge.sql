-- Migration 068: Add Supporter badge definition
-- Auto-granted when a user makes a confirmed support payment via Stripe

INSERT INTO badge_definitions (slug, category, label, description, fallback_icon, color, bg_color, sort_order, requires_metadata, is_active)
VALUES ('supporter', 'distinction', 'Supporter', 'Supported Rivyls with a voluntary contribution', 'heart', '#F59E0B', 'rgba(245,158,11,0.2)', 15, false, true);
