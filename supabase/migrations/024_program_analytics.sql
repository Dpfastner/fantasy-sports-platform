-- Phase 24.2: Create program_analytics table
-- Used by future Pro Analytics feature (premium tier)

CREATE TABLE IF NOT EXISTS program_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_year INT NOT NULL,
  power_score NUMERIC,
  sos_rank INT,
  returning_production_pct NUMERIC,
  recruiting_rank INT,
  preseason_rank INT,
  composite_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, season_year)
);

CREATE INDEX idx_program_analytics_school_season ON program_analytics(school_id, season_year);

ALTER TABLE program_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read program_analytics"
  ON program_analytics FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE program_analytics IS 'Pre-computed analytics per school per season. Populated by service role for Pro Analytics feature.';
