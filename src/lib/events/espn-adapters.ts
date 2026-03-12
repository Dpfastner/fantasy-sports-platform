/**
 * ESPN API adapters for event game sports.
 * Fetches scores, fixtures, and participant data from ESPN public APIs.
 *
 * Follows platform patterns:
 * - Uses monitoredFetch from espn-monitor.ts for API health tracking
 * - Logs to espn_api_health table with structure hashing
 * - Sentry alerts on structure changes or failures
 * - Timeout on all fetch calls
 *
 * ESPN API patterns:
 * - Site API: https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}
 * - Core API: https://sports.core.api.espn.com/v2/sports/{sport}/leagues/{leagueId}
 */

import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  logApiHealth,
  hashResponseStructure,
  type ValidationResult,
} from '@/lib/api/espn-monitor'

// ============================================
// Sport configurations
// ============================================

export interface ESPNSportConfig {
  sport: string
  league: string
  /** Core API league ID (for real-time scores) */
  coreLeagueId?: string
  /** Site API path */
  siteApiPath: string
  /** Team ID → short_name mapping */
  teamMap: Record<string, string>
}

export const ESPN_SPORTS: Record<string, ESPNSportConfig> = {
  hockey: {
    sport: 'hockey',
    league: 'mens-college-hockey',
    siteApiPath: 'hockey/mens-college-hockey',
    teamMap: {},
  },
  golf: {
    sport: 'golf',
    league: 'pga',
    siteApiPath: 'golf/pga',
    teamMap: {},
  },
  rugby: {
    sport: 'rugby',
    league: 'six-nations',
    coreLeagueId: '180659',
    siteApiPath: 'rugby/rugby-union',
    teamMap: {
      '1': 'ENG',
      '2': 'SCO',
      '3': 'IRL',
      '4': 'WAL',
      '9': 'FRA',
      '20': 'ITA',
    },
  },
}

// ESPN abbreviation normalization (ESPN sometimes uses different codes)
const ABBREVIATION_MAP: Record<string, string> = {
  'IRE': 'IRL',
}

function normalizeAbbreviation(abbr: string): string {
  return ABBREVIATION_MAP[abbr] || abbr
}

// ============================================
// Monitored fetch with health tracking
// ============================================

const SITE_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports'
const CORE_API_BASE = 'https://sports.core.api.espn.com/v2/sports'
const FETCH_TIMEOUT_MS = 10000

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Monitored fetch that logs to espn_api_health and alerts via Sentry.
 * Pass supabase=null to skip monitoring (e.g., in client-side polling).
 */
async function monitoredEventFetch(
  supabase: SupabaseClient | null,
  endpoint: string,
  url: string,
  validator: (data: unknown) => ValidationResult
): Promise<{ data: unknown; statusCode: number }> {
  const start = Date.now()

  let response: Response
  try {
    response = await fetchWithTimeout(url)
  } catch (err) {
    const elapsed = Date.now() - start
    const message = err instanceof Error && err.name === 'AbortError'
      ? `ESPN API timeout after ${elapsed}ms for "${endpoint}"`
      : `ESPN API fetch failed for "${endpoint}": ${err instanceof Error ? err.message : String(err)}`

    console.error(`[ESPN Events] ${message}`)
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { endpoint, monitor: 'espn-events' },
    })

    if (supabase) {
      await logApiHealth(supabase, endpoint, 0, elapsed, false, '', [message]).catch(() => {})
    }
    throw new Error(message)
  }

  const responseTimeMs = Date.now() - start
  const statusCode = response.status

  if (!response.ok) {
    const message = `ESPN API error: HTTP ${statusCode} for "${endpoint}"`
    console.error(`[ESPN Events] ${message}`)

    if (supabase) {
      await logApiHealth(supabase, endpoint, statusCode, responseTimeMs, false, '', [`HTTP ${statusCode}`]).catch(() => {})
    }

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { endpoint, statusCode: String(statusCode), monitor: 'espn-events' },
    })

    throw new Error(message)
  }

  const data = await response.json()
  const validation = validator(data)
  const hash = hashResponseStructure(data)

  if (supabase) {
    await logApiHealth(supabase, endpoint, statusCode, responseTimeMs, validation.valid, hash, validation.issues).catch(() => {})
  }

  if (!validation.valid) {
    console.warn(`[ESPN Events] Structure validation failed for "${endpoint}":`, validation.issues)
  }

  return { data, statusCode }
}

