-- Phase 24.4: Create league_announcements table
-- Used by commissioner announcements feature (Phase 28.3)

CREATE TABLE IF NOT EXISTS league_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  commissioner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_league_announcements_league ON league_announcements(league_id);

ALTER TABLE league_announcements ENABLE ROW LEVEL SECURITY;

-- League members can read announcements for their leagues
CREATE POLICY "League members can read announcements"
  ON league_announcements FOR SELECT
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- Commissioners can insert announcements for their leagues
CREATE POLICY "Commissioners can create announcements"
  ON league_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
    )
    AND commissioner_id = auth.uid()
  );

-- Commissioners can update their own announcements
CREATE POLICY "Commissioners can update announcements"
  ON league_announcements FOR UPDATE
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
    )
  );

-- Commissioners can delete announcements in their leagues
CREATE POLICY "Commissioners can delete announcements"
  ON league_announcements FOR DELETE
  TO authenticated
  USING (
    league_id IN (
      SELECT league_id FROM league_members WHERE user_id = auth.uid() AND role IN ('commissioner', 'co_commissioner')
    )
  );

COMMENT ON TABLE league_announcements IS 'Commissioner announcements displayed on league home page.';
