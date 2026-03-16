// ============================================
// Season and week constants for CFB fantasy
// Values sourced from sport-seasons config registry.
// All exports preserved for backward compatibility.
// ============================================

import { getSeasonConfigForSport } from './sport-seasons'

const cfb = getSeasonConfigForSport('cfb')!

// Season start date (August 24 UTC, Week 0)
export const SEASON_START_MONTH = cfb.startMonth // 7 = August (0-indexed)
export const SEASON_START_DAY = cfb.startDay

// Week number constants
export const WEEK_ZERO = 0
export const REGULAR_SEASON_END = 14
export const WEEK_CONF_CHAMPS = 15
export const WEEK_ARMY_NAVY = 16
export const WEEK_BOWLS = 17
export const WEEK_CFP_R1 = 18
export const WEEK_CFP_QF = 19
export const WEEK_CFP_SF = 20
export const WEEK_CHAMPIONSHIP = 21
export const WEEK_HEISMAN = 22
export const MAX_WEEK = cfb.totalWeeks
export const POSTSEASON_START = cfb.postseasonStartWeek

// Number of regular-season columns shown in roster grid (weeks 0–16)
export const REGULAR_WEEK_COUNT = cfb.regularSeasonWeeks

// All special/postseason week numbers
export const SPECIAL_WEEKS = [
  WEEK_CONF_CHAMPS,
  WEEK_BOWLS,
  WEEK_CFP_R1,
  WEEK_CFP_QF,
  WEEK_CFP_SF,
  WEEK_CHAMPIONSHIP,
  WEEK_HEISMAN,
] as const

// Event bonus weeks (weeks where special event scoring applies)
export const EVENT_BONUS_WEEKS = cfb.eventBonusWeeks

// Roster grid special columns configuration — sourced from registry
export const ROSTER_SPECIAL_COLUMNS = cfb.rosterSpecialColumns

// Week label maps for different contexts — sourced from registry
export const LEADERBOARD_WEEK_LABELS: Record<number, string> = cfb.leaderboardLabels

export const SCHEDULE_WEEK_LABELS: Record<number, string> = cfb.scheduleLabels

/**
 * Get a human-readable label for a week number.
 * Context: 'leaderboard' uses abbreviated labels, 'schedule' uses descriptive labels.
 */
export function getWeekLabel(week: number, context: 'leaderboard' | 'schedule' = 'leaderboard'): string {
  if (context === 'leaderboard') {
    if (week === 0) return 'W0'
    if (LEADERBOARD_WEEK_LABELS[week]) return LEADERBOARD_WEEK_LABELS[week]
    if (week >= 1 && week <= WEEK_ARMY_NAVY) return `W${week}`
    return `W${week}`
  }

  // schedule context
  if (SCHEDULE_WEEK_LABELS[week]) return SCHEDULE_WEEK_LABELS[week]
  if (week <= REGULAR_SEASON_END) return `Week ${week}`
  return `Week ${week}`
}

/**
 * Get the UTC season start date for a given year.
 */
export function getSeasonStartDate(year: number): Date {
  return new Date(Date.UTC(year, SEASON_START_MONTH, SEASON_START_DAY))
}

/**
 * Calculate the current week number from a timestamp.
 * Returns 0–MAX_WEEK. Does not check sandbox overrides (see week.ts for that).
 */
export function calculateCurrentWeek(year: number, now: number = Date.now()): number {
  const seasonStart = getSeasonStartDate(year)
  const weeksDiff = Math.floor((now - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return Math.max(0, Math.min(weeksDiff + 1, MAX_WEEK))
}

/**
 * Check if a week number is in the postseason.
 */
export function isPostseason(week: number): boolean {
  return week >= POSTSEASON_START
}
