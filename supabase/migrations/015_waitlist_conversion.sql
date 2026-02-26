-- ============================================
-- 015: Waitlist → User conversion tracking
--
-- When a waitlist member signs up:
--   1. Marks their waitlist row as converted
--   2. Sets tier = 'founding_commissioner' if source = 'commissioner'
--   3. Links referrer if they came via a referral link
-- ============================================

-- Add conversion tracking columns to waitlist
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS
    converted_at TIMESTAMPTZ;

ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS
    converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update the signup trigger to check waitlist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _waitlist_row RECORD;
    _referrer_code TEXT;
    _referrer_id UUID;
BEGIN
    -- 1. Create the profile (original behavior)
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

        -- If they signed up as a commissioner, set founding tier
        IF _waitlist_row.source = 'commissioner' THEN
            UPDATE public.profiles
            SET tier = 'founding_commissioner'
            WHERE id = NEW.id;
        END IF;

        -- If they were referred, link to referrer's profile
        IF _waitlist_row.source LIKE 'referral:%' THEN
            _referrer_code := substring(_waitlist_row.source FROM 'referral:(.+)');

            -- Find the referrer by their waitlist referral code → converted user → profile
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

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Index for fast email lookups during signup
CREATE INDEX IF NOT EXISTS idx_waitlist_email_not_converted
    ON waitlist (email)
    WHERE converted_at IS NULL;

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_referral_code
    ON waitlist (referral_code)
    WHERE converted_user_id IS NOT NULL;
