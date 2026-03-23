import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { autoPickSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { selectAutoPickSchool, type AutoPickContext } from '@/lib/draft/auto-pick'
import { notifyLeagueMembers } from '@/lib/notifications'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

// Reset auto_pick_enabled for all teams in a league (used on draft start/reset)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult

    const supabase = createAdminClient()

    await supabase
      .from('fantasy_teams')
      .update({ auto_pick_enabled: false })
      .eq('league_id', leagueId)

    return NextResponse.json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Reset auto-pick error:', error)
    return NextResponse.json({ error: 'Failed to reset auto-pick' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!

  try {
    const { id: leagueId } = await params

    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const isMember = await verifyLeagueMembership(user.id, leagueId)
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawBody = await request.json()
    const validation = validateBody(autoPickSchema, rawBody)
    if (!validation.success) return validation.response

    const { draftId, expectedPick } = validation.data
    const supabase = createAdminClient()

    // Fetch current draft state
    const { data: draft } = await supabase
      .from('drafts')
      .select('id, status, current_round, current_pick, current_team_id, pick_deadline, league_id')
      .eq('id', draftId)
      .eq('league_id', leagueId)
      .single()

    if (!draft) {
      return NextResponse.json({ skipped: true, reason: 'draft_not_found' })
    }

    // Idempotency: only act if draft is active and on the expected pick
    if (draft.status !== 'in_progress') {
      return NextResponse.json({ skipped: true, reason: 'draft_not_active' })
    }

    if (draft.current_pick !== expectedPick) {
      return NextResponse.json({ skipped: true, reason: 'pick_already_advanced' })
    }

    if (!draft.current_team_id) {
      return NextResponse.json({ skipped: true, reason: 'no_current_team' })
    }

    // Check if the current team has auto_pick_enabled (skip timer check if so)
    const { data: currentTeamRow } = await supabase
      .from('fantasy_teams')
      .select('auto_pick_enabled')
      .eq('id', draft.current_team_id)
      .single()

    const autoPickEnabled = currentTeamRow?.auto_pick_enabled === true

    // Timer validation: only auto-pick if timer expired OR auto_pick_enabled
    if (!autoPickEnabled) {
      if (!draft.pick_deadline) {
        return NextResponse.json({ skipped: true, reason: 'no_deadline' })
      }
      if (new Date(draft.pick_deadline) > new Date()) {
        return NextResponse.json({ skipped: true, reason: 'timer_not_expired' })
      }
    }

    // Fetch prerequisite data
    const [
      { data: league },
      { data: settings },
      { data: currentTeam },
      { data: draftOrder },
    ] = await Promise.all([
      supabase
        .from('leagues')
        .select('name, season_id, seasons(year)')
        .eq('id', leagueId)
        .single(),
      supabase
        .from('league_settings')
        .select('schools_per_team, max_school_selections_total, max_school_selections_per_team, draft_timer_seconds')
        .eq('league_id', leagueId)
        .single(),
      supabase
        .from('fantasy_teams')
        .select('id, name, user_id')
        .eq('id', draft.current_team_id)
        .single(),
      supabase
        .from('draft_order')
        .select('fantasy_team_id, pick_number, round')
        .eq('draft_id', draftId)
        .order('pick_number'),
    ])

    if (!league || !settings || !currentTeam || !draftOrder) {
      return NextResponse.json({ error: 'Failed to load draft data' }, { status: 500 })
    }

    const seasonYear = (league.seasons as unknown as { year: number })?.year || new Date().getFullYear()

    // Build auto-pick context
    const ctx: AutoPickContext = {
      draftId,
      leagueId,
      teamId: currentTeam.id,
      userId: currentTeam.user_id,
      currentPick: draft.current_pick,
      currentRound: draft.current_round,
      seasonId: league.season_id,
      seasonYear,
      schoolsPerTeam: settings.schools_per_team,
      maxSelectionsTotal: settings.max_school_selections_total,
      maxSelectionsPerTeam: settings.max_school_selections_per_team,
    }

    // Run auto-pick algorithm
    const result = await selectAutoPickSchool(supabase, ctx)

    if (!result) {
      // No school available — skip the pick (advance without inserting)
      if (!autoPickEnabled) {
        await supabase
          .from('fantasy_teams')
          .update({ auto_pick_enabled: true })
          .eq('id', currentTeam.id)
      }
      await advanceDraft(supabase, draft, draftOrder, settings.draft_timer_seconds, leagueId, league.name)
      return NextResponse.json({
        success: true,
        pick: null,
        skippedPick: true,
        reason: 'no_available_schools',
      })
    }

    // Insert the draft pick
    const { error: pickError } = await supabase
      .from('draft_picks')
      .insert({
        draft_id: draftId,
        fantasy_team_id: currentTeam.id,
        school_id: result.schoolId,
        round: draft.current_round,
        pick_number: draft.current_pick,
        is_auto_pick: true,
      })

    if (pickError) {
      // Unique constraint violation = another client already made this pick
      if (pickError.code === '23505') {
        return NextResponse.json({ skipped: true, reason: 'pick_already_made' })
      }
      return NextResponse.json({ error: 'Failed to insert pick' }, { status: 500 })
    }

    // If this auto-pick was triggered by timer expiry (not by user toggle),
    // enable auto_pick for this team so future picks are immediate
    if (!autoPickEnabled) {
      await supabase
        .from('fantasy_teams')
        .update({ auto_pick_enabled: true })
        .eq('id', currentTeam.id)
    }

    // Add to roster
    await supabase
      .from('roster_periods')
      .insert({
        fantasy_team_id: currentTeam.id,
        school_id: result.schoolId,
        slot_number: draft.current_pick,
        start_week: 1,
        season_id: league.season_id,
      })

    // Advance to next pick
    await advanceDraft(supabase, draft, draftOrder, settings.draft_timer_seconds, leagueId, league.name)

    return NextResponse.json({
      success: true,
      pick: {
        schoolId: result.schoolId,
        schoolName: result.schoolName,
        conference: result.conference,
        source: result.source,
        isAutoPick: true,
        teamName: currentTeam.name,
      },
    })
  } catch (error) {
    Sentry.captureException(error)
    console.error('Auto-pick error:', error)
    return NextResponse.json(
      { error: 'Auto-pick failed', details: String(error) },
      { status: 500 }
    )
  }
}

// ── Advance Draft (server-side version of advanceToNextPick) ──

interface DraftState {
  id: string
  current_pick: number
}

interface DraftOrderEntry {
  fantasy_team_id: string
  pick_number: number
  round: number
}

async function advanceDraft(
  supabase: ReturnType<typeof createAdminClient>,
  draft: DraftState,
  draftOrder: DraftOrderEntry[],
  timerSeconds: number,
  leagueId?: string,
  leagueName?: string
) {
  const nextPickNumber = draft.current_pick + 1
  const nextOrder = draftOrder.find(o => o.pick_number === nextPickNumber)

  if (!nextOrder) {
    // Draft complete
    await supabase
      .from('drafts')
      .update({
        status: 'completed',
        current_team_id: null,
        pick_deadline: null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', draft.id)

    // Send draft complete notification to all league members
    if (leagueId) {
      notifyLeagueMembers({
        leagueId,
        type: 'draft_completed',
        title: 'Draft Completed',
        body: `The draft for ${leagueName || 'your league'} is complete!`,
        data: { draftId: draft.id },
      })
    }
    return
  }

  // Set next pick with fresh timer
  const deadline = new Date(Date.now() + (timerSeconds || 60) * 1000)

  await supabase
    .from('drafts')
    .update({
      current_round: nextOrder.round,
      current_pick: nextPickNumber,
      current_team_id: nextOrder.fantasy_team_id,
      pick_deadline: deadline.toISOString(),
    })
    .eq('id', draft.id)
}
