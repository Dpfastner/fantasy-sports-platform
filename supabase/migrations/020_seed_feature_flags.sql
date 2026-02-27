-- ============================================
-- 020: Seed feature flags for premium features
--
-- Populates the feature_flags table with the 9 planned
-- premium features. All are disabled and require 'pro'
-- tier. Year 1: everything is free regardless of flags.
-- Year 2: enable flags and gate behind Pro subscription.
-- ============================================

INSERT INTO feature_flags (key, name, description, tier_required, enabled) VALUES
  ('pre_draft_intelligence', 'Pre-Draft Intelligence', 'AI-powered draft recommendations and school analysis before your draft', 'pro', false),
  ('live_analytics', 'Live Analytics', 'Real-time scoring projections and performance insights during games', 'pro', false),
  ('transaction_intelligence', 'Transaction Intelligence', 'Smart add/drop suggestions based on upcoming schedules and matchups', 'pro', false),
  ('custom_scoring_templates', 'Custom Scoring Templates', 'Save and share custom scoring configurations across leagues', 'pro', false),
  ('waiver_suggestions', 'Waiver Suggestions', 'Recommended available schools based on remaining schedule strength', 'pro', false),
  ('what_if_simulator', 'What-If Simulator', 'Simulate draft picks and transactions to see projected outcomes', 'pro', false),
  ('power_rankings', 'Power Rankings', 'Weekly algorithmic power rankings for all teams in your league', 'pro', false),
  ('custom_league_themes', 'Custom League Themes', 'Customize your league with unique colors, logos, and branding', 'pro', false),
  ('early_draft_access', 'Early Draft Access', 'Access to draft room 48 hours before standard opening', 'pro', false)
ON CONFLICT (key) DO NOTHING;
