import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.log('Missing env vars')
  process.exit(1)
}
const admin = createClient(url, key)

async function seed() {
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', 'frozen-four-2026')
    .single()

  if (!tournament) {
    console.log('Tournament not found')
    return
  }
  console.log('Tournament ID:', tournament.id)

  // Delete existing participants
  const { data: existing } = await admin
    .from('event_participants')
    .select('id')
    .eq('tournament_id', tournament.id)

  if (existing && existing.length > 0) {
    await admin.from('event_participants').delete().eq('tournament_id', tournament.id)
    console.log('Cleared', existing.length, 'existing participants')
  }

  const teams = [
    { name: 'Michigan State', short_name: 'MSU', seed: 1 },
    { name: 'Michigan', short_name: 'MICH', seed: 2 },
    { name: 'North Dakota', short_name: 'UND', seed: 3 },
    { name: 'Western Michigan', short_name: 'WMU', seed: 4 },
    { name: 'Penn State', short_name: 'PSU', seed: 5 },
    { name: 'Providence', short_name: 'PROV', seed: 6 },
    { name: 'Quinnipiac', short_name: 'QU', seed: 7 },
    { name: 'Minnesota Duluth', short_name: 'UMD', seed: 8 },
    { name: 'Denver', short_name: 'DU', seed: 9 },
    { name: 'Cornell', short_name: 'COR', seed: 10 },
    { name: 'Dartmouth', short_name: 'DART', seed: 11 },
    { name: 'Boston College', short_name: 'BC', seed: 12 },
    { name: 'Wisconsin', short_name: 'WIS', seed: 13 },
    { name: 'Connecticut', short_name: 'CONN', seed: 14 },
    { name: 'Augustana', short_name: 'AUG', seed: 15 },
    { name: 'Bentley', short_name: 'BENT', seed: 16 },
  ]

  const rows = teams.map(t => ({
    tournament_id: tournament.id,
    name: t.name,
    short_name: t.short_name,
    seed: t.seed,
    metadata: { projected: true },
  }))

  const { error: pErr } = await admin.from('event_participants').insert(rows)
  if (pErr) {
    console.log('Insert error:', pErr)
    return
  }
  console.log('Inserted', teams.length, 'teams')

  // Get participant IDs
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, seed')
    .eq('tournament_id', tournament.id)
    .order('seed', { ascending: true })

  const seedToId: Record<number, string> = {}
  for (const p of participants || []) {
    if (p.seed != null) seedToId[p.seed] = p.id
  }

  // Standard bracket: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
  const matchups = [
    { game: 1, seed1: 1, seed2: 16 },
    { game: 2, seed1: 8, seed2: 9 },
    { game: 3, seed1: 5, seed2: 12 },
    { game: 4, seed1: 4, seed2: 13 },
    { game: 5, seed1: 3, seed2: 14 },
    { game: 6, seed1: 6, seed2: 11 },
    { game: 7, seed1: 7, seed2: 10 },
    { game: 8, seed1: 2, seed2: 15 },
  ]

  // Get games
  const { data: games } = await admin
    .from('event_games')
    .select('id, game_number')
    .eq('tournament_id', tournament.id)
    .order('game_number', { ascending: true })

  const gameMap: Record<number, string> = {}
  for (const g of games || []) {
    gameMap[g.game_number] = g.id
  }
  console.log('Found', games?.length || 0, 'games')

  // Update round 1 games with team assignments
  for (const m of matchups) {
    const gameId = gameMap[m.game]
    if (gameId) {
      const { error } = await admin
        .from('event_games')
        .update({
          participant_1_id: seedToId[m.seed1],
          participant_2_id: seedToId[m.seed2],
          starts_at: '2026-03-27T18:00:00Z',
        })
        .eq('id', gameId)
      if (error) console.log('Update error game', m.game, error)
      else console.log(`Game ${m.game}: #${m.seed1} ${teams[m.seed1 - 1].name} vs #${m.seed2} ${teams[m.seed2 - 1].name}`)
    }
  }

  // Update config
  await admin
    .from('event_tournaments')
    .update({
      config: {
        regionals: [
          { name: 'Albany Regional', city: 'Albany, NY', dates: '2026-03-26 to 2026-03-29' },
          { name: 'Loveland Regional', city: 'Loveland, CO', dates: '2026-03-26 to 2026-03-29' },
          { name: 'Sioux Falls Regional', city: 'Sioux Falls, SD', dates: '2026-03-26 to 2026-03-29' },
          { name: 'Worcester Regional', city: 'Worcester, MA', dates: '2026-03-26 to 2026-03-29' },
        ],
        frozen_four_venue: 'T-Mobile Arena, Las Vegas, NV',
        semifinal_date: '2026-04-09',
        championship_date: '2026-04-11',
        selection_date: '2026-03-22',
        teams_seeded: true,
      },
    })
    .eq('id', tournament.id)

  console.log('Done! 16 teams seeded and assigned to bracket.')
}

seed().catch(console.error)