// ============================================
// Response validators per sport
// ============================================

function validateRugbyEventResponse(data: unknown): ValidationResult {
  const issues: string[] = []
  if (!data || typeof data !== 'object') return { valid: false, issues: ['Not an object'] }

  const obj = data as Record<string, unknown>
  if (!obj.competitions || !Array.isArray(obj.competitions)) {
    issues.push('Missing "competitions" array')
  } else if ((obj.competitions as unknown[]).length > 0) {
    const comp = (obj.competitions as Record<string, unknown>[])[0]
    if (!comp.competitors || !Array.isArray(comp.competitors)) {
      issues.push('Missing "competitors" array')
    }
    if (!comp.status || typeof comp.status !== 'object') {
      issues.push('Missing "status" object')
    }
  }
  return { valid: issues.length === 0, issues }
}

function validateSiteScoreboardResponse(data: unknown): ValidationResult {
  const issues: string[] = []
  if (!data || typeof data !== 'object') return { valid: false, issues: ['Not an object'] }

  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.events)) {
    issues.push('Missing or non-array "events" field')
    return { valid: false, issues }
  }

  if ((obj.events as unknown[]).length > 0) {
    const event = (obj.events as Record<string, unknown>[])[0]
    if (!event.id) issues.push('Event missing "id"')
    if (!event.competitions || !Array.isArray(event.competitions)) {
      issues.push('Event missing "competitions" array')
    } else {
      const comp = (event.competitions as Record<string, unknown>[])[0]
      if (!comp?.competitors || !Array.isArray(comp.competitors)) {
        issues.push('Competition missing "competitors"')
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

function validateRugbyEventsListResponse(data: unknown): ValidationResult {
  const issues: string[] = []
  if (!data || typeof data !== 'object') return { valid: false, issues: ['Not an object'] }

  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.items)) {
    issues.push('Missing "items" array')
  }
  return { valid: issues.length === 0, issues }
}

function validateTeamsResponse(data: unknown): ValidationResult {
  const issues: string[] = []
  if (!data || typeof data !== 'object') return { valid: false, issues: ['Not an object'] }

  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.sports)) {
    issues.push('Missing "sports" array')
  }
  return { valid: issues.length === 0, issues }
}

// ============================================
// Rugby (Six Nations) adapter
// Uses Core API (site API doesn't cover Six Nations well)
// ============================================

export interface ESPNRugbyMatch {
  espnEventId: string
  name: string
  date: string
  homeTeamCode: string
  awayTeamCode: string
  homeScore: number | null
  awayScore: number | null
  status: 'scheduled' | 'live' | 'completed'
  isComplete: boolean
  isDraw: boolean
  winnerTeamCode: string | null
  displayClock?: string
  period?: number
}

/**
 * Fetch Six Nations fixtures and scores from ESPN.
 * Logs all API calls to espn_api_health for monitoring.
 */
