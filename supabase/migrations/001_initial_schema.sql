-- Fantasy Sports Platform - Initial Schema
-- This migration creates all tables needed for the multi-sport fantasy platform

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE sport_type AS ENUM ('college_football', 'hockey', 'baseball', 'basketball', 'cricket');
CREATE TYPE draft_type AS ENUM ('snake', 'linear');
CREATE TYPE draft_status AS ENUM ('not_started', 'in_progress', 'paused', 'completed');
CREATE TYPE game_status AS ENUM ('scheduled', 'live', 'completed', 'postponed', 'cancelled');
CREATE TYPE league_role AS ENUM ('commissioner', 'member');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- ============================================
-- GLOBAL TABLES
-- ============================================

-- Sports supported by the platform
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug sport_type NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    api_provider TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seasons (2024, 2025, etc.)
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(sport_id, year)
);

-- Teams/Schools master list
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    abbreviation TEXT,
    primary_color TEXT NOT NULL DEFAULT '#000000',
    secondary_color TEXT NOT NULL DEFAULT '#FFFFFF',
    conference TEXT NOT NULL,
    division TEXT,
    external_api_id TEXT,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(sport_id, name)
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'user',
    favorite_school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- LEAGUE TABLES
-- ============================================

-- Leagues
CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    is_public BOOLEAN NOT NULL DEFAULT false,
    max_teams INTEGER NOT NULL DEFAULT 12,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- League settings
CREATE TABLE league_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL UNIQUE REFERENCES leagues(id) ON DELETE CASCADE,
    -- Draft settings
    draft_date TIMESTAMPTZ,
    draft_type draft_type NOT NULL DEFAULT 'snake',
    draft_timer_seconds INTEGER NOT NULL DEFAULT 60,
    schools_per_team INTEGER NOT NULL DEFAULT 12,
    max_school_selections_per_team INTEGER NOT NULL DEFAULT 1,
    max_school_selections_total INTEGER NOT NULL DEFAULT 3,
    -- Transaction settings
    max_add_drops_per_season INTEGER NOT NULL DEFAULT 50,
    add_drop_deadline DATE,
    -- Scoring - Wins
    points_win NUMERIC(5,2) NOT NULL DEFAULT 1,
    points_conference_game NUMERIC(5,2) NOT NULL DEFAULT 1,
    points_over_50 NUMERIC(5,2) NOT NULL DEFAULT 1,
    points_shutout NUMERIC(5,2) NOT NULL DEFAULT 1,
    points_ranked_25 NUMERIC(5,2) NOT NULL DEFAULT 1,
    points_ranked_10 NUMERIC(5,2) NOT NULL DEFAULT 2,
    -- Scoring - Losses
    points_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_conference_game_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_over_50_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_shutout_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_ranked_25_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_ranked_10_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    -- Scoring - Special events
    points_conference_championship_win NUMERIC(5,2) NOT NULL DEFAULT 10,
    points_conference_championship_loss NUMERIC(5,2) NOT NULL DEFAULT 0,
    points_heisman_winner NUMERIC(5,2) NOT NULL DEFAULT 10,
    points_bowl_appearance NUMERIC(5,2) NOT NULL DEFAULT 5,
    points_playoff_first_round NUMERIC(5,2) NOT NULL DEFAULT 5,
    points_playoff_quarterfinal NUMERIC(5,2) NOT NULL DEFAULT 5,
    points_playoff_semifinal NUMERIC(5,2) NOT NULL DEFAULT 5,
    points_championship_win NUMERIC(5,2) NOT NULL DEFAULT 20,
    points_championship_loss NUMERIC(5,2) NOT NULL DEFAULT 5,
    -- Prize settings
    entry_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    prize_pool NUMERIC(10,2) NOT NULL DEFAULT 0,
    high_points_enabled BOOLEAN NOT NULL DEFAULT true,
    high_points_weekly_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    high_points_weeks INTEGER NOT NULL DEFAULT 15,
    high_points_allow_ties BOOLEAN NOT NULL DEFAULT true,
    num_winners INTEGER NOT NULL DEFAULT 3,
    winner_percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
    runner_up_percentage NUMERIC(5,2) NOT NULL DEFAULT 30,
    third_place_percentage NUMERIC(5,2) NOT NULL DEFAULT 20,
    -- Locks
    settings_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- League members
