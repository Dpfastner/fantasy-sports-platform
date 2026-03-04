// Scoring preset definitions for league settings
// Each preset defines all 21 scoring fields that commissioners can customize

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

const STANDARD_VALUES: ScoringPresetValues = {
  points_win: 1,
  points_conference_game: 1,
  points_over_50: 1,
  points_shutout: 1,
  points_ranked_25: 1,
  points_ranked_10: 2,
  points_loss: 0,
  points_conference_game_loss: 0,
  points_over_50_loss: 0,
  points_shutout_loss: 0,
  points_ranked_25_loss: 0,
  points_ranked_10_loss: 0,
  points_conference_championship_win: 10,
  points_conference_championship_loss: 0,
  points_heisman_winner: 10,
  points_bowl_appearance: 3,
  points_playoff_first_round: 3,
  points_playoff_quarterfinal: 4,
  points_playoff_semifinal: 5,
  points_championship_win: 20,
  points_championship_loss: 6,
}

const CONSERVATIVE_VALUES: ScoringPresetValues = {
  points_win: 1,
  points_conference_game: 1,
  points_over_50: 1,
  points_shutout: 1,
  points_ranked_25: 1,
  points_ranked_10: 2,
  points_loss: 0,
  points_conference_game_loss: 0,
  points_over_50_loss: 0,
  points_shutout_loss: 0,
  points_ranked_25_loss: 0,
  points_ranked_10_loss: 0,
  points_conference_championship_win: 5,
  points_conference_championship_loss: 0,
  points_heisman_winner: 5,
  points_bowl_appearance: 3,
  points_playoff_first_round: 3,
  points_playoff_quarterfinal: 4,
  points_playoff_semifinal: 5,
  points_championship_win: 10,
  points_championship_loss: 6,
}

const AGGRESSIVE_VALUES: ScoringPresetValues = {
  points_win: 2,
  points_conference_game: 1.5,
  points_over_50: 1.5,
  points_shutout: 1.5,
  points_ranked_25: 2,
  points_ranked_10: 3,
  points_loss: -1,
  points_conference_game_loss: -0.5,
  points_over_50_loss: 0,
  points_shutout_loss: -1,
  points_ranked_25_loss: 0,
  points_ranked_10_loss: 0,
  points_conference_championship_win: 15,
  points_conference_championship_loss: -3,
  points_heisman_winner: 15,
  points_bowl_appearance: 5,
  points_playoff_first_round: 5,
  points_playoff_quarterfinal: 6,
  points_playoff_semifinal: 8,
  points_championship_win: 30,
  points_championship_loss: -5,
}

const CHAOS_VALUES: ScoringPresetValues = {
  points_win: 1,
  points_conference_game: 2,
  points_over_50: 2,
  points_shutout: 2,
  points_ranked_25: 2,
  points_ranked_10: 4,
  points_loss: -2,
  points_conference_game_loss: -1,
  points_over_50_loss: 1,
  points_shutout_loss: -2,
  points_ranked_25_loss: 1,
  points_ranked_10_loss: 1.5,
  points_conference_championship_win: 20,
  points_conference_championship_loss: -5,
  points_heisman_winner: 20,
  points_bowl_appearance: 6,
  points_playoff_first_round: 6,
  points_playoff_quarterfinal: 8,
  points_playoff_semifinal: 10,
  points_championship_win: 40,
  points_championship_loss: -10,
}

export const SCORING_PRESETS: ScoringPreset[] = [
  {
    key: 'standard',
    label: 'Standard',
    description: 'Balanced scoring with no loss penalties. Great for first-time leagues.',
    values: STANDARD_VALUES,
  },
  {
    key: 'conservative',
    label: 'Conservative',
    description: 'Lower bonuses keep scores tight. Wins matter most, fewer blowout swings.',
    values: CONSERVATIVE_VALUES,
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    description: 'Higher bonuses and loss penalties. Every game matters — bad weeks hurt.',
    values: AGGRESSIVE_VALUES,
  },
  {
    key: 'chaos',
    label: 'Chaos Mode',
    description: 'Massive swings. Upsets rewarded, losses punished hard. Not for the faint of heart.',
    values: CHAOS_VALUES,
  },
]

// All scoring field keys that presets control
export const SCORING_FIELD_KEYS: (keyof ScoringPresetValues)[] = [
  'points_win', 'points_conference_game', 'points_over_50', 'points_shutout',
  'points_ranked_25', 'points_ranked_10',
  'points_loss', 'points_conference_game_loss', 'points_over_50_loss',
  'points_shutout_loss', 'points_ranked_25_loss', 'points_ranked_10_loss',
  'points_conference_championship_win', 'points_conference_championship_loss',
  'points_heisman_winner', 'points_bowl_appearance',
  'points_playoff_first_round', 'points_playoff_quarterfinal', 'points_playoff_semifinal',
  'points_championship_win', 'points_championship_loss',
]

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
