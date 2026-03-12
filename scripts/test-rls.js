const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const { createClient } = require("@supabase/supabase-js");

async function test() {
  const secret = env.SUPABASE_JWT_SECRET;

  if (!secret) {
    console.log("No SUPABASE_JWT_SECRET found in .env.local");
    console.log("Available keys with SECRET/JWT:", Object.keys(env).filter(k => k.includes("JWT") || k.includes("SECRET")));

    // Fallback: just test with the anon key (no auth)
    const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data, error } = await anonClient
      .from("fantasy_teams")
      .select("id, name, user_id")
      .eq("league_id", "b0e71432-5859-48fb-a1c0-fa9f886a0490");

    console.log("\nAs anonymous (no auth):", JSON.stringify(data));
    if (error) console.log("Error:", error.message);
    return;
  }

  // Create a custom JWT for the commissioner
  const jwt = require("jsonwebtoken");
  const commissionerId = "5ab25825-1e29-4949-b798-61a8724170d6";
  const memberId = "5faeef09-31f4-455a-a181-6ea2f6e8be68";

  for (const [label, userId] of [["commissioner", commissionerId], ["member", memberId]]) {
    const token = jwt.sign({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: "supabase",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }, secret);

    const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: "Bearer " + token } }
    });

    const { data, error } = await userClient
      .from("fantasy_teams")
      .select("id, name, user_id")
      .eq("league_id", "b0e71432-5859-48fb-a1c0-fa9f886a0490");

    console.log(`As ${label} (${userId}):`, JSON.stringify(data));
    if (error) console.log(`  Error:`, error.message);
  }
}

test().catch(e => console.log("Fatal:", e.message));
