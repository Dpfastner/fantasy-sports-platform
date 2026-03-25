-- Migration 060: Enable RLS on espn_api_health table
-- This table was created in 042 without RLS, flagged by Supabase security advisor.
-- No client-side policies needed — only service_role (cron jobs) writes to this table.

ALTER TABLE espn_api_health ENABLE ROW LEVEL SECURITY;
