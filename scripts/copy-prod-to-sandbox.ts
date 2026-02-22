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

async function copyGames() {
  console.log('=== Copying games from PRODUCTION to SANDBOX ===\n')

  // Get season ID from both databases (should match by year)
  const { data: prodSeason } = await prodSupabase
    .from('seasons')
    .select('id, year')
    .eq('year', 2025)
    .single()

  const { data: sandboxSeason } = await sandboxSupabase
    .from('seasons')
    .select('id, year')
    .eq('year', 2025)
    .single()

  if (!prodSeason || !sandboxSeason) {
    console.error('Could not find 2025 season in one or both databases')
    console.log('Production season:', prodSeason)
    console.log('Sandbox season:', sandboxSeason)
    return
  }

  console.log(`Production season ID: ${prodSeason.id}`)
  console.log(`Sandbox season ID: ${sandboxSeason.id}`)

  // Fetch all games from production
  const { data: prodGames, error: fetchError } = await prodSupabase
    .from('games')
    .select('*')
    .eq('season_id', prodSeason.id)

  if (fetchError) {
    console.error('Error fetching production games:', fetchError)
    return
  }

  console.log(`\nFetched ${prodGames?.length || 0} games from production`)

  if (!prodGames || prodGames.length === 0) {
    console.log('No games to copy')
    return
  }

  // Clear existing games in sandbox for this season
  console.log('\nClearing existing games in sandbox...')
  const { error: deleteError } = await sandboxSupabase
    .from('games')
    .delete()
    .eq('season_id', sandboxSeason.id)

  if (deleteError) {
    console.error('Error clearing sandbox games:', deleteError)
    return
  }

  // Map games to sandbox season ID and remove the id field
  const gamesToInsert = prodGames.map(game => {
    const { id, ...rest } = game
    return {
      ...rest,
      season_id: sandboxSeason.id,
    }
  })

  // Insert in batches of 100
  console.log('\nInserting games to sandbox...')
  let inserted = 0
  const batchSize = 100

  for (let i = 0; i < gamesToInsert.length; i += batchSize) {
    const batch = gamesToInsert.slice(i, i + batchSize)
    const { error: insertError } = await sandboxSupabase
      .from('games')
      .insert(batch)

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
    } else {
      inserted += batch.length
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${prodGames.length} games`)
    }
  }

  console.log(`\n=== DONE: Copied ${inserted} games to sandbox ===`)

  // Verify CFP data
  const { data: verification } = await sandboxSupabase
    .from('games')
    .select('is_playoff_game, playoff_round')
    .eq('season_id', sandboxSeason.id)
    .gte('week_number', 17)

  const cfp = verification?.filter(g => g.is_playoff_game) || []
  const regular = verification?.filter(g => !g.is_playoff_game) || []

  console.log(`\nVerification:`)
  console.log(`  CFP games: ${cfp.length}`)
  console.log(`  Regular bowl games: ${regular.length}`)
}

copyGames()
