-- Phase 24.5: Create league_seasons table
-- Used by league history / trophy room feature (Phase 28.6)

CREATE TABLE IF NOT EXISTS league_seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season_year INT NOT NULL,
  final_standings JSONB,
  champion_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, season_year)
);

CREATE INDEX idx_league_seasons_league_year ON league_seasons(league_id, season_year);

ALTER TABLE league_seasons ENABLE ROW LEVEL SECURITY;

-- League members can read their league's season history
CREATE POLICY "League members can read league seasons"
  ON league_seasons FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- Commissioners can create/update season records
CREATE POLICY "Commissioners can create league seasons"
  ON league_seasons FOR INSERT
  TO authenticated
  WITH CHECK (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
    )
  );

CREATE POLICY "Commissioners can update league seasons"
  ON league_seasons FOR UPDATE
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
    )
  );

COMMENT ON TABLE league_seasons IS 'Archived season results per league. Stores final standings and champion for trophy room.';
