const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  // Step 1: Create a temp function to check RLS policies
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION public.temp_check_rls_policies()
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSON;
    BEGIN
      SELECT json_agg(row_to_json(p))
      INTO result
      FROM (
        SELECT policyname, tablename, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename IN ('fantasy_teams', 'leagues', 'league_members')
        ORDER BY tablename, policyname
      ) p;
      RETURN result;
    END;
    $$;
  `;

  // Use the Supabase SQL API via the database webhook
  // Actually, use fetch to create the function via pg-meta
  const headers = {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": "Bearer " + key
  };

  // Try creating function via the SQL endpoint
  const createRes = await fetch(url + "/rest/v1/rpc/temp_check_rls_policies", {
    method: "POST",
    headers
  });

  if (createRes.status === 404) {
    console.log("Function doesn't exist yet. Need to create it via Supabase SQL Editor.");
    console.log("\nPlease run this SQL in your Supabase SQL Editor:");
    console.log(createFnSQL);
    console.log("\nThen run this script again.");

    // Alternative: try the direct fix without checking first
    console.log("\n\n=== ALTERNATIVE: Just fix the policy directly ===");
    console.log("Run this SQL in Supabase SQL Editor to fix the fantasy_teams RLS:\n");
    console.log(`
-- First, check current policies
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'fantasy_teams';

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Fantasy teams viewable by league members" ON fantasy_teams;

-- Create a clean, working policy
CREATE POLICY "Fantasy teams viewable by league members" ON fantasy_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = fantasy_teams.league_id
      AND league_members.user_id = auth.uid()
    )
  );

-- Verify
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'fantasy_teams';
    `);
    return;
  }

  const data = await createRes.json();
  console.log("Policies:", JSON.stringify(data, null, 2));
}

main().catch(e => console.error("Error:", e.message));
