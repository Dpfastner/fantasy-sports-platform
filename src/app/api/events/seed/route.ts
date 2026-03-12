import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/events/seed
// One-time admin endpoint to seed tournament data.
// Body: { tournament: 'frozen-four-2026' | 'masters-2026' | 'w-six-nations-2026' }
// Auth: CRON_SECRET (admin only)
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { tournament } = await request.json()
    const admin = createAdminClient()

    switch (tournament) {
      case 'frozen-four-2026':
        return await seedFrozenFour(admin)
      case 'frozen-four-2026-teams':
        return await seedFrozenFourTeams(admin)
      case 'masters-2026':
        return await seedMasters(admin)
      case 'w-six-nations-2026':
        return await seedWSixNations(admin)
      default:
        return NextResponse.json({ error: `Unknown tournament: ${tournament}` }, { status: 400 })
    }
  } catch (err) {
    console.error('Seed error:', err)
    Sentry.captureException(err, { tags: { route: 'events/seed' } })
    return NextResponse.json({ error: 'Seeding failed' }, { status: 500 })
  }
}

// ============================================
// FROZEN FOUR 2026
// 16-team bracket. Teams TBD until Selection Sunday (Mar 22).
// Seeds the tournament shell + bracket game structure.
// Re-run seed-teams endpoint after bracket reveal.
// ============================================

async function seedFrozenFour(admin: ReturnType<typeof createAdminClient>) {
  const slug = 'frozen-four-2026'

  const { data: existing } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'Frozen Four 2026 already seeded', id: existing.id })
  }

  const { data: tournament, error: tErr } = await admin
    .from('event_tournaments')
    .insert({
      sport: 'hockey',
      name: 'NCAA Frozen Four 2026',
      slug,
      format: 'bracket',
      status: 'upcoming',
      bracket_size: 16,
      description: '2026 NCAA Division I Men\'s Ice Hockey Tournament. 16-team single-elimination bracket.',
      rules_text: `## How to Play\n\n1. **Fill out your bracket** — predict the winner of each game from Regionals through the Championship.\n2. **Points escalate by round** — later rounds are worth more.\n3. **Lock deadline** — all picks lock before the first Regional game.\n\n### Scoring\n- Regional Quarterfinal: 2 pts\n- Regional Semifinal: 4 pts\n- Frozen Four Semifinal: 8 pts\n- Championship: 16 pts\n- Upset bonus: +2 pts when a lower seed wins\n\n### Tiebreaker\nPredict the total combined goals in the Championship game.`,
      starts_at: '2026-03-26T00:00:00Z',
      ends_at: '2026-04-11T23:59:00Z',
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
        teams_seeded: false,
      },
    })
    .select('id')
    .single()

  if (tErr) throw tErr

  // Bracket games: 15 games for 16 teams
  // Round 1 (Regional QF): games 1-8
  // Round 2 (Regional Final): games 9-12
  // Round 3 (Frozen Four SF): games 13-14
  // Round 4 (Championship): game 15
  const games = [
    { game_number: 1, round: 'regional_quarterfinal' },
    { game_number: 2, round: 'regional_quarterfinal' },
    { game_number: 3, round: 'regional_quarterfinal' },
    { game_number: 4, round: 'regional_quarterfinal' },
    { game_number: 5, round: 'regional_quarterfinal' },
    { game_number: 6, round: 'regional_quarterfinal' },
    { game_number: 7, round: 'regional_quarterfinal' },
    { game_number: 8, round: 'regional_quarterfinal' },
    { game_number: 9, round: 'regional_final' },
    { game_number: 10, round: 'regional_final' },
    { game_number: 11, round: 'regional_final' },
    { game_number: 12, round: 'regional_final' },
    { game_number: 13, round: 'semifinal' },
    { game_number: 14, round: 'semifinal' },
    { game_number: 15, round: 'championship' },
  ]

  const gameRows = games.map(g => ({
    tournament_id: tournament.id,
    game_number: g.game_number,
    round: g.round,
    status: 'scheduled' as const,
  }))

  const { error: gErr } = await admin.from('event_games').insert(gameRows)
  if (gErr) throw gErr

  return NextResponse.json({
    success: true,
    tournament: 'frozen-four-2026',
    id: tournament.id,
    message: 'Tournament shell created with 15 bracket games. Teams will be seeded after Selection Sunday (Mar 22).',
    games: games.length,
  })
}

