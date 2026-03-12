import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ValidationResult {
  valid: boolean
  issues: string[]
}

/**
 * Validate ESPN scoreboard response structure
 */
export function validateScoreboardResponse(data: unknown): ValidationResult {
  const issues: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, issues: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.events)) {
    issues.push('Missing or non-array "events" field')
    return { valid: false, issues }
  }

  // Check first event structure if events exist
  if (obj.events.length > 0) {
    const event = obj.events[0] as Record<string, unknown>
    if (!event.id) issues.push('Event missing "id"')
    if (!event.competitions || !Array.isArray(event.competitions)) {
      issues.push('Event missing "competitions" array')
    } else if (event.competitions.length > 0) {
      const comp = (event.competitions as Record<string, unknown>[])[0]
      if (!comp.competitors || !Array.isArray(comp.competitors)) {
        issues.push('Competition missing "competitors" array')
      } else {
        const competitors = comp.competitors as Record<string, unknown>[]
        if (competitors.length < 2) {
          issues.push(`Competition has ${competitors.length} competitors (expected 2)`)
        } else {
          const first = competitors[0]
          if (!first.team || typeof first.team !== 'object') issues.push('Competitor missing "team"')
          if (first.score === undefined) issues.push('Competitor missing "score"')
          if (!first.homeAway) issues.push('Competitor missing "homeAway"')
        }
      }
      if (!comp.status || typeof comp.status !== 'object') {
        issues.push('Competition missing "status"')
      } else {
        const status = comp.status as Record<string, unknown>
        if (!status.type || typeof status.type !== 'object') {
          issues.push('Status missing "type"')
        } else {
          const type = status.type as Record<string, unknown>
          if (!type.state) issues.push('Status type missing "state"')
        }
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Validate ESPN rankings response structure
 */
export function validateRankingsResponse(data: unknown): ValidationResult {
  const issues: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, issues: ['Response is not an object'] }
  }

  const obj = data as Record<string, unknown>

  if (!Array.isArray(obj.rankings)) {
    issues.push('Missing or non-array "rankings" field')
    return { valid: false, issues }
  }

  if (obj.rankings.length > 0) {
    const ranking = (obj.rankings as Record<string, unknown>[])[0]
    if (!ranking.name) issues.push('Ranking missing "name"')
    if (!Array.isArray(ranking.ranks)) {
      issues.push('Ranking missing "ranks" array')
    } else if (ranking.ranks.length > 0) {
      const rank = (ranking.ranks as Record<string, unknown>[])[0]
      if (rank.current === undefined) issues.push('Rank entry missing "current"')
      if (!rank.team || typeof rank.team !== 'object') {
        issues.push('Rank entry missing "team"')
      } else {
        const team = rank.team as Record<string, unknown>
        if (!team.id) issues.push('Rank team missing "id"')
      }
    }
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Generate a structural hash of a JSON response.
 * Captures key names and value types (not values) to detect API changes.
 */
export function hashResponseStructure(data: unknown, depth: number = 3): string {
  const signature = buildTypeSignature(data, depth)
  // Simple string hash
  let hash = 0
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

function buildTypeSignature(data: unknown, depth: number): string {
  if (depth <= 0) return typeof data

  if (data === null) return 'null'
  if (data === undefined) return 'undefined'

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    return `[${buildTypeSignature(data[0], depth - 1)}]`
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>).sort()
    const entries = keys.map(
      (k) => `${k}:${buildTypeSignature((data as Record<string, unknown>)[k], depth - 1)}`
    )
    return `{${entries.join(',')}}`
  }

  return typeof data
}

/**
 * Log API health check to database.
 * Alerts via Sentry if structure hash changes from previous.
 */
export async function logApiHealth(
  supabase: SupabaseClient,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number,
  valid: boolean,
  hash: string,
  issues: string[]
): Promise<void> {
  try {
    // Check if hash changed from last check
    const { data: lastCheck } = await supabase
      .from('espn_api_health')
      .select('structure_hash, structure_valid')
      .eq('endpoint', endpoint)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single()

    const hashChanged = lastCheck && lastCheck.structure_hash !== hash
    const becameInvalid = lastCheck && lastCheck.structure_valid && !valid

    // Insert health check
    await supabase.from('espn_api_health').insert({
      endpoint,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      structure_valid: valid,
      structure_hash: hash,
      issues,
    })

    // Alert if structure changed or became invalid
    if (hashChanged || becameInvalid) {
      const message = hashChanged
        ? `ESPN API structure changed for "${endpoint}" (old: ${lastCheck.structure_hash}, new: ${hash})`
        : `ESPN API validation failed for "${endpoint}": ${issues.join(', ')}`

      console.warn(`[ESPN Monitor] ${message}`)
      Sentry.captureMessage(message, { level: 'warning', tags: { endpoint, monitor: 'espn-api' } })
    }
  } catch (err) {
    // Don't let monitoring errors break the sync
    console.error('[ESPN Monitor] Failed to log health check:', err)
  }
}

/**
 * Wrapper to monitor an ESPN API call.
 * Returns the parsed response data.
 */
export async function monitoredFetch(
  supabase: SupabaseClient,
  endpoint: string,
  url: string,
  validator: (data: unknown) => ValidationResult
): Promise<{ data: unknown; statusCode: number }> {
  const start = Date.now()
  const response = await fetch(url)
  const responseTimeMs = Date.now() - start
  const statusCode = response.status

  if (!response.ok) {
    await logApiHealth(supabase, endpoint, statusCode, responseTimeMs, false, '', [`HTTP ${statusCode}`])
    throw new Error(`ESPN API error: ${statusCode}`)
  }

  const data = await response.json()
  const validation = validator(data)
  const hash = hashResponseStructure(data)

  await logApiHealth(supabase, endpoint, statusCode, responseTimeMs, validation.valid, hash, validation.issues)

  return { data, statusCode }
}
