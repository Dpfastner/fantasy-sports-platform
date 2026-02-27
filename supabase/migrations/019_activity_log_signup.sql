-- ============================================
-- 019: Add user.signup event to activity_log via trigger
--
-- Extends the handle_new_user() trigger to insert a
-- 'user.signup' row into activity_log whenever a new
-- user is created via auth.users.
-- ============================================

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

    -- 3. Log signup event to activity_log
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