// ============================================
// FROZEN FOUR 2026 — TEAMS
// Seed projected 16 teams and assign to bracket games.
// Can be re-run after Selection Sunday to update with actual teams.
// ============================================

async function seedFrozenFourTeams(admin: ReturnType<typeof createAdminClient>) {
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', 'frozen-four-2026')
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Frozen Four tournament not found. Run frozen-four-2026 seed first.' }, { status: 400 })
  }

  // Delete existing participants (allow re-seeding with actual bracket)
  await admin
    .from('event_participants')
    .delete()
    .eq('tournament_id', tournament.id)

  // Projected 16-team bracket (seeds based on PairWise rankings)
  const teams = [
    { name: 'Michigan State', short: 'MSU', seed: 1 },
    { name: 'Michigan', short: 'MICH', seed: 2 },
    { name: 'North Dakota', short: 'UND', seed: 3 },
    { name: 'Western Michigan', short: 'WMU', seed: 4 },
    { name: 'Penn State', short: 'PSU', seed: 5 },
    { name: 'Providence', short: 'PROV', seed: 6 },
    { name: 'Quinnipiac', short: 'QU', seed: 7 },
    { name: 'Minnesota Duluth', short: 'UMD', seed: 8 },
    { name: 'Denver', short: 'DU', seed: 9 },
    { name: 'Cornell', short: 'COR', seed: 10 },
    { name: 'Dartmouth', short: 'DART', seed: 11 },
    { name: 'Boston College', short: 'BC', seed: 12 },
    { name: 'Wisconsin', short: 'WIS', seed: 13 },
    { name: 'Connecticut', short: 'CONN', seed: 14 },
    { name: 'Augustana', short: 'AUG', seed: 15 },
    { name: 'Bentley', short: 'BENT', seed: 16 },
  ]

  const participantRows = teams.map(t => ({
    tournament_id: tournament.id,
    name: t.name,
    short_name: t.short,
    seed: t.seed,
    metadata: { projected: true },
  }))

  const { error: pErr } = await admin.from('event_participants').insert(participantRows)
  if (pErr) throw pErr

  // Fetch participant IDs
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, seed')
    .eq('tournament_id', tournament.id)
    .order('seed', { ascending: true })

  if (!participants) throw new Error('Failed to fetch participants')

  const seedToId: Record<number, string> = {}
  for (const p of participants) {
    if (p.seed != null) seedToId[p.seed] = p.id
  }

  // Assign teams to bracket games
  // Standard bracket: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
  const matchups = [
    { game: 1, seed1: 1, seed2: 16 },  // Albany Regional
    { game: 2, seed1: 8, seed2: 9 },
    { game: 3, seed1: 5, seed2: 12 },  // Loveland Regional
    { game: 4, seed1: 4, seed2: 13 },
    { game: 5, seed1: 3, seed2: 14 },  // Sioux Falls Regional
    { game: 6, seed1: 6, seed2: 11 },
    { game: 7, seed1: 7, seed2: 10 },  // Worcester Regional
    { game: 8, seed1: 2, seed2: 15 },
  ]

  // Get existing games
  const { data: games } = await admin
    .from('event_games')
    .select('id, game_number')
    .eq('tournament_id', tournament.id)
    .order('game_number', { ascending: true })

  if (!games) throw new Error('No games found')

  const gameMap: Record<number, string> = {}
  for (const g of games) {
    gameMap[g.game_number] = g.id
  }

  // Update round 1 games with team assignments + start times
  for (const m of matchups) {
    const gameId = gameMap[m.game]
    if (gameId) {
      await admin
        .from('event_games')
        .update({
          participant_1_id: seedToId[m.seed1],
          participant_2_id: seedToId[m.seed2],
          starts_at: '2026-03-27T18:00:00Z', // Regional games start Mar 27
        })
        .eq('id', gameId)
    }
  }

  // Update config to mark teams as seeded
  await admin
    .from('event_tournaments')
    .update({ config: {
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
    }})
    .eq('id', tournament.id)

  return NextResponse.json({
    success: true,
    tournament: 'frozen-four-2026-teams',
    id: tournament.id,
    participants: teams.length,
    message: 'Projected 16 teams seeded and assigned to bracket games.',
  })
}

// ============================================
// MASTERS 2026
// Pick'em format with head-to-head matchups.
// Seeds top 40 golfers by OWGR + notable past champions.
// ============================================

