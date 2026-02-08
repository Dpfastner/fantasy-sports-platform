-- Create issue_reports table for user bug reports
CREATE TABLE IF NOT EXISTS issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  page VARCHAR(255),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'new',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Anyone can create issue reports" ON issue_reports
  FOR INSERT WITH CHECK (true);

-- Only admins can view all reports (we'll check role in app)
CREATE POLICY "Users can view own reports" ON issue_reports
  FOR SELECT USING (user_id = auth.uid());

-- Create index for querying
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created ON issue_reports(created_at DESC);

COMMENT ON TABLE issue_reports IS 'User-submitted bug reports and feature requests';
