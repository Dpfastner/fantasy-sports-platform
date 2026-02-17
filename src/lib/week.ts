import { cookies } from 'next/headers'
import { getEnvironment } from './env'

export const WEEK_OVERRIDE_COOKIE = 'sandbox_week_override'
export const DATE_OVERRIDE_COOKIE = 'sandbox_date_override'

// Day offsets from Monday (week starts on Monday)
const DAY_OFFSETS: Record<string, number> = {
  'tue': 1,  // Tuesday = Monday + 1
  'thu': 3,  // Thursday = Monday + 3
  'sat': 5,  // Saturday = Monday + 5
  'sun': 6,  // Sunday = Monday + 6
}

/**
 * Calculate the current week based on the season start date
 * In sandbox/development, allows override via cookie
 *
 * NOTE: This is a server-only function. Do not import in client components.
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
 * Get the simulated current date for deadline testing
 * In sandbox/development with day override, returns a simulated date
 * Otherwise returns the actual current date
 *
 * NOTE: This is a server-only function. Do not import in client components.
 */
export async function getSimulatedDate(seasonYear: number): Promise<Date> {
  const env = getEnvironment()
  if (env === 'sandbox' || env === 'development') {
    const cookieStore = await cookies()
    const weekOverride = cookieStore.get(WEEK_OVERRIDE_COOKIE)
    const dayOverride = cookieStore.get(DATE_OVERRIDE_COOKIE)

    if (weekOverride?.value && dayOverride?.value) {
      const week = parseInt(weekOverride.value, 10)
      const dayKey = dayOverride.value.toLowerCase()

      if (!isNaN(week) && week >= 0 && week <= 20 && DAY_OFFSETS[dayKey] !== undefined) {
        // Calculate the Monday of the given week
        // Season starts August 24, Week 0 is that week
        const seasonStart = new Date(seasonYear, 7, 24) // August 24
        // Find the Monday of week 0 (could be before Aug 24)
        const dayOfWeek = seasonStart.getDay() // 0 = Sunday, 1 = Monday, etc.
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
        const week0Monday = new Date(seasonStart)
        week0Monday.setDate(seasonStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

        // Add weeks to get to the target week's Monday
        const targetMonday = new Date(week0Monday)
        targetMonday.setDate(week0Monday.getDate() + (week * 7))

        // Add day offset
        const simulatedDate = new Date(targetMonday)
        simulatedDate.setDate(targetMonday.getDate() + DAY_OFFSETS[dayKey])

        // Set time to noon to avoid timezone issues
        simulatedDate.setHours(12, 0, 0, 0)

        return simulatedDate
      }
    }
  }

  // Return actual current date
  return new Date()
}

/**
 * Get both current week and simulated date in one call
 * Useful for components that need both values
 */
export async function getWeekAndDate(seasonYear: number): Promise<{
  currentWeek: number
  simulatedDate: Date
  dayOverride: string | null
}> {
  const env = getEnvironment()
  let dayOverride: string | null = null

  if (env === 'sandbox' || env === 'development') {
    const cookieStore = await cookies()
    const dayOverrideCookie = cookieStore.get(DATE_OVERRIDE_COOKIE)
    if (dayOverrideCookie?.value) {
      dayOverride = dayOverrideCookie.value
    }
  }

  const [currentWeek, simulatedDate] = await Promise.all([
    getCurrentWeek(seasonYear),
    getSimulatedDate(seasonYear),
  ])

  return { currentWeek, simulatedDate, dayOverride }
}