async function seedMasters(admin: ReturnType<typeof createAdminClient>) {
  const slug = 'masters-2026'

  const { data: existing } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'Masters 2026 already seeded', id: existing.id })
  }

  const { data: tournament, error: tErr } = await admin
    .from('event_tournaments')
    .insert({
      sport: 'golf',
      name: 'The Masters 2026',
      slug,
      format: 'pickem',
      status: 'upcoming',
      description: 'The 90th Masters Tournament at Augusta National. Pick winners in head-to-head golfer matchups each round.',
      rules_text: `## How to Play\n\n1. **Pick matchup winners** — we create head-to-head pairings. Pick who finishes with the lower score.\n2. **New matchups each round** — picks refresh for rounds 1-4.\n3. **Confidence points** — assign higher confidence to picks you're more sure about.\n\n### Scoring\n- Correct pick: 1 pt × confidence\n- Upset bonus: +2 pts if you correctly pick the higher-ranked golfer to lose\n\n### Tiebreaker\nPredict the winning score (strokes relative to par).`,
      starts_at: '2026-04-09T00:00:00Z',
      ends_at: '2026-04-12T23:59:00Z',
      config: {
        venue: 'Augusta National Golf Club',
        city: 'Augusta, GA',
        rounds: 4,
        cut_after_round: 2,
      },
    })
    .select('id')
    .single()

  if (tErr) throw tErr

  const golfers = [
    { name: 'Scottie Scheffler', seed: 1, meta: { owgr: 1, note: '2024 Masters champion' } },
    { name: 'Rory McIlroy', seed: 2, meta: { owgr: 2, note: '2025 Masters champion (defending)' } },
    { name: 'Tommy Fleetwood', seed: 3, meta: { owgr: 3 } },
    { name: 'Collin Morikawa', seed: 4, meta: { owgr: 4 } },
    { name: 'Justin Rose', seed: 5, meta: { owgr: 5 } },
    { name: 'Russell Henley', seed: 6, meta: { owgr: 6 } },
    { name: 'Chris Gotterup', seed: 7, meta: { owgr: 7 } },
    { name: 'Robert MacIntyre', seed: 8, meta: { owgr: 8 } },
    { name: 'Sepp Straka', seed: 9, meta: { owgr: 9 } },
    { name: 'Xander Schauffele', seed: 10, meta: { owgr: 10 } },
    { name: 'J.J. Spaun', seed: 11, meta: { owgr: 11 } },
    { name: 'Hideki Matsuyama', seed: 12, meta: { owgr: 12, note: '2021 Masters champion' } },
    { name: 'Ben Griffin', seed: 13, meta: { owgr: 13 } },
    { name: 'Justin Thomas', seed: 14, meta: { owgr: 14 } },
    { name: 'Cameron Young', seed: 15, meta: { owgr: 15 } },
    { name: 'Harris English', seed: 16, meta: { owgr: 16 } },
    { name: 'Alex Noren', seed: 17, meta: { owgr: 17 } },
    { name: 'Viktor Hovland', seed: 18, meta: { owgr: 18 } },
    { name: 'Akshay Bhatia', seed: 19, meta: { owgr: 19 } },
    { name: 'Patrick Reed', seed: 20, meta: { owgr: 20, note: '2018 Masters champion' } },
    { name: 'Ludvig Aberg', seed: 21, meta: { owgr: 21 } },
    { name: 'Jacob Bridgeman', seed: 22, meta: { owgr: 22 } },
    { name: 'Keegan Bradley', seed: 23, meta: { owgr: 23 } },
    { name: 'Matt Fitzpatrick', seed: 24, meta: { owgr: 24 } },
    { name: 'Maverick McNealy', seed: 25, meta: { owgr: 25 } },
    { name: 'Tyrrell Hatton', seed: 26, meta: { owgr: 26 } },
    { name: 'Ryan Gerard', seed: 27, meta: { owgr: 27 } },
    { name: 'Si Woo Kim', seed: 28, meta: { owgr: 28 } },
    { name: 'Shane Lowry', seed: 29, meta: { owgr: 29 } },
    { name: 'Min Woo Lee', seed: 30, meta: { owgr: 30 } },
    { name: 'Jon Rahm', seed: 31, meta: { owgr: 36, note: '2023 Masters champion' } },
    { name: 'Bryson DeChambeau', seed: 32, meta: { owgr: 41 } },
    { name: 'Jordan Spieth', seed: 33, meta: { note: '2015 Masters champion' } },
    { name: 'Tiger Woods', seed: 34, meta: { note: '5x Masters champion, participation uncertain' } },
    { name: 'Dustin Johnson', seed: 35, meta: { note: '2020 Masters champion' } },
    { name: 'Patrick Cantlay', seed: 36, meta: { owgr: 33 } },
    { name: 'Sam Burns', seed: 37, meta: { owgr: 32 } },
    { name: 'Adam Scott', seed: 38, meta: { owgr: 50, note: '2013 Masters champion' } },
    { name: 'Brooks Koepka', seed: 39, meta: { note: 'Past major winner' } },
    { name: 'Phil Mickelson', seed: 40, meta: { note: '3x Masters champion' } },
  ]

  const participantRows = golfers.map(g => ({
    tournament_id: tournament.id,
    name: g.name,
    seed: g.seed,
    metadata: g.meta,
  }))

  const { error: pErr } = await admin.from('event_participants').insert(participantRows)
  if (pErr) throw pErr

  // Create round-based matchups: 20 per round × 4 rounds = 80 games
  // Seeded: 1v40, 2v39, 3v38, etc.
  const { data: seededParticipants } = await admin
    .from('event_participants')
    .select('id, seed')
    .eq('tournament_id', tournament.id)

  if (!seededParticipants) throw new Error('Failed to fetch seeded participants')

  const seedToId: Record<number, string> = {}
  for (const p of seededParticipants) {
    if (p.seed != null) seedToId[p.seed] = p.id
  }

  const roundDates = [
    '2026-04-09T12:00:00Z', // Round 1 — Thursday
    '2026-04-10T12:00:00Z', // Round 2 — Friday
    '2026-04-11T14:00:00Z', // Round 3 — Saturday
    '2026-04-12T14:00:00Z', // Round 4 — Sunday
  ]

  const gameRows: Record<string, unknown>[] = []
  let gameNum = 1

  for (let round = 1; round <= 4; round++) {
    for (let i = 0; i < 20; i++) {
      gameRows.push({
        tournament_id: tournament.id,
        game_number: gameNum++,
        round: `round_${round}`,
        participant_1_id: seedToId[i + 1],
        participant_2_id: seedToId[40 - i],
        status: 'scheduled',
        starts_at: roundDates[round - 1],
      })
    }
  }

  const { error: gErr } = await admin.from('event_games').insert(gameRows)
  if (gErr) throw gErr

  return NextResponse.json({
    success: true,
    tournament: 'masters-2026',
    id: tournament.id,
    participants: golfers.length,
    games: gameRows.length,
  })
}

