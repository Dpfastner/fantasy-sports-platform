// Scoring preset definitions for league settings
// Each preset defines all scoring fields that commissioners can customize.
// CFB fields and presets are sourced from the sport scoring registry.

import {
  getScoringConfigForSport,
  getScoringFieldKeysForSport,
  type SportScoringPreset,
} from '@/lib/scoring/sport-scoring-registry'

export type ScoringPresetKey = 'standard' | 'conservative' | 'aggressive' | 'chaos' | 'custom'

export interface ScoringPresetValues {
  // Regular game - wins
  points_win: number
  points_conference_game: number
  points_over_50: number
  points_shutout: number
  points_ranked_25: number
  points_ranked_10: number
  // Regular game - losses
  points_loss: number
  points_conference_game_loss: number
  points_over_50_loss: number
  points_shutout_loss: number
  points_ranked_25_loss: number
  points_ranked_10_loss: number
  // Special events
  points_conference_championship_win: number
  points_conference_championship_loss: number
  points_heisman_winner: number
  points_bowl_appearance: number
  points_playoff_first_round: number
  points_playoff_quarterfinal: number
  points_playoff_semifinal: number
  points_championship_win: number
  points_championship_loss: number
}

export interface ScoringPreset {
  key: ScoringPresetKey
  label: string
  description: string
  values: ScoringPresetValues
}

// Build presets from registry
const cfbConfig = getScoringConfigForSport('cfb')!

function registryPresetToTyped(preset: SportScoringPreset): ScoringPreset {
  return {
    key: preset.key as ScoringPresetKey,
    label: preset.label,
    description: preset.description,
    values: preset.values as unknown as ScoringPresetValues,
  }
}

export const SCORING_PRESETS: ScoringPreset[] = cfbConfig.presets.map(registryPresetToTyped)

// All scoring field keys that presets control — sourced from registry
export const SCORING_FIELD_KEYS: (keyof ScoringPresetValues)[] =
  getScoringFieldKeysForSport('cfb') as (keyof ScoringPresetValues)[]

/** Check if current settings match a known preset */
export function detectPreset(settings: Record<string, unknown>): ScoringPresetKey {
  for (const preset of SCORING_PRESETS) {
    const matches = SCORING_FIELD_KEYS.every(
      (key) => Number(settings[key]) === preset.values[key]
    )
    if (matches) return preset.key
  }
  return 'custom'
}

/** Get preset values by key */
export function getPresetValues(key: ScoringPresetKey): ScoringPresetValues | null {
  const preset = SCORING_PRESETS.find((p) => p.key === key)
  return preset?.values ?? null
}

/**
 * Get presets for a specific sport. Returns typed presets with Record<string, number> values.
 * Use this for sport-agnostic contexts where ScoringPresetValues type isn't needed.
 */
export function getPresetsForSportSlug(sportSlug: string): SportScoringPreset[] {
  const config = getScoringConfigForSport(sportSlug)
  return config?.presets ?? []
}
