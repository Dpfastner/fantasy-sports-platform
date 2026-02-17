import { cookies } from 'next/headers'
import { getEnvironment } from './env'

const WEEK_OVERRIDE_COOKIE = 'sandbox_week_override'

/**
 * Calculate the current week based on the season start date
 * In sandbox/development, allows override via cookie
 */
export async function getCurrentWeek(seasonYear: number): Promise<number> {
  // Check for sandbox/development week override
  const env = getEnvironment()
  if (env === 'sandbox' || env === 'development') {
    const cookieStore = await cookies()
    const override = cookieStore.get(WEEK_OVERRIDE_COOKIE)
    if (override?.value) {
      const overrideWeek = parseInt(override.value, 10)
      if (!isNaN(overrideWeek) && overrideWeek >= 0 && overrideWeek <= 20) {
        return overrideWeek
      }
    }
  }

  // Calculate current week based on date
  const seasonStart = new Date(seasonYear, 7, 24) // August 24
  const weeksDiff = Math.floor((Date.now() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(0, Math.min(weeksDiff + 1, 20))
}

/**
 * Get the week override cookie name for client components
 */
export function getWeekOverrideCookieName(): string {
  return WEEK_OVERRIDE_COOKIE
}
