/**
 * Sport Scoring Registry
 *
 * Defines scoring fields and presets per sport. Each sport registers its own
 * scoring configuration here. The registry is consumed by scoring-presets.ts,
 * the points calculator router, and league settings UI.
 *
 * To add a new sport:
 * 1. Define its SportScoringConfig (fields + presets)
 * 2. Register it in SPORT_SCORING_CONFIGS
 * 3. Create a calculator in src/lib/points/calculator-{sport}.ts
 * 4. Register the calculator in src/lib/points/index.ts
 */

// --- Interfaces ---

export interface SportScoringField {
  /** Database column key, e.g. 'points_win' */
  key: string
  /** Human-readable label, e.g. 'Win' */
  label: string
  /** Category for UI grouping */
  category: 'game_win' | 'game_loss' | 'special_event'
  /** Default value for this field */
  defaultValue: number
  /** Tooltip / description */
  description: string
  /** Which part of the season this applies to */
  appliesToFormat?: 'regular' | 'postseason' | 'all'
}

export interface SportScoringPreset {
  key: string
  label: string
  description: string
  values: Record<string, number>
}

export interface SportScoringConfig {
  sportSlug: string
  fields: SportScoringField[]
  presets: SportScoringPreset[]
}

// --- CFB Scoring Config ---

const CFB_FIELDS: SportScoringField[] = [
  // Game wins
  { key: 'points_win', label: 'Win', category: 'game_win', defaultValue: 1, description: 'Points when your program wins a game', appliesToFormat: 'regular' },
  { key: 'points_conference_game', label: 'Conference Game', category: 'game_win', defaultValue: 1, description: 'Bonus for winning a conference game', appliesToFormat: 'regular' },
  { key: 'points_over_50', label: '50+ Points', category: 'game_win', defaultValue: 1, description: 'Bonus when your program scores 50 or more points', appliesToFormat: 'all' },
  { key: 'points_shutout', label: 'Shutout', category: 'game_win', defaultValue: 1, description: 'Bonus when your program shuts out the opponent', appliesToFormat: 'all' },
  { key: 'points_ranked_25', label: 'Beat Ranked (11-25)', category: 'game_win', defaultValue: 1, description: 'Bonus for beating a team ranked 11-25', appliesToFormat: 'regular' },
  { key: 'points_ranked_10', label: 'Beat Ranked (1-10)', category: 'game_win', defaultValue: 2, description: 'Bonus for beating a team ranked 1-10', appliesToFormat: 'regular' },
  // Game losses
  { key: 'points_loss', label: 'Loss', category: 'game_loss', defaultValue: 0, description: 'Points when your program loses a game' },
  { key: 'points_conference_game_loss', label: 'Conference Game (L)', category: 'game_loss', defaultValue: 0, description: 'Penalty for losing a conference game' },
  { key: 'points_over_50_loss', label: '50+ Points (L)', category: 'game_loss', defaultValue: 0, description: 'Points when your program scores 50+ but loses' },
  { key: 'points_shutout_loss', label: 'Shutout (L)', category: 'game_loss', defaultValue: 0, description: 'Penalty when your program gets shut out' },
  { key: 'points_ranked_25_loss', label: 'Ranked (11-25) Loss', category: 'game_loss', defaultValue: 0, description: 'Points for losing to a team ranked 11-25' },
  { key: 'points_ranked_10_loss', label: 'Ranked (1-10) Loss', category: 'game_loss', defaultValue: 0, description: 'Points for losing to a team ranked 1-10' },
  // Special events
  { key: 'points_conference_championship_win', label: 'Conference Championship Win', category: 'special_event', defaultValue: 10, description: 'Bonus for winning a conference championship', appliesToFormat: 'postseason' },
  { key: 'points_conference_championship_loss', label: 'Conference Championship Loss', category: 'special_event', defaultValue: 0, description: 'Points for losing a conference championship', appliesToFormat: 'postseason' },
  { key: 'points_heisman_winner', label: 'Heisman Winner', category: 'special_event', defaultValue: 10, description: 'Bonus when a player from your program wins the Heisman', appliesToFormat: 'postseason' },
  { key: 'points_bowl_appearance', label: 'Bowl Appearance', category: 'special_event', defaultValue: 3, description: 'Points for making a bowl game', appliesToFormat: 'postseason' },
  { key: 'points_playoff_first_round', label: 'CFP First Round', category: 'special_event', defaultValue: 3, description: 'Points for making the CFP first round', appliesToFormat: 'postseason' },
  { key: 'points_playoff_quarterfinal', label: 'CFP Quarterfinal', category: 'special_event', defaultValue: 4, description: 'Points for making the CFP quarterfinal', appliesToFormat: 'postseason' },
  { key: 'points_playoff_semifinal', label: 'CFP Semifinal', category: 'special_event', defaultValue: 5, description: 'Points for making the CFP semifinal', appliesToFormat: 'postseason' },
  { key: 'points_championship_win', label: 'National Championship Win', category: 'special_event', defaultValue: 20, description: 'Points for winning the national championship', appliesToFormat: 'postseason' },
  { key: 'points_championship_loss', label: 'National Championship Loss', category: 'special_event', defaultValue: 6, description: 'Points for losing the national championship', appliesToFormat: 'postseason' },
]

