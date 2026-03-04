-- Phase 24.3: Create program_trends table
-- Used by future Pro Draft Intelligence feature (premium tier)

CREATE TABLE IF NOT EXISTS program_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_year INT NOT NULL,
  week INT NOT NULL,
  trend_score NUMERIC,
  recent_points_avg NUMERIC,
  upcoming_sos NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, season_year, week)
);

CREATE INDEX idx_program_trends_school_season_week ON program_trends(school_id, season_year, week);

ALTER TABLE program_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read program_trends"
  ON program_trends FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE program_trends IS 'Weekly trend data per school. Populated by service role for Pro Draft Intelligence feature.';
