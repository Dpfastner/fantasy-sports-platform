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
// Uses Site API scoreboard endpoint (Core API doesn't return scores)
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
  round?: number
  venue?: string
}

/**
 * Fetch Six Nations fixtures and scores from ESPN Site API.
 * Uses the scoreboard endpoint which returns scores (unlike Core API).
 */
/**
 * Fetch rugby matches from ESPN Core API.
 *
 * Uses the Core API (sports.core.api.espn.com) which reliably supports
 * rugby Six Nations — ported from the working rugby-survivor project.
 *
 * Flow: events?dates= → event refs → event detail → status + per-team scores
 */
export async function fetchRugbyMatches(
  dates: string[],
  supabase: SupabaseClient | null = null
): Promise<ESPNRugbyMatch[]> {
  const config = ESPN_SPORTS.rugby
  const rugbyBase = `${CORE_API_BASE}/rugby/leagues/${config.coreLeagueId}`
  const matches: ESPNRugbyMatch[] = []
  const seenEventIds = new Set<string>()

  // ESPN team ID → our team code (with IRE→IRL normalization)
  const espnTeamIdMap: Record<string, string> = {
    '1': 'ENG', '2': 'SCO', '3': 'IRL', '4': 'WAL', '9': 'FRA', '20': 'ITA',
  }

  for (const dateStr of dates) {
    try {
      // Step 1: Get event refs for this date
      const eventsUrl = `${rugbyBase}/events?dates=${dateStr}`
      const eventsRes = await fetchWithTimeout(eventsUrl, 15000)
      if (!eventsRes.ok) {
        console.error(`[espn-rugby] Events HTTP ${eventsRes.status} for date ${dateStr}`)
        continue
      }
      const eventsData = await eventsRes.json() as { items?: { $ref: string }[] }
      const eventRefs = eventsData.items || []

      // Log to health tracking
      if (supabase) {
        const hash = hashResponseStructure(eventsData)
        await logApiHealth(
          supabase,
          `events/rugby/core/events?dates=${dateStr}`,
          eventsRes.status,
          0,
          eventRefs.length > 0,
          hash,
          eventRefs.length === 0 ? ['No event refs returned'] : [],
        )
      }

      // Step 2: Fetch each event's details
      for (const ref of eventRefs) {
        try {
          const eventRes = await fetchWithTimeout(ref.$ref, 10000)
          if (!eventRes.ok) continue
          const eventData = await eventRes.json() as Record<string, unknown>

          const eventId = String(eventData.id || '')
          if (!eventId || seenEventIds.has(eventId)) continue
          seenEventIds.add(eventId)

          const competitions = eventData.competitions as Record<string, unknown>[] || []
          const competition = competitions[0]
          if (!competition) continue

          // Step 3: Fetch status separately (more reliable for live data)
          let isComplete = false
          let isLive = false
          let displayClock: string | undefined
          let period: number | undefined

          try {
            const statusUrl = `${rugbyBase}/events/${eventId}/competitions/${eventId}/status`
            const statusRes = await fetchWithTimeout(statusUrl, 10000)
            if (statusRes.ok) {
              const statusData = await statusRes.json() as Record<string, unknown>
              const statusType = statusData.type as Record<string, unknown> || {}
              isComplete = statusType.completed === true
              isLive = statusType.state === 'in'
              displayClock = (statusData.displayClock as string) || undefined
              period = (statusData.period as number) || undefined
            }
          } catch {
            // Fall back to competition-level status
            const compStatus = competition.status as Record<string, unknown> || {}
            const compType = compStatus.type as Record<string, unknown> || {}
            isComplete = compType.completed === true
            isLive = compType.state === 'in'
          }

          // Step 4: Get teams and scores
          const competitors = competition.competitors as Record<string, unknown>[] || []
          let homeTeamCode = ''
          let awayTeamCode = ''
          let homeScore: number | null = null
          let awayScore: number | null = null

          for (const comp of competitors) {
            // Core API: team ID is on comp.id directly; comp.team is a $ref link, not inlined
            const teamId = String(comp.id || '')
            const teamCode = espnTeamIdMap[teamId] || normalizeAbbreviation(String(teamId))
            const isHome = comp.homeAway === 'home'

            // Try fetching score from Core API endpoint (most reliable for live)
            let score: number | null = null
            if (isLive || isComplete) {
              try {
                const scoreUrl = `${rugbyBase}/events/${eventId}/competitions/${eventId}/competitors/${teamId}/score`
                const scoreRes = await fetchWithTimeout(scoreUrl, 5000)
                if (scoreRes.ok) {
                  const scoreData = await scoreRes.json() as { value?: number }
                  score = scoreData.value ?? null
                }
              } catch {
                // Fall back to competitor-level score
                score = comp.score != null ? parseInt(String(comp.score)) : null
              }
            }

            if (isHome) {
              homeTeamCode = teamCode
              homeScore = score
            } else {
              awayTeamCode = teamCode
              awayScore = score
            }
          }

          if (!homeTeamCode || !awayTeamCode) continue

          const isDraw = isComplete && homeScore !== null && awayScore !== null && homeScore === awayScore
          let winnerTeamCode: string | null = null
          if (isComplete && homeScore !== null && awayScore !== null) {
            if (homeScore > awayScore) winnerTeamCode = homeTeamCode
            else if (awayScore > homeScore) winnerTeamCode = awayTeamCode
          }

          matches.push({
            espnEventId: eventId,
            name: (eventData.name as string) || `${homeTeamCode} vs ${awayTeamCode}`,
            date: (eventData.date as string) || '',
            homeTeamCode,
            awayTeamCode,
            homeScore,
            awayScore,
            status: isComplete ? 'completed' : isLive ? 'live' : 'scheduled',
            isComplete,
            isDraw,
            winnerTeamCode,
            displayClock,
            period,
          })
        } catch {
          continue
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err) {
      console.error(`[espn-rugby] Error fetching date ${dateStr}:`, err instanceof Error ? err.message : err)
      continue
    }
  }

  return matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ============================================
// TheSportsDB adapter (Women's Six Nations)
// ESPN does not cover Women's Six Nations; TheSportsDB league 5563 does.
// ============================================

/** Team name patterns from TheSportsDB → our team codes */
const SPORTSDB_TEAM_MAP: Record<string, string> = {
  england: 'ENG',
  france: 'FRA',
  ireland: 'IRL',
  italy: 'ITA',
  scotland: 'SCO',
  wales: 'WAL',
}

function mapSportsDbTeam(name: string): string | null {
  const lower = name.toLowerCase()
  for (const [key, code] of Object.entries(SPORTSDB_TEAM_MAP)) {
    if (lower.includes(key)) return code
  }
  return null
}

/**
 * Fetch rugby matches from TheSportsDB for a given league + season.
 * Returns the same ESPNRugbyMatch interface so downstream code is unchanged.
 */
export async function fetchRugbyMatchesSportsDb(
  leagueId: string,
  season: string = '2026'
): Promise<ESPNRugbyMatch[]> {
  const apiKey = '3' // public test key
  const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsseason.php?id=${leagueId}&s=${season}`

  let data: Record<string, unknown>
  try {
    const response = await fetchWithTimeout(url, 15000)
    if (!response.ok) {
      console.error(`[sportsdb] HTTP ${response.status} for league ${leagueId}`)
      return []
    }
    data = await response.json()
  } catch (err) {
    console.error(`[sportsdb] Fetch failed for league ${leagueId}:`, err instanceof Error ? err.message : err)
    return []
  }

  const events = (data.events || []) as Record<string, unknown>[]
  if (!events.length) return []

  const matches: ESPNRugbyMatch[] = []

  for (const event of events) {
    const homeTeamCode = mapSportsDbTeam(String(event.strHomeTeam || ''))
    const awayTeamCode = mapSportsDbTeam(String(event.strAwayTeam || ''))
    if (!homeTeamCode || !awayTeamCode) continue

    const status = String(event.strStatus || '')
    const isComplete = status === 'FT' || status === 'Match Finished' || status === 'AET'
    const isLive = !isComplete && status !== 'NS' && status !== 'Not Started' && status !== '' && status !== 'Postponed'

    let homeScore: number | null = null
    let awayScore: number | null = null
    if (event.intHomeScore != null && event.intHomeScore !== '') {
      homeScore = parseInt(String(event.intHomeScore))
      if (isNaN(homeScore)) homeScore = null
    }
    if (event.intAwayScore != null && event.intAwayScore !== '') {
      awayScore = parseInt(String(event.intAwayScore))
      if (isNaN(awayScore)) awayScore = null
    }

    const isDraw = isComplete && homeScore !== null && awayScore !== null && homeScore === awayScore
    let winnerTeamCode: string | null = null
    if (isComplete && homeScore !== null && awayScore !== null) {
      if (homeScore > awayScore) winnerTeamCode = homeTeamCode
      else if (awayScore > homeScore) winnerTeamCode = awayTeamCode
    }

    // Build date from strTimestamp or dateEvent
    let date = String(event.strTimestamp || event.dateEvent || '')
    if (date && !date.includes('T')) date = `${date}T00:00:00Z`

    const roundNum = event.intRound != null ? parseInt(String(event.intRound)) : undefined

    matches.push({
      espnEventId: String(event.idEvent || ''),
      name: String(event.strEvent || `${homeTeamCode} vs ${awayTeamCode}`),
      date,
      homeTeamCode,
      awayTeamCode,
      homeScore,
      awayScore,
      status: isComplete ? 'completed' : isLive ? 'live' : 'scheduled',
      isComplete,
      isDraw,
      winnerTeamCode,
      round: roundNum && !isNaN(roundNum) ? roundNum : undefined,
      venue: event.strVenue ? String(event.strVenue) : undefined,
    })
  }

  return matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ============================================
// Rugby Standings — ESPN Standings API
// ============================================

export interface RugbyStanding {
  rank: number
  teamCode: string
  teamName: string
  gamesPlayed: number
  won: number
  drawn: number
  lost: number
  pointsFor: number
  pointsAgainst: number
  pointsDifference: number
  bonusPoints: number
  points: number
}

export async function fetchRugbyStandings(espnLeagueId: string): Promise<RugbyStanding[]> {
  const url = `https://site.api.espn.com/apis/v2/sports/rugby/${espnLeagueId}/standings`

  try {
    const response = await fetchWithTimeout(url, 15000)
    if (!response.ok) {
      console.error(`[espn-standings] HTTP ${response.status} for league ${espnLeagueId}`)
      return []
    }

    const data = await response.json() as Record<string, unknown>
    const children = (data.children || []) as Record<string, unknown>[]
    if (!children.length) return []

    const standings = children[0].standings as Record<string, unknown> || {}
    const entries = (standings.entries || []) as Record<string, unknown>[]

    return entries.map(entry => {
      const team = entry.team as Record<string, unknown> || {}
      const stats = (entry.stats || []) as Array<{ name: string; value: number }>

      const getStat = (name: string): number => {
        const s = stats.find(st => st.name === name)
        return s ? s.value : 0
      }

      return {
        rank: getStat('playoffSeed'),
        teamCode: normalizeAbbreviation(String(team.abbreviation || '')),
        teamName: String(team.displayName || ''),
        gamesPlayed: getStat('gamesPlayed'),
        won: getStat('gamesWon'),
        drawn: getStat('gamesDrawn'),
        lost: getStat('gamesLost'),
        pointsFor: getStat('pointsFor'),
        pointsAgainst: getStat('pointsAgainst'),
        pointsDifference: getStat('pointsDifference'),
        bonusPoints: getStat('bonusPoints'),
        points: getStat('points'),
      }
    }).sort((a, b) => a.rank - b.rank)
  } catch (err) {
    console.error(`[espn-standings] Error:`, err instanceof Error ? err.message : err)
    return []
  }
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
  period: string | null
  clock: string | null
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
    // Fetch both today and yesterday (UTC) to cover US timezone offset.
    // US evening games (e.g., 9 PM ET = March 26) are March 27 in UTC,
    // so we need both dates to catch all active games.
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0].replace(/-/g, '')
    const url = `${SITE_API_BASE}/hockey/mens-college-hockey/scoreboard?dates=${yesterdayStr}-${dateStr}&limit=100`
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

      const periodNum = (statusObj.period as number) || 0
      const isOvertime = periodNum > 3
      const displayClock = (statusObj.displayClock as string) || null

      // Map period number to display text
      let periodText: string | null = null
      if (isLive || isComplete) {
        if (periodNum === 1) periodText = '1st'
        else if (periodNum === 2) periodText = '2nd'
        else if (periodNum === 3) periodText = '3rd'
        else if (periodNum > 3) periodText = 'OT'
      }

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
        period: periodText,
        clock: isLive ? displayClock : null,
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
  countryCode: string | null        // ISO code for flag display
  position: number | null
  score: string | null
  totalStrokes: number | null
  roundScores: (number | null)[]    // individual round scores [r1, r2, r3, r4]
  scoreToPar: number | null         // parsed from score display value
  status: 'active' | 'cut' | 'wd' | 'dq'
  imageUrl: string | null
}

/** Parse ESPN score display value to numeric score-to-par. "E" → 0, "-5" → -5, "+3" → 3 */
function parseScoreToPar(display: string | null): number | null {
  if (!display) return null
  const trimmed = display.trim()
  if (trimmed === 'E' || trimmed === 'Even') return 0
  const num = parseInt(trimmed, 10)
  return isNaN(num) ? null : num
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

          const countryName = String((athlete.flag as Record<string, unknown>)?.alt || '')

          golfers.push({
            espnPlayerId: String(athlete.id || comp.id || ''),
            name: String(athlete.displayName || (athlete as Record<string, unknown>).fullName || ''),
            country: countryName,
            countryCode: getCountryFlagCode(countryName),
            position: (comp.order as number) || null,
            score: (scoreObj.displayValue as string) || null,
            totalStrokes: linescores
              ? linescores.reduce((sum, ls) => sum + (ls.value || 0), 0)
              : null,
            roundScores: linescores
              ? linescores.map(ls => ls.value ?? null)
              : [],
            scoreToPar: parseScoreToPar((scoreObj.displayValue as string) || null),
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

/**
 * Fetch the full golf tournament field from ESPN.
 * Uses the scoreboard API with a specific date to find the tournament,
 * then extracts all competitors. Returns empty if field not yet published.
 */
export async function fetchGolfField(
  tournamentDate: string // e.g., '2026-04-09'
): Promise<ESPNGolfer[]> {
  try {
    const dateStr = tournamentDate.replace(/-/g, '')
    const url = `${SITE_API_BASE}/golf/pga/scoreboard?dates=${dateStr}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Rivyls/1.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const data = await res.json()
    const events = (data.events || []) as Record<string, unknown>[]
    const golfers: ESPNGolfer[] = []

    for (const event of events) {
      const competitions = (event.competitions || []) as Record<string, unknown>[]
      for (const competition of competitions) {
        const competitors = (competition.competitors || []) as Record<string, unknown>[]
        for (const comp of competitors) {
          const athlete = (comp.athlete || {}) as Record<string, unknown>
          const countryName = String((athlete.flag as Record<string, unknown>)?.alt || '')

          golfers.push({
            espnPlayerId: String(athlete.id || comp.id || ''),
            name: String(athlete.displayName || ''),
            country: countryName,
            countryCode: getCountryFlagCode(countryName),
            position: (comp.order as number) || null,
            score: null,
            totalStrokes: null,
            roundScores: [],
            scoreToPar: null,
            status: 'active',
            imageUrl: (athlete.headshot as Record<string, unknown>)?.href as string || null,
          })
        }
      }
    }

    return golfers
  } catch (err) {
    console.error('[espn-golf] Failed to fetch field:', err)
    return []
  }
}

// ============================================
// Golf Core API — hole-by-hole data
// ============================================

export interface ESPNGolfHole {
  hole: number           // 1-18 (from period)
  round: number          // 1-4 (which round)
  strokes: number        // actual score on this hole
  par: number            // hole par
  scoreType: string      // PAR | BIRDIE | EAGLE | BOGEY | DOUBLE_BOGEY | etc.
}

export interface ESPNGolferLive extends ESPNGolfer {
  currentHole: number | null    // status.hole — hole currently playing
  thru: number | null           // status.thru — holes completed in current round
  startHole: number | null      // status.startHole — teed off from (1 or 10)
  teeTime: string | null        // status.teeTime ISO string
  currentRound: number | null   // status.period
  holes: ESPNGolfHole[]         // flat list of all holes played across all rounds
}

export interface ESPNCourseHole {
  number: number
  par: number
  yards: number
}

export interface ESPNCourseData {
  name: string
  totalYards: number
  totalPar: number
  parOut: number
  parIn: number
  holes: ESPNCourseHole[]
}

/**
 * Fetch course layout from ESPN Core API. Returns 18-hole data (par, yardage) plus course meta.
 * Cache this — course data doesn't change during a tournament.
 */
export async function fetchCourseData(
  espnEventId: string,
  courseId: string
): Promise<ESPNCourseData | null> {
  try {
    const url = `${CORE_API_BASE}/golf/leagues/pga/events/${espnEventId}/courses/${courseId}?lang=en&region=us`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Rivyls/1.0' },
      next: { revalidate: 86400 }, // cache 24h
    })
    if (!res.ok) return null
    const data = await res.json()

    const holesRaw = (data.holes || []) as Array<Record<string, unknown>>
    const holes: ESPNCourseHole[] = holesRaw.map(h => ({
      number: Number(h.number) || 0,
      par: Number(h.shotsToPar) || 4,
      yards: Number(h.totalYards) || 0,
    }))

    return {
      name: String(data.name || ''),
      totalYards: Number(data.totalYards) || 0,
      totalPar: Number(data.shotsToPar) || 72,
      parOut: Number(data.parOut) || 36,
      parIn: Number(data.parIn) || 36,
      holes,
    }
  } catch (err) {
    console.error('[espn-golf-core] fetchCourseData failed:', err)
    Sentry.captureException(err, { tags: { sport: 'golf', api: 'core', fn: 'fetchCourseData' } })
    return null
  }
}

/**
 * Fetch a single golfer's live status + per-hole linescores from ESPN Core API.
 * Two HTTP calls per golfer (status + linescores), executed in parallel.
 * Returns null on any error — caller should degrade gracefully.
 */
export async function fetchGolferLive(
  espnEventId: string,
  athleteId: string
): Promise<{
  espnPlayerId: string
  currentHole: number | null
  thru: number | null
  startHole: number | null
  teeTime: string | null
  currentRound: number | null
  position: number | null
  status: 'active' | 'cut' | 'wd' | 'dq'
  courseId: string | null
  holes: ESPNGolfHole[]
} | null> {
  try {
    const base = `${CORE_API_BASE}/golf/leagues/pga/events/${espnEventId}/competitions/${espnEventId}/competitors/${athleteId}`
    const [statusRes, linescoresRes] = await Promise.all([
      fetch(`${base}/status?lang=en&region=us`, { headers: { 'User-Agent': 'Rivyls/1.0' }, next: { revalidate: 30 } }),
      fetch(`${base}/linescores?lang=en&region=us`, { headers: { 'User-Agent': 'Rivyls/1.0' }, next: { revalidate: 30 } }),
    ])

    if (!statusRes.ok) return null
    const status = await statusRes.json() as Record<string, unknown>
    const statusType = (status.type || {}) as Record<string, unknown>
    const statusName = String(statusType.name || '').toUpperCase()

    // Parse course $ref → extract course id
    let courseId: string | null = null
    if (status.course && typeof status.course === 'object') {
      const ref = (status.course as Record<string, unknown>).$ref as string | undefined
      if (ref) {
        const match = ref.match(/\/courses\/(\d+)/)
        if (match) courseId = match[1]
      }
    }

    // Position object → number
    let position: number | null = null
    const posObj = status.position as Record<string, unknown> | undefined
    if (posObj && posObj.displayName) {
      const parsed = parseInt(String(posObj.displayName).replace(/\D/g, ''), 10)
      if (!isNaN(parsed)) position = parsed
    }

    // Parse linescores — items[] is per round, each has nested linescores[] of hole data
    const holes: ESPNGolfHole[] = []
    if (linescoresRes.ok) {
      const ls = await linescoresRes.json() as Record<string, unknown>
      const items = (ls.items || []) as Array<Record<string, unknown>>
      for (const item of items) {
        const roundNum = Number(item.period) || 0
        const holeEntries = (item.linescores || []) as Array<Record<string, unknown>>
        for (const h of holeEntries) {
          const strokes = Number(h.value)
          if (!strokes) continue  // unplayed hole
          const scoreTypeObj = (h.scoreType || {}) as Record<string, unknown>
          holes.push({
            hole: Number(h.period) || 0,
            round: roundNum,
            strokes,
            par: Number(h.par) || 4,
            scoreType: String(scoreTypeObj.name || 'PAR'),
          })
        }
      }
    }

    return {
      espnPlayerId: String(athleteId),
      currentHole: typeof status.hole === 'number' ? (status.hole as number) : null,
      thru: typeof status.thru === 'number' ? (status.thru as number) : null,
      startHole: typeof status.startHole === 'number' ? (status.startHole as number) : null,
      teeTime: (status.teeTime as string) || null,
      currentRound: typeof status.period === 'number' ? (status.period as number) : null,
      position,
      status: statusName.includes('CUT') ? 'cut'
        : statusName.includes('WD') ? 'wd'
        : statusName.includes('DQ') ? 'dq'
        : 'active',
      courseId,
      holes,
    }
  } catch (err) {
    console.error(`[espn-golf-core] fetchGolferLive(${athleteId}) failed:`, err)
    return null
  }
}

/**
 * Fetch live hole-by-hole data for a list of golfers with bounded concurrency.
 * Skips cut/WD/DQ golfers automatically.
 */
export async function fetchGolfFieldFromCore(
  espnEventId: string,
  athleteIds: string[],
  opts: { concurrency?: number } = {}
): Promise<Map<string, Awaited<ReturnType<typeof fetchGolferLive>>>> {
  const concurrency = opts.concurrency ?? 10
  const results = new Map<string, Awaited<ReturnType<typeof fetchGolferLive>>>()

  // Simple concurrency pool
  let index = 0
  async function worker() {
    while (index < athleteIds.length) {
      const i = index++
      const id = athleteIds[i]
      const data = await fetchGolferLive(espnEventId, id)
      results.set(id, data)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, athleteIds.length) }, () => worker())
  await Promise.all(workers)

  return results
}

// ============================================
// Golf OWGR Rankings — HTML scrape from ESPN
// ============================================

export interface ESPNGolfRanking {
  rank: number
  name: string
  country: string
}

/**
 * Country name → ISO 3166-1 alpha-2 code mapping for flag display.
 * Used with flagcdn.com: https://flagcdn.com/24x18/{code}.png
 */
const COUNTRY_ISO: Record<string, string> = {
  'united states': 'us',
  'usa': 'us',
  'england': 'gb-eng',
  'scotland': 'gb-sct',
  'wales': 'gb-wls',
  'northern ireland': 'gb-nir',
  'ireland': 'ie',
  'australia': 'au',
  'canada': 'ca',
  'south africa': 'za',
  'japan': 'jp',
  'south korea': 'kr',
  'korea': 'kr',
  'sweden': 'se',
  'norway': 'no',
  'denmark': 'dk',
  'germany': 'de',
  'france': 'fr',
  'spain': 'es',
  'italy': 'it',
  'austria': 'at',
  'belgium': 'be',
  'netherlands': 'nl',
  'switzerland': 'ch',
  'china': 'cn',
  'chinese taipei': 'tw',
  'taiwan': 'tw',
  'india': 'in',
  'thailand': 'th',
  'philippines': 'ph',
  'mexico': 'mx',
  'argentina': 'ar',
  'colombia': 'co',
  'chile': 'cl',
  'brazil': 'br',
  'fiji': 'fj',
  'new zealand': 'nz',
  'zimbabwe': 'zw',
  'nigeria': 'ng',
  'puerto rico': 'pr',
  'finland': 'fi',
  'czech republic': 'cz',
  'czechia': 'cz',
  'poland': 'pl',
  'portugal': 'pt',
  'singapore': 'sg',
  'malaysia': 'my',
  'indonesia': 'id',
  'vietnam': 'vn',
  'pakistan': 'pk',
  'venezuela': 've',
  'paraguay': 'py',
  'bermuda': 'bm',
  'bahamas': 'bs',
  'jamaica': 'jm',
  'trinidad and tobago': 'tt',
  'guatemala': 'gt',
  'panama': 'pa',
  'costa rica': 'cr',
  'dominican republic': 'do',
  'peru': 'pe',
  'ecuador': 'ec',
  'uruguay': 'uy',
  'honduras': 'hn',
  'el salvador': 'sv',
  'nicaragua': 'ni',
  'bolivia': 'bo',
}

/**
 * Get ISO country code for flag CDN display.
 * Returns code for use with flagcdn.com: `https://flagcdn.com/24x18/${code}.png`
 */
export function getCountryFlagCode(country: string): string | null {
  if (!country) return null
  return COUNTRY_ISO[country.toLowerCase()] || null
}

/**
 * Get flag image URL for a country name.
 * Uses flagcdn.com which serves free, public domain flag images.
 */
export function getCountryFlagUrl(country: string, size: '16x12' | '24x18' | '32x24' | '48x36' = '24x18'): string | null {
  const code = getCountryFlagCode(country)
  if (!code) return null
  return `https://flagcdn.com/${size}/${code}.png`
}

/**
 * Fetch OWGR golf rankings from ESPN's rankings page.
 * Scrapes the HTML table to extract rank, name, and country for top 200 golfers.
 * Falls back gracefully if the page structure changes.
 */
export async function fetchGolfRankings(): Promise<ESPNGolfRanking[]> {
  const rankings: ESPNGolfRanking[] = []

  try {
    const response = await fetchWithTimeout('https://www.espn.com/golf/rankings', 15000)
    if (!response.ok) {
      console.error(`[espn-golf] Rankings page returned ${response.status}`)
      return []
    }

    const html = await response.text()

    // ESPN structure: <tr><td><span class="rank_column">1</span></td><td>...<img title="Country">...<a>Name</a>...</td></tr>
    // The img uses title= for country, and rank is inside a span
    const rowPattern = /<tr\b[^>]*>[\s\S]*?<span[^>]*class="rank_column"[^>]*>(\d+)<\/span>[\s\S]*?<img[^>]*title="([^"]*)"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?<\/tr>/g
    let match
    while ((match = rowPattern.exec(html)) !== null) {
      const rank = parseInt(match[1], 10)
      const country = match[2].trim()
      const name = match[3].trim()

      if (rank > 0 && name) {
        rankings.push({ rank, name, country })
      }
    }

    if (rankings.length === 0) {
      // Structure may have changed — alert via Sentry
      Sentry.captureMessage('ESPN golf rankings page returned 0 results — HTML structure may have changed', {
        level: 'warning',
        tags: { sport: 'golf', monitor: 'espn-rankings' },
      })
    }
  } catch (err) {
    console.error('[espn-golf] Failed to fetch rankings:', err)
    Sentry.captureException(err, { tags: { sport: 'golf', monitor: 'espn-rankings' } })
  }

  return rankings
}

// ============================================
// Hockey records from USCHO poll (ESPN website)
// ============================================

/**
 * Fetch hockey team records from the USCHO poll on ESPN's rankings page.
 * The ESPN API doesn't return accurate hockey records, but the USCHO poll
 * on the website has correct W-L-T records.
 * Returns a Map of team name → record string (e.g., "29-7-1").
 */
export async function fetchHockeyRecords(): Promise<Map<string, string>> {
  const records = new Map<string, string>()

  try {
    const response = await fetchWithTimeout('https://www.espn.com/mens-college-hockey/rankings', 15000)
    if (!response.ok) {
      console.error(`[espn-hockey] Rankings page returned ${response.status}`)
      return records
    }

    const html = await response.text()

    // Find the USCHO section — it's the third poll table on the page
    // Each team row has: rank, team name, and record (W-L-T)
    // Pattern: look for team names with records in W-L or W-L-T format after them
    const teamRecordPattern = /class="Table__TD"[^>]*>(?:<[^>]+>)*(\d+)(?:<[^>]+>)*<\/td>[\s\S]*?class="Table__TD"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>[\s\S]*?class="Table__TD"[^>]*>(?:<[^>]+>)*(\d+-\d+(?:-\d+)?)(?:<[^>]+>)*<\/td>/g
    let match
    while ((match = teamRecordPattern.exec(html)) !== null) {
      const name = match[2].trim()
      const record = match[3].trim()
      if (name && record) {
        records.set(name, record)
      }
    }

    // If regex didn't match (ESPN structure changed), try simpler pattern
    if (records.size === 0) {
      // Fallback: match team display names followed by W-L-T records
      const simplePattern = /<a[^>]*href="[^"]*mens-college-hockey[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?(\d{2,}-\d{1,2}(?:-\d{1,2})?)/g
      while ((match = simplePattern.exec(html)) !== null) {
        const name = match[1].trim()
        const record = match[2].trim()
        if (name && record && !records.has(name)) {
          records.set(name, record)
        }
      }
    }

    if (records.size === 0) {
      Sentry.captureMessage('ESPN hockey rankings page returned 0 records — HTML structure may have changed', {
        level: 'warning',
        tags: { sport: 'hockey', monitor: 'espn-rankings' },
      })
    }
  } catch (err) {
    console.error('[espn-hockey] Failed to fetch records:', err)
    Sentry.captureException(err, { tags: { sport: 'hockey', monitor: 'espn-rankings' } })
  }

  return records
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
    period?: string | null
    clock?: string | null
    liveStatus?: string | null
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

    // Determine if our p1 is home (matches winnerId path or fetch p1's external_id)
    const { data: p1 } = await admin
      .from('event_participants')
      .select('external_id, metadata')
      .eq('id', game.participant_1_id)
      .single()
    const p1EspnId = p1?.external_id || (p1?.metadata as Record<string, unknown> | null)?.espn_team_id
    // Note: result.homeScore/awayScore come from ESPN — winnerId tells us which side won.
    // If winnerId matches p1, p1 had the higher score. We can't reliably determine home/away
    // without more info, so we use the winnerId vs scores to deduce.
    let p1Score = result.homeScore
    let p2Score = result.awayScore
    if (result.homeScore != null && result.awayScore != null && winnerId) {
      const p1IsWinner = winnerId === game.participant_1_id
      const homeWins = result.homeScore > result.awayScore
      const p1IsHome = p1IsWinner === homeWins
      p1Score = p1IsHome ? result.homeScore : result.awayScore
      p2Score = p1IsHome ? result.awayScore : result.homeScore
    }
    void p1EspnId

    await admin
      .from('event_games')
      .update({
        participant_1_score: p1Score,
        participant_2_score: p2Score,
        status: result.status,
        winner_id: winnerId,
        is_draw: result.isDraw,
        period: result.period || null,
        clock: result.clock || null,
        live_status: result.liveStatus || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', game.id)

    updated++
  }

  return updated
}
