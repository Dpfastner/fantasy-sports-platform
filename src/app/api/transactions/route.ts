import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSimulatedDate } from '@/lib/week'
import { requireAuth, verifyLeagueMembership } from '@/lib/auth'
import { validateBody } from '@/lib/api/validation'
import { transactionSchema } from '@/lib/api/schemas'
import { createRateLimiter, getClientIp } from '@/lib/api/rate-limit'
import { logActivity } from '@/lib/activity'
import { notifyLeagueMembers } from '@/lib/notifications'

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function POST(request: NextRequest) {
  const { limited, response } = limiter.check(getClientIp(request))
  if (limited) return response!
  try {
    // Verify user is authenticated
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const rawBody = await request.json()
    const validation = validateBody(transactionSchema, rawBody)
    if (!validation.success) return validation.response

    const {
      teamId,
      leagueId,
      seasonId,
      weekNumber,
      droppedSchoolId,
      addedSchoolId,
      slotNumber,
      rosterPeriodId,
    } = validation.data

    const supabase = createAdminClient()

    // Get team and verify the requesting user owns it
    const { data: team, error: teamError } = await supabase
      .from('fantasy_teams')
      .select('id, user_id, add_drops_used, league_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    if (team.user_id !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to do this." },
        { status: 403 }
      )
    }

    // Get league settings
    const { data: settings, error: settingsError } = await supabase
      .from('league_settings')
      .select('max_add_drops_per_season, add_drop_deadline, max_school_selections_total')
      .eq('league_id', leagueId)
      .single()

    if (settingsError) {
      return NextResponse.json(
        { error: "Couldn't load league settings. Try refreshing the page." },
        { status: 500 }
      )
    }

    // Check if deadline has passed (using simulated date for sandbox testing)
    if (settings?.add_drop_deadline) {
      // Get season year for simulated date calculation
      let seasonYear = new Date().getFullYear()
      if (seasonId) {
        const { data: season } = await supabase
          .from('seasons')
          .select('year')
          .eq('id', seasonId)
          .single()
        if (season) {
          seasonYear = season.year
        }
      }

      const deadline = new Date(settings.add_drop_deadline)
      const currentDate = await getSimulatedDate(seasonYear)
      if (currentDate > deadline) {
        return NextResponse.json(
          { error: 'The add/drop deadline has passed' },
          { status: 400 }
        )
      }
    }

    // Check if team has remaining transactions
    const maxTransactions = settings?.max_add_drops_per_season || 50
    if (team.add_drops_used >= maxTransactions) {
      return NextResponse.json(
        { error: 'You have used all your transactions for this season' },
        { status: 400 }
      )
    }

    // Determine if this is an add-only transaction (empty roster slot)
    const isAddOnly = !droppedSchoolId || !rosterPeriodId

    if (isAddOnly) {
      // Verify the team actually has an empty slot
      const { data: settingsForRoster } = await supabase
        .from('league_settings')
        .select('schools_per_team')
        .eq('league_id', leagueId)
        .single()
      const maxRosterSize = settingsForRoster?.schools_per_team || 12

      const { data: activeRoster } = await supabase
        .from('roster_periods')
        .select('id')
        .eq('fantasy_team_id', teamId)
        .is('end_week', null)

      if ((activeRoster?.length || 0) >= maxRosterSize) {
        return NextResponse.json(
          { error: 'Your roster is full. You must drop a school to add one.' },
          { status: 400 }
        )
      }
    }

    if (!isAddOnly) {
      // Verify the roster period exists and belongs to the team
      const { data: rosterPeriod, error: rosterError } = await supabase
        .from('roster_periods')
        .select('id, school_id, fantasy_team_id, end_week')
        .eq('id', rosterPeriodId!)
        .eq('fantasy_team_id', teamId)
        .single()

      if (rosterError || !rosterPeriod) {
        return NextResponse.json(
          { error: 'Roster period not found' },
          { status: 404 }
        )
      }

      if (rosterPeriod.end_week !== null) {
        return NextResponse.json(
          { error: 'This school has already been dropped' },
          { status: 400 }
        )
      }

      if (rosterPeriod.school_id !== droppedSchoolId) {
        return NextResponse.json(
          { error: 'Something went wrong. Try again.' },
          { status: 400 }
        )
      }
    }

    // Check if the added school is already on the team
    const { data: existingRoster } = await supabase
      .from('roster_periods')
      .select('id')
      .eq('fantasy_team_id', teamId)
      .eq('school_id', addedSchoolId)
      .is('end_week', null)
      .single()

    if (existingRoster) {
      return NextResponse.json(
        { error: 'This school is already on your roster' },
        { status: 400 }
      )
    }

    // Check if the added school exceeds max selections league-wide
    const maxSelections = settings?.max_school_selections_total || 3
    const { count: selectionCount } = await supabase
      .from('roster_periods')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', addedSchoolId)
      .is('end_week', null)
      .eq('fantasy_teams.league_id', leagueId)

    // Need to join with fantasy_teams to filter by league
    const { data: leagueSelections } = await supabase
      .from('roster_periods')
      .select(`
        id,
        fantasy_teams!inner (league_id)
      `)
      .eq('school_id', addedSchoolId)
      .eq('fantasy_teams.league_id', leagueId)
      .is('end_week', null)

    if ((leagueSelections?.length || 0) >= maxSelections) {
      return NextResponse.json(
        { error: `This school has already been selected by ${maxSelections} teams` },
        { status: 400 }
      )
    }

    // All validations passed - execute the transaction

    // 1. Update the dropped school's roster period with end_week (skip for add-only)
    if (!isAddOnly && rosterPeriodId) {
      const { error: updateError } = await supabase
        .from('roster_periods')
        .update({ end_week: weekNumber })
        .eq('id', rosterPeriodId)

      if (updateError) {
        return NextResponse.json(
          { error: "Couldn't update your roster. Try again." },
          { status: 500 }
        )
      }
    }

    // 2. Create new roster period for the added school
    const { error: insertError } = await supabase
      .from('roster_periods')
      .insert({
        fantasy_team_id: teamId,
        school_id: addedSchoolId,
        slot_number: slotNumber,
        start_week: weekNumber,
        end_week: null,
        season_id: seasonId || null,
      })

    if (insertError) {
      // Rollback the previous update (only if we dropped someone)
      if (!isAddOnly && rosterPeriodId) {
        await supabase
          .from('roster_periods')
          .update({ end_week: null })
          .eq('id', rosterPeriodId)
      }

      return NextResponse.json(
        { error: "Couldn't add school to roster. Try again." },
        { status: 500 }
      )
    }

    // 3. Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        fantasy_team_id: teamId,
        week_number: weekNumber,
        dropped_school_id: droppedSchoolId || null,
        added_school_id: addedSchoolId,
        slot_number: slotNumber,
        season_id: seasonId || null,
      })

    if (txError) {
      console.error('Failed to create transaction record:', txError)
      // Don't fail the whole transaction for this
    }

    // 4. Increment add_drops_used on the team
    const { error: teamUpdateError } = await supabase
      .from('fantasy_teams')
      .update({ add_drops_used: team.add_drops_used + 1 })
      .eq('id', teamId)

    if (teamUpdateError) {
      console.error('Failed to update team transaction count:', teamUpdateError)
      // Don't fail the whole transaction for this
    }

    logActivity({
      userId: user.id,
      leagueId,
      action: 'transaction.completed',
      details: { teamId, droppedSchoolId, addedSchoolId, weekNumber, slotNumber },
    })

    // Fetch school names for the notification
    const { data: addedSchool } = await supabase.from('schools').select('name').eq('id', addedSchoolId).single()
    const { data: teamInfo } = await supabase.from('fantasy_teams').select('name').eq('id', teamId).single()
    let droppedLabel: string | null = null
    if (droppedSchoolId) {
      const { data: droppedSchool } = await supabase.from('schools').select('name').eq('id', droppedSchoolId).single()
      droppedLabel = droppedSchool?.name || 'a school'
    }

    const addedLabel = addedSchool?.name || 'a school'
    const teamLabel = teamInfo?.name || 'A team'

    const notifBody = droppedLabel
      ? `${teamLabel} dropped ${droppedLabel} and added ${addedLabel}`
      : `${teamLabel} added ${addedLabel}`

    notifyLeagueMembers({
      leagueId,
      excludeUserId: user.id,
      type: 'transaction_completed',
      title: 'Transaction Completed',
      body: notifBody,
      data: { leagueId },
    })

    return NextResponse.json({
      success: true,
      message: 'Transaction completed successfully',
      transaction: {
        droppedSchoolId,
        addedSchoolId,
        weekNumber,
        slotNumber,
      },
    })
  } catch (error) {
    console.error('Transaction error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint for fetching transaction history
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await requireAuth()
    if (authResult instanceof NextResponse) return authResult
    const { user } = authResult

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const leagueId = searchParams.get('leagueId')

    if (!teamId && !leagueId) {
      return NextResponse.json(
        { error: 'teamId or leagueId required' },
        { status: 400 }
      )
    }

    // Verify user is a member of the league
    if (leagueId) {
      const isMember = await verifyLeagueMembership(user.id, leagueId)
      if (!isMember) {
        return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 })
      }
    }

    const supabase = createAdminClient()

    let query = supabase
      .from('transactions')
      .select(`
        id,
        week_number,
        slot_number,
        created_at,
        fantasy_team_id,
        fantasy_teams (name),
        dropped_school:schools!transactions_dropped_school_id_fkey (
          id, name, abbreviation, logo_url
        ),
        added_school:schools!transactions_added_school_id_fkey (
          id, name, abbreviation, logo_url
        )
      `)
      .order('created_at', { ascending: false })

    if (teamId) {
      query = query.eq('fantasy_team_id', teamId)
    }

    // If leagueId is provided, we need to filter by league
    if (leagueId && !teamId) {
      const { data: leagueTeams } = await supabase
        .from('fantasy_teams')
        .select('id')
        .eq('league_id', leagueId)

      const teamIds = leagueTeams?.map(t => t.id) || []
      if (teamIds.length > 0) {
        query = query.in('fantasy_team_id', teamIds)
      }
    }

    const { data: transactions, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Couldn't load transactions. Try refreshing the page." },
        { status: 500 }
      )
    }

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Try again.' },
      { status: 500 }
    )
  }
}
