'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculateAllPoints } from '@/lib/points/calculator'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'

interface GameScoreUpdate {
  gameId: string
  homeScore: number
  awayScore: number
  status: string
}

interface SaveResult {
  success: boolean
  gamesUpdated: number
  pointsRecalculated: boolean
  error?: string
}

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || !ADMIN_USER_IDS.includes(user.id)) {
    return { error: 'Unauthorized' }
  }
  return { userId: user.id }
}

export async function getGamesForWeek(
  seasonId: string,
  weekNumber: number
): Promise<{ data?: unknown[]; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('games')
    .select('id, external_game_id, week_number, game_date, game_time, home_school_id, away_school_id, home_team_name, home_team_logo_url, away_team_name, away_team_logo_url, home_score, away_score, home_rank, away_rank, status, is_manual_override, manual_override_at')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .order('game_date')
    .order('game_time')

  if (error) return { error: error.message }
  return { data: data || [] }
}

export async function getSeasonInfo(): Promise<{ data?: { id: string; year: number }; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = createAdminClient()
  const year = new Date().getFullYear()
  const { data, error } = await supabase
    .from('seasons')
    .select('id, year')
    .eq('year', year)
    .single()

  if (error) return { error: error.message }
  return { data }
}

export async function saveManualScores(
  seasonId: string,
  weekNumber: number,
  updates: GameScoreUpdate[]
): Promise<SaveResult> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { success: false, gamesUpdated: 0, pointsRecalculated: false, error: auth.error }

  const supabase = createAdminClient()
  let gamesUpdated = 0

  for (const update of updates) {
    const { error } = await supabase
      .from('games')
      .update({
        home_score: update.homeScore,
        away_score: update.awayScore,
        status: update.status,
        is_manual_override: true,
        manual_override_at: new Date().toISOString(),
        manual_override_by: auth.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.gameId)

    if (!error) gamesUpdated++
  }

  // Recalculate points for all leagues
  let pointsRecalculated = false
  try {
    await calculateAllPoints(seasonId, weekNumber, supabase)
    pointsRecalculated = true
  } catch (err) {
    return {
      success: true,
      gamesUpdated,
      pointsRecalculated: false,
      error: `Scores saved but points recalculation failed: ${String(err)}`,
    }
  }

  return { success: true, gamesUpdated, pointsRecalculated }
}

export async function clearManualOverrides(
  seasonId: string,
  weekNumber: number
): Promise<{ success: boolean; cleared: number; error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { success: false, cleared: 0, error: auth.error }

  const supabase = createAdminClient()

  // Get count of manual overrides first
  const { data: manualGames } = await supabase
    .from('games')
    .select('id')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .eq('is_manual_override', true)

  const count = manualGames?.length || 0
  if (count === 0) return { success: true, cleared: 0 }

  const { error } = await supabase
    .from('games')
    .update({
      is_manual_override: false,
      manual_override_at: null,
      manual_override_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .eq('is_manual_override', true)

  if (error) return { success: false, cleared: 0, error: error.message }
  return { success: true, cleared: count }
}
