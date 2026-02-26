import { describe, it, expect } from 'vitest'
import { getLeagueYear, getLeagueSeasonName } from './league-helpers'

describe('league-helpers', () => {
  const currentYear = new Date().getFullYear()

  // ── getLeagueYear ────────────────────────────────────────

  describe('getLeagueYear', () => {
    it('extracts year from object', () => {
      expect(getLeagueYear({ year: 2025 })).toBe(2025)
    })

    it('extracts year from single-element array', () => {
      expect(getLeagueYear([{ year: 2025 }])).toBe(2025)
    })

    it('extracts year from first element of multi-element array', () => {
      expect(getLeagueYear([{ year: 2025 }, { year: 2024 }])).toBe(2025)
    })

    it('returns current year for null', () => {
      expect(getLeagueYear(null)).toBe(currentYear)
    })

    it('returns current year for undefined', () => {
      expect(getLeagueYear(undefined)).toBe(currentYear)
    })

    it('returns current year for empty array', () => {
      expect(getLeagueYear([])).toBe(currentYear)
    })

    it('returns current year for object without year property', () => {
      expect(getLeagueYear({ name: 'Test' })).toBe(currentYear)
    })
  })

  // ── getLeagueSeasonName ──────────────────────────────────

  describe('getLeagueSeasonName', () => {
    it('extracts name from object', () => {
      expect(getLeagueSeasonName({ name: '2025 CFB Season', year: 2025 })).toBe('2025 CFB Season')
    })

    it('extracts name from single-element array', () => {
      expect(getLeagueSeasonName([{ name: '2025 CFB Season' }])).toBe('2025 CFB Season')
    })

    it('falls back to "YEAR Season" when name is missing', () => {
      expect(getLeagueSeasonName({ year: 2025 })).toBe('2025 Season')
    })

    it('uses fallbackYear for display name when no name in data', () => {
      expect(getLeagueSeasonName(null, 2025)).toBe('2025 Season')
    })

    it('uses fallbackYear over extracted year for display name', () => {
      expect(getLeagueSeasonName({ year: 2024 }, 2025)).toBe('2025 Season')
    })

    it('uses name from data even when fallbackYear is provided', () => {
      expect(getLeagueSeasonName({ name: 'Custom Name', year: 2024 }, 2025)).toBe('Custom Name')
    })

    it('returns current year fallback for null without fallbackYear', () => {
      expect(getLeagueSeasonName(null)).toBe(`${currentYear} Season`)
    })

    it('returns current year fallback for empty array', () => {
      expect(getLeagueSeasonName([])).toBe(`${currentYear} Season`)
    })
  })
})
