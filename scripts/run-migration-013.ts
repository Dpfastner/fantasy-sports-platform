import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function runMigration() {
  console.log('=== Running Migration 013: league_school_event_bonuses ===\n')

  // Check if table already exists
  const { data: existingTable, error: checkError } = await supabase
    .from('league_school_event_bonuses')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('Table already exists, skipping migration.')
    return true
  }

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log('Table exists but had an error:', checkError.message)
    return true
  }

  console.log('Creating league_school_event_bonuses table...')

  // Run the migration SQL using RPC (raw SQL execution)
  // Note: This requires the SQL to be run via Supabase Dashboard or CLI
  // For now, we'll provide instructions
  console.log('\n*** IMPORTANT ***')
  console.log('Please run the following SQL in your Supabase Dashboard SQL Editor:')
  console.log('Go to: https://supabase.com/dashboard/project/lpmbhutdaxmfjxacbusq/sql')
  console.log('\n--- SQL to run ---\n')

  const sql = `
-- ============================================
-- LEAGUE SCHOOL EVENT BONUSES TABLE
-- Stores special event bonuses per league (since each league has different bonus values)
-- ============================================

CREATE TABLE IF NOT EXISTS league_school_event_bonuses (
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
CREATE INDEX IF NOT EXISTS idx_league_school_event_bonuses_league_season
    ON league_school_event_bonuses(league_id, season_id);
CREATE INDEX IF NOT EXISTS idx_league_school_event_bonuses_school_week
    ON league_school_event_bonuses(school_id, week_number);

-- Enable RLS
ALTER TABLE league_school_event_bonuses ENABLE ROW LEVEL SECURITY;

-- RLS policies: Allow read for anyone, write only for authenticated users
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
`

  console.log(sql)
  console.log('\n--- End SQL ---\n')

  return false
}

runMigration().then(exists => {
  if (exists) {
    console.log('\nTable ready. You can now run: npx ts-node scripts/populate-event-bonuses.ts')
  } else {
    console.log('\nAfter running the SQL above, run: npx ts-node scripts/populate-event-bonuses.ts')
  }
})
