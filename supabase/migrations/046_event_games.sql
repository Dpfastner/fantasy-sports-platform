-- ============================================
-- 046: Event Games Schema
-- Supports bracket predictions, pick'em, and survivor leagues
-- for Frozen Four, Masters, Six Nations, and future events.
-- ============================================

-- ============================================
-- 1. EVENT TOURNAMENTS
-- The top-level competition (e.g., "NCAA Frozen Four 2026")
-- ============================================

CREATE TABLE event_tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT NOT NULL,                -- 'hockey', 'golf', 'rugby', 'football', etc.
    name TEXT NOT NULL,                 -- 'NCAA Frozen Four 2026'
    slug TEXT NOT NULL UNIQUE,          -- 'frozen-four-2026' (URL-safe)
    format TEXT NOT NULL CHECK (format IN ('bracket', 'pickem', 'survivor')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    bracket_size INT,                   -- 4, 8, 16 for brackets; NULL otherwise
    total_weeks INT,                    -- for survivor (e.g., 5 for Six Nations)
    description TEXT,
    rules_text TEXT,                    -- markdown rules displayed to users
    image_url TEXT,                     -- banner/hero image
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',          -- format-specific config (e.g., {"allow_draws": false})
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_tournaments_status ON event_tournaments(status);
CREATE INDEX idx_event_tournaments_sport ON event_tournaments(sport);

COMMENT ON TABLE event_tournaments IS 'Top-level event competitions (Frozen Four, Masters, Six Nations, etc.)';
COMMENT ON COLUMN event_tournaments.config IS 'Format-specific settings: bracket={}, pickem={confidence_points:bool}, survivor={strikes:1, allow_draws:false}';

-- ============================================
-- 2. EVENT PARTICIPANTS
-- Teams, golfers, or nations competing in the tournament
-- ============================================

CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES event_tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,                    -- abbreviation (e.g., 'ENG', 'BOS')
    seed INT,                           -- bracket seeding (1-16), NULL for non-bracket
    logo_url TEXT,
    external_id TEXT,                   -- ESPN team/athlete ID for score syncing
    metadata JSONB DEFAULT '{}',        -- sport-specific (record, ranking, country, etc.)
    sort_order INT DEFAULT 0,           -- display ordering
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tournament_id, name)
);

CREATE INDEX idx_event_participants_tournament ON event_participants(tournament_id);
CREATE INDEX idx_event_participants_external ON event_participants(external_id) WHERE external_id IS NOT NULL;

COMMENT ON TABLE event_participants IS 'Teams/golfers/nations competing in an event tournament';

-- ============================================
-- 3. EVENT GAMES
-- Individual matchups within a tournament
-- For brackets: each bracket slot (QF1, QF2, SF1, etc.)
-- For pick'em: each matchup users predict
-- For survivor: each match in a given week
-- ============================================

CREATE TABLE event_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES event_tournaments(id) ON DELETE CASCADE,
    game_number INT NOT NULL,           -- position in bracket or sequential order
    round TEXT,                         -- 'round_1', 'quarterfinal', 'semifinal', 'championship', 'third_place', etc.
    week_number INT,                    -- for survivor: which week (1-5 for Six Nations)
    participant_1_id UUID REFERENCES event_participants(id) ON DELETE SET NULL,
    participant_2_id UUID REFERENCES event_participants(id) ON DELETE SET NULL,
    participant_1_score INT,
    participant_2_score INT,
    winner_id UUID REFERENCES event_participants(id) ON DELETE SET NULL,
    is_draw BOOLEAN DEFAULT false,      -- rugby/soccer draws
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled', 'postponed')),
    starts_at TIMESTAMPTZ,
    external_id TEXT,                   -- ESPN event ID
    metadata JSONB DEFAULT '{}',        -- overtime, venue, broadcast, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tournament_id, game_number)
);

CREATE INDEX idx_event_games_tournament ON event_games(tournament_id, game_number);
CREATE INDEX idx_event_games_week ON event_games(tournament_id, week_number) WHERE week_number IS NOT NULL;
CREATE INDEX idx_event_games_status ON event_games(status);
CREATE INDEX idx_event_games_external ON event_games(external_id) WHERE external_id IS NOT NULL;

COMMENT ON TABLE event_games IS 'Individual matchups within a tournament (bracket slots, pick''em matchups, survivor week matches)';
COMMENT ON COLUMN event_games.game_number IS 'Bracket: slot position (1-15 for 16-team). Pick''em: matchup order. Survivor: match order within week.';

-- ============================================
-- 4. EVENT POOLS
-- A group of users competing (like a league for events)
-- ============================================

