-- ============================================
-- 014c: Add missing updated_at columns + triggers
-- ============================================
-- Reuses existing update_updated_at_column() trigger function from migration 001

ALTER TABLE league_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE roster_periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE draft_order ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE draft_picks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create auto-update triggers
CREATE TRIGGER update_league_members_updated_at
    BEFORE UPDATE ON league_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roster_periods_updated_at
    BEFORE UPDATE ON roster_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_order_updated_at
    BEFORE UPDATE ON draft_order
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_picks_updated_at
    BEFORE UPDATE ON draft_picks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
