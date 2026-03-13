import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { fetchHockeyTeams, fetchGolfRankings, fetchGolfField, getCountryFlagCode } from '@/lib/events/espn-adapters'

// POST /api/events/seed
// One-time admin endpoint to seed tournament data.
// Body: { tournament: 'frozen-four-2026' | 'masters-2026' | 'w-six-nations-2026' | 'm-six-nations-2026' }
// Auth: CRON_SECRET (admin only)
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { tournament } = body
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
      case 'm-six-nations-2026':
        return await seedMSixNations(admin)
      case 'refresh-golf-rankings':
        return await refreshGolfRankings(admin)
      case 'reseed-masters-games':
        return await reseedMastersGames(admin)
      case 'update-masters-config':
        return await updateMastersConfig(admin)
      case 'sync-golf-field':
        return await syncGolfField(admin, body)
      case 'refresh-golf-metadata':
        return await refreshGolfMetadata(admin, body)
      case 'sync-hockey-logos':
        return await syncHockeyLogos(admin)
      case 'frozen-four-2026-schedule':
        return await seedFrozenFourSchedule(admin)
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
      format: 'multi',
      status: 'upcoming',
      description: 'The 90th Masters Tournament at Augusta National. Create Pick\'em or Roster pools.',
      rules_text: `## Pick'em Format\n1. **Pick matchup winners** each round.\n2. **Scoring**: 1 pt per correct pick + upset bonus.\n\n## Roster Format\n1. **Draft 7 golfers** — 2 from Tier A (OWGR 1–15), 2 from Tier B (16–30), 3 from Tier C (31+).\n2. **Scoring**: Aggregate score-to-par from your best 5 of 7 picks. Lowest wins.\n3. **Cut penalty**: Cut golfers get the field's highest score + 1 per missed round.\n4. **Rosters lock** at first tee time.`,
      starts_at: '2026-04-09T00:00:00Z',
      ends_at: '2026-04-12T23:59:00Z',
      config: {
        venue: 'Augusta National Golf Club',
        city: 'Augusta, GA',
        rounds: 4,
        cut_after_round: 2,
        allowed_game_types: ['pickem', 'roster'],
        roster_tiers: {
          A: { count: 2, owgr_min: 1, owgr_max: 15 },
          B: { count: 2, owgr_min: 16, owgr_max: 30 },
          C: { count: 3, owgr_min: 31 },
        },
      },
    })
    .select('id')
    .single()

  if (tErr) throw tErr

  // Compute tier from OWGR: A = 1-15, B = 16-30, C = 31+
  const getTier = (owgr?: number) => {
    if (!owgr) return 'C' // past champions without OWGR go to Tier C
    if (owgr <= 15) return 'A'
    if (owgr <= 30) return 'B'
    return 'C'
  }

  // Auto-fetch OWGR rankings from ESPN
  const espnRankings = await fetchGolfRankings()
  const rankingsByName: Record<string, { rank: number; country: string }> = {}
  for (const r of espnRankings) {
    // Normalize name for matching (lowercase, no accents)
    rankingsByName[r.name.toLowerCase()] = { rank: r.rank, country: r.country }
  }

  // Helper: look up OWGR from ESPN rankings, fall back to hardcoded value
  const lookupOwgr = (name: string, fallback?: number) => {
    const found = rankingsByName[name.toLowerCase()]
    return found?.rank ?? fallback
  }
  const lookupCountry = (name: string) => {
    const found = rankingsByName[name.toLowerCase()]
    return found?.country || null
  }

  const golferDefs = [
    { name: 'Scottie Scheffler', seed: 1, fallbackOwgr: 1, note: '2024 Masters champion' },
    { name: 'Rory McIlroy', seed: 2, fallbackOwgr: 2, note: '2025 Masters champion (defending)' },
    { name: 'Tommy Fleetwood', seed: 3, fallbackOwgr: 3 },
    { name: 'Collin Morikawa', seed: 4, fallbackOwgr: 4 },
    { name: 'Justin Rose', seed: 5, fallbackOwgr: 5 },
    { name: 'Russell Henley', seed: 6, fallbackOwgr: 6 },
    { name: 'Chris Gotterup', seed: 7, fallbackOwgr: 7 },
    { name: 'Robert MacIntyre', seed: 8, fallbackOwgr: 8 },
    { name: 'Sepp Straka', seed: 9, fallbackOwgr: 9 },
    { name: 'Xander Schauffele', seed: 10, fallbackOwgr: 10 },
    { name: 'J.J. Spaun', seed: 11, fallbackOwgr: 11 },
    { name: 'Hideki Matsuyama', seed: 12, fallbackOwgr: 12, note: '2021 Masters champion' },
    { name: 'Ben Griffin', seed: 13, fallbackOwgr: 13 },
    { name: 'Justin Thomas', seed: 14, fallbackOwgr: 14 },
    { name: 'Cameron Young', seed: 15, fallbackOwgr: 15 },
    { name: 'Harris English', seed: 16, fallbackOwgr: 16 },
    { name: 'Alex Noren', seed: 17, fallbackOwgr: 17 },
    { name: 'Viktor Hovland', seed: 18, fallbackOwgr: 18 },
    { name: 'Akshay Bhatia', seed: 19, fallbackOwgr: 19 },
    { name: 'Patrick Reed', seed: 20, fallbackOwgr: 20, note: '2018 Masters champion' },
    { name: 'Ludvig Aberg', seed: 21, fallbackOwgr: 21 },
    { name: 'Jacob Bridgeman', seed: 22, fallbackOwgr: 22 },
    { name: 'Keegan Bradley', seed: 23, fallbackOwgr: 23 },
    { name: 'Matt Fitzpatrick', seed: 24, fallbackOwgr: 24 },
    { name: 'Maverick McNealy', seed: 25, fallbackOwgr: 25 },
    { name: 'Tyrrell Hatton', seed: 26, fallbackOwgr: 26 },
    { name: 'Ryan Gerard', seed: 27, fallbackOwgr: 27 },
    { name: 'Si Woo Kim', seed: 28, fallbackOwgr: 28 },
    { name: 'Shane Lowry', seed: 29, fallbackOwgr: 29 },
    { name: 'Min Woo Lee', seed: 30, fallbackOwgr: 30 },
    { name: 'Jon Rahm', seed: 31, fallbackOwgr: 36, note: '2023 Masters champion' },
    { name: 'Bryson DeChambeau', seed: 32, fallbackOwgr: 41 },
    { name: 'Jordan Spieth', seed: 33, fallbackOwgr: 56, note: '2015 Masters champion', country: 'United States' },
    { name: 'Tiger Woods', seed: 34, fallbackOwgr: 800, note: '5x Masters champion, participation uncertain', country: 'United States' },
    { name: 'Dustin Johnson', seed: 35, fallbackOwgr: 150, note: '2020 Masters champion', country: 'United States' },
    { name: 'Patrick Cantlay', seed: 36, fallbackOwgr: 33 },
    { name: 'Sam Burns', seed: 37, fallbackOwgr: 32 },
    { name: 'Adam Scott', seed: 38, fallbackOwgr: 50, note: '2013 Masters champion' },
    { name: 'Brooks Koepka', seed: 39, fallbackOwgr: 75, note: 'Past major winner', country: 'United States' },
    { name: 'Phil Mickelson', seed: 40, fallbackOwgr: 300, note: '3x Masters champion', country: 'United States' },
  ]

  const golfers = golferDefs.map(g => {
    const owgr = lookupOwgr(g.name, g.fallbackOwgr)
    const country = lookupCountry(g.name) || (g as { country?: string }).country || null
    const countryCode = country ? getCountryFlagCode(country) : null
    return {
      name: g.name,
      seed: g.seed,
      meta: {
        ...(owgr ? { owgr } : {}),
        ...(g.note ? { note: g.note } : {}),
        ...(country ? { country } : {}),
        ...(countryCode ? { country_code: countryCode } : {}),
        tier: getTier(owgr),
      },
    }
  })

  const participantRows = golfers.map(g => ({
    tournament_id: tournament.id,
    name: g.name,
    seed: g.seed,
    metadata: g.meta,
  }))

  const { error: pErr } = await admin.from('event_participants').insert(participantRows)
  if (pErr) throw pErr

  // Create 20 head-to-head matchups (pick once for the whole tournament)
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

  const gameRows: Record<string, unknown>[] = []
  for (let i = 0; i < 20; i++) {
    gameRows.push({
      tournament_id: tournament.id,
      game_number: i + 1,
      round: 'tournament',
      participant_1_id: seedToId[i + 1],
      participant_2_id: seedToId[40 - i],
      status: 'scheduled',
      starts_at: '2026-04-09T12:00:00Z', // Tournament start
    })
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
// REFRESH GOLF RANKINGS
// Updates existing golf participants with live OWGR + country data from ESPN.
// ============================================

async function refreshGolfRankings(admin: ReturnType<typeof createAdminClient>) {
  const rankings = await fetchGolfRankings()
  if (rankings.length === 0) {
    return NextResponse.json({ error: 'Failed to fetch rankings from ESPN' }, { status: 502 })
  }

  // Find all golf tournaments
  const { data: tournaments } = await admin
    .from('event_tournaments')
    .select('id, name')
    .eq('sport', 'golf')

  if (!tournaments?.length) {
    return NextResponse.json({ error: 'No golf tournaments found' }, { status: 404 })
  }

  const getTier = (owgr?: number) => {
    if (!owgr) return 'C'
    if (owgr <= 15) return 'A'
    if (owgr <= 30) return 'B'
    return 'C'
  }

  // Build lookup by lowercase name
  const rankingsByName: Record<string, { rank: number; country: string }> = {}
  for (const r of rankings) {
    rankingsByName[r.name.toLowerCase()] = { rank: r.rank, country: r.country }
  }

  let totalUpdated = 0

  for (const tournament of tournaments) {
    const { data: participants } = await admin
      .from('event_participants')
      .select('id, name, metadata')
      .eq('tournament_id', tournament.id)

    if (!participants) continue

    for (const p of participants) {
      const found = rankingsByName[p.name.toLowerCase()]
      if (!found) continue

      const existingMeta = (p.metadata || {}) as Record<string, unknown>
      const countryCode = getCountryFlagCode(found.country)
      const updatedMeta = {
        ...existingMeta,
        owgr: found.rank,
        tier: getTier(found.rank),
        country: found.country,
        ...(countryCode ? { country_code: countryCode } : {}),
      }

      await admin
        .from('event_participants')
        .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
        .eq('id', p.id)

      totalUpdated++
    }
  }

  return NextResponse.json({
    success: true,
    rankingsFetched: rankings.length,
    participantsUpdated: totalUpdated,
    tournaments: tournaments.map(t => t.name),
  })
}

// ============================================
// RESEED MASTERS GAMES
// Deletes existing 80 games + stale picks, re-creates 20 matchups.
// Safe to run on existing tournament to fix game count.
// ============================================

async function reseedMastersGames(admin: ReturnType<typeof createAdminClient>) {
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', 'masters-2026')
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Masters tournament not found. Run masters-2026 seed first.' }, { status: 400 })
  }

  // Get existing game IDs to delete associated picks
  const { data: existingGames } = await admin
    .from('event_games')
    .select('id')
    .eq('tournament_id', tournament.id)

  const existingGameIds = existingGames?.map(g => g.id) || []

  // Delete picks that reference these games
  if (existingGameIds.length > 0) {
    const { error: pickErr } = await admin
      .from('event_picks')
      .delete()
      .in('game_id', existingGameIds)

    if (pickErr) throw pickErr
  }

  // Delete existing games
  const { error: delErr } = await admin
    .from('event_games')
    .delete()
    .eq('tournament_id', tournament.id)

  if (delErr) throw delErr

  // Re-create 20 matchups with round: 'tournament'
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, seed')
    .eq('tournament_id', tournament.id)

  if (!participants) throw new Error('No participants found')

  const seedToId: Record<number, string> = {}
  for (const p of participants) {
    if (p.seed != null) seedToId[p.seed] = p.id
  }

  const gameRows: Record<string, unknown>[] = []
  for (let i = 0; i < 20; i++) {
    gameRows.push({
      tournament_id: tournament.id,
      game_number: i + 1,
      round: 'tournament',
      participant_1_id: seedToId[i + 1],
      participant_2_id: seedToId[40 - i],
      status: 'scheduled',
      starts_at: '2026-04-09T12:00:00Z',
    })
  }

  const { error: gErr } = await admin.from('event_games').insert(gameRows)
  if (gErr) throw gErr

  return NextResponse.json({
    success: true,
    action: 'reseed-masters-games',
    gamesDeleted: existingGameIds.length,
    picksDeleted: existingGameIds.length > 0 ? 'associated picks removed' : 'no picks to remove',
    gamesCreated: 20,
    message: 'Masters games re-seeded: 20 head-to-head matchups (pick once for tournament).',
  })
}

