-- Migration 052: Roster Draft Modes
-- Adds support for three roster pool draft modes:
--   open (default), limited (selection cap), snake_draft, linear_draft
--
-- Draft mode config is stored in event_pools.scoring_rules JSONB (no new columns).
-- Two new tables for live draft state (snake/linear only).

-- ── event_pool_drafts: State machine for live drafts ──
CREATE TABLE IF NOT EXISTS event_pool_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES event_pools(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'paused', 'completed')),
  current_round INT NOT NULL DEFAULT 1,
  current_pick INT NOT NULL DEFAULT 1,
  current_entry_id UUID REFERENCES event_entries(id) ON DELETE SET NULL,
  pick_deadline TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_pool_drafts_pool ON event_pool_drafts(pool_id);

-- ── event_pool_draft_order: Pick slots for live drafts ──
CREATE TABLE IF NOT EXISTS event_pool_draft_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES event_pool_drafts(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES event_entries(id) ON DELETE CASCADE,
  round INT NOT NULL,
  pick_number INT NOT NULL,
  position_in_round INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(draft_id, pick_number)
);

CREATE INDEX IF NOT EXISTS idx_event_pool_draft_order_draft ON event_pool_draft_order(draft_id, pick_number);
CREATE INDEX IF NOT EXISTS idx_event_pool_draft_order_entry ON event_pool_draft_order(entry_id);

-- ── RLS Policies ──
ALTER TABLE event_pool_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pool_draft_order ENABLE ROW LEVEL SECURITY;

-- Anyone can read draft state (for real-time subscriptions)
CREATE POLICY "event_pool_drafts_select" ON event_pool_drafts
  FOR SELECT USING (true);

CREATE POLICY "event_pool_draft_order_select" ON event_pool_draft_order
  FOR SELECT USING (true);

-- Only service role can insert/update (API routes use admin client)
CREATE POLICY "event_pool_drafts_insert" ON event_pool_drafts
  FOR INSERT WITH CHECK (false);
CREATE POLICY "event_pool_drafts_update" ON event_pool_drafts
  FOR UPDATE USING (false);

CREATE POLICY "event_pool_draft_order_insert" ON event_pool_draft_order
  FOR INSERT WITH CHECK (false);
CREATE POLICY "event_pool_draft_order_update" ON event_pool_draft_order
  FOR UPDATE USING (false);

-- Enable realtime for draft state
ALTER PUBLICATION supabase_realtime ADD TABLE event_pool_drafts;
ALTER PUBLICATION supabase_realtime ADD TABLE event_pool_draft_order;
