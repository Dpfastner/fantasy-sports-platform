import type { UserBadgeWithDefinition } from '@/types/database'

export interface LeagueSettings {
  id: string
  league_id: string
  // Draft settings
  draft_date: string | null
  draft_type: 'snake' | 'linear'
  draft_order_type: 'random' | 'manual'
  draft_timer_seconds: number
  schools_per_team: number
  max_school_selections_per_team: number
  max_school_selections_total: number
  // Transaction settings
  max_add_drops_per_season: number
  add_drop_deadline: string | null
  // Scoring - Wins
  points_win: number
  points_conference_game: number
  points_over_50: number
  points_shutout: number
  points_ranked_25: number
  points_ranked_10: number
  // Scoring - Losses
  points_loss: number
  points_conference_game_loss: number
  points_over_50_loss: number
  points_shutout_loss: number
  points_ranked_25_loss: number
  points_ranked_10_loss: number
  // Scoring - Special events
  points_conference_championship_win: number
  points_conference_championship_loss: number
  points_heisman_winner: number
  points_bowl_appearance: number
  points_playoff_first_round: number
  points_playoff_quarterfinal: number
  points_playoff_semifinal: number
  points_championship_win: number
  points_championship_loss: number
  // Prize settings
  entry_fee: number
  prize_pool: number
  high_points_enabled: boolean
  high_points_weekly_amount: number
  high_points_weeks: number
  high_points_allow_ties: boolean
  num_winners: number
  winner_percentage: number
  runner_up_percentage: number
  third_place_percentage: number
  // Double points settings
  double_points_enabled: boolean
  max_double_picks_per_season: number
  // Trade settings
  trades_enabled: boolean
  trade_deadline: string | null
  max_trades_per_season: number
  // Scoring preset
  scoring_preset: string | null
  // Section visibility toggles
  show_announcements: boolean
  show_chat: boolean
  show_activity_feed: boolean
  // Status
  settings_locked: boolean
}

export interface League {
  id: string
  name: string
  max_teams: number
  is_public: boolean
  created_by: string
}

export interface LeagueMember {
  id: string
  user_id: string
  role: 'commissioner' | 'co_commissioner' | 'member'
  has_paid: boolean
  joined_at: string
  profiles: {
    id: string
    email: string
    display_name: string | null
    tier?: string
  }
  fantasy_teams: {
    id: string
    name: string
    second_owner_id: string | null
  }[] | null
}

export interface DraftOrderTeam {
  id: string
  name: string
  draft_position: number
  owner_name: string
}

export interface RecentTrade {
  id: string
  status: string
  proposed_at: string
  resolved_at: string | null
  proposer_team: { id: string; name: string } | null
  receiver_team: { id: string; name: string } | null
  trade_items: { school_id: string; team_id: string; direction: string; schools: { name: string } | null }[]
}