CREATE TABLE event_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES event_tournaments(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,   -- optional link to existing Rivyls league
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    invite_code TEXT UNIQUE,
    scoring_rules JSONB NOT NULL DEFAULT '{}',   -- format-specific scoring config
    tiebreaker TEXT NOT NULL DEFAULT 'none' CHECK (tiebreaker IN (
        'none',
        'championship_score',    -- predict total championship score
        'first_match_score',     -- predict first match score (survivor)
        'most_upsets',           -- most upset picks correct
        'random'                 -- random draw
    )),
    deadline TIMESTAMPTZ,               -- global pick lock time (bracket); per-week deadlines in event_pool_weeks
    max_entries INT,                     -- optional cap on entries per pool
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'scoring', 'completed')),
    linked_pool_id UUID REFERENCES event_pools(id) ON DELETE SET NULL,  -- for combined leaderboards
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_pools_tournament ON event_pools(tournament_id);
CREATE INDEX idx_event_pools_created_by ON event_pools(created_by);
CREATE INDEX idx_event_pools_invite ON event_pools(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX idx_event_pools_league ON event_pools(league_id) WHERE league_id IS NOT NULL;

COMMENT ON TABLE event_pools IS 'Groups of users competing in an event tournament (like leagues for events)';
COMMENT ON COLUMN event_pools.scoring_rules IS 'Bracket: {"round_1":1,"quarterfinal":2,"semifinal":4,"championship":8}. Pick''em: {"correct_pick":1,"upset_bonus":2}. Survivor: {"strikes_allowed":1}';

-- ============================================
-- 5. EVENT POOL WEEKS (Survivor-specific)
-- Per-week deadlines and resolution state for survivor
-- ============================================

CREATE TABLE event_pool_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES event_pools(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,       -- pick lock time for this week
    resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN (
        'pending',       -- matches haven't started
        'in_progress',   -- some matches live/completed, not all
        'resolved'       -- ALL matches completed, eliminations processed
    )),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(pool_id, week_number)
);

CREATE INDEX idx_event_pool_weeks_pool ON event_pool_weeks(pool_id, week_number);

COMMENT ON TABLE event_pool_weeks IS 'Per-week state for survivor pools. Enforces week-level resolution (all matches must finish before eliminations).';

-- ============================================
-- 6. EVENT ENTRIES
-- A user's participation in a pool
-- ============================================

CREATE TABLE event_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES event_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    display_name TEXT,                   -- optional custom name for this entry
    total_points NUMERIC NOT NULL DEFAULT 0,
    -- Survivor-specific
    is_active BOOLEAN NOT NULL DEFAULT true,
    eliminated_week INT,
    elimination_reason TEXT CHECK (elimination_reason IS NULL OR elimination_reason IN (
        'loss', 'draw', 'missed_deadline', 'manual'
    )),
    strikes_used INT NOT NULL DEFAULT 0,
    -- Tiebreaker
    tiebreaker_prediction JSONB,         -- {"team1_score": 3, "team2_score": 1} or {"total_score": 47}
    tiebreaker_difference NUMERIC,       -- calculated after event ends
    -- Timestamps
    submitted_at TIMESTAMPTZ,            -- when bracket was locked / entry confirmed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(pool_id, user_id)             -- one entry per user per pool (multi-entry via separate pools)
);

CREATE INDEX idx_event_entries_pool ON event_entries(pool_id, total_points DESC);
CREATE INDEX idx_event_entries_user ON event_entries(user_id);
CREATE INDEX idx_event_entries_active ON event_entries(pool_id, is_active) WHERE is_active = true;

COMMENT ON TABLE event_entries IS 'A user''s participation in an event pool. Tracks points, elimination status, and tiebreaker.';

-- ============================================
-- 7. EVENT PICKS
-- Individual predictions (bracket picks, matchup picks, survivor picks)
-- ============================================

CREATE TABLE event_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES event_entries(id) ON DELETE CASCADE,
    game_id UUID REFERENCES event_games(id) ON DELETE CASCADE,       -- bracket/pick'em: which game
    week_number INT,                                                  -- survivor: which week
    participant_id UUID NOT NULL REFERENCES event_participants(id),   -- who they picked
    is_correct BOOLEAN,                 -- NULL until resolved, true/false after
    points_earned NUMERIC NOT NULL DEFAULT 0,
    missed_deadline BOOLEAN NOT NULL DEFAULT false,
    picked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,            -- when this pick was scored
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bracket/pick'em: one pick per game per entry
CREATE UNIQUE INDEX idx_event_picks_entry_game
    ON event_picks(entry_id, game_id)
    WHERE game_id IS NOT NULL;

-- Survivor: one pick per week per entry
CREATE UNIQUE INDEX idx_event_picks_entry_week
    ON event_picks(entry_id, week_number)
    WHERE week_number IS NOT NULL;

-- Survivor: prevent team reuse across weeks within an entry
CREATE UNIQUE INDEX idx_event_picks_no_team_reuse
    ON event_picks(entry_id, participant_id)
    WHERE week_number IS NOT NULL AND missed_deadline = false;

CREATE INDEX idx_event_picks_entry ON event_picks(entry_id);
CREATE INDEX idx_event_picks_game ON event_picks(game_id) WHERE game_id IS NOT NULL;
CREATE INDEX idx_event_picks_participant ON event_picks(participant_id);