export async function fetchRugbyMatches(
  dates: string[],
  supabase: SupabaseClient | null = null
): Promise<ESPNRugbyMatch[]> {
  const config = ESPN_SPORTS.rugby
  const baseUrl = `${CORE_API_BASE}/rugby/leagues/${config.coreLeagueId}`
  const matches: ESPNRugbyMatch[] = []
  const seenEventIds = new Set<string>()

  for (const dateStr of dates) {
    try {
      const eventsUrl = `${baseUrl}/events?dates=${dateStr}`
      const { data: eventsData } = await monitoredEventFetch(
        supabase,
        `events/rugby/six-nations/events?dates=${dateStr}`,
        eventsUrl,
        validateRugbyEventsListResponse
      )

      const eventRefs = (eventsData as Record<string, unknown>).items as { $ref?: string }[] || []

      for (const ref of eventRefs) {
        try {
          const eventUrl = ref.$ref
          if (!eventUrl) continue

          // Individual event fetches don't need full monitoring (too many calls)
          const eventResponse = await fetchWithTimeout(eventUrl)
          if (!eventResponse.ok) continue

          const eventData = await eventResponse.json()
          if (seenEventIds.has(eventData.id)) continue
          seenEventIds.add(eventData.id)

          const competition = eventData.competitions?.[0]
          if (!competition) continue

          const competitors = competition.competitors || []
          let homeTeamCode = ''
          let awayTeamCode = ''
          let homeScore: number | null = null
          let awayScore: number | null = null

          for (const comp of competitors) {
            const teamCode = config.teamMap[comp.id] || normalizeAbbreviation(comp.abbreviation || '')
            const score = comp.score?.value ?? null

            if (comp.homeAway === 'home') {
              homeTeamCode = teamCode
              homeScore = score
            } else {
              awayTeamCode = teamCode
              awayScore = score
            }
          }

          if (!homeTeamCode || !awayTeamCode) continue

          const statusType = competition.status?.type || eventData.status?.type || {}
          const isComplete = statusType.completed === true
          const isLive = statusType.state === 'in' || statusType.name === 'STATUS_IN_PROGRESS'
          const isDraw = isComplete && homeScore !== null && awayScore !== null && homeScore === awayScore

          let winnerTeamCode: string | null = null
          if (isComplete && homeScore !== null && awayScore !== null) {
            if (homeScore > awayScore) winnerTeamCode = homeTeamCode
            else if (awayScore > homeScore) winnerTeamCode = awayTeamCode
            // Draw: winnerTeamCode stays null
          }

          matches.push({
            espnEventId: eventData.id,
            name: eventData.name || `${homeTeamCode} vs ${awayTeamCode}`,
            date: eventData.date,
            homeTeamCode,
            awayTeamCode,
            homeScore,
            awayScore,
            status: isComplete ? 'completed' : isLive ? 'live' : 'scheduled',
            isComplete,
            isDraw,
            winnerTeamCode,
            displayClock: competition.status?.displayClock,
            period: competition.status?.period,
          })
        } catch {
          continue
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      // monitoredEventFetch already logged + Sentry'd, just continue
      console.error(`[espn-rugby] Error fetching date ${dateStr}:`, err instanceof Error ? err.message : err)
      continue
    }
  }

  return matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ============================================
// Hockey (NCAA) adapter — Site API
// ============================================

export interface ESPNHockeyGame {
  espnEventId: string
  name: string
  date: string
  homeTeamName: string
  awayTeamName: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number | null
  awayScore: number | null
  homeLogoUrl: string | null
  awayLogoUrl: string | null
  status: 'scheduled' | 'live' | 'completed'
  isComplete: boolean
  winnerTeamId: string | null
  isOvertime: boolean
}

/**
 * Fetch NCAA hockey tournament games from ESPN.
 * Logs API health to espn_api_health.
 */
export async function fetchHockeyTournamentGames(
  year: number = new Date().getFullYear(),
  supabase: SupabaseClient | null = null
): Promise<ESPNHockeyGame[]> {
  const games: ESPNHockeyGame[] = []

  try {
    const url = `${SITE_API_BASE}/hockey/mens-college-hockey/scoreboard?dates=${year}&seasontype=3&limit=100`
    const { data } = await monitoredEventFetch(
      supabase,
      `events/hockey/ncaa/scoreboard?seasontype=3&year=${year}`,
      url,
      validateSiteScoreboardResponse
    )

    const events = (data as Record<string, unknown>).events as Record<string, unknown>[] || []

    for (const event of events) {
      const competition = (event.competitions as Record<string, unknown>[])?.[0]
      if (!competition) continue

      const competitors = competition.competitors as Record<string, unknown>[] || []
      if (competitors.length !== 2) continue

      const home = competitors.find(c => c.homeAway === 'home')
      const away = competitors.find(c => c.homeAway === 'away')
      if (!home || !away) continue

      const homeTeam = (home.team || {}) as Record<string, unknown>
      const awayTeam = (away.team || {}) as Record<string, unknown>
      const statusObj = (competition.status as Record<string, unknown>) || {}
      const statusType = (statusObj.type || {}) as Record<string, unknown>

      const isComplete = statusType.completed === true
      const isLive = statusType.state === 'in'
      const homeScore = home.score != null ? Number(home.score) : null
      const awayScore = away.score != null ? Number(away.score) : null

      let winnerTeamId: string | null = null
      if (isComplete && homeScore !== null && awayScore !== null) {
        winnerTeamId = homeScore > awayScore ? String(homeTeam.id) : String(awayTeam.id)
      }

      const period = (statusObj.period as number) || 0
      const isOvertime = period > 3

      games.push({
        espnEventId: String(event.id),
        name: String(event.name || `${homeTeam.displayName} vs ${awayTeam.displayName}`),
        date: String(event.date),
        homeTeamName: String(homeTeam.displayName || homeTeam.name || ''),
        awayTeamName: String(awayTeam.displayName || awayTeam.name || ''),
        homeTeamId: String(homeTeam.id || ''),
        awayTeamId: String(awayTeam.id || ''),
        homeScore,
        awayScore,
        homeLogoUrl: (homeTeam.logo as string) || null,
        awayLogoUrl: (awayTeam.logo as string) || null,
        status: isComplete ? 'completed' : isLive ? 'live' : 'scheduled',
        isComplete,
        winnerTeamId,
        isOvertime,
      })
    }
  } catch (err) {
    console.error('[espn-hockey] Failed to fetch tournament games:', err)
    Sentry.captureException(err, { tags: { sport: 'hockey', monitor: 'espn-events' } })
  }

  return games
}

/**
 * Fetch NCAA hockey teams from ESPN.
 */
export async function fetchHockeyTeams(
  supabase: SupabaseClient | null = null
): Promise<{
  id: string
  name: string
  abbreviation: string
  logoUrl: string | null
  seed: number | null
}[]> {
  try {
    const url = `${SITE_API_BASE}/hockey/mens-college-hockey/teams?limit=100`
    const { data } = await monitoredEventFetch(
      supabase,
      'events/hockey/ncaa/teams',
      url,
      validateTeamsResponse
    )

    const sports = (data as Record<string, unknown>).sports as Record<string, unknown>[] || []
    const teams: { id: string; name: string; abbreviation: string; logoUrl: string | null; seed: number | null }[] = []

    for (const sport of sports) {
      for (const league of (sport.leagues || []) as Record<string, unknown>[]) {
        for (const teamWrapper of (league.teams || []) as Record<string, unknown>[]) {
          const team = (teamWrapper.team || {}) as Record<string, unknown>
          const logos = team.logos as { href: string }[] | undefined
          teams.push({
            id: String(team.id),
            name: String(team.displayName || team.name || ''),
            abbreviation: String(team.abbreviation || ''),
            logoUrl: logos?.[0]?.href || null,
            seed: null,
          })
        }
      }
    }

    return teams
  } catch (err) {
    console.error('[espn-hockey] Failed to fetch teams:', err)
    Sentry.captureException(err, { tags: { sport: 'hockey', monitor: 'espn-events' } })
    return []
  }
}

// ============================================
// Golf (PGA / Masters) adapter — Site API
// ============================================

export interface ESPNGolfer {
  espnPlayerId: string
  name: string
  country: string
  position: number | null
  score: string | null
  totalStrokes: number | null
  status: 'active' | 'cut' | 'wd' | 'dq'
  imageUrl: string | null
}

/**
 * Fetch Masters Tournament leaderboard from ESPN.
 * Logs API health for structure change detection.
 */
export async function fetchGolfLeaderboard(
  tournamentId?: string,
  supabase: SupabaseClient | null = null
): Promise<ESPNGolfer[]> {
  const golfers: ESPNGolfer[] = []

  try {
    const url = tournamentId
      ? `${SITE_API_BASE}/golf/pga/scoreboard?event=${tournamentId}`
      : `${SITE_API_BASE}/golf/pga/scoreboard`

    const { data } = await monitoredEventFetch(
      supabase,
      `events/golf/pga/scoreboard${tournamentId ? `?event=${tournamentId}` : ''}`,
      url,
      validateSiteScoreboardResponse
    )

    const events = (data as Record<string, unknown>).events as Record<string, unknown>[] || []

    for (const event of events) {
      const competitions = (event.competitions || []) as Record<string, unknown>[]
      for (const competition of competitions) {
        const competitors = (competition.competitors || []) as Record<string, unknown>[]
        for (const comp of competitors) {
          const athlete = (comp.athlete || {}) as Record<string, unknown>
          const statusObj = (comp.status as Record<string, unknown>) || {}
          const statusType = (statusObj.type as Record<string, unknown>) || {}
          const statusName = String(statusType.name || '')

          const linescores = comp.linescores as { value: number }[] | undefined
          const scoreObj = (comp.score as Record<string, unknown>) || {}

          golfers.push({
            espnPlayerId: String(athlete.id || comp.id || ''),
            name: String(athlete.displayName || (athlete as Record<string, unknown>).fullName || ''),
            country: String((athlete.flag as Record<string, unknown>)?.alt || ''),
            position: (comp.order as number) || null,
            score: (scoreObj.displayValue as string) || null,
            totalStrokes: linescores
              ? linescores.reduce((sum, ls) => sum + (ls.value || 0), 0)
              : null,
            status: statusName.includes('CUT') ? 'cut'
              : statusName.includes('WD') ? 'wd'
              : statusName.includes('DQ') ? 'dq'
              : 'active',
            imageUrl: (athlete.headshot as Record<string, unknown>)?.href as string || null,
          })
        }
      }
    }
  } catch (err) {
    console.error('[espn-golf] Failed to fetch leaderboard:', err)
    Sentry.captureException(err, { tags: { sport: 'golf', monitor: 'espn-events' } })
  }

  return golfers.sort((a, b) => (a.position || 999) - (b.position || 999))
}

// ============================================
// Generic event game sync helper
// ============================================

/**
 * Sync ESPN game results to event_games table.
 * Updates scores, winner, status, and draw flag.
 * Returns count of games updated.
 */
export async function syncGameResults(
  admin: SupabaseClient,
  tournamentId: string,
  results: {
    externalId: string
    homeScore: number | null
    awayScore: number | null
    status: 'scheduled' | 'live' | 'completed'
    winnerId: string | null
    isDraw: boolean
  }[]
): Promise<number> {
  let updated = 0

  for (const result of results) {
    const { data: game } = await admin
      .from('event_games')
      .select('id, participant_1_id, participant_2_id')
      .eq('tournament_id', tournamentId)
      .eq('external_id', result.externalId)
      .single()

    if (!game) continue

    let winnerId: string | null = null
    if (result.winnerId && !result.isDraw) {
      const { data: winner } = await admin
        .from('event_participants')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('external_id', result.winnerId)
        .single()

      winnerId = winner?.id || null
    }

    await admin
      .from('event_games')
      .update({
        participant_1_score: result.homeScore,
        participant_2_score: result.awayScore,
        status: result.status,
        winner_id: winnerId,
        is_draw: result.isDraw,
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id)

    updated++
  }

  return updated
}
