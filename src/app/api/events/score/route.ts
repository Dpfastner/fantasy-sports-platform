import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })
import {
  scoreBracketEntry,
  scorePickemEntry,
  evaluateSurvivorWeek,
  scoreRosterEntry,
  resolveTiebreaker,
  type BracketScoringRules,
  type PickemScoringRules,
  type SurvivorScoringRules,
  type RosterScoringRules,
  DEFAULT_BRACKET_SCORING,
  DEFAULT_PICKEM_SCORING,
  DEFAULT_SURVIVOR_SCORING,
  DEFAULT_ROSTER_SCORING,
} from '@/lib/events/shared'
import type { EventGame, EventParticipant, EventPick } from '@/types/database'

// POST /api/events/score
// Triggered by cron or admin to resolve picks for completed games.
// Body: { tournamentId: string, weekNumber?: number }
export async function POST(request: Request) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  // Verify cron secret or admin
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { tournamentId, weekNumber } = await request.json()
    if (!tournamentId) {
      return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get tournament
    const { data: tournament } = await admin
      .from('event_tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Get participants
    const { data: participants } = await admin
      .from('event_participants')
      .select('*')
      .eq('tournament_id', tournamentId)

    if (!participants) {
      return NextResponse.json({ error: 'No participants found' }, { status: 500 })
    }

    // Get all pools for this tournament
    const { data: pools } = await admin
      .from('event_pools')
      .select('*')
      .eq('tournament_id', tournamentId)

    if (!pools?.length) {
      return NextResponse.json({ message: 'No pools to score' })
    }

    // Get completed games (not needed for roster pools, but used by others)
    let completedGames: EventGame[] = []
    const hasGameBasedPools = pools.some(p => p.game_type !== 'roster')

    if (hasGameBasedPools) {
      let gamesQuery = admin
        .from('event_games')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')

      if (weekNumber != null) {
        gamesQuery = gamesQuery.eq('week_number', weekNumber)
      }

      const { data: games } = await gamesQuery
      completedGames = games || []

      if (!completedGames.length && !pools.some(p => p.game_type === 'roster')) {
        return NextResponse.json({ message: 'No completed games to score' })
      }
    }

    let totalUpdated = 0

    for (const pool of pools) {
      // Use pool.game_type for dispatch (supports multi-format tournaments)
      const gameType = pool.game_type as string

      if (gameType === 'bracket') {
        if (completedGames.length) {
          totalUpdated += await scoreBracketPool(admin, pool, completedGames, participants)
        }
      } else if (gameType === 'pickem') {
        if (completedGames.length) {
          totalUpdated += await scorePickemPool(admin, pool, completedGames, participants)
        }
      } else if (gameType === 'survivor') {
        if (completedGames.length) {
          totalUpdated += await scoreSurvivorPool(admin, pool, completedGames, participants, weekNumber)
        }
      } else if (gameType === 'roster') {
        totalUpdated += await scoreRosterPool(admin, pool, participants)
      }
    }

    return NextResponse.json({
      success: true,
      gamesScored: completedGames.length,
      entriesUpdated: totalUpdated,
    })
  } catch (err) {
    console.error('Event scoring error:', err)
    Sentry.captureException(err, { tags: { route: 'events/score', monitor: 'event-scoring' } })
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}

// ── BRACKET SCORING ──

async function scoreBracketPool(
  admin: ReturnType<typeof createAdminClient>,
  pool: Record<string, unknown>,
  games: EventGame[],
  participants: EventParticipant[]
): Promise<number> {
  const poolId = pool.id as string
  const scoringRules = (pool.scoring_rules || DEFAULT_BRACKET_SCORING) as BracketScoringRules

  // Get all entries for this pool
  const { data: entries } = await admin
    .from('event_entries')
    .select('id, user_id')
    .eq('pool_id', poolId)

  if (!entries?.length) return 0

  let updated = 0

  for (const entry of entries) {
    // Get picks for this entry
    const { data: picks } = await admin
      .from('event_picks')
      .select('*')
      .eq('entry_id', entry.id)

    if (!picks?.length) continue

    const { totalPoints, results } = scoreBracketEntry(picks, games, participants, scoringRules)

    // Update individual pick records
    for (const result of results) {
      if (result.isCorrect !== null) {
        await admin
          .from('event_picks')
          .update({
            is_correct: result.isCorrect,
            points_earned: result.pointsEarned,
            resolved_at: new Date().toISOString(),
          })
          .eq('entry_id', entry.id)
          .eq('game_id', result.gameId)
      }
    }

    // Update entry total
    await admin
      .from('event_entries')
      .update({
        total_points: totalPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)

    updated++
  }

  return updated
}

// ── PICK'EM SCORING ──

async function scorePickemPool(
  admin: ReturnType<typeof createAdminClient>,
  pool: Record<string, unknown>,
  games: EventGame[],
  participants: EventParticipant[]
): Promise<number> {
  const poolId = pool.id as string
  const scoringRules = (pool.scoring_rules || DEFAULT_PICKEM_SCORING) as PickemScoringRules

  const { data: entries } = await admin
    .from('event_entries')
    .select('id')
    .eq('pool_id', poolId)

  if (!entries?.length) return 0

  let updated = 0

  for (const entry of entries) {
    const { data: picks } = await admin
      .from('event_picks')
      .select('*')
      .eq('entry_id', entry.id)

    if (!picks?.length) continue

    const { totalPoints, results } = scorePickemEntry(picks, games, participants, scoringRules)

    for (const result of results) {
      if (result.isCorrect !== null) {
        await admin
          .from('event_picks')
          .update({
            is_correct: result.isCorrect,
            points_earned: result.pointsEarned,
            resolved_at: new Date().toISOString(),
          })
          .eq('entry_id', entry.id)
          .eq('game_id', result.gameId)
      }
    }

    await admin
      .from('event_entries')
      .update({
        total_points: totalPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)

    updated++
  }

  return updated
}

// ── SURVIVOR SCORING ──
// IMPORTANT: Week-level resolution — only processes when ALL matches in the week are completed.

async function scoreSurvivorPool(
  admin: ReturnType<typeof createAdminClient>,
  pool: Record<string, unknown>,
  completedGames: EventGame[],
  participants: EventParticipant[],
  weekNumber?: number
): Promise<number> {
  const poolId = pool.id as string
  const scoringRules = (pool.scoring_rules || DEFAULT_SURVIVOR_SCORING) as SurvivorScoringRules
  const tournamentId = pool.tournament_id as string

  // Get pool weeks to process
  let weeksQuery = admin
    .from('event_pool_weeks')
    .select('*')
    .eq('pool_id', poolId)
    .neq('resolution_status', 'resolved')

  if (weekNumber != null) {
    weeksQuery = weeksQuery.eq('week_number', weekNumber)
  }

  const { data: unresolvedWeeks } = await weeksQuery
  if (!unresolvedWeeks?.length) return 0

  let updated = 0

  for (const week of unresolvedWeeks) {
    // Get ALL games for this week (not just completed)
    const { data: allWeekGames } = await admin
      .from('event_games')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('week_number', week.week_number)

    if (!allWeekGames?.length) continue

    // Check if ALL games in this week are completed
    const allCompleted = allWeekGames.every(g => g.status === 'completed' || g.status === 'cancelled')

    if (!allCompleted) {
      // Update to in_progress if some games are completed
      const someCompleted = allWeekGames.some(g => g.status === 'completed')
      if (someCompleted && week.resolution_status === 'pending') {
        await admin
          .from('event_pool_weeks')
          .update({ resolution_status: 'in_progress' })
          .eq('id', week.id)
      }
      continue // Don't resolve until ALL matches are done
    }

    // All matches completed — resolve this week
    const { data: entries } = await admin
      .from('event_entries')
      .select('id, user_id, is_active, strikes_used')
      .eq('pool_id', poolId)

    if (!entries?.length) continue

    for (const entry of entries) {
      // Skip already-eliminated entries
      if (!entry.is_active) continue

      // Get this entry's pick for this week
      const { data: pickData } = await admin
        .from('event_picks')
        .select('*')
        .eq('entry_id', entry.id)
        .eq('week_number', week.week_number)
        .maybeSingle()

      const result = evaluateSurvivorWeek(pickData, allWeekGames, participants, scoringRules)

      if (result.isCorrect === false) {
        // Check strikes
        const newStrikesUsed = entry.strikes_used + 1
        const strikesAllowed = scoringRules.strikes_allowed || 0

        if (newStrikesUsed > strikesAllowed) {
          // Eliminated
          await admin
            .from('event_entries')
            .update({
              is_active: false,
              eliminated_week: week.week_number,
              elimination_reason: result.eliminationReason,
              strikes_used: newStrikesUsed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id)

          // Log elimination
          await admin.from('event_activity_log').insert({
            pool_id: poolId,
            tournament_id: tournamentId,
            user_id: entry.user_id,
            action: 'survivor.eliminated',
            details: {
              week: week.week_number,
              reason: result.eliminationReason,
              participant: result.participantName,
            },
          })

          // Notify user of elimination
          const poolName = pool.name as string || 'Survivor Pool'
          const reasonText = result.eliminationReason === 'missed_deadline'
            ? 'You missed the deadline'
            : result.eliminationReason === 'draw'
            ? `${result.participantName} drew`
            : `${result.participantName} lost`
          createNotification({
            userId: entry.user_id,
            type: 'event_eliminated',
            title: `Eliminated — ${poolName}`,
            body: `${reasonText} in Week ${week.week_number}. You survived ${week.week_number - 1} week(s).`,
            data: { poolId, tournamentId, week: week.week_number },
          })
        } else {
          // Strike used but not eliminated
          await admin
            .from('event_entries')
            .update({
              strikes_used: newStrikesUsed,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id)
        }
      }

      // Update pick record
      if (pickData && result.isCorrect !== null) {
        await admin
          .from('event_picks')
          .update({
            is_correct: result.isCorrect,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', pickData.id)
      }

      // Create missed deadline pick record (idempotent check)
      if (result.missedDeadline && !pickData) {
        const { data: existingMissed } = await admin
          .from('event_picks')
          .select('id')
          .eq('entry_id', entry.id)
          .eq('week_number', week.week_number)
          .eq('missed_deadline', true)
          .maybeSingle()

        if (!existingMissed) {
          // Need a valid participant_id — use first participant as placeholder
          const placeholderParticipant = participants[0]
          if (placeholderParticipant) {
            await admin.from('event_picks').insert({
              entry_id: entry.id,
              week_number: week.week_number,
              participant_id: placeholderParticipant.id,
              missed_deadline: true,
              is_correct: false,
              resolved_at: new Date().toISOString(),
            })
          }
        }
      }

      updated++
    }

    // Mark week as resolved
    await admin
      .from('event_pool_weeks')
      .update({
        resolution_status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', week.id)
  }

  return updated
}

// ── ROSTER SCORING ──
// Scores based on participant metadata (score_to_par, status) — no games needed.

async function scoreRosterPool(
  admin: ReturnType<typeof createAdminClient>,
  pool: Record<string, unknown>,
  participants: EventParticipant[]
): Promise<number> {
  const poolId = pool.id as string
  const poolRules = (pool.scoring_rules || {}) as Partial<RosterScoringRules>

  const rules: RosterScoringRules = {
    roster_size: poolRules.roster_size || DEFAULT_ROSTER_SCORING.roster_size,
    count_best: poolRules.count_best || DEFAULT_ROSTER_SCORING.count_best,
    tiers: poolRules.tiers || DEFAULT_ROSTER_SCORING.tiers,
    cut_penalty: poolRules.cut_penalty || DEFAULT_ROSTER_SCORING.cut_penalty,
    cut_penalty_fixed: poolRules.cut_penalty_fixed,
  }

  // Get all entries for this pool
  const { data: entries } = await admin
    .from('event_entries')
    .select('id')
    .eq('pool_id', poolId)

  if (!entries?.length) return 0

  let updated = 0

  for (const entry of entries) {
    // Get roster picks for this entry (game_id IS NULL and week_number IS NULL)
    const { data: picks } = await admin
      .from('event_picks')
      .select('*')
      .eq('entry_id', entry.id)
      .is('game_id', null)
      .is('week_number', null)

    if (!picks?.length) continue

    const { totalPoints, results } = scoreRosterEntry(picks, participants, rules)

    // Update individual pick points_earned (each golfer's contribution)
    for (const result of results) {
      if (result.adjustedScore != null) {
        await admin
          .from('event_picks')
          .update({
            points_earned: result.adjustedScore,
            resolved_at: new Date().toISOString(),
          })
          .eq('entry_id', entry.id)
          .eq('participant_id', result.participantId)
          .is('game_id', null)
      }
    }

    // Update entry total (null totalPoints means no scores yet — keep as 0)
    await admin
      .from('event_entries')
      .update({
        total_points: totalPoints ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entry.id)

    updated++
  }

  return updated
}