COMMENT ON TABLE event_picks IS 'Individual predictions. Bracket: one per game slot. Pick''em: one per matchup. Survivor: one per week.';
COMMENT ON COLUMN event_picks.is_correct IS 'NULL = unresolved. true = correct pick / survived. false = wrong pick / eliminated.';

-- ============================================
-- 8. EVENT ACTIVITY LOG
-- Audit trail for all event actions
-- ============================================

CREATE TABLE event_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID REFERENCES event_pools(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES event_tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,                -- 'pick.submitted', 'pick.updated', 'entry.eliminated', 'game.completed', 'pool.created', etc.
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_activity_pool ON event_activity_log(pool_id, created_at DESC) WHERE pool_id IS NOT NULL;
CREATE INDEX idx_event_activity_tournament ON event_activity_log(tournament_id, created_at DESC);

COMMENT ON TABLE event_activity_log IS 'Audit trail for event game actions (picks, eliminations, score updates, admin overrides)';

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE event_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pool_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: get pool IDs user is a member of (via entries)
CREATE OR REPLACE FUNCTION public.get_user_event_pool_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT pool_id FROM public.event_entries WHERE user_id = auth.uid();
$$;

-- Tournaments: public read
CREATE POLICY "Anyone can view tournaments"
    ON event_tournaments FOR SELECT USING (true);

-- Participants: public read
CREATE POLICY "Anyone can view participants"
    ON event_participants FOR SELECT USING (true);

-- Games: public read (scores are public info)
CREATE POLICY "Anyone can view games"
    ON event_games FOR SELECT USING (true);

-- Pools: public pools visible to all, private pools visible to members + creator
CREATE POLICY "View pools"
    ON event_pools FOR SELECT
    USING (
        visibility = 'public'
        OR created_by = auth.uid()
        OR id IN (SELECT public.get_user_event_pool_ids())
    );

-- Pools: authenticated users can create
CREATE POLICY "Authenticated users can create pools"
    ON event_pools FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Pools: creator can update
CREATE POLICY "Pool creator can update"
    ON event_pools FOR UPDATE
    USING (created_by = auth.uid());

-- Pool weeks: visible to pool members
CREATE POLICY "Pool members view weeks"
    ON event_pool_weeks FOR SELECT
    USING (
        pool_id IN (SELECT public.get_user_event_pool_ids())
        OR EXISTS (
            SELECT 1 FROM event_pools
            WHERE event_pools.id = event_pool_weeks.pool_id
            AND (event_pools.visibility = 'public' OR event_pools.created_by = auth.uid())
        )
    );

-- Entries: users can view entries in their pools, public pool entries visible to all
CREATE POLICY "View entries"
    ON event_entries FOR SELECT
    USING (
        user_id = auth.uid()
        OR pool_id IN (SELECT public.get_user_event_pool_ids())
        OR EXISTS (
            SELECT 1 FROM event_pools
            WHERE event_pools.id = event_entries.pool_id
            AND event_pools.visibility = 'public'
        )
    );

-- Entries: authenticated users can join pools
CREATE POLICY "Users can create entries"
    ON event_entries FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Entries: users can update own entries (tiebreaker, display_name)
CREATE POLICY "Users can update own entries"
    ON event_entries FOR UPDATE
    USING (user_id = auth.uid());

-- Picks: pool members can view all picks (after deadline), own picks anytime
CREATE POLICY "View picks"
    ON event_picks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM event_entries
            WHERE event_entries.id = event_picks.entry_id
            AND (
                event_entries.user_id = auth.uid()
                OR event_entries.pool_id IN (SELECT public.get_user_event_pool_ids())
            )
        )
    );

-- Picks: users can create picks for their own entries
CREATE POLICY "Users can create picks"
    ON event_picks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_entries
            WHERE event_entries.id = event_picks.entry_id
            AND event_entries.user_id = auth.uid()
        )
    );

-- Picks: users can update own picks (before deadline — enforced server-side)
CREATE POLICY "Users can update own picks"
    ON event_picks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM event_entries
            WHERE event_entries.id = event_picks.entry_id
            AND event_entries.user_id = auth.uid()
        )
    );

-- Picks: users can delete own picks (before deadline — enforced server-side)
CREATE POLICY "Users can delete own picks"
    ON event_picks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM event_entries
            WHERE event_entries.id = event_picks.entry_id
            AND event_entries.user_id = auth.uid()
        )
    );

-- Activity log: pool members can view, server inserts
CREATE POLICY "Pool members view event activity"
    ON event_activity_log FOR SELECT
    USING (
        tournament_id IS NOT NULL
        OR pool_id IN (SELECT public.get_user_event_pool_ids())
    );

-- ============================================
-- 10. INVITE CODE GENERATION HELPER
-- ============================================

CREATE OR REPLACE FUNCTION generate_event_invite_code()
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;

COMMENT ON FUNCTION generate_event_invite_code IS 'Generates an 8-character uppercase alphanumeric invite code for event pools';