CREATE TABLE league_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role league_role NOT NULL DEFAULT 'member',
    has_paid BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(league_id, user_id)
);

-- ============================================
-- FANTASY TEAM TABLES
-- ============================================

-- Fantasy teams
CREATE TABLE fantasy_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    primary_color TEXT NOT NULL DEFAULT '#1a1a1a',
    secondary_color TEXT NOT NULL DEFAULT '#ffffff',
    image_url TEXT,
    draft_position INTEGER,
    total_points NUMERIC(10,2) NOT NULL DEFAULT 0,
    high_points_winnings NUMERIC(10,2) NOT NULL DEFAULT 0,
    add_drops_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(league_id, user_id)
);

-- Roster periods
CREATE TABLE roster_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    start_week INTEGER NOT NULL,
    end_week INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    dropped_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    added_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly double points picks (future feature)
CREATE TABLE weekly_double_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(fantasy_team_id, week_number)
);

-- ============================================
-- DRAFT TABLES
-- ============================================

-- Draft state
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL UNIQUE REFERENCES leagues(id) ON DELETE CASCADE,
    status draft_status NOT NULL DEFAULT 'not_started',
    current_round INTEGER NOT NULL DEFAULT 1,
    current_pick INTEGER NOT NULL DEFAULT 1,
    current_team_id UUID REFERENCES fantasy_teams(id) ON DELETE SET NULL,
    pick_deadline TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Draft order
CREATE TABLE draft_order (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    position_in_round INTEGER NOT NULL,
    UNIQUE(draft_id, pick_number)
);

-- Draft picks
CREATE TABLE draft_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    picked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(draft_id, pick_number)
);

-- ============================================
-- GAME DATA TABLES
-- ============================================

-- Games
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    external_game_id TEXT,
    week_number INTEGER NOT NULL,
    week_name TEXT,
    game_date DATE NOT NULL,
    game_time TIME,
    bowl_name TEXT,
    home_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    away_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    home_score INTEGER,
    away_score INTEGER,
    home_rank INTEGER,
    away_rank INTEGER,
    status game_status NOT NULL DEFAULT 'scheduled',
    is_conference_game BOOLEAN NOT NULL DEFAULT false,
    is_bowl_game BOOLEAN NOT NULL DEFAULT false,
    is_playoff_game BOOLEAN NOT NULL DEFAULT false,
    playoff_round TEXT,
    quarter TEXT,
    clock TEXT,
    possession_team_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(season_id, external_game_id)
);

-- ============================================
-- POINTS TABLES
-- ============================================

-- School weekly points
CREATE TABLE school_weekly_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    base_points NUMERIC(5,2) NOT NULL DEFAULT 0,
    conference_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
    over_50_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
    shutout_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
    ranked_25_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
    ranked_10_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_points NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(school_id, season_id, week_number)
);

-- School season bonuses
CREATE TABLE school_season_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    bonus_type TEXT NOT NULL,
    points NUMERIC(5,2) NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(school_id, season_id, bonus_type)
);

-- Fantasy team weekly points
CREATE TABLE fantasy_team_weekly_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fantasy_team_id UUID NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    points NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_high_points_winner BOOLEAN NOT NULL DEFAULT false,
    high_points_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(fantasy_team_id, week_number)
);

-- ============================================
-- RANKINGS & HISTORY TABLES
-- ============================================

-- AP Rankings history
CREATE TABLE ap_rankings_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(season_id, week_number, school_id)
);

-- Playoff teams
CREATE TABLE playoff_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    seed INTEGER NOT NULL,
    eliminated_round TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(season_id, school_id)
);

