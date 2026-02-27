-- ============================================
-- 021: Flexible Badge System
--
-- Replaces the is_founding_commissioner boolean with a general-purpose
-- badge system. Users can earn multiple badges (founding commissioner,
-- season champion, contest winner, etc.) stored in user_badges.
--
-- Also adds season_champions table for permanent winner records
-- with pre-signup backfill support.
-- ============================================

-- ============================================
-- 1. Badge Definitions (catalog of badge types)
-- ============================================
CREATE TABLE badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    fallback_icon TEXT NOT NULL DEFAULT 'star',
    color TEXT NOT NULL DEFAULT '#F5A623',
    bg_color TEXT NOT NULL DEFAULT 'rgba(245,166,35,0.2)',
    sort_order INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_metadata BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badge definitions"
    ON badge_definitions FOR SELECT USING (true);

-- ============================================
-- 2. User Badges (instances earned by users)
-- ============================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_definition_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Non-metadata badges (e.g. founding_commissioner) can only be granted once per user
CREATE UNIQUE INDEX idx_user_badges_unique_non_meta
    ON user_badges (user_id, badge_definition_id)
    WHERE revoked_at IS NULL AND metadata = '{}';

CREATE INDEX idx_user_badges_user ON user_badges(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_badges_definition ON user_badges(badge_definition_id);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active badges"
    ON user_badges FOR SELECT USING (revoked_at IS NULL);

-- ============================================
-- 3. Season Champions (permanent winner records)
-- ============================================
CREATE TABLE season_champions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    email TEXT,
    fantasy_team_id UUID REFERENCES fantasy_teams(id) ON DELETE SET NULL,
    team_name TEXT NOT NULL,
    total_points NUMERIC NOT NULL,
    final_rank INT NOT NULL DEFAULT 1,
    sport TEXT NOT NULL,
    year INT NOT NULL,
    league_name TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(league_id, season_id, final_rank)
);

CREATE INDEX idx_season_champions_user ON season_champions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_season_champions_email ON season_champions(email) WHERE user_id IS NULL AND email IS NOT NULL;
CREATE INDEX idx_season_champions_season ON season_champions(season_id);

ALTER TABLE season_champions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view season champions"
    ON season_champions FOR SELECT USING (true);

-- ============================================
-- 4. Seed initial badge definitions
-- ============================================
INSERT INTO badge_definitions (slug, category, label, description, fallback_icon, color, bg_color, sort_order, requires_metadata) VALUES
('founding_commissioner', 'distinction', 'Founding Commissioner', 'Original Rivyls commissioner from Year 1', 'star', '#F5A623', 'rgba(245,166,35,0.2)', 10, false),
('season_champion', 'achievement', 'Season Champion', 'Won a league championship', 'trophy', '#F5A623', 'rgba(245,166,35,0.2)', 20, true),
('contest_winner', 'contest', 'Contest Winner', 'Won a Rivyls community contest', 'medal', '#C0C0C0', 'rgba(192,192,192,0.2)', 50, false);

-- ============================================
-- 5. Migrate existing founding commissioners to user_badges
-- ============================================
-- Note: The is_founding_commissioner boolean column was never applied to the database.
-- Instead, check if any users have tier='founding_commissioner' from the original design.
INSERT INTO user_badges (user_id, badge_definition_id, source, granted_at)
SELECT p.id, bd.id, 'migration', now()
FROM profiles p
CROSS JOIN badge_definitions bd
WHERE p.tier = 'founding_commissioner'
AND bd.slug = 'founding_commissioner';

-- Reset those users to 'free' tier
UPDATE profiles SET tier = 'free' WHERE tier = 'founding_commissioner';

-- ============================================
-- 6. Clean up tier constraint (ensure free/pro only)
-- ============================================
ALTER TABLE profiles DROP COLUMN IF EXISTS is_founding_commissioner;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tier_check CHECK (tier IN ('free', 'pro'));

-- ============================================
-- 7. Update handle_new_user() trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _waitlist_row RECORD;
    _referrer_code TEXT;
    _referrer_id UUID;
    _fc_badge_id UUID;
    _sc_badge_id UUID;
    _champion RECORD;
BEGIN
    -- 1. Create the profile
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );

    -- 2. Check if this email was on the waitlist
    SELECT * INTO _waitlist_row
    FROM public.waitlist
    WHERE email = lower(NEW.email)
    AND converted_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        -- Mark waitlist entry as converted
        UPDATE public.waitlist
        SET converted_at = now(),
            converted_user_id = NEW.id
        WHERE id = _waitlist_row.id;

        -- If they signed up as a commissioner, grant founding badge
        IF _waitlist_row.source = 'commissioner' THEN
            SELECT id INTO _fc_badge_id
            FROM public.badge_definitions
            WHERE slug = 'founding_commissioner';

            IF _fc_badge_id IS NOT NULL THEN
                INSERT INTO public.user_badges (user_id, badge_definition_id, source)
                VALUES (NEW.id, _fc_badge_id, 'auto_signup_backfill');
            END IF;
        END IF;

        -- If they were referred, link to referrer's profile
        IF _waitlist_row.source LIKE 'referral:%' THEN
            _referrer_code := substring(_waitlist_row.source FROM 'referral:(.+)');

            SELECT converted_user_id INTO _referrer_id
            FROM public.waitlist
            WHERE referral_code = _referrer_code
            AND converted_user_id IS NOT NULL
            LIMIT 1;

            IF _referrer_id IS NOT NULL THEN
                UPDATE public.profiles
                SET referred_by = _referrer_id
                WHERE id = NEW.id;
            END IF;
        END IF;
    END IF;

    -- 3. Backfill season champion badges
    BEGIN
        SELECT id INTO _sc_badge_id
        FROM public.badge_definitions
        WHERE slug = 'season_champion';

        IF _sc_badge_id IS NOT NULL THEN
            FOR _champion IN
                SELECT * FROM public.season_champions
                WHERE email = lower(NEW.email) AND user_id IS NULL
            LOOP
                -- Link the champion record to this user
                UPDATE public.season_champions SET user_id = NEW.id WHERE id = _champion.id;
                -- Grant the badge
                INSERT INTO public.user_badges (user_id, badge_definition_id, metadata, source)
                VALUES (
                    NEW.id,
                    _sc_badge_id,
                    jsonb_build_object(
                        'sport', _champion.sport,
                        'year', _champion.year,
                        'league_name', _champion.league_name,
                        'league_id', _champion.league_id::text
                    ),
                    'auto_signup_backfill'
                );
            END LOOP;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Don't let badge backfill failures prevent signup
        RAISE WARNING 'Badge backfill failed for %: %', NEW.email, SQLERRM;
    END;

    -- 4. Log signup event to activity_log
    INSERT INTO public.activity_log (user_id, action, details)
    VALUES (
        NEW.id,
        'user.signup',
        jsonb_build_object(
            'email', NEW.email,
            'from_waitlist', FOUND
        )
    );

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;
