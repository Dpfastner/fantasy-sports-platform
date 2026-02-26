import { describe, it, expect } from 'vitest'
import {
  getSeasonStartDate,
  calculateCurrentWeek,
  getWeekLabel,
  isPostseason,
  SEASON_START_MONTH,
  SEASON_START_DAY,
  MAX_WEEK,
  WEEK_ZERO,
  REGULAR_SEASON_END,
  WEEK_CONF_CHAMPS,
  WEEK_ARMY_NAVY,
  WEEK_BOWLS,
  WEEK_CFP_R1,
  WEEK_CFP_QF,
  WEEK_CFP_SF,
  WEEK_CHAMPIONSHIP,
  WEEK_HEISMAN,
  POSTSEASON_START,
  SPECIAL_WEEKS,
  REGULAR_WEEK_COUNT,
} from './season'

// ── Constants ──────────────────────────────────────────────

describe('season constants', () => {
  it('season starts in August', () => {
    expect(SEASON_START_MONTH).toBe(7) // 0-indexed: 7 = August
  })

  it('season starts on the 24th', () => {
    expect(SEASON_START_DAY).toBe(24)
  })

  it('MAX_WEEK is 22 (Heisman)', () => {
    expect(MAX_WEEK).toBe(22)
  })

  it('POSTSEASON_START equals WEEK_CONF_CHAMPS', () => {
    expect(POSTSEASON_START).toBe(WEEK_CONF_CHAMPS)
  })

  it('REGULAR_WEEK_COUNT covers weeks 0–16', () => {
    expect(REGULAR_WEEK_COUNT).toBe(17)
  })

  it('special weeks are in ascending order', () => {
    for (let i = 1; i < SPECIAL_WEEKS.length; i++) {
      expect(SPECIAL_WEEKS[i]).toBeGreaterThan(SPECIAL_WEEKS[i - 1])
    }
  })

  it('week constants are sequential', () => {
    expect(WEEK_ZERO).toBe(0)
    expect(REGULAR_SEASON_END).toBe(14)
    expect(WEEK_CONF_CHAMPS).toBe(15)
    expect(WEEK_ARMY_NAVY).toBe(16)
    expect(WEEK_BOWLS).toBe(17)
    expect(WEEK_CFP_R1).toBe(18)
    expect(WEEK_CFP_QF).toBe(19)
    expect(WEEK_CFP_SF).toBe(20)
    expect(WEEK_CHAMPIONSHIP).toBe(21)
    expect(WEEK_HEISMAN).toBe(22)
  })
})

// ── getSeasonStartDate ─────────────────────────────────────

describe('getSeasonStartDate', () => {
  it('returns August 24 UTC for a given year', () => {
    const date = getSeasonStartDate(2025)
    expect(date.getUTCFullYear()).toBe(2025)
    expect(date.getUTCMonth()).toBe(7) // August
    expect(date.getUTCDate()).toBe(24)
  })

  it('returns midnight UTC', () => {
    const date = getSeasonStartDate(2025)
    expect(date.getUTCHours()).toBe(0)
    expect(date.getUTCMinutes()).toBe(0)
    expect(date.getUTCSeconds()).toBe(0)
  })

  it('works for different years', () => {
    const d2024 = getSeasonStartDate(2024)
    const d2026 = getSeasonStartDate(2026)
    expect(d2024.getUTCFullYear()).toBe(2024)
    expect(d2026.getUTCFullYear()).toBe(2026)
    // Same month/day regardless of year
    expect(d2024.getUTCMonth()).toBe(7)
    expect(d2024.getUTCDate()).toBe(24)
    expect(d2026.getUTCMonth()).toBe(7)
    expect(d2026.getUTCDate()).toBe(24)
  })
})

// ── calculateCurrentWeek ───────────────────────────────────

describe('calculateCurrentWeek', () => {
  const YEAR = 2025
  // August 24, 2025 00:00 UTC
  const seasonStart = Date.UTC(2025, 7, 24)
  const ONE_DAY = 24 * 60 * 60 * 1000
  const ONE_WEEK = 7 * ONE_DAY

  it('returns week 1 on season start day', () => {
    // weeksDiff = floor(0 / week) = 0, result = max(0, min(0+1, 22)) = 1
    expect(calculateCurrentWeek(YEAR, seasonStart)).toBe(1)
  })

  it('returns week 1 during the first 6 days after start', () => {
    expect(calculateCurrentWeek(YEAR, seasonStart + 1 * ONE_DAY)).toBe(1)
    expect(calculateCurrentWeek(YEAR, seasonStart + 6 * ONE_DAY)).toBe(1)
  })

  it('returns week 2 after 7 days', () => {
    expect(calculateCurrentWeek(YEAR, seasonStart + ONE_WEEK)).toBe(2)
  })

  it('returns week 3 after 14 days', () => {
    expect(calculateCurrentWeek(YEAR, seasonStart + 2 * ONE_WEEK)).toBe(3)
  })

  it('clamps to 0 before season starts', () => {
    // Far before season
    const julyFirst = Date.UTC(2025, 6, 1)
    expect(calculateCurrentWeek(YEAR, julyFirst)).toBe(0)
  })

  it('returns 0 exactly 1 day before season start', () => {
    expect(calculateCurrentWeek(YEAR, seasonStart - ONE_DAY)).toBe(0)
  })

  it('clamps to MAX_WEEK far after season ends', () => {
    const farFuture = Date.UTC(2026, 5, 1) // June 2026
    expect(calculateCurrentWeek(YEAR, farFuture)).toBe(MAX_WEEK)
  })

  it('returns MAX_WEEK at the boundary', () => {
    // Week 22 starts at seasonStart + 21 weeks
    const week22Start = seasonStart + 21 * ONE_WEEK
    expect(calculateCurrentWeek(YEAR, week22Start)).toBe(22)
  })

  it('never exceeds MAX_WEEK', () => {
    // Week 23 would be seasonStart + 22 weeks, but should clamp
    const beyondMax = seasonStart + 30 * ONE_WEEK
    expect(calculateCurrentWeek(YEAR, beyondMax)).toBe(MAX_WEEK)
  })

  it('uses Date.now() as default when no timestamp provided', () => {
    const result = calculateCurrentWeek(YEAR)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(MAX_WEEK)
  })
})