-- Heisman winners
CREATE TABLE heisman_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(season_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Performance indexes
CREATE INDEX idx_schools_sport ON schools(sport_id);
CREATE INDEX idx_schools_conference ON schools(conference);
CREATE INDEX idx_seasons_sport ON seasons(sport_id);
CREATE INDEX idx_seasons_current ON seasons(is_current) WHERE is_current = true;
CREATE INDEX idx_leagues_sport ON leagues(sport_id);
CREATE INDEX idx_leagues_season ON leagues(season_id);
CREATE INDEX idx_leagues_invite_code ON leagues(invite_code);
CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_fantasy_teams_league ON fantasy_teams(league_id);
CREATE INDEX idx_fantasy_teams_user ON fantasy_teams(user_id);
CREATE INDEX idx_roster_periods_team ON roster_periods(fantasy_team_id);
CREATE INDEX idx_roster_periods_school ON roster_periods(school_id);
CREATE INDEX idx_transactions_team ON transactions(fantasy_team_id);
CREATE INDEX idx_draft_picks_draft ON draft_picks(draft_id);
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_week ON games(season_id, week_number);
CREATE INDEX idx_school_weekly_points_school ON school_weekly_points(school_id);
CREATE INDEX idx_school_weekly_points_season_week ON school_weekly_points(season_id, week_number);
CREATE INDEX idx_fantasy_team_weekly_points_team ON fantasy_team_weekly_points(fantasy_team_id);
CREATE INDEX idx_ap_rankings_season_week ON ap_rankings_history(season_id, week_number);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_double_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_weekly_points ENABLE ROW LEVEL SECURITY;

-- Public read access for reference tables
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_weekly_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_season_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_rankings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE heisman_winners ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sports, Seasons, Schools: Public read access
CREATE POLICY "Sports are viewable by everyone" ON sports FOR SELECT USING (true);
CREATE POLICY "Seasons are viewable by everyone" ON seasons FOR SELECT USING (true);
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);

-- Games and points: Public read access
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "School weekly points viewable by everyone" ON school_weekly_points FOR SELECT USING (true);
CREATE POLICY "School season bonuses viewable by everyone" ON school_season_bonuses FOR SELECT USING (true);
CREATE POLICY "AP rankings viewable by everyone" ON ap_rankings_history FOR SELECT USING (true);
CREATE POLICY "Playoff teams viewable by everyone" ON playoff_teams FOR SELECT USING (true);
CREATE POLICY "Heisman winners viewable by everyone" ON heisman_winners FOR SELECT USING (true);

-- Leagues: Members can view their leagues, commissioners can update
CREATE POLICY "Leagues viewable by members" ON leagues FOR SELECT
    USING (
        is_public = true
        OR created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM league_members WHERE league_id = leagues.id AND user_id = auth.uid())
    );
CREATE POLICY "Users can create leagues" ON leagues FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Commissioners can update leagues" ON leagues FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM league_members WHERE league_id = leagues.id AND user_id = auth.uid() AND role = 'commissioner')
    );

-- League settings: Same as leagues
CREATE POLICY "League settings viewable by members" ON league_settings FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_settings.league_id AND (
            leagues.is_public = true
            OR leagues.created_by = auth.uid()
            OR EXISTS (SELECT 1 FROM league_members WHERE league_id = leagues.id AND user_id = auth.uid())
        ))
    );
CREATE POLICY "Commissioners can update league settings" ON league_settings FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_settings.league_id AND (
            leagues.created_by = auth.uid()
            OR EXISTS (SELECT 1 FROM league_members WHERE league_id = leagues.id AND user_id = auth.uid() AND role = 'commissioner')
        ))
    );
CREATE POLICY "Commissioners can insert league settings" ON league_settings FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_settings.league_id AND leagues.created_by = auth.uid())
    );

-- League members: Members can view, commissioners can manage
CREATE POLICY "League members viewable by league members" ON league_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM league_members lm WHERE lm.league_id = league_members.league_id AND lm.user_id = auth.uid())
    );
CREATE POLICY "Users can join leagues" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave leagues" ON league_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Commissioners can manage members" ON league_members FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_members.league_id AND (
            leagues.created_by = auth.uid()
            OR EXISTS (SELECT 1 FROM league_members lm WHERE lm.league_id = league_members.league_id AND lm.user_id = auth.uid() AND lm.role = 'commissioner')
        ))
    );

