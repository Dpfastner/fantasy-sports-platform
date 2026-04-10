-- Batch update multiple event_participants.metadata in a single call.
-- Called from Google Apps Script golf sync to reduce UrlFetch quota usage.
-- Previously the sync fired one PATCH per golfer (~90 fetches per run), which
-- exhausted the Apps Script 20k/day free tier quota within hours during the
-- Masters live window. This RPC collapses the 90 PATCHes into 1 RPC call.
--
-- Input shape: [{ "id": "uuid", "metadata": { ... } }, ...]
-- Returns: count of rows updated

CREATE OR REPLACE FUNCTION bulk_update_participant_metadata(updates jsonb)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  u jsonb;
  updated_count int := 0;
BEGIN
  IF jsonb_typeof(updates) != 'array' THEN
    RAISE EXCEPTION 'updates must be a JSON array';
  END IF;

  FOR u IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
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

-- Grant execute to service_role (used by Apps Script via the service-role key)
GRANT EXECUTE ON FUNCTION bulk_update_participant_metadata(jsonb) TO service_role;

COMMENT ON FUNCTION bulk_update_participant_metadata(jsonb) IS
  'Batch update event_participants.metadata from JSON array of {id, metadata} objects. Used by Apps Script sync to avoid UrlFetch quota exhaustion.';
