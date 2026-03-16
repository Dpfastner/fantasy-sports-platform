/**
 * Sport Season Configuration
 *
 * Defines season timing, week structure, and postseason layout per sport.
 * Consumed by season.ts, week.ts, and any UI that displays week labels or
 * season progress.
 *
 * To add a new sport:
 * 1. Define its SportSeasonConfig with all weeks
 * 2. Register it in SPORT_SEASON_CONFIGS
 */

// --- Interfaces ---

export interface SportWeekDefinition {
  weekNumber: number
  /** Full label, e.g. 'Week 1' or 'Conference Championships' */
  label: string
  /** Short label for compact displays, e.g. 'W1' or 'Bowls' */
  shortLabel: string
  /** Week type for styling and logic */
  type: 'regular' | 'postseason' | 'special'
  /** Optional color class for roster grid columns */
  color?: string
  /** Optional text color class for roster grid columns */
  textColor?: string
}

export interface SportLeaderboardWeekLabel {
  weekNumber: number
  label: string
}

export interface SportScheduleWeekLabel {
  weekNumber: number
  label: string
}

export interface SportSeasonConfig {
  sportSlug: string
  /** 0-indexed month (7 = August) */
  startMonth: number
  startDay: number
  regularSeasonWeeks: number
  totalWeeks: number
  postseasonStartWeek: number
  weeks: SportWeekDefinition[]
  /** Leaderboard uses abbreviated labels for some weeks */
  leaderboardLabels: Record<number, string>
  /** Schedule view uses descriptive labels for some weeks */
  scheduleLabels: Record<number, string>
  /** Weeks where special event scoring applies */
  eventBonusWeeks: number[]
  /** Special columns shown in the roster grid */
  rosterSpecialColumns: Array<{
    week: number
    label: string
    color: string
    textColor: string
  }>
}

// --- CFB Season Config ---

function buildCFBWeeks(): SportWeekDefinition[] {
  const weeks: SportWeekDefinition[] = []

  // Week 0 (early start)
  weeks.push({ weekNumber: 0, label: 'Week 0', shortLabel: 'W0', type: 'regular' })

  // Weeks 1-14 (regular season)
  for (let i = 1; i <= 14; i++) {
    weeks.push({ weekNumber: i, label: `Week ${i}`, shortLabel: `W${i}`, type: 'regular' })
  }

  // Week 15: Conference Championships
  weeks.push({ weekNumber: 15, label: 'Conference Championships', shortLabel: 'Conf', type: 'postseason' })

  // Week 16: Army-Navy
  weeks.push({ weekNumber: 16, label: 'Week 16', shortLabel: 'W16', type: 'regular' })

  // Week 17: Bowl Games
  weeks.push({ weekNumber: 17, label: 'Bowl Games', shortLabel: 'Bowl', type: 'postseason', color: 'bg-green-600/20', textColor: 'text-green-400' })

  // Week 18: CFP First Round
  weeks.push({ weekNumber: 18, label: 'CFP First Round', shortLabel: 'R1', type: 'postseason', color: 'bg-orange-600/20', textColor: 'text-orange-400' })

  // Week 19: CFP Quarterfinals
  weeks.push({ weekNumber: 19, label: 'CFP Quarterfinals', shortLabel: 'QF', type: 'postseason', color: 'bg-orange-600/20', textColor: 'text-orange-400' })

  // Week 20: CFP Semifinals
  weeks.push({ weekNumber: 20, label: 'CFP Semifinals', shortLabel: 'SF', type: 'postseason', color: 'bg-orange-600/20', textColor: 'text-orange-400' })

  // Week 21: National Championship
  weeks.push({ weekNumber: 21, label: 'National Championship', shortLabel: 'NC', type: 'postseason', color: 'bg-yellow-600/20', textColor: 'text-yellow-400' })

  // Week 22: Heisman
  weeks.push({ weekNumber: 22, label: 'Heisman', shortLabel: 'H', type: 'special', color: 'bg-amber-600/20', textColor: 'text-amber-400' })

  return weeks
}

const CFB_SEASON_CONFIG: SportSeasonConfig = {
  sportSlug: 'cfb',
  startMonth: 7, // August (0-indexed)
  startDay: 24,
  regularSeasonWeeks: 17, // weeks 0-16
  totalWeeks: 22,
  postseasonStartWeek: 15,
  weeks: buildCFBWeeks(),
  leaderboardLabels: {
    17: 'Bowls',
    18: 'CFP',
    19: 'Natty',
  },
  scheduleLabels: {
    15: 'Conf Champ',
    16: 'Week 16',
    17: 'Bowl',
  },
  eventBonusWeeks: [15, 17, 18, 19, 20, 21, 22],
  rosterSpecialColumns: [
    { week: 17, label: 'Bowl', color: 'bg-green-600/20', textColor: 'text-green-400' },
    { week: 18, label: 'R1', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
    { week: 19, label: 'QF', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
    { week: 20, label: 'SF', color: 'bg-orange-600/20', textColor: 'text-orange-400' },
    { week: 21, label: 'NC', color: 'bg-yellow-600/20', textColor: 'text-yellow-400' },
    { week: 22, label: 'H', color: 'bg-amber-600/20', textColor: 'text-amber-400' },
  ],
}

// --- Registry ---

const SPORT_SEASON_CONFIGS: Map<string, SportSeasonConfig> = new Map([
  ['cfb', CFB_SEASON_CONFIG],
])

// --- Public API ---

export function getSeasonConfigForSport(slug: string): SportSeasonConfig | undefined {
  return SPORT_SEASON_CONFIGS.get(slug)
}

export function getWeeksForSport(slug: string): SportWeekDefinition[] {
  return SPORT_SEASON_CONFIGS.get(slug)?.weeks ?? []
}

export function getTotalWeeksForSport(slug: string): number {
  return SPORT_SEASON_CONFIGS.get(slug)?.totalWeeks ?? 0
}

export function getPostseasonStartForSport(slug: string): number {
  return SPORT_SEASON_CONFIGS.get(slug)?.postseasonStartWeek ?? 0
}
