/**
 * Sport Calculator Router
 *
 * Dispatches to the correct sport-specific calculator based on sport slug.
 * Currently only CFB is registered. To add a new sport:
 *
 * 1. Create src/lib/points/calculator-{sport}.ts implementing SportCalculator
 * 2. Import and register it in the CALCULATORS map below
 */

import type { SportCalculator } from './shared'
import {
  calculateWeeklySchoolPoints,
  calculateFantasyTeamPoints,
  calculateAllPoints,
} from './calculator'

// Wrap existing CFB calculator functions as a SportCalculator
const cfbCalculator: SportCalculator = {
  sportSlug: 'cfb',
  calculateWeeklySchoolPoints,
  calculateFantasyTeamPoints,
  calculateAllPoints,
}

const CALCULATORS: Map<string, SportCalculator> = new Map([
  ['cfb', cfbCalculator],
])

/**
 * Get the calculator for a given sport.
 * Returns undefined if no calculator is registered for that sport.
 */
export function getCalculatorForSport(slug: string): SportCalculator | undefined {
  return CALCULATORS.get(slug)
}

/**
 * Get all registered sport slugs that have calculators.
 */
export function getRegisteredCalculatorSports(): string[] {
  return Array.from(CALCULATORS.keys())
}
