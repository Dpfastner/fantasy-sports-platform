/**
 * Shared tier constants, colors, and utilities for roster-style event pools.
 * Single source of truth — all components import from here.
 */

import { type RosterTier, DEFAULT_ROSTER_SCORING } from './shared'

export type { RosterTier }

/** Default tier configuration (A: 1-15, B: 16-30, C: 31+) */
export const DEFAULT_TIERS = DEFAULT_ROSTER_SCORING.tiers

/** Tier display colors — superset shape with bg, text, and border */
export const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-success/10', text: 'text-success-text', border: 'border-success/30' },
  B: { bg: 'bg-info/10', text: 'text-info-text', border: 'border-info/30' },
  C: { bg: 'bg-warning/10', text: 'text-warning-text', border: 'border-warning/30' },
}

/**
 * Determine which tier a participant belongs to based on OWGR.
 * Falls back to last tier key (typically 'C') if no match.
 */
export function getTier(
  owgr: number,
  tiers: Record<string, { owgr_min: number; owgr_max?: number }> = DEFAULT_TIERS
): string {
  for (const [key, def] of Object.entries(tiers)) {
    if (owgr >= def.owgr_min && (!def.owgr_max || owgr <= def.owgr_max)) return key
  }
  return 'C'
}

/** Country flag image from flagcdn */
export function CountryFlag({ country, countryCode }: { country?: string; countryCode?: string }) {
  if (!countryCode) return null
  return (
    <img
      src={`https://flagcdn.com/24x18/${countryCode}.png`}
      alt={country || ''}
      title={country || ''}
      width={18}
      height={14}
      className="inline-block shrink-0 rounded-[2px]"
      loading="lazy"
    />
  )
}
