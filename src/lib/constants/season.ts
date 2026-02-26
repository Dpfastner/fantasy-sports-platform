// ============================================
// Season and week constants for CFB fantasy
// ============================================

// Season start date (August 24 UTC, Week 0)
export const SEASON_START_MONTH = 7 // August (0-indexed)
export const SEASON_START_DAY = 24

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
export const MAX_WEEK = 22
export const POSTSEASON_START = WEEK_CONF_CHAMPS

// Number of regular-season columns shown in roster grid (weeks 0–16)
export const REGULAR_WEEK_COUNT = 17

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
export const EVENT_BONUS_WEEKS = [
  WEEK_CONF_CHAMPS,
  WEEK_BOWLS,
  WEEK_CFP_R1,
  WEEK_CFP_QF,
  WEEK_CFP_SF,
  WEEK_CHAMPIONSHIP,
  WEEK_HEISMAN,
] as const

// Roster grid special columns configuration
export const ROSTER_SPECIAL_COLUMNS = [
  { week: WEEK_BOWLS, label: 'Bowl', color: 'bg-green-600/20', textColor: 'text-green-400' },
  { week: WEEK_CFP_R1, label: 'R1', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
  { week: WEEK_CFP_QF, label: 'QF', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
  { week: WEEK_CFP_SF, label: 'SF', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
  { week: WEEK_CHAMPIONSHIP, label: 'NC', color: 'bg-yellow-600/20', textColor: 'text-yellow-400' },
  { week: WEEK_HEISMAN, label: 'H', color: 'bg-amber-600/20', textColor: 'text-amber-400' },
] as const

// Week label maps for different contexts
export const LEADERBOARD_WEEK_LABELS: Record<number, string> = {
  [WEEK_BOWLS]: 'Bowls',
  [WEEK_CFP_R1]: 'CFP',
  [WEEK_CFP_QF]: 'Natty',
}

export const SCHEDULE_WEEK_LABELS: Record<number, string> = {
  [WEEK_CONF_CHAMPS]: 'Conf Champ',
  [WEEK_ARMY_NAVY]: 'Week 16',
  [WEEK_BOWLS]: 'Bowl',
}

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
 * Returns 0–22. Does not check sandbox overrides (see week.ts for that).
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
