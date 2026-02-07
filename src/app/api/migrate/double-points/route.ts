import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Add double points columns to league_settings
    const { error: settingsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE league_settings
        ADD COLUMN IF NOT EXISTS double_points_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS max_double_picks_per_season INTEGER DEFAULT 0;
      `
    })

    // If RPC doesn't exist, try direct update via update/insert on a test row
    // Actually let's just check if columns exist and add defaults
    const { data: checkSettings, error: checkError } = await supabaseAdmin
      .from('league_settings')
      .select('double_points_enabled')
      .limit(1)

    if (checkError && checkError.message.includes('does not exist')) {
      // Column doesn't exist - we need to add it via Supabase dashboard
      return NextResponse.json({
        success: false,
        message: 'Please add columns via Supabase dashboard SQL editor',
        sql: `
ALTER TABLE league_settings
ADD COLUMN IF NOT EXISTS double_points_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_double_picks_per_season INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS weekly_double_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id),
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_earned DECIMAL(10,2) DEFAULT 0,
  bonus_points DECIMAL(10,2) DEFAULT 0,
  UNIQUE(team_id, week_number)
);

ALTER TABLE weekly_double_picks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_team ON weekly_double_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_week ON weekly_double_picks(week_number);
        `
      })
    }

    // Check if weekly_double_picks table exists
    const { data: checkPicks, error: picksError } = await supabaseAdmin
      .from('weekly_double_picks')
      .select('id')
      .limit(1)

    if (picksError && picksError.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        message: 'weekly_double_picks table needs to be created via Supabase dashboard',
        sql: `
CREATE TABLE IF NOT EXISTS weekly_double_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  school_id UUID NOT NULL REFERENCES schools(id),
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_earned DECIMAL(10,2) DEFAULT 0,
  bonus_points DECIMAL(10,2) DEFAULT 0,
  UNIQUE(team_id, week_number)
);

ALTER TABLE weekly_double_picks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_team ON weekly_double_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_double_picks_week ON weekly_double_picks(week_number);

-- RLS policies
CREATE POLICY "Users can view double picks in their leagues" ON weekly_double_picks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN league_members lm ON t.league_id = lm.league_id
      WHERE t.id = weekly_double_picks.team_id
      AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can insert their double picks" ON weekly_double_picks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = weekly_double_picks.team_id
      AND (t.owner_id = auth.uid() OR t.second_owner_id = auth.uid())
    )
  );

CREATE POLICY "Team owners can update their double picks" ON weekly_double_picks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = weekly_double_picks.team_id
      AND (t.owner_id = auth.uid() OR t.second_owner_id = auth.uid())
    )
  );
        `
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Double points tables and columns exist',
      settingsColumnsExist: !checkError,
      picksTableExists: !picksError
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    )
  }
}