-- Fantasy teams: League members can view, owners can update
CREATE POLICY "Fantasy teams viewable by league members" ON fantasy_teams FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM league_members WHERE league_id = fantasy_teams.league_id AND user_id = auth.uid())
    );
CREATE POLICY "Users can create own fantasy team" ON fantasy_teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fantasy team" ON fantasy_teams FOR UPDATE USING (auth.uid() = user_id);

-- Roster periods, transactions, weekly picks: Same pattern
CREATE POLICY "Roster periods viewable by league members" ON roster_periods FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fantasy_teams ft
            JOIN league_members lm ON lm.league_id = ft.league_id
            WHERE ft.id = roster_periods.fantasy_team_id AND lm.user_id = auth.uid()
        )
    );
CREATE POLICY "Team owners can manage roster" ON roster_periods FOR ALL
    USING (
        EXISTS (SELECT 1 FROM fantasy_teams WHERE id = roster_periods.fantasy_team_id AND user_id = auth.uid())
    );

CREATE POLICY "Transactions viewable by league members" ON transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fantasy_teams ft
            JOIN league_members lm ON lm.league_id = ft.league_id
            WHERE ft.id = transactions.fantasy_team_id AND lm.user_id = auth.uid()
        )
    );
CREATE POLICY "Team owners can create transactions" ON transactions FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM fantasy_teams WHERE id = transactions.fantasy_team_id AND user_id = auth.uid())
    );

CREATE POLICY "Weekly picks viewable by league members" ON weekly_double_picks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fantasy_teams ft
            JOIN league_members lm ON lm.league_id = ft.league_id
            WHERE ft.id = weekly_double_picks.fantasy_team_id AND lm.user_id = auth.uid()
        )
    );
CREATE POLICY "Team owners can manage weekly picks" ON weekly_double_picks FOR ALL
    USING (
        EXISTS (SELECT 1 FROM fantasy_teams WHERE id = weekly_double_picks.fantasy_team_id AND user_id = auth.uid())
    );

-- Draft tables: League members can view, system manages
CREATE POLICY "Drafts viewable by league members" ON drafts FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM league_members WHERE league_id = drafts.league_id AND user_id = auth.uid())
    );

CREATE POLICY "Draft order viewable by league members" ON draft_order FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drafts d
            JOIN league_members lm ON lm.league_id = d.league_id
            WHERE d.id = draft_order.draft_id AND lm.user_id = auth.uid()
        )
    );

CREATE POLICY "Draft picks viewable by league members" ON draft_picks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM drafts d
            JOIN league_members lm ON lm.league_id = d.league_id
            WHERE d.id = draft_picks.draft_id AND lm.user_id = auth.uid()
        )
    );
CREATE POLICY "Team owners can make draft picks" ON draft_picks FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM fantasy_teams WHERE id = draft_picks.fantasy_team_id AND user_id = auth.uid())
    );

-- Fantasy team weekly points: League members can view
CREATE POLICY "Fantasy team weekly points viewable by league members" ON fantasy_team_weekly_points FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fantasy_teams ft
            JOIN league_members lm ON lm.league_id = ft.league_id
            WHERE ft.id = fantasy_team_weekly_points.fantasy_team_id AND lm.user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_league_settings_updated_at BEFORE UPDATE ON league_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fantasy_teams_updated_at BEFORE UPDATE ON fantasy_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_school_weekly_points_updated_at BEFORE UPDATE ON school_weekly_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fantasy_team_weekly_points_updated_at BEFORE UPDATE ON fantasy_team_weekly_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_playoff_teams_updated_at BEFORE UPDATE ON playoff_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to create league settings when league is created
CREATE OR REPLACE FUNCTION handle_new_league()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.league_settings (league_id)
    VALUES (NEW.id);

    INSERT INTO public.league_members (league_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'commissioner');

    INSERT INTO public.drafts (league_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to create league settings on league creation
CREATE TRIGGER on_league_created
    AFTER INSERT ON leagues
    FOR EACH ROW EXECUTE FUNCTION handle_new_league();
