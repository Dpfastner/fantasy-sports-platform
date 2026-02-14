import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { areCronsEnabled, getEnvironment } from '@/lib/env'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(url, key)
}

interface ReconciliationResult {
  teamPointsFixed: number
  highPointsFixed: number
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const expectedKey = process.env.CRON_SECRET || process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Skip cron jobs in non-production environments
    if (!areCronsEnabled()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Crons disabled in ${getEnvironment()} environment`,
        timestamp: new Date().toISOString(),
      })
    }

    const supabase = getSupabaseAdmin()
    const result: ReconciliationResult = {
      teamPointsFixed: 0,
      highPointsFixed: 0,
      errors: [],
    }

    console.log('Starting nightly reconciliation...')

    // 1. Reconcile fantasy team total points
    // Get all fantasy teams with their weekly points
    const { data: teams, error: teamsError } = await supabase
      .from('fantasy_teams')
      .select('id, total_points, high_points_winnings')

    if (teamsError) {
      result.errors.push(`Failed to fetch teams: ${teamsError.message}`)
    } else if (teams) {
      for (const team of teams) {
        // Get sum of weekly points
        const { data: weeklyPoints, error: wpError } = await supabase
          .from('fantasy_team_weekly_points')
          .select('points, high_points_amount')
          .eq('fantasy_team_id', team.id)

        if (wpError) {
          result.errors.push(`Failed to fetch weekly points for team ${team.id}: ${wpError.message}`)
          continue
        }

        const calculatedTotal = weeklyPoints?.reduce((sum, wp) => sum + Number(wp.points || 0), 0) || 0
        const calculatedHighPoints = weeklyPoints?.reduce((sum, wp) => sum + Number(wp.high_points_amount || 0), 0) || 0

        // Check if totals match
        const currentTotal = Number(team.total_points || 0)
        const currentHighPoints = Number(team.high_points_winnings || 0)

        if (Math.abs(calculatedTotal - currentTotal) > 0.01) {
          console.log(`Team ${team.id}: total_points mismatch. Current: ${currentTotal}, Calculated: ${calculatedTotal}`)

          const { error: updateError } = await supabase
            .from('fantasy_teams')
            .update({ total_points: calculatedTotal })
            .eq('id', team.id)

          if (updateError) {
            result.errors.push(`Failed to update total_points for team ${team.id}: ${updateError.message}`)
          } else {
            result.teamPointsFixed++
          }
        }

        if (Math.abs(calculatedHighPoints - currentHighPoints) > 0.01) {
          console.log(`Team ${team.id}: high_points_winnings mismatch. Current: ${currentHighPoints}, Calculated: ${calculatedHighPoints}`)

          const { error: updateError } = await supabase
            .from('fantasy_teams')
            .update({ high_points_winnings: calculatedHighPoints })
            .eq('id', team.id)

          if (updateError) {
            result.errors.push(`Failed to update high_points_winnings for team ${team.id}: ${updateError.message}`)
          } else {
            result.highPointsFixed++
          }
        }
      }
    }

    // 2. Verify high points winners per week per league
    const { data: leagues, error: leaguesError } = await supabase
      .from('leagues')
      .select(`
        id,
        league_settings (
          high_points_enabled,
          high_points_weekly_amount,
          high_points_allow_ties
        )
      `)

    if (leaguesError) {
      result.errors.push(`Failed to fetch leagues: ${leaguesError.message}`)
    } else if (leagues) {
      for (const league of leagues) {
        const settings = Array.isArray(league.league_settings)
          ? league.league_settings[0]
          : league.league_settings

        if (!settings?.high_points_enabled) continue

        // Get all teams in this league
        const { data: leagueTeams } = await supabase
          .from('fantasy_teams')
          .select('id')
          .eq('league_id', league.id)

        if (!leagueTeams || leagueTeams.length === 0) continue

        const teamIds = leagueTeams.map(t => t.id)

        // Get all weekly points for these teams
        const { data: weeklyData } = await supabase
          .from('fantasy_team_weekly_points')
          .select('id, fantasy_team_id, week_number, points, is_high_points_winner')
          .in('fantasy_team_id', teamIds)

        if (!weeklyData) continue

        // Group by week
        const weeklyGroups = new Map<number, typeof weeklyData>()
        for (const wp of weeklyData) {
          if (!weeklyGroups.has(wp.week_number)) {
            weeklyGroups.set(wp.week_number, [])
          }
          weeklyGroups.get(wp.week_number)!.push(wp)
        }

        // Verify high points winner for each week
        for (const [week, weekPoints] of weeklyGroups) {
          if (weekPoints.length === 0) continue

          const maxPoints = Math.max(...weekPoints.map(wp => Number(wp.points)))
          const winners = weekPoints.filter(wp => Number(wp.points) === maxPoints)

          // Check if correct teams are marked as winners
          for (const wp of weekPoints) {
            const isWinner = winners.includes(wp)
            const shouldBeMarked = isWinner && (settings.high_points_allow_ties || winners.length === 1)

            if (wp.is_high_points_winner !== shouldBeMarked) {
              console.log(`Week ${week}: Fixing high_points_winner for entry ${wp.id}. Current: ${wp.is_high_points_winner}, Should be: ${shouldBeMarked}`)

              const { error: updateError } = await supabase
                .from('fantasy_team_weekly_points')
                .update({ is_high_points_winner: shouldBeMarked })
                .eq('id', wp.id)

              if (updateError) {
                result.errors.push(`Failed to update high_points_winner for entry ${wp.id}: ${updateError.message}`)
              } else {
                result.highPointsFixed++
              }
            }
          }
        }
      }
    }

    console.log('Reconciliation complete:', result)

    return NextResponse.json({
      success: true,
      message: 'Reconciliation complete',
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json(
      { error: 'Reconciliation failed', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Nightly reconciliation endpoint',
    usage: 'POST with Authorization: Bearer <CRON_SECRET>',
    description: 'Verifies and fixes data integrity issues in fantasy teams and weekly points',
  })
}