// ============================================
// UPDATE MASTERS CONFIG
// Fixes tournament format to 'multi' so Roster pools can be created.
// Safe to re-run — just updates tournament metadata.
// ============================================

async function updateMastersConfig(admin: ReturnType<typeof createAdminClient>) {
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id, format, config')
    .eq('slug', 'masters-2026')
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Masters tournament not found.' }, { status: 400 })
  }

  const { error } = await admin
    .from('event_tournaments')
    .update({
      format: 'multi',
      description: 'The 90th Masters Tournament at Augusta National. Create Pick\'em or Roster pools.',
      config: {
        ...(tournament.config as Record<string, unknown>),
        allowed_game_types: ['pickem', 'roster'],
        roster_tiers: {
          A: { count: 2, owgr_min: 1, owgr_max: 15 },
          B: { count: 2, owgr_min: 16, owgr_max: 30 },
          C: { count: 3, owgr_min: 31 },
        },
      },
    })
    .eq('id', tournament.id)

  if (error) throw error

  // Fix participants missing country/owgr data (past champions not in ESPN top 200)
  const hardcodedFixes: Record<string, { owgr: number; country: string; country_code: string }> = {
    'Jordan Spieth': { owgr: 56, country: 'United States', country_code: 'us' },
    'Tiger Woods': { owgr: 800, country: 'United States', country_code: 'us' },
    'Dustin Johnson': { owgr: 150, country: 'United States', country_code: 'us' },
    'Brooks Koepka': { owgr: 75, country: 'United States', country_code: 'us' },
    'Phil Mickelson': { owgr: 300, country: 'United States', country_code: 'us' },
  }

  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name, metadata')
    .eq('tournament_id', tournament.id)

  let fixed = 0
  for (const p of participants || []) {
    const fix = hardcodedFixes[p.name]
    if (!fix) continue
    const meta = (p.metadata || {}) as Record<string, unknown>
    if (meta.country_code) continue // already has data
    await admin
      .from('event_participants')
      .update({
        metadata: { ...meta, ...fix, tier: 'C' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', p.id)
    fixed++
  }

  return NextResponse.json({
    success: true,
    action: 'update-masters-config',
    previousFormat: tournament.format,
    newFormat: 'multi',
    participantsFixed: fixed,
    message: 'Masters tournament updated to multi-format. Roster and Pick\'em pools can now be created.',
  })
}

// ============================================
// SYNC GOLF FIELD
// Generic: fetches the full field from ESPN for any golf tournament.
// 1. Tries ESPN scoreboard (field available ~week of tournament)
// 2. Falls back to OWGR top N rankings
// Adds new participants, updates existing ones with country/ranking data.
// Body: { tournament: 'sync-golf-field', slug: 'masters-2026', topN?: 90 }
// ============================================

async function syncGolfField(
  admin: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const slug = body.slug as string
  const topN = (body.topN as number) || 90

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 })
  }

  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id, starts_at, config')
    .eq('slug', slug)
    .eq('sport', 'golf')
    .single()

  if (!tournament) {
    return NextResponse.json({ error: `Golf tournament '${slug}' not found` }, { status: 404 })
  }

  // Get existing participants
  const { data: existing } = await admin
    .from('event_participants')
    .select('id, name, seed, metadata')
    .eq('tournament_id', tournament.id)

  const existingByName: Record<string, { id: string; seed: number | null; metadata: Record<string, unknown> }> = {}
  for (const p of existing || []) {
    existingByName[p.name.toLowerCase()] = {
      id: p.id,
      seed: p.seed,
      metadata: (p.metadata || {}) as Record<string, unknown>,
    }
  }

  // Tier computation
  const config = (tournament.config || {}) as Record<string, unknown>
  const rosterTiers = config.roster_tiers as Record<string, { owgr_min: number; owgr_max?: number }> | undefined
  const getTier = (owgr: number) => {
    if (!rosterTiers) return owgr <= 15 ? 'A' : owgr <= 30 ? 'B' : 'C'
    for (const [key, def] of Object.entries(rosterTiers)) {
      if (owgr >= def.owgr_min && (!def.owgr_max || owgr <= def.owgr_max)) return key
    }
    return 'C'
  }

  // Strategy 1: Try ESPN scoreboard for published field
  const startDate = tournament.starts_at?.split('T')[0] || ''
  const espnField = startDate ? await fetchGolfField(startDate) : []

  // Strategy 2: OWGR rankings (always available)
  const owgrRankings = await fetchGolfRankings()
  const owgrByName: Record<string, { rank: number; country: string }> = {}
  for (const r of owgrRankings) {
    owgrByName[r.name.toLowerCase()] = { rank: r.rank, country: r.country }
  }

  // Merge: ESPN field takes priority (has real field), OWGR fills in rankings
  let added = 0
  let updated = 0
  let nextSeed = (existing || []).length + 1

  // Process ESPN field golfers first (these are the actual tournament entrants)
  const processedNames = new Set<string>()

  for (const golfer of espnField) {
    const nameKey = golfer.name.toLowerCase()
    processedNames.add(nameKey)
    const owgrData = owgrByName[nameKey]
    const owgr = owgrData?.rank || null
    const country = golfer.country || owgrData?.country || null
    const countryCode = country ? getCountryFlagCode(country) : golfer.countryCode

    const meta: Record<string, unknown> = {
      ...(owgr ? { owgr } : {}),
      ...(country ? { country } : {}),
      ...(countryCode ? { country_code: countryCode } : {}),
      ...(golfer.imageUrl ? { image_url: golfer.imageUrl } : {}),
      tier: owgr ? getTier(owgr) : 'C',
      espn_id: golfer.espnPlayerId,
    }

    const ex = existingByName[nameKey]
    if (ex) {
      // Update existing with fresh data
      await admin
        .from('event_participants')
        .update({ metadata: { ...ex.metadata, ...meta }, updated_at: new Date().toISOString() })
        .eq('id', ex.id)
      updated++
    } else {
      // Add new participant
      await admin.from('event_participants').insert({
        tournament_id: tournament.id,
        name: golfer.name,
        seed: nextSeed++,
        metadata: meta,
      })
      added++
    }
  }

  // If ESPN field was empty, supplement with OWGR top N (not already in tournament)
  if (espnField.length === 0) {
    const rankedGolfers = owgrRankings.slice(0, topN)
    for (const r of rankedGolfers) {
      const nameKey = r.name.toLowerCase()
      if (processedNames.has(nameKey)) continue
      processedNames.add(nameKey)

      const countryCode = getCountryFlagCode(r.country)
      const meta: Record<string, unknown> = {
        owgr: r.rank,
        country: r.country,
        ...(countryCode ? { country_code: countryCode } : {}),
        tier: getTier(r.rank),
      }

      const ex = existingByName[nameKey]
      if (ex) {
        await admin
          .from('event_participants')
          .update({ metadata: { ...ex.metadata, ...meta }, updated_at: new Date().toISOString() })
          .eq('id', ex.id)
        updated++
      } else {
        await admin.from('event_participants').insert({
          tournament_id: tournament.id,
          name: r.name,
          seed: nextSeed++,
          metadata: meta,
        })
        added++
      }
    }
  }

  return NextResponse.json({
    success: true,
    action: 'sync-golf-field',
    slug,
    source: espnField.length > 0 ? 'espn-field' : 'owgr-rankings',
    espnFieldSize: espnField.length,
    owgrRankingsSize: owgrRankings.length,
    added,
    updated,
    totalParticipants: (existing?.length || 0) + added,
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

// ============================================
// FROZEN FOUR 2026 — SCHEDULE
// Sets starts_at for later round games (regional finals, semis, championship).
// Round 1 dates are set during team seeding. This fills in the rest.
// ============================================

async function seedFrozenFourSchedule(admin: ReturnType<typeof createAdminClient>) {
  const { data: tournament } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', 'frozen-four-2026')
    .single()

  if (!tournament) {
    return NextResponse.json({ error: 'Frozen Four tournament not found' }, { status: 400 })
  }

  const { data: games } = await admin
    .from('event_games')
    .select('id, game_number, round')
    .eq('tournament_id', tournament.id)
    .order('game_number', { ascending: true })

  if (!games) throw new Error('No games found')

  // Schedule dates from tournament config
  // Regional QF: Mar 27-28 (already set)
  // Regional Finals: Mar 28-29
  // Frozen Four Semis: Apr 9
  // Championship: Apr 11
  const roundDates: Record<string, string> = {
    regional_final: '2026-03-29T18:00:00Z',
    semifinal: '2026-04-09T17:00:00Z',
    championship: '2026-04-11T20:00:00Z',
  }

  let updated = 0
  for (const game of games) {
    const date = roundDates[game.round]
    if (date) {
      await admin
        .from('event_games')
        .update({ starts_at: date })
        .eq('id', game.id)
      updated++
    }
  }

  return NextResponse.json({
    success: true,
    action: 'frozen-four-2026-schedule',
    gamesUpdated: updated,
  })
}

// ============================================
// SYNC HOCKEY LOGOS
// Fetches team logos from ESPN and updates event_participants.
// Matches by name (contains check for fuzzy matching).
// Can be re-run anytime — safe to call multiple times.
// ============================================

// Known name aliases where our DB name doesn't substring-match ESPN's name
const HOCKEY_NAME_ALIASES: Record<string, string[]> = {
  'Connecticut': ['UConn'],
  'Minnesota Duluth': ['Minnesota-Duluth', 'Minn. Duluth'],
}

function matchEspnTeam(
  participantName: string,
  espnTeams: { name: string; logoUrl: string | null }[],
): { name: string; logoUrl: string | null } | undefined {
  const pLower = participantName.toLowerCase()

  // Check aliases first
  const aliases = HOCKEY_NAME_ALIASES[participantName] || []
  for (const alias of aliases) {
    const found = espnTeams.find(t => t.name.toLowerCase().includes(alias.toLowerCase()))
    if (found) return found
  }

  // Find ALL ESPN teams whose name starts with our participant name.
  // Then pick the SHORTEST one — "Michigan Wolverines" beats "Michigan State Spartans"
  // because it's the closest match to "Michigan".
  const startMatches = espnTeams.filter(t =>
    t.name.toLowerCase().startsWith(pLower + ' ') || t.name.toLowerCase() === pLower
  )
  if (startMatches.length > 0) {
    startMatches.sort((a, b) => a.name.length - b.name.length)
    return startMatches[0]
  }

  // Fallback: substring match (but prefer shorter names)
  const subMatches = espnTeams.filter(t =>
    t.name.toLowerCase().includes(pLower) ||
    pLower.includes(t.name.toLowerCase())
  )
  if (subMatches.length > 0) {
    subMatches.sort((a, b) => a.name.length - b.name.length)
    return subMatches[0]
  }

  return undefined
}

async function syncHockeyLogos(admin: ReturnType<typeof createAdminClient>) {
  // Get all hockey tournaments
  const { data: tournaments } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('sport', 'hockey')

  if (!tournaments?.length) {
    return NextResponse.json({ error: 'No hockey tournaments found' }, { status: 404 })
  }

  const tournamentIds = tournaments.map(t => t.id)

  // Get all participants
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name')
    .in('tournament_id', tournamentIds)

  if (!participants?.length) {
    return NextResponse.json({ error: 'No participants found' }, { status: 404 })
  }

  // Fetch all NCAA hockey teams from ESPN (includes logos)
  const espnTeams = await fetchHockeyTeams(admin)

  // Sort participants by name length DESC so "Michigan State" matches before "Michigan"
  const sortedParticipants = [...participants].sort((a, b) => b.name.length - a.name.length)

  let matched = 0
  const matchDetails: Array<{ participant: string; espn: string | null }> = []
  for (const participant of sortedParticipants) {
    const espnTeam = matchEspnTeam(participant.name, espnTeams)

    if (espnTeam?.logoUrl) {
      await admin
        .from('event_participants')
        .update({ logo_url: espnTeam.logoUrl })
        .eq('id', participant.id)
      matched++
      matchDetails.push({ participant: participant.name, espn: espnTeam.name })
    } else {
      matchDetails.push({ participant: participant.name, espn: null })
    }
  }

  return NextResponse.json({
    success: true,
    action: 'sync-hockey-logos',
    totalParticipants: participants.length,
    logosMatched: matched,
    espnTeamsAvailable: espnTeams.length,
    matchDetails,
  })
}

// ============================================
// MEN'S SIX NATIONS 2026 — PICK'EM
// 6 teams, 5 rounds, 15 games. Predict every match result.
// Tournament already completed (Feb 1 – Mar 15, 2026) — seeded for demo/testing.
// ============================================

async function seedMSixNations(admin: ReturnType<typeof createAdminClient>) {
  const slug = 'm-six-nations-2026'

  const { data: existing } = await admin
    .from('event_tournaments')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: "Men's Six Nations 2026 already seeded", id: existing.id })
  }

  const { data: tournament, error: tErr } = await admin
    .from('event_tournaments')
    .insert({
      sport: 'rugby',
      name: "Men's Six Nations 2026",
      slug,
      format: 'pickem',
      status: 'upcoming',
      description: "Guinness Men's Six Nations 2026. Pick the winner of every match across 5 rounds. Earn bonus points for correctly predicting upsets.",
      rules_text: `## How to Play\n\n1. **Pick the winner of each match** before the round deadline.\n2. Earn **1 point** for each correct pick.\n3. Earn **2 bonus points** for correctly picking an upset (lower-seeded team wins).\n4. The player with the most points at the end of the tournament wins.\n\n### Deadlines\n- Picks lock 1 minute before the first kickoff of each round.\n- You can change your picks any time before the deadline.`,
      starts_at: '2026-02-01T00:00:00Z',
      ends_at: '2026-03-15T23:59:00Z',
      config: {
        scoring: { correct_pick: 1, upset_bonus: 2 },
      },
    })
    .select('id')
    .single()

  if (tErr) throw tErr

  // Seed 6 teams (same as Women's, same ESPN IDs)
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
  // Note: Pick'em uses round labels but no week_number (no elimination tracking)
  const fixtures = [
    // Round 1 — Sat Feb 1
    { round: 'round_1', num: 1, home: 'FRA', away: 'WAL', at: '2026-02-01T14:15:00Z', venue: 'Stade de France, Paris' },
    { round: 'round_1', num: 2, home: 'SCO', away: 'ITA', at: '2026-02-01T16:15:00Z', venue: 'Scottish Gas Murrayfield' },
    { round: 'round_1', num: 3, home: 'IRL', away: 'ENG', at: '2026-02-01T17:45:00Z', venue: 'Aviva Stadium, Dublin' },
    // Round 2 — Sat Feb 8
    { round: 'round_2', num: 4, home: 'ITA', away: 'WAL', at: '2026-02-08T14:15:00Z', venue: 'Stadio Olimpico, Rome' },
    { round: 'round_2', num: 5, home: 'ENG', away: 'FRA', at: '2026-02-08T16:45:00Z', venue: 'Allianz Stadium, Twickenham' },
    { round: 'round_2', num: 6, home: 'SCO', away: 'IRL', at: '2026-02-08T17:00:00Z', venue: 'Scottish Gas Murrayfield' },
    // Round 3 — Sat Feb 22
    { round: 'round_3', num: 7, home: 'ITA', away: 'IRL', at: '2026-02-22T14:15:00Z', venue: 'Stadio Olimpico, Rome' },
    { round: 'round_3', num: 8, home: 'WAL', away: 'ENG', at: '2026-02-22T16:45:00Z', venue: 'Principality Stadium, Cardiff' },
    { round: 'round_3', num: 9, home: 'FRA', away: 'SCO', at: '2026-02-22T21:00:00Z', venue: 'Stade de France, Paris' },
    // Round 4 — Sat Mar 8
    { round: 'round_4', num: 10, home: 'IRL', away: 'FRA', at: '2026-03-08T14:15:00Z', venue: 'Aviva Stadium, Dublin' },
    { round: 'round_4', num: 11, home: 'WAL', away: 'SCO', at: '2026-03-08T16:45:00Z', venue: 'Principality Stadium, Cardiff' },
    { round: 'round_4', num: 12, home: 'ENG', away: 'ITA', at: '2026-03-08T17:00:00Z', venue: 'Allianz Stadium, Twickenham' },
    // Round 5 — Sat Mar 15 (Super Saturday)
    { round: 'round_5', num: 13, home: 'SCO', away: 'ENG', at: '2026-03-15T14:15:00Z', venue: 'Scottish Gas Murrayfield' },
    { round: 'round_5', num: 14, home: 'FRA', away: 'ITA', at: '2026-03-15T16:45:00Z', venue: 'Stade de France, Paris' },
    { round: 'round_5', num: 15, home: 'WAL', away: 'IRL', at: '2026-03-15T21:00:00Z', venue: 'Principality Stadium, Cardiff' },
  ]

  const gameRows = fixtures.map(f => ({
    tournament_id: tournament.id,
    game_number: f.num,
    round: f.round,
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
    tournament: 'm-six-nations-2026',
    id: tournament.id,
    participants: teams.length,
    games: fixtures.length,
  })
}

