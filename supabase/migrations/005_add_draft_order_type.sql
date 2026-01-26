-- Add draft order type to league settings
-- Options: 'random' (default) or 'manual' (commissioner sets order)

CREATE TYPE draft_order_type AS ENUM ('random', 'manual');

ALTER TABLE league_settings
ADD COLUMN draft_order_type draft_order_type NOT NULL DEFAULT 'random';

-- Add manual draft order storage (only used when draft_order_type = 'manual')
-- This stores the commissioner's preferred team order before draft starts
ALTER TABLE league_settings
ADD COLUMN manual_draft_order UUID[] DEFAULT '{}';
