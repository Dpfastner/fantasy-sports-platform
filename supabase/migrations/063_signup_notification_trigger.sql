-- Migration 063: Move signup admin notification into database trigger
-- Previously fired from auth callback (fire-and-forget, could silently fail).
-- Now inserted directly in the handle_new_user() trigger — same transaction,
-- guaranteed delivery.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _waitlist_row RECORD;
    _referrer_code TEXT;
    _referrer_id UUID;
    _display_name TEXT;
    _admin_id UUID;
    _admin_ids UUID[] := ARRAY['5ab25825-1e29-4949-b798-61a8724170d6'::UUID];
BEGIN
    _display_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));

    -- 1. Create the profile (original behavior)
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, _display_name);

    -- 2. Check if this email was on the waitlist
    SELECT * INTO _waitlist_row
    FROM public.waitlist
    WHERE email = lower(NEW.email)
    AND converted_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.waitlist
        SET converted_at = now(), converted_user_id = NEW.id
        WHERE id = _waitlist_row.id;

        IF _waitlist_row.source = 'commissioner' THEN
            UPDATE public.profiles SET tier = 'founding_commissioner' WHERE id = NEW.id;
        END IF;

        IF _waitlist_row.source LIKE 'referral:%' THEN
            _referrer_code := substring(_waitlist_row.source FROM 'referral:(.+)');
            SELECT converted_user_id INTO _referrer_id
            FROM public.waitlist
            WHERE referral_code = _referrer_code AND converted_user_id IS NOT NULL
            LIMIT 1;

            IF _referrer_id IS NOT NULL THEN
                UPDATE public.profiles SET referred_by = _referrer_id WHERE id = NEW.id;
            END IF;
        END IF;
    END IF;

    -- 3. Log signup event to activity_log
    INSERT INTO public.activity_log (user_id, action, details)
    VALUES (
        NEW.id, 'user.signup',
        jsonb_build_object('email', NEW.email, 'from_waitlist', FOUND)
    );

    -- 4. Notify admins of new signup (guaranteed — same transaction)
    FOREACH _admin_id IN ARRAY _admin_ids LOOP
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
            _admin_id,
            'system',
            'New user signed up',
            _display_name || ' (' || NEW.email || ') just joined Rivyls',
            jsonb_build_object('signupUserId', NEW.id::text)
        );
    END LOOP;

    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;
