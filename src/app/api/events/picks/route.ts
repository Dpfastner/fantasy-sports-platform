import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient as createServerClient, createAdminClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validation'
import {
  eventBracketPickSchema,
  eventSurvivorPickSchema,
  eventPickemPickSchema,
  eventRosterPickSchema,
} from '@/lib/api/schemas'
import { validateRosterCompleteness, getDraftMode, type RosterScoringRules, DEFAULT_ROSTER_SCORING } from '@/lib/events/shared'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 })

// GET /api/events/picks?entryId=xxx
// Returns all picks for the user's entry
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')
    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify entry belongs to user
    const { data: entry } = await admin
      .from('event_entries')
      .select('id, pool_id, user_id')
      .eq('id', entryId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Allow viewing own picks or pool member picks
    if (entry.user_id !== user.id) {
      const { data: userEntry } = await admin
        .from('event_entries')
        .select('id')
        .eq('pool_id', entry.pool_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!userEntry) {
        return NextResponse.json({ error: 'Not a member of this pool' }, { status: 403 })
      }
    }

    const { data: picks } = await admin
      .from('event_picks')
      .select('*, event_participants(id, name, short_name, seed, logo_url)')
      .eq('entry_id', entryId)
      .order('picked_at', { ascending: true })

    return NextResponse.json({ picks: picks || [] })
  } catch (err) {
    console.error('Picks fetch error:', err)
    Sentry.captureException(err, { tags: { route: 'events/picks', action: 'fetch' } })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// POST /api/events/picks
// Submit picks — format detected from pool's tournament format
export async function POST(request: Request) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const rawBody = await request.json()
    const admin = createAdminClient()

    // Determine format from entry's pool
    const entryId = rawBody.entryId
    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    const { data: entry } = await admin
      .from('event_entries')
      .select(`
        id, user_id, pool_id, is_active,
        event_pools(id, tournament_id, game_type, status, deadline, scoring_rules, tiebreaker,
          event_tournaments(id, format, status, bracket_size, config)
        )
      `)
      .eq('id', entryId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (entry.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your entry' }, { status: 403 })
    }

    if (!entry.is_active) {
      return NextResponse.json({ error: 'You have been eliminated from this pool' }, { status: 409 })
    }

    const pool = entry.event_pools as unknown as {
      id: string
      tournament_id: string
      game_type: string
      status: string
      deadline: string | null
      scoring_rules: Record<string, unknown>
      tiebreaker: string
      event_tournaments: {
        id: string
        format: string
        status: string
        bracket_size: number | null
        config: Record<string, unknown>
      }
    }

    if (pool.status !== 'open') {
      return NextResponse.json({ error: 'This pool is locked' }, { status: 409 })
    }

    // Use pool.game_type (per-pool) instead of tournament.format
    const gameType = pool.game_type

    if (gameType === 'bracket') {
      return handleBracketPicks(rawBody, entry, pool, admin, user.id)
    } else if (gameType === 'survivor') {
      return handleSurvivorPick(rawBody, entry, pool, admin, user.id)
    } else if (gameType === 'pickem') {
      return handlePickemPicks(rawBody, entry, pool, admin, user.id)
    } else if (gameType === 'roster') {
      return handleRosterPicks(rawBody, entry, pool, admin, user.id)
    }

    return NextResponse.json({ error: `Unknown game type: ${gameType}` }, { status: 400 })
  } catch (err) {
    console.error('Pick submission error:', err)
    Sentry.captureException(err, { tags: { route: 'events/picks', action: 'submit' } })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// ── BRACKET PICKS ──

async function handleBracketPicks(
  rawBody: unknown,
  entry: { id: string },
  pool: { id: string; tournament_id: string; deadline: string | null; tiebreaker: string },
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const validation = validateBody(eventBracketPickSchema, rawBody)
  if (!validation.success) return validation.response

  const { picks, tiebreakerPrediction } = validation.data

  // Tiebreaker validation
  if (pool.tiebreaker !== 'none' && !tiebreakerPrediction) {
    return NextResponse.json({ error: 'Tiebreaker prediction is required' }, { status: 400 })
  }
  if (pool.tiebreaker === 'championship_score' && tiebreakerPrediction &&
      tiebreakerPrediction.team1_score === 0 && tiebreakerPrediction.team2_score === 0) {
    return NextResponse.json({ error: 'Tiebreaker scores cannot both be zero' }, { status: 400 })
  }

  // Server-side deadline enforcement
  if (pool.deadline && new Date(pool.deadline) < new Date()) {
    return NextResponse.json({ error: 'The deadline has passed' }, { status: 409 })
  }

  // Validate all game IDs belong to this tournament
  const gameIds = picks.map(p => p.gameId)
  const { data: games } = await admin
    .from('event_games')
    .select('id, tournament_id, status')
    .in('id', gameIds)

  if (!games || games.length !== picks.length) {
    return NextResponse.json({ error: 'One or more invalid game IDs' }, { status: 400 })
  }

  const invalidGames = games.filter(g => g.tournament_id !== pool.tournament_id)
  if (invalidGames.length > 0) {
    return NextResponse.json({ error: 'Games do not belong to this tournament' }, { status: 400 })
  }

  // Validate all participant IDs belong to this tournament
  const participantIds = picks.map(p => p.participantId)
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, tournament_id')
    .in('id', participantIds)

  if (!participants || participants.length !== new Set(participantIds).size) {
    return NextResponse.json({ error: 'One or more invalid participant IDs' }, { status: 400 })
  }

  const invalidParticipants = participants.filter(p => p.tournament_id !== pool.tournament_id)
  if (invalidParticipants.length > 0) {
    return NextResponse.json({ error: 'Participants do not belong to this tournament' }, { status: 400 })
  }

  // Delete existing picks for this entry (replace all)
  await admin
    .from('event_picks')
    .delete()
    .eq('entry_id', entry.id)

  // Insert new picks
  const pickRows = picks.map(p => ({
    entry_id: entry.id,
    game_id: p.gameId,
    participant_id: p.participantId,
    picked_at: new Date().toISOString(),
  }))

  const { error: insertError } = await admin
    .from('event_picks')
    .insert(pickRows)

  if (insertError) {
    console.error('Bracket pick insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }

  // Update tiebreaker and submitted_at
  await admin
    .from('event_entries')
    .update({
      tiebreaker_prediction: tiebreakerPrediction || null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entry.id)

  // Log activity
  await admin.from('event_activity_log').insert({
    pool_id: pool.id,
    tournament_id: pool.tournament_id,
    user_id: userId,
    action: 'bracket.submitted',
    details: { pick_count: picks.length, has_tiebreaker: !!tiebreakerPrediction },
  })
  logActivity({ userId, action: 'event.bracket_completed', details: { poolId: pool.id, tournamentId: pool.tournament_id, pickCount: picks.length } })

  return NextResponse.json({ success: true, pickCount: picks.length })
}

// ── SURVIVOR PICK ──

async function handleSurvivorPick(
  rawBody: unknown,
  entry: { id: string },
  pool: { id: string; tournament_id: string },
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const validation = validateBody(eventSurvivorPickSchema, rawBody)
  if (!validation.success) return validation.response

  const { weekNumber, participantId } = validation.data

  // Check week deadline (server-side enforcement)
  const { data: poolWeek } = await admin
    .from('event_pool_weeks')
    .select('id, deadline, resolution_status')
    .eq('pool_id', pool.id)
    .eq('week_number', weekNumber)
    .single()

  if (!poolWeek) {
    return NextResponse.json({ error: `Week ${weekNumber} not found` }, { status: 404 })
  }

  if (new Date(poolWeek.deadline) < new Date()) {
    return NextResponse.json({ error: 'The deadline for this week has passed' }, { status: 409 })
  }

  if (poolWeek.resolution_status === 'resolved') {
    return NextResponse.json({ error: 'This week has already been resolved' }, { status: 409 })
  }

  // Validate participant belongs to tournament
  const { data: participant } = await admin
    .from('event_participants')
    .select('id, name, tournament_id')
    .eq('id', participantId)
    .single()

  if (!participant || participant.tournament_id !== pool.tournament_id) {
    return NextResponse.json({ error: 'Invalid participant' }, { status: 400 })
  }

  // Check team hasn't been used in a previous week
  const { data: existingPicks } = await admin
    .from('event_picks')
    .select('id, week_number, participant_id, missed_deadline')
    .eq('entry_id', entry.id)

  const usedInOtherWeek = (existingPicks || []).some(
    p => p.participant_id === participantId &&
         p.week_number !== weekNumber &&
         !p.missed_deadline
  )

  if (usedInOtherWeek) {
    return NextResponse.json({
      error: `You already used ${participant.name} in a previous week`,
    }, { status: 409 })
  }

  // Upsert: delete old pick for this week, insert new one
  const existingWeekPick = (existingPicks || []).find(p => p.week_number === weekNumber)
  if (existingWeekPick) {
    await admin.from('event_picks').delete().eq('id', existingWeekPick.id)
  }

  const { error: insertError } = await admin
    .from('event_picks')
    .insert({
      entry_id: entry.id,
      week_number: weekNumber,
      participant_id: participantId,
      picked_at: new Date().toISOString(),
    })

  if (insertError) {
    console.error('Survivor pick insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 })
  }

  // Log activity
  await admin.from('event_activity_log').insert({
    pool_id: pool.id,
    tournament_id: pool.tournament_id,
    user_id: userId,
    action: 'survivor.pick_submitted',
    details: { week: weekNumber, participant: participant.name },
  })
  logActivity({ userId, action: 'event.survivor_pick_made', details: { poolId: pool.id, tournamentId: pool.tournament_id, week: weekNumber } })

  return NextResponse.json({ success: true, participant: participant.name })
}

// ── PICK'EM PICKS ──

async function handlePickemPicks(
  rawBody: unknown,
  entry: { id: string },
  pool: { id: string; tournament_id: string; deadline: string | null },
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const validation = validateBody(eventPickemPickSchema, rawBody)
  if (!validation.success) return validation.response

  const { picks } = validation.data

  // Server-side deadline enforcement
  if (pool.deadline && new Date(pool.deadline) < new Date()) {
    return NextResponse.json({ error: 'The deadline has passed' }, { status: 409 })
  }

  // Validate all game IDs belong to tournament
  const gameIds = picks.map(p => p.gameId)
  const { data: games } = await admin
    .from('event_games')
    .select('id, tournament_id')
    .in('id', gameIds)

  if (!games || games.length !== picks.length) {
    return NextResponse.json({ error: 'One or more invalid game IDs' }, { status: 400 })
  }

  const invalidGames = games.filter(g => g.tournament_id !== pool.tournament_id)
  if (invalidGames.length > 0) {
    return NextResponse.json({ error: 'Games do not belong to this tournament' }, { status: 400 })
  }

  // Validate participant IDs
  const participantIds = picks.map(p => p.participantId)
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, tournament_id')
    .in('id', participantIds)

  if (!participants || participants.length !== new Set(participantIds).size) {
    return NextResponse.json({ error: 'One or more invalid participant IDs' }, { status: 400 })
  }

  // Delete existing picks for this entry (replace all)
  await admin
    .from('event_picks')
    .delete()
    .eq('entry_id', entry.id)

  // Insert new picks
  const pickRows = picks.map(p => ({
    entry_id: entry.id,
    game_id: p.gameId,
    participant_id: p.participantId,
    picked_at: new Date().toISOString(),
  }))

  const { error: insertError } = await admin
    .from('event_picks')
    .insert(pickRows)

  if (insertError) {
    console.error('Pickem pick insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save picks' }, { status: 500 })
  }

  // Update submitted_at
  await admin
    .from('event_entries')
    .update({
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entry.id)

  // Log activity
  await admin.from('event_activity_log').insert({
    pool_id: pool.id,
    tournament_id: pool.tournament_id,
    user_id: userId,
    action: 'pickem.submitted',
    details: { pick_count: picks.length },
  })
  logActivity({ userId, action: 'event.picks_submitted', details: { poolId: pool.id, tournamentId: pool.tournament_id, pickCount: picks.length } })

  return NextResponse.json({ success: true, pickCount: picks.length })
}

// ── ROSTER PICKS ──

async function handleRosterPicks(
  rawBody: unknown,
  entry: { id: string },
  pool: {
    id: string
    tournament_id: string
    deadline: string | null
    scoring_rules: Record<string, unknown>
    event_tournaments: { config: Record<string, unknown> }
  },
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const validation = validateBody(eventRosterPickSchema, rawBody)
  if (!validation.success) return validation.response

  const { picks } = validation.data

  // Enforce deadline
  if (pool.deadline && new Date(pool.deadline) < new Date()) {
    return NextResponse.json({ error: 'The deadline has passed. Rosters are locked.' }, { status: 409 })
  }

  // Load tournament participants with metadata
  const { data: participants } = await admin
    .from('event_participants')
    .select('id, name, seed, metadata')
    .eq('tournament_id', pool.tournament_id)

  if (!participants?.length) {
    return NextResponse.json({ error: 'No participants found for this tournament' }, { status: 500 })
  }

  // Determine scoring rules: pool-level > tournament config > defaults
  const poolRules = pool.scoring_rules as Partial<RosterScoringRules> | null
  const tournamentConfig = pool.event_tournaments.config || {}
  const rosterTiers = (tournamentConfig.roster_tiers || poolRules?.tiers || DEFAULT_ROSTER_SCORING.tiers) as RosterScoringRules['tiers']

  const rules: RosterScoringRules = {
    roster_size: (poolRules?.roster_size as number) || DEFAULT_ROSTER_SCORING.roster_size,
    count_best: (poolRules?.count_best as number) || DEFAULT_ROSTER_SCORING.count_best,
    tiers: rosterTiers,
    cut_penalty: (poolRules?.cut_penalty as RosterScoringRules['cut_penalty']) || DEFAULT_ROSTER_SCORING.cut_penalty,
    cut_penalty_fixed: poolRules?.cut_penalty_fixed,
  }

  // Validate pick count matches roster_size
  if (picks.length !== rules.roster_size) {
    return NextResponse.json({
      error: `You must pick exactly ${rules.roster_size} golfers (got ${picks.length})`,
    }, { status: 400 })
  }

  // Validate all participants exist in tournament
  const participantIds = new Set(participants.map(p => p.id))
  for (const pick of picks) {
    if (!participantIds.has(pick.participantId)) {
      return NextResponse.json({ error: `Invalid golfer selection: ${pick.participantId}` }, { status: 400 })
    }
  }

  // Validate tier constraints
  const { isValid, errors } = validateRosterCompleteness(
    picks.map(p => p.participantId),
    participants as unknown as Parameters<typeof validateRosterCompleteness>[1],
    rules
  )

  if (!isValid) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  // Enforce selection cap for limited mode
  const draftMode = getDraftMode(pool.scoring_rules)
  const selectionCap = (pool.scoring_rules as Partial<RosterScoringRules>)?.selection_cap

  if (draftMode === 'limited' && selectionCap && selectionCap > 0) {
    // Count existing picks per participant across all OTHER entries in this pool
    const { data: allPoolEntries } = await admin
      .from('event_entries')
      .select('id')
      .eq('pool_id', pool.id)
      .neq('id', entry.id)

    if (allPoolEntries?.length) {
      const otherEntryIds = allPoolEntries.map(e => e.id)
      const { data: otherPicks } = await admin
        .from('event_picks')
        .select('participant_id')
        .in('entry_id', otherEntryIds)
        .is('game_id', null)
        .is('week_number', null)

      // Build count map
      const selectionCounts: Record<string, number> = {}
      for (const p of (otherPicks || [])) {
        selectionCounts[p.participant_id] = (selectionCounts[p.participant_id] || 0) + 1
      }

      // Check if any of the user's picks would exceed the cap
      const overCap = picks.filter(p => (selectionCounts[p.participantId] || 0) >= selectionCap)
      if (overCap.length > 0) {
        const names = overCap.map(p => {
          const participant = participants.find(pt => pt.id === p.participantId)
          return participant?.name || p.participantId
        })
        return NextResponse.json({
          error: `Selection cap reached (max ${selectionCap} per golfer): ${names.join(', ')}`,
        }, { status: 409 })
      }
    }
  }

  // Reject open picks for snake/linear draft pools (must use draft API)
  if (draftMode === 'snake_draft' || draftMode === 'linear_draft') {
    return NextResponse.json({
      error: 'This pool uses a live draft. Picks must be submitted through the draft room.',
    }, { status: 400 })
  }

  // Replace-all: delete existing picks for this entry
  await admin
    .from('event_picks')
    .delete()
    .eq('entry_id', entry.id)
    .is('game_id', null)
    .is('week_number', null)

  // Insert new roster picks
  const pickRows = picks.map(p => ({
    entry_id: entry.id,
    participant_id: p.participantId,
    picked_at: new Date().toISOString(),
  }))

  const { error: insertError } = await admin
    .from('event_picks')
    .insert(pickRows)

  if (insertError) {
    console.error('Roster pick insert failed:', insertError)
    return NextResponse.json({ error: 'Failed to save roster' }, { status: 500 })
  }

  // Update submitted_at
  await admin
    .from('event_entries')
    .update({
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entry.id)

  // Log activity
  await admin.from('event_activity_log').insert({
    pool_id: pool.id,
    tournament_id: pool.tournament_id,
    user_id: userId,
    action: 'roster.submitted',
    details: { pick_count: picks.length },
  })
  logActivity({ userId, action: 'event.picks_submitted', details: { poolId: pool.id, tournamentId: pool.tournament_id, pickCount: picks.length, gameType: 'roster' } })

  return NextResponse.json({ success: true, pickCount: picks.length })
}
