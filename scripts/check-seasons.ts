import { createClient } from '@supabase/supabase-js'

// Production Supabase
const prodSupabase = createClient(
  'https://ucqhctqbxmceedootgto.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcWhjdHFieG1jZWVkb290Z3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NTU3NDYsImV4cCI6MjA1NTMzMTc0Nn0.sKFX1I4w3s8Xi4MqGBa1JhgPrlKk5F4eSXz2g1OyGQs'
)

// Sandbox Supabase
const sandboxSupabase = createClient(
  'https://lpmbhutdaxmfjxacbusq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwbWJodXRkYXhtZmp4YWNidXNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3NzYwMSwiZXhwIjoyMDg0OTUzNjAxfQ.6b03Ylxv43X1Uw2CvkKKY77fWl4BWB8naK2bAalpHrA'
)

async function checkSeasons() {
  console.log('=== PRODUCTION DATABASE ===')
  const { data: prodSeasons } = await prodSupabase
    .from('seasons')
    .select('id, year, name')
    .order('year', { ascending: false })

  for (const season of prodSeasons || []) {
    const { count } = await prodSupabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id)
    console.log(`  ${season.year} (${season.name}): ${count} games - ID: ${season.id}`)
  }

  console.log('\n=== SANDBOX DATABASE ===')
  const { data: sandboxSeasons } = await sandboxSupabase
    .from('seasons')
    .select('id, year, name')
    .order('year', { ascending: false })

  for (const season of sandboxSeasons || []) {
    const { count } = await sandboxSupabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id)
    console.log(`  ${season.year} (${season.name}): ${count} games - ID: ${season.id}`)
  }
}

checkSeasons()
