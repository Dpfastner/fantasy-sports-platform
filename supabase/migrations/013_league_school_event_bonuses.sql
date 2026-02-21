-- ============================================
-- LEAGUE SCHOOL EVENT BONUSES TABLE
-- Stores special event bonuses per league (since each league has different bonus values)
-- ============================================

CREATE TABLE league_school_event_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    bonus_type TEXT NOT NULL CHECK (bonus_type IN (
        'bowl_appearance',
        'cfp_first_round',
        'cfp_quarterfinal',
        'cfp_semifinal',
        'championship_win',
        'championship_loss',
        'conf_championship_win',
        'conf_championship_loss',
        'heisman'
    )),
    points NUMERIC(5,2) NOT NULL DEFAULT 0,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Unique constraint: one bonus of each type per league/school/week
    UNIQUE(league_id, school_id, season_id, week_number, bonus_type)
);

-- Index for efficient queries
CREATE INDEX idx_league_school_event_bonuses_league_season
    ON league_school_event_bonuses(league_id, season_id);
CREATE INDEX idx_league_school_event_bonuses_school_week
    ON league_school_event_bonuses(school_id, week_number);

-- Enable RLS
ALTER TABLE league_school_event_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS policies: Allow read for anyone, write only for authenticated users with league membership
CREATE POLICY "Anyone can view event bonuses"
    ON league_school_event_bonuses FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert event bonuses"
    ON league_school_event_bonuses FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update event bonuses"
    ON league_school_event_bonuses FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete event bonuses"
    ON league_school_event_bonuses FOR DELETE
    USING (auth.uid() IS NOT NULL);
