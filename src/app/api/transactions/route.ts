import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSimulatedDate } from '@/lib/week'

// Create admin client for transaction processing
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      teamId,
      leagueId,
      seasonId,
      weekNumber,
      droppedSchoolId,
      addedSchoolId,
      slotNumber,
      rosterPeriodId,
    } = body

    if (!teamId || !leagueId || !weekNumber || !droppedSchoolId || !addedSchoolId || !slotNumber || !rosterPeriodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Get team and verify ownership via the request
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

    // Get league settings
    const { data: settings, error: settingsError } = await supabase
      .from('league_settings')
      .select('max_add_drops_per_season, add_drop_deadline, max_school_selections_total')
      .eq('league_id', leagueId)
      .single()

    if (settingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch league settings' },
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

    // Verify the roster period exists and belongs to the team
    const { data: rosterPeriod, error: rosterError } = await supabase
      .from('roster_periods')
      .select('id, school_id, fantasy_team_id, end_week')
      .eq('id', rosterPeriodId)
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
        { error: 'School ID mismatch' },
        { status: 400 }
      )
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

    // 1. Update the dropped school's roster period with end_week
    const { error: updateError } = await supabase
      .from('roster_periods')
      .update({ end_week: weekNumber })
      .eq('id', rosterPeriodId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update roster period' },
        { status: 500 }
      )
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
      })

    if (insertError) {
      // Rollback the previous update
      await supabase
        .from('roster_periods')
        .update({ end_week: null })
        .eq('id', rosterPeriodId)

      return NextResponse.json(
        { error: 'Failed to add new school to roster' },
        { status: 500 }
      )
    }

    // 3. Create transaction record
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        fantasy_team_id: teamId,
        week_number: weekNumber,
        dropped_school_id: droppedSchoolId,
        added_school_id: addedSchoolId,
        slot_number: slotNumber,
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for fetching transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const leagueId = searchParams.get('leagueId')

    if (!teamId && !leagueId) {
      return NextResponse.json(
        { error: 'teamId or leagueId required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

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
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
