-- Protect cut status in the bulk_update_participant_metadata RPC.
-- Once a golfer's status is 'cut', external callers (Apps Script, etc.)
-- cannot overwrite it back to 'active'. They CAN set it to 'cut' or 'wd'/'dq'.

CREATE OR REPLACE FUNCTION bulk_update_participant_metadata(updates jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  u jsonb;
  updated_count int := 0;
  existing_status text;
  incoming_status text;
BEGIN
  IF jsonb_typeof(updates) != 'array' THEN
    RAISE EXCEPTION 'updates must be a JSON array';
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Check existing status before update
    SELECT metadata->>'status' INTO existing_status
    FROM event_participants
    WHERE id = (u->>'id')::uuid;

    -- Get incoming status (if provided)
    incoming_status := (u->'metadata'->>'status');

    -- Guard: if golfer is already cut, only allow cut/wd/dq status updates
    IF existing_status = 'cut' AND (incoming_status IS NULL OR incoming_status = 'active') THEN
      -- Skip this update — don't overwrite cut with active
      CONTINUE;
    END IF;

    UPDATE event_participants
    SET metadata = (u->'metadata')::jsonb
    WHERE id = (u->>'id')::uuid;

    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION bulk_update_participant_metadata(jsonb) IS
  'Batch update event_participants.metadata. Protects cut status — once a golfer is cut, external callers cannot revert to active.';
