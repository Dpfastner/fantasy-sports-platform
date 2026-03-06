-- ============================================
-- 036: Trading enhancements for Phase 27
-- ============================================

-- Add columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS counter_to_trade_id UUID REFERENCES trades(id);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS dropped_schools JSONB;
-- dropped_schools format: [{ "teamId": "uuid", "schoolId": "uuid", "slotNumber": 3 }, ...]
ALTER TABLE trades ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- Expand status CHECK to include 'expired' and 'countered'
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE trades ADD CONSTRAINT trades_status_check
  CHECK (status IN ('proposed','accepted','rejected','cancelled','vetoed','expired','countered'));

-- Add trade settings to league_settings
ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS trades_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trade_deadline DATE,
  ADD COLUMN IF NOT EXISTS max_trades_per_season INTEGER NOT NULL DEFAULT 10;

-- Track trades used per team (mirrors add_drops_used)
ALTER TABLE fantasy_teams
  ADD COLUMN IF NOT EXISTS trades_used INTEGER NOT NULL DEFAULT 0;

-- Indexes for trade queries
CREATE INDEX IF NOT EXISTS idx_trades_proposer ON trades(proposer_team_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiver ON trades(receiver_team_id);
CREATE INDEX IF NOT EXISTS idx_trades_expires ON trades(expires_at) WHERE status = 'proposed';
