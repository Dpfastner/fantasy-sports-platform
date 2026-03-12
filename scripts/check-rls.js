const { Client } = require("pg");
const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const ref = "lpmbhutdaxmfjxacbusq";

// Try pooler connection with service role JWT as password
const client = new Client({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres." + ref,
  password: env.SUPABASE_SERVICE_ROLE_KEY,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to database!");

    // Check RLS policies on fantasy_teams
    const result = await client.query(
      "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = $1 ORDER BY policyname",
      ["fantasy_teams"]
    );

    console.log("\n=== RLS Policies on fantasy_teams ===");
    for (const row of result.rows) {
      console.log(`\n  Policy: ${row.policyname} (${row.cmd})`);
      console.log(`  USING: ${row.qual}`);
      if (row.with_check) console.log(`  WITH CHECK: ${row.with_check}`);
    }

    // Also check if RLS is enabled
    const rlsResult = await client.query(
      "SELECT relrowsecurity FROM pg_class WHERE relname = 'fantasy_teams'"
    );
    console.log("\n  RLS enabled:", rlsResult.rows[0]?.relrowsecurity);

    // Check leagues policies too for comparison
    const leaguesPolicies = await client.query(
      "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = $1 ORDER BY policyname",
      ["leagues"]
    );
    console.log("\n=== RLS Policies on leagues ===");
    for (const row of leaguesPolicies.rows) {
      console.log(`\n  Policy: ${row.policyname} (${row.cmd})`);
      console.log(`  USING: ${row.qual}`);
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
