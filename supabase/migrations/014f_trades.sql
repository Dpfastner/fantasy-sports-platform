-- ============================================
-- 014f: Trades tables (schema only, no UI)
-- ============================================

CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    proposer_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    receiver_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'proposed'
        CHECK (status IN ('proposed', 'accepted', 'rejected', 'cancelled', 'vetoed')),
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    commissioner_override BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT
);

CREATE TABLE trade_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('giving', 'receiving'))
);

CREATE INDEX idx_trades_league ON trades(league_id, proposed_at DESC);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trade_items_trade ON trade_items(trade_id);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_items ENABLE ROW LEVEL SECURITY;

-- League members can view trades in their leagues
CREATE POLICY "League members can view trades" ON trades FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM league_members
        WHERE league_members.league_id = trades.league_id
        AND league_members.user_id = auth.uid()
    ));

CREATE POLICY "League members can view trade items" ON trade_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM trades
        JOIN league_members ON league_members.league_id = trades.league_id
        WHERE trades.id = trade_items.trade_id
        AND league_members.user_id = auth.uid()
    ));
