-- Phase 41a: Ticket conversation system
-- Adds response threading to issue_reports + AI enrichment columns

-- Conversation responses on tickets
CREATE TABLE ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES issue_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_responses_report ON ticket_responses(report_id, created_at ASC);

ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

-- Users can read responses on their own tickets
CREATE POLICY "read_own_ticket_responses" ON ticket_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM issue_reports WHERE id = report_id AND user_id = auth.uid())
  );

-- Users can reply to their own tickets
CREATE POLICY "reply_own_tickets" ON ticket_responses
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM issue_reports WHERE id = report_id AND user_id = auth.uid())
  );

-- Enrich issue_reports with priority, AI fields, and response tracking
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'normal';
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS ai_category VARCHAR(50);
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS response_count INT DEFAULT 0;
ALTER TABLE issue_reports ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMPTZ;