// ============================================
// WOMEN'S SIX NATIONS 2026
// Survivor format — 6 teams, 5 weeks.
// ============================================

async function seedWSixNations(admin: ReturnType<typeof createAdminClient>) {
  const slug = 'w-six-nations-2026'

  const { data: existing } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: 'Women\'s Six Nations 2026 already seeded', id: existing.id })
  }

  const { data: tournament, error: tErr } = await admin
    .from('event_tournaments')
    .insert({
      sport: 'rugby',
      name: "Women's Six Nations 2026",
      slug,
      format: 'survivor',
      status: 'upcoming',
      total_weeks: 5,
      description: 'Guinness Women\'s Six Nations 2026. Pick one team to win each round — if they lose, you\'re eliminated. Can\'t pick the same team twice.',
      rules_text: `## How to Play\n\n1. **Pick one team each round** to win their match.\n2. If your team **wins**, you survive to the next round.\n3. If your team **loses or draws**, you're **eliminated**.\n4. **You can't pick the same team twice** — use them wisely!\n5. Last person standing wins.\n\n### Important\n- Picks lock 1 minute before the first kickoff of each round.\n- If you miss the deadline, you're automatically eliminated.\n- A draw counts as a loss (eliminates you).`,
      starts_at: '2026-04-11T00:00:00Z',
      ends_at: '2026-05-17T23:59:00Z',
      config: {
        draw_eliminates: true,
        strikes_allowed: 0,
        week_deadlines: [
          '2026-04-11T11:24:00Z',
          '2026-04-18T12:29:00Z',
          '2026-04-25T13:14:00Z',
          '2026-05-09T12:59:00Z',
          '2026-05-17T11:14:00Z',
        ],
      },
    })
    .select('id')
    .single()

  if (tErr) throw tErr

  // Seed 6 teams
  const teams = [
    { name: 'England', code: 'ENG', seed: 1 },
    { name: 'France', code: 'FRA', seed: 2 },
    { name: 'Ireland', code: 'IRL', seed: 3 },
    { name: 'Scotland', code: 'SCO', seed: 4 },
    { name: 'Wales', code: 'WAL', seed: 5 },
    { name: 'Italy', code: 'ITA', seed: 6 },
  ]

  const participantRows = teams.map(t => ({
    tournament_id: tournament.id,
    name: t.name,
    short_name: t.code,
    seed: t.seed,
    metadata: { code: t.code },
  }))

  const { error: pErr } = await admin.from('event_participants').insert(participantRows)
  if (pErr) throw pErr

  // Fetch participant IDs for game creation
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, short_name')
    .eq('tournament_id', tournament.id)

  if (!participants) throw new Error('Failed to fetch participants')

  const codeToId: Record<string, string> = {}
  for (const p of participants) {
    if (p.short_name) codeToId[p.short_name] = p.id
  }

  // Full fixture schedule (all times UTC)
  const fixtures = [
    // Round 1 — Sat Apr 11
    { week: 1, num: 1, home: 'FRA', away: 'ITA', at: '2026-04-11T11:25:00Z', venue: 'Stade des Alpes, Grenoble' },
    { week: 1, num: 2, home: 'ENG', away: 'IRL', at: '2026-04-11T13:25:00Z', venue: 'Allianz Stadium, Twickenham' },
    { week: 1, num: 3, home: 'WAL', away: 'SCO', at: '2026-04-11T15:40:00Z', venue: 'Principality Stadium, Cardiff' },
    // Round 2 — Sat Apr 18
    { week: 2, num: 4, home: 'SCO', away: 'ENG', at: '2026-04-18T12:30:00Z', venue: 'Scottish Gas Murrayfield' },
    { week: 2, num: 5, home: 'WAL', away: 'FRA', at: '2026-04-18T14:35:00Z', venue: 'Cardiff Arms Park' },
    { week: 2, num: 6, home: 'IRL', away: 'ITA', at: '2026-04-18T16:40:00Z', venue: 'Dexcom Stadium, Galway' },
    // Round 3 — Sat Apr 25
    { week: 3, num: 7, home: 'ENG', away: 'WAL', at: '2026-04-25T13:15:00Z', venue: 'Ashton Gate, Bristol' },
    { week: 3, num: 8, home: 'ITA', away: 'SCO', at: '2026-04-25T14:30:00Z', venue: 'Stadio Sergio Lanfranchi, Parma' },
    { week: 3, num: 9, home: 'FRA', away: 'IRL', at: '2026-04-25T18:10:00Z', venue: 'Stade Marcel Michelin, Clermont' },
    // Round 4 — Sat May 9
    { week: 4, num: 10, home: 'ITA', away: 'ENG', at: '2026-05-09T13:00:00Z', venue: 'Stadio Sergio Lanfranchi, Parma' },
    { week: 4, num: 11, home: 'SCO', away: 'FRA', at: '2026-05-09T15:15:00Z', venue: 'Hive Stadium, Edinburgh' },
    { week: 4, num: 12, home: 'IRL', away: 'WAL', at: '2026-05-09T17:30:00Z', venue: 'Affidea Stadium, Belfast' },
    // Round 5 — Sun May 17 (Super Sunday)
    { week: 5, num: 13, home: 'WAL', away: 'ITA', at: '2026-05-17T11:15:00Z', venue: 'Cardiff Arms Park' },
    { week: 5, num: 14, home: 'IRL', away: 'SCO', at: '2026-05-17T13:30:00Z', venue: 'Aviva Stadium, Dublin' },
    { week: 5, num: 15, home: 'FRA', away: 'ENG', at: '2026-05-17T14:45:00Z', venue: 'Stade Atlantique, Bordeaux' },
  ]

  const gameRows = fixtures.map(f => ({
    tournament_id: tournament.id,
    game_number: f.num,
    round: `round_${f.week}`,
    week_number: f.week,
    participant_1_id: codeToId[f.home],
    participant_2_id: codeToId[f.away],
    starts_at: f.at,
    status: 'scheduled' as const,
    metadata: { venue: f.venue },
  }))

  const { error: gErr } = await admin.from('event_games').insert(gameRows)
  if (gErr) throw gErr

  return NextResponse.json({
    success: true,
    tournament: 'w-six-nations-2026',
    id: tournament.id,
    participants: teams.length,
    games: fixtures.length,
  })
}
