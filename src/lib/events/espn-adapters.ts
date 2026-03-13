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
}

/**
 * Fetch Six Nations fixtures and scores from ESPN Site API.
 * Uses the scoreboard endpoint which returns scores (unlike Core API).
 */
export async function fetchRugbyMatches(
  dates: string[],
  supabase: SupabaseClient | null = null
): Promise<ESPNRugbyMatch[]> {
  const config = ESPN_SPORTS.rugby
  const matches: ESPNRugbyMatch[] = []
  const seenEventIds = new Set<string>()

  for (const dateStr of dates) {
    try {
      const url = `${SITE_API_BASE}/rugby/${config.coreLeagueId}/scoreboard?dates=${dateStr}`
      const { data } = await monitoredEventFetch(
        supabase,
        `events/rugby/six-nations/scoreboard?dates=${dateStr}`,
        url,
        validateSiteScoreboardResponse
      )

      const events = (data as Record<string, unknown>).events as Record<string, unknown>[] || []

      for (const event of events) {
        try {
          const eventId = event.id as string
          if (seenEventIds.has(eventId)) continue
          seenEventIds.add(eventId)

          const competitions = event.competitions as Record<string, unknown>[] || []
          const competition = competitions[0]
          if (!competition) continue

          const competitors = competition.competitors as Record<string, unknown>[] || []
          let homeTeamCode = ''
          let awayTeamCode = ''
          let homeScore: number | null = null
          let awayScore: number | null = null

          for (const comp of competitors) {
            const team = comp.team as Record<string, unknown> || {}
            const abbr = normalizeAbbreviation((team.abbreviation as string) || '')
            const teamCode = config.teamMap[team.id as string] || abbr
            const score = comp.score != null ? parseInt(comp.score as string) : null

            if (comp.homeAway === 'home') {
              homeTeamCode = teamCode
              homeScore = score
            } else {
              awayTeamCode = teamCode
              awayScore = score
            }
          }

          if (!homeTeamCode || !awayTeamCode) continue

          const status = competition.status as Record<string, unknown> || {}
          const statusType = status.type as Record<string, unknown> || {}
          const isComplete = statusType.completed === true
          const isLive = statusType.state === 'in' || statusType.name === 'STATUS_IN_PROGRESS'
          const isDraw = isComplete && homeScore !== null && awayScore !== null && homeScore === awayScore

          let winnerTeamCode: string | null = null
          if (isComplete && homeScore !== null && awayScore !== null) {
            if (homeScore > awayScore) winnerTeamCode = homeTeamCode
            else if (awayScore > homeScore) winnerTeamCode = awayTeamCode
          }

          matches.push({
            espnEventId: eventId,
            name: (event.name as string) || `${homeTeamCode} vs ${awayTeamCode}`,
            date: event.date as string,
            homeTeamCode,
            awayTeamCode,
            homeScore,
            awayScore,
            status: isComplete ? 'completed' : isLive ? 'live' : 'scheduled',
            isComplete,
            isDraw,
            winnerTeamCode,
            displayClock: (status.displayClock as string) || undefined,
            period: (status.period as number) || undefined,
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

    await admin
      .from('event_games')
      .update({
        participant_1_score: result.homeScore,
        participant_2_score: result.awayScore,
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