// ─── Refresh Golf Metadata (country flags) ────────────────────────
async function refreshGolfMetadata(
  admin: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const slug = (body.slug as string) || 'masters-2026'

  // Find tournament
  const { data: tournament, error: tErr } = await admin
    .from('event_tournaments')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (tErr || !tournament) {
    return NextResponse.json({ error: `Tournament not found: ${slug}` }, { status: 404 })
  }

  // Get all participants
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name, metadata')
    .eq('tournament_id', tournament.id)

  if (!participants?.length) {
    return NextResponse.json({ error: 'No participants found' }, { status: 404 })
  }

  // Fetch OWGR rankings for country data
  const rankings = await fetchGolfRankings()
  const rankingsByName = new Map<string, { country: string; rank: number }>()
  for (const r of rankings) {
    rankingsByName.set(r.name.toLowerCase(), { country: r.country, rank: r.rank })
  }

  // Hardcoded country data for past champions not in OWGR top 200
  const PAST_CHAMPION_COUNTRIES: Record<string, string> = {
    'jordan spieth': 'United States',
    'tiger woods': 'United States',
    'dustin johnson': 'United States',
    'brooks koepka': 'United States',
    'phil mickelson': 'United States',
    'bubba watson': 'United States',
    'patrick reed': 'United States',
    'danny willett': 'England',
    'adam scott': 'Australia',
    'charl schwartzel': 'South Africa',
    'angel cabrera': 'Argentina',
    'trevor immelman': 'South Africa',
    'zach johnson': 'United States',
    'mike weir': 'Canada',
    'vijay singh': 'Fiji',
    'jose maria olazabal': 'Spain',
    'fred couples': 'United States',
    'bernhard langer': 'Germany',
    'ian woosnam': 'Wales',
    'sandy lyle': 'Scotland',
    'ludvig aberg': 'Sweden',
    'larry mize': 'United States',
    'jack nicklaus': 'United States',
    'ben crenshaw': 'United States',
    'nick faldo': 'England',
    'mark o\'meara': 'United States',
  }

  let updated = 0
  let skipped = 0
  const updateLog: string[] = []

  for (const p of participants) {
    const meta = (p.metadata || {}) as Record<string, unknown>

    // Skip if already has country_code
    if (meta.country_code) {
      skipped++
      continue
    }

    // Try to find country from rankings
    const nameLower = p.name.toLowerCase()
    const ranking = rankingsByName.get(nameLower)
    let country = ranking?.country

    // Fallback to hardcoded past champions
    if (!country) {
      country = PAST_CHAMPION_COUNTRIES[nameLower]
    }

    if (!country) {
      updateLog.push(`No match: ${p.name}`)
      skipped++
      continue
    }

    const countryCode = getCountryFlagCode(country)
    if (!countryCode) {
      updateLog.push(`No flag code for: ${p.name} (${country})`)
      skipped++
      continue
    }

    // Update metadata
    const updatedMeta: Record<string, unknown> = { ...meta, country, country_code: countryCode }
    if (ranking?.rank && !meta.owgr) {
      updatedMeta.owgr = ranking.rank
    }

    await admin
      .from('event_participants')
      .update({ metadata: updatedMeta })
      .eq('id', p.id)

    updated++
    updateLog.push(`Updated: ${p.name} → ${country} (${countryCode})`)
  }

  return NextResponse.json({
    success: true,
    tournament: slug,
    total: participants.length,
    updated,
    skipped,
    log: updateLog,
  })
}
