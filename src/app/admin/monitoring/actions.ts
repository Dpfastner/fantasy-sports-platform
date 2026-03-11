'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ADMIN_USER_IDS } from '@/lib/constants/admin'
import { fetchScoreboard, fetchRankings } from '@/lib/api/espn'
import {
  validateScoreboardResponse,
  validateRankingsResponse,
  hashResponseStructure,
  logApiHealth,
} from '@/lib/api/espn-monitor'

async function verifyAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return !error && !!user && ADMIN_USER_IDS.includes(user.id)
}

export async function getHealthChecks(): Promise<{ data?: unknown[]; error?: string }> {
  if (!(await verifyAdmin())) return { error: 'Unauthorized' }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('espn_api_health')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(50)

  if (error) return { error: error.message }
  return { data: data || [] }
}

export async function runHealthTest(): Promise<{
  success: boolean
  scoreboardValid?: boolean
  rankingsValid?: boolean
  error?: string
}> {
  if (!(await verifyAdmin())) return { success: false, error: 'Unauthorized' }

  const supabase = createAdminClient()
  const year = new Date().getFullYear()

  let scoreboardValid = false
  let rankingsValid = false

  // Test scoreboard
  try {
    const start = Date.now()
    const games = await fetchScoreboard(year, 1, 2)
    const time = Date.now() - start
    const validation = validateScoreboardResponse({ events: games })
    const hash = hashResponseStructure({ events: games })
    await logApiHealth(supabase, 'scoreboard', 200, time, validation.valid, hash, validation.issues)
    scoreboardValid = validation.valid
  } catch (err) {
    await logApiHealth(supabase, 'scoreboard', 0, 0, false, '', [`Fetch error: ${String(err)}`])
  }

  // Test rankings
  try {
    const start = Date.now()
    const rankingsData = await fetchRankings(year)
    const time = Date.now() - start
    const validation = validateRankingsResponse(rankingsData)
    const hash = hashResponseStructure(rankingsData)
    await logApiHealth(supabase, 'rankings', 200, time, validation.valid, hash, validation.issues)
    rankingsValid = validation.valid
  } catch (err) {
    await logApiHealth(supabase, 'rankings', 0, 0, false, '', [`Fetch error: ${String(err)}`])
  }

  return { success: true, scoreboardValid, rankingsValid }
}