// ── isPostseason ───────────────────────────────────────────

describe('isPostseason', () => {
  it('returns false for week 0', () => {
    expect(isPostseason(0)).toBe(false)
  })

  it('returns false for regular season weeks (1-14)', () => {
    for (let w = 1; w <= REGULAR_SEASON_END; w++) {
      expect(isPostseason(w)).toBe(false)
    }
  })

  it('returns true for conference championships (week 15)', () => {
    expect(isPostseason(WEEK_CONF_CHAMPS)).toBe(true)
  })

  it('returns true for all postseason weeks', () => {
    expect(isPostseason(WEEK_ARMY_NAVY)).toBe(true)
    expect(isPostseason(WEEK_BOWLS)).toBe(true)
    expect(isPostseason(WEEK_CFP_R1)).toBe(true)
    expect(isPostseason(WEEK_CFP_QF)).toBe(true)
    expect(isPostseason(WEEK_CFP_SF)).toBe(true)
    expect(isPostseason(WEEK_CHAMPIONSHIP)).toBe(true)
    expect(isPostseason(WEEK_HEISMAN)).toBe(true)
  })
})

// ── getWeekLabel ───────────────────────────────────────────

describe('getWeekLabel', () => {
  describe('leaderboard context (default)', () => {
    it('returns "W0" for week 0', () => {
      expect(getWeekLabel(0)).toBe('W0')
    })

    it('returns "W1" through "W14" for regular season', () => {
      expect(getWeekLabel(1)).toBe('W1')
      expect(getWeekLabel(7)).toBe('W7')
      expect(getWeekLabel(14)).toBe('W14')
    })

    it('returns "W15" for conference championships', () => {
      expect(getWeekLabel(WEEK_CONF_CHAMPS)).toBe('W15')
    })

    it('returns "W16" for Army-Navy', () => {
      expect(getWeekLabel(WEEK_ARMY_NAVY)).toBe('W16')
    })

    it('returns "Bowls" for bowl week', () => {
      expect(getWeekLabel(WEEK_BOWLS)).toBe('Bowls')
    })

    it('returns "CFP" for CFP round 1', () => {
      expect(getWeekLabel(WEEK_CFP_R1)).toBe('CFP')
    })

    it('returns "Natty" for CFP quarterfinals', () => {
      expect(getWeekLabel(WEEK_CFP_QF)).toBe('Natty')
    })

    it('returns "W20" for CFP semifinals (no special label)', () => {
      expect(getWeekLabel(WEEK_CFP_SF)).toBe('W20')
    })

    it('returns "W21" for championship', () => {
      expect(getWeekLabel(WEEK_CHAMPIONSHIP)).toBe('W21')
    })

    it('returns "W22" for Heisman', () => {
      expect(getWeekLabel(WEEK_HEISMAN)).toBe('W22')
    })
  })

  describe('schedule context', () => {
    it('returns "Week 0" for week 0', () => {
      expect(getWeekLabel(0, 'schedule')).toBe('Week 0')
    })

    it('returns "Week N" for regular season', () => {
      expect(getWeekLabel(1, 'schedule')).toBe('Week 1')
      expect(getWeekLabel(14, 'schedule')).toBe('Week 14')
    })

    it('returns "Conf Champ" for conference championships', () => {
      expect(getWeekLabel(WEEK_CONF_CHAMPS, 'schedule')).toBe('Conf Champ')
    })

    it('returns "Week 16" for Army-Navy', () => {
      expect(getWeekLabel(WEEK_ARMY_NAVY, 'schedule')).toBe('Week 16')
    })

    it('returns "Bowl" for bowl week', () => {
      expect(getWeekLabel(WEEK_BOWLS, 'schedule')).toBe('Bowl')
    })

    it('returns "Week N" for CFP weeks (no special schedule labels)', () => {
      expect(getWeekLabel(WEEK_CFP_R1, 'schedule')).toBe('Week 18')
      expect(getWeekLabel(WEEK_CFP_QF, 'schedule')).toBe('Week 19')
    })
  })
})