const CFB_PRESETS: SportScoringPreset[] = [
  {
    key: 'standard',
    label: 'Standard',
    description: 'Balanced scoring with no loss penalties. Great for first-time leagues.',
    values: {
      points_win: 1, points_conference_game: 1, points_over_50: 1, points_shutout: 1,
      points_ranked_25: 1, points_ranked_10: 2,
      points_loss: 0, points_conference_game_loss: 0, points_over_50_loss: 0,
      points_shutout_loss: 0, points_ranked_25_loss: 0, points_ranked_10_loss: 0,
      points_conference_championship_win: 10, points_conference_championship_loss: 0,
      points_heisman_winner: 10, points_bowl_appearance: 3,
      points_playoff_first_round: 3, points_playoff_quarterfinal: 4,
      points_playoff_semifinal: 5, points_championship_win: 20, points_championship_loss: 6,
    },
  },
  {
    key: 'conservative',
    label: 'Conservative',
    description: 'Lower bonuses keep scores tight. Wins matter most, fewer blowout swings.',
    values: {
      points_win: 1, points_conference_game: 1, points_over_50: 1, points_shutout: 1,
      points_ranked_25: 1, points_ranked_10: 2,
      points_loss: 0, points_conference_game_loss: 0, points_over_50_loss: 0,
      points_shutout_loss: 0, points_ranked_25_loss: 0, points_ranked_10_loss: 0,
      points_conference_championship_win: 5, points_conference_championship_loss: 0,
      points_heisman_winner: 5, points_bowl_appearance: 3,
      points_playoff_first_round: 3, points_playoff_quarterfinal: 4,
      points_playoff_semifinal: 5, points_championship_win: 10, points_championship_loss: 6,
    },
  },
  {
    key: 'aggressive',
    label: 'Aggressive',
    description: 'Higher bonuses and loss penalties. Every game matters — bad weeks hurt.',
    values: {
      points_win: 2, points_conference_game: 1.5, points_over_50: 1.5, points_shutout: 1.5,
      points_ranked_25: 2, points_ranked_10: 3,
      points_loss: -1, points_conference_game_loss: -0.5, points_over_50_loss: 0,
      points_shutout_loss: -1, points_ranked_25_loss: 0, points_ranked_10_loss: 0,
      points_conference_championship_win: 15, points_conference_championship_loss: -3,
      points_heisman_winner: 15, points_bowl_appearance: 5,
      points_playoff_first_round: 5, points_playoff_quarterfinal: 6,
      points_playoff_semifinal: 8, points_championship_win: 30, points_championship_loss: -5,
    },
  },
  {
    key: 'chaos',
    label: 'Chaos Mode',
    description: 'Massive swings. Upsets rewarded, losses punished hard. Not for the faint of heart.',
    values: {
      points_win: 1, points_conference_game: 2, points_over_50: 2, points_shutout: 2,
      points_ranked_25: 2, points_ranked_10: 4,
      points_loss: -2, points_conference_game_loss: -1, points_over_50_loss: 1,
      points_shutout_loss: -2, points_ranked_25_loss: 1, points_ranked_10_loss: 1.5,
      points_conference_championship_win: 20, points_conference_championship_loss: -5,
      points_heisman_winner: 20, points_bowl_appearance: 6,
      points_playoff_first_round: 6, points_playoff_quarterfinal: 8,
      points_playoff_semifinal: 10, points_championship_win: 40, points_championship_loss: -10,
    },
  },
]

const CFB_SCORING_CONFIG: SportScoringConfig = {
  sportSlug: 'cfb',
  fields: CFB_FIELDS,
  presets: CFB_PRESETS,
}

// --- Registry ---

const SPORT_SCORING_CONFIGS: Map<string, SportScoringConfig> = new Map([
  ['cfb', CFB_SCORING_CONFIG],
])

// --- Public API ---

export function getScoringConfigForSport(slug: string): SportScoringConfig | undefined {
  return SPORT_SCORING_CONFIGS.get(slug)
}

export function getScoringFieldsForSport(slug: string): SportScoringField[] {
  return SPORT_SCORING_CONFIGS.get(slug)?.fields ?? []
}

export function getPresetsForSport(slug: string): SportScoringPreset[] {
  return SPORT_SCORING_CONFIGS.get(slug)?.presets ?? []
}

export function getScoringFieldKeysForSport(slug: string): string[] {
  return getScoringFieldsForSport(slug).map(f => f.key)
}

export function getRegisteredSports(): string[] {
  return Array.from(SPORT_SCORING_CONFIGS.keys())
}
