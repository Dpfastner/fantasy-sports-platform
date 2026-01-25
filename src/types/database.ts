export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type SportType = 'college_football' | 'hockey' | 'baseball' | 'basketball' | 'cricket'
export type DraftType = 'snake' | 'linear'
export type DraftStatus = 'not_started' | 'in_progress' | 'paused' | 'completed'
export type GameStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
export type LeagueRole = 'commissioner' | 'member'
export type UserRole = 'user' | 'admin'

export interface Database {
  public: {
    Tables: {
      // ============================================
      // GLOBAL TABLES (shared across all leagues)
      // ============================================

      // Sports supported by the platform
      sports: {
        Row: {
          id: string
          name: string
          slug: SportType
          is_active: boolean
          api_provider: string | null // 'espn', 'nhl', etc.
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: SportType
          is_active?: boolean
          api_provider?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: SportType
          is_active?: boolean
          api_provider?: string | null
          created_at?: string
        }
      }

      // Seasons (2024, 2025, etc.)
      seasons: {
        Row: {
          id: string
          sport_id: string
          year: number
          name: string // "2024-2025 Season"
          start_date: string
          end_date: string
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sport_id: string
          year: number
          name: string
          start_date: string
          end_date: string
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sport_id?: string
          year?: number
          name?: string
          start_date?: string
          end_date?: string
          is_current?: boolean
          created_at?: string
        }
      }

      // Teams/Schools master list (134 FBS schools, 32 NHL teams, etc.)
      schools: {
        Row: {
          id: string
          sport_id: string
          name: string
          abbreviation: string | null
          primary_color: string
          secondary_color: string
          conference: string
          division: string | null // For East/West divisions
          external_api_id: string | null // ESPN team ID, etc.
          logo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sport_id: string
          name: string
          abbreviation?: string | null
          primary_color: string
          secondary_color: string
          conference: string
          division?: string | null
          external_api_id?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sport_id?: string
          name?: string
          abbreviation?: string | null
          primary_color?: string
          secondary_color?: string
          conference?: string
          division?: string | null
          external_api_id?: string | null
          logo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // User profiles (extends Supabase auth.users)
      profiles: {
        Row: {
          id: string // References auth.users.id
          email: string
          display_name: string | null
          avatar_url: string | null
          role: UserRole
          favorite_school_id: string | null // For charity feature
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          favorite_school_id?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          favorite_school_id?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // LEAGUE TABLES
      // ============================================

      // Leagues
      leagues: {
        Row: {
          id: string
          sport_id: string
          season_id: string
          name: string
          description: string | null
          invite_code: string // Unique code for joining
          is_public: boolean
          max_teams: number
          created_by: string // User ID of commissioner
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sport_id: string
          season_id: string
          name: string
          description?: string | null
          invite_code?: string
          is_public?: boolean
          max_teams?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sport_id?: string
          season_id?: string
          name?: string
          description?: string | null
          invite_code?: string
          is_public?: boolean
          max_teams?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }

      // League settings (commissioner configuration)
      league_settings: {
        Row: {
          id: string
          league_id: string
          // Draft settings
          draft_date: string | null
          draft_type: DraftType
          draft_timer_seconds: number
          schools_per_team: number
          max_school_selections_per_team: number // How many times same school on one team
          max_school_selections_total: number // How many times same school across league
          // Transaction settings
          max_add_drops_per_season: number
          add_drop_deadline: string | null // Season-wide deadline
          // Scoring - Wins
          points_win: number
          points_conference_game: number
          points_over_50: number
          points_shutout: number
          points_ranked_25: number
          points_ranked_10: number
          // Scoring - Losses (usually 0)
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
          // Locks
          settings_locked: boolean // Locked after draft starts
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          draft_date?: string | null
          draft_type?: DraftType
          draft_timer_seconds?: number
          schools_per_team?: number
          max_school_selections_per_team?: number
          max_school_selections_total?: number
          max_add_drops_per_season?: number
          add_drop_deadline?: string | null
          points_win?: number
          points_conference_game?: number
          points_over_50?: number
          points_shutout?: number
          points_ranked_25?: number
          points_ranked_10?: number
          points_loss?: number
          points_conference_game_loss?: number
          points_over_50_loss?: number
          points_shutout_loss?: number
          points_ranked_25_loss?: number
          points_ranked_10_loss?: number
          points_conference_championship_win?: number
          points_conference_championship_loss?: number
          points_heisman_winner?: number
          points_bowl_appearance?: number
          points_playoff_first_round?: number
          points_playoff_quarterfinal?: number
          points_playoff_semifinal?: number
          points_championship_win?: number
          points_championship_loss?: number
          entry_fee?: number
          prize_pool?: number
          high_points_enabled?: boolean
          high_points_weekly_amount?: number
          high_points_weeks?: number
          high_points_allow_ties?: boolean
          num_winners?: number
          winner_percentage?: number
          runner_up_percentage?: number
          third_place_percentage?: number
          settings_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          draft_date?: string | null
          draft_type?: DraftType
          draft_timer_seconds?: number
          schools_per_team?: number
          max_school_selections_per_team?: number
          max_school_selections_total?: number
          max_add_drops_per_season?: number
          add_drop_deadline?: string | null
          points_win?: number
          points_conference_game?: number
          points_over_50?: number
          points_shutout?: number
          points_ranked_25?: number
          points_ranked_10?: number
          points_loss?: number
          points_conference_game_loss?: number
          points_over_50_loss?: number
          points_shutout_loss?: number
          points_ranked_25_loss?: number
          points_ranked_10_loss?: number
          points_conference_championship_win?: number
          points_conference_championship_loss?: number
          points_heisman_winner?: number
          points_bowl_appearance?: number
          points_playoff_first_round?: number
          points_playoff_quarterfinal?: number
          points_playoff_semifinal?: number
          points_championship_win?: number
          points_championship_loss?: number
          entry_fee?: number
          prize_pool?: number
          high_points_enabled?: boolean
          high_points_weekly_amount?: number
          high_points_weeks?: number
          high_points_allow_ties?: boolean
          num_winners?: number
          winner_percentage?: number
          runner_up_percentage?: number
          third_place_percentage?: number
          settings_locked?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // League members (links users to leagues)
      league_members: {
        Row: {
          id: string
          league_id: string
          user_id: string
          role: LeagueRole
          has_paid: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          role?: LeagueRole
          has_paid?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          role?: LeagueRole
          has_paid?: boolean
          joined_at?: string
        }
      }

      // ============================================
      // FANTASY TEAM TABLES
      // ============================================

      // Fantasy teams (user's team within a league)
      fantasy_teams: {
        Row: {
          id: string
          league_id: string
          user_id: string
          name: string
          primary_color: string
          secondary_color: string
          image_url: string | null
          draft_position: number | null
          total_points: number
          high_points_winnings: number
          add_drops_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          name: string
          primary_color?: string
          secondary_color?: string
          image_url?: string | null
          draft_position?: number | null
          total_points?: number
          high_points_winnings?: number
          add_drops_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          name?: string
          primary_color?: string
          secondary_color?: string
          image_url?: string | null
          draft_position?: number | null
          total_points?: number
          high_points_winnings?: number
          add_drops_used?: number
          created_at?: string
          updated_at?: string
        }
      }

      // Roster periods (tracks which schools on which teams and when)
      roster_periods: {
        Row: {
          id: string
          fantasy_team_id: string
          school_id: string
          slot_number: number // 1-12 etc, for re-adding to same slot
          start_week: number
          end_week: number | null // null = still active
          created_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          school_id: string
          slot_number: number
          start_week: number
          end_week?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          school_id?: string
          slot_number?: number
          start_week?: number
          end_week?: number | null
          created_at?: string
        }
      }

      // Transactions (add/drop history)
      transactions: {
        Row: {
          id: string
          fantasy_team_id: string
          week_number: number
          dropped_school_id: string
          added_school_id: string
          slot_number: number
          created_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          week_number: number
          dropped_school_id: string
          added_school_id: string
          slot_number: number
          created_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          week_number?: number
          dropped_school_id?: string
          added_school_id?: string
          slot_number?: number
          created_at?: string
        }
      }

      // Weekly double points pick (future feature - schema ready)
      weekly_double_picks: {
        Row: {
          id: string
          fantasy_team_id: string
          week_number: number
          school_id: string
          created_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          week_number: number
          school_id: string
          created_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          week_number?: number
          school_id?: string
          created_at?: string
        }
      }

      // ============================================
      // DRAFT TABLES
      // ============================================

      // Draft state
      drafts: {
        Row: {
          id: string
          league_id: string
          status: DraftStatus
          current_round: number
          current_pick: number
          current_team_id: string | null
          pick_deadline: string | null // When current pick expires
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          status?: DraftStatus
          current_round?: number
          current_pick?: number
          current_team_id?: string | null
          pick_deadline?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          status?: DraftStatus
          current_round?: number
          current_pick?: number
          current_team_id?: string | null
          pick_deadline?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // Draft order (which team picks when)
      draft_order: {
        Row: {
          id: string
          draft_id: string
          fantasy_team_id: string
          round: number
          pick_number: number // Overall pick number (1-96 for 8 teams x 12 rounds)
          position_in_round: number // 1-8 within the round
        }
        Insert: {
          id?: string
          draft_id: string
          fantasy_team_id: string
          round: number
          pick_number: number
          position_in_round: number
        }
        Update: {
          id?: string
          draft_id?: string
          fantasy_team_id?: string
          round?: number
          pick_number?: number
          position_in_round?: number
        }
      }

      // Draft picks (history of all picks made)
      draft_picks: {
        Row: {
          id: string
          draft_id: string
          fantasy_team_id: string
          school_id: string
          round: number
          pick_number: number
          picked_at: string
        }
        Insert: {
          id?: string
          draft_id: string
          fantasy_team_id: string
          school_id: string
          round: number
          pick_number: number
          picked_at?: string
        }
        Update: {
          id?: string
          draft_id?: string
          fantasy_team_id?: string
          school_id?: string
          round?: number
          pick_number?: number
          picked_at?: string
        }
      }

      // ============================================
      // GAME DATA TABLES
      // ============================================

      // Games (schedule + results)
      games: {
        Row: {
          id: string
          season_id: string
          external_game_id: string | null // ESPN game ID
          week_number: number
          week_name: string | null // "Week 1", "Conference Championships", etc.
          game_date: string
          game_time: string | null
          bowl_name: string | null // "Rose Bowl", "CFP Semifinal", etc.
          home_school_id: string
          away_school_id: string
          home_score: number | null
          away_score: number | null
          home_rank: number | null // AP rank at time of game
          away_rank: number | null
          status: GameStatus
          is_conference_game: boolean
          is_bowl_game: boolean
          is_playoff_game: boolean
          playoff_round: string | null // 'first', 'quarter', 'semi', 'championship'
          quarter: string | null // For live games
          clock: string | null // For live games
          possession_team_id: string | null // For live games
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          external_game_id?: string | null
          week_number: number
          week_name?: string | null
          game_date: string
          game_time?: string | null
          bowl_name?: string | null
          home_school_id: string
          away_school_id: string
          home_score?: number | null
          away_score?: number | null
          home_rank?: number | null
          away_rank?: number | null
          status?: GameStatus
          is_conference_game?: boolean
          is_bowl_game?: boolean
          is_playoff_game?: boolean
          playoff_round?: string | null
          quarter?: string | null
          clock?: string | null
          possession_team_id?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          external_game_id?: string | null
          week_number?: number
          week_name?: string | null
          game_date?: string
          game_time?: string | null
          bowl_name?: string | null
          home_school_id?: string
          away_school_id?: string
          home_score?: number | null
          away_score?: number | null
          home_rank?: number | null
          away_rank?: number | null
          status?: GameStatus
          is_conference_game?: boolean
          is_bowl_game?: boolean
          is_playoff_game?: boolean
          playoff_round?: string | null
          quarter?: string | null
          clock?: string | null
          possession_team_id?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // POINTS TABLES
      // ============================================

      // School weekly points (calculated from games)
      school_weekly_points: {
        Row: {
          id: string
          school_id: string
          season_id: string
          week_number: number
          game_id: string | null
          base_points: number // Win/loss points
          conference_bonus: number
          over_50_bonus: number
          shutout_bonus: number
          ranked_25_bonus: number
          ranked_10_bonus: number
          total_points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          season_id: string
          week_number: number
          game_id?: string | null
          base_points?: number
          conference_bonus?: number
          over_50_bonus?: number
          shutout_bonus?: number
          ranked_25_bonus?: number
          ranked_10_bonus?: number
          total_points?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          season_id?: string
          week_number?: number
          game_id?: string | null
          base_points?: number
          conference_bonus?: number
          over_50_bonus?: number
          shutout_bonus?: number
          ranked_25_bonus?: number
          ranked_10_bonus?: number
          total_points?: number
          created_at?: string
          updated_at?: string
        }
      }

      // School season bonuses (bowl, playoff, heisman, etc.)
      school_season_bonuses: {
        Row: {
          id: string
          school_id: string
          season_id: string
          bonus_type: string // 'bowl_appearance', 'playoff_first', 'heisman', 'championship_win', etc.
          points: number
          awarded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          school_id: string
          season_id: string
          bonus_type: string
          points: number
          awarded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          season_id?: string
          bonus_type?: string
          points?: number
          awarded_at?: string
          created_at?: string
        }
      }

      // Fantasy team weekly points (aggregated from roster)
      fantasy_team_weekly_points: {
        Row: {
          id: string
          fantasy_team_id: string
          week_number: number
          points: number
          is_high_points_winner: boolean
          high_points_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          week_number: number
          points?: number
          is_high_points_winner?: boolean
          high_points_amount?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          week_number?: number
          points?: number
          is_high_points_winner?: boolean
          high_points_amount?: number
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // RANKINGS & HISTORY TABLES
      // ============================================

      // AP Rankings history (weekly snapshots)
      ap_rankings_history: {
        Row: {
          id: string
          season_id: string
          week_number: number
          school_id: string
          rank: number
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          week_number: number
          school_id: string
          rank: number
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          week_number?: number
          school_id?: string
          rank?: number
          created_at?: string
        }
      }

      // Playoff teams (separate from AP rankings)
      playoff_teams: {
        Row: {
          id: string
          season_id: string
          school_id: string
          seed: number
          eliminated_round: string | null // 'first', 'quarter', 'semi', 'championship' or null if still active
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          season_id: string
          school_id: string
          seed: number
          eliminated_round?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          school_id?: string
          seed?: number
          eliminated_round?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // Heisman winners
      heisman_winners: {
        Row: {
          id: string
          season_id: string
          school_id: string
          player_name: string
          awarded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          season_id: string
          school_id: string
          player_name: string
          awarded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          season_id?: string
          school_id?: string
          player_name?: string
          awarded_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      sport_type: SportType
      draft_type: DraftType
      draft_status: DraftStatus
      game_status: GameStatus
      league_role: LeagueRole
      user_role: UserRole
    }
  }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Sport = Tables<'sports'>
export type Season = Tables<'seasons'>
export type School = Tables<'schools'>
export type Profile = Tables<'profiles'>
export type League = Tables<'leagues'>
export type LeagueSettings = Tables<'league_settings'>
export type LeagueMember = Tables<'league_members'>
export type FantasyTeam = Tables<'fantasy_teams'>
export type RosterPeriod = Tables<'roster_periods'>
export type Transaction = Tables<'transactions'>
export type Draft = Tables<'drafts'>
export type DraftOrder = Tables<'draft_order'>
export type DraftPick = Tables<'draft_picks'>
export type Game = Tables<'games'>
export type SchoolWeeklyPoints = Tables<'school_weekly_points'>
export type SchoolSeasonBonus = Tables<'school_season_bonuses'>
export type FantasyTeamWeeklyPoints = Tables<'fantasy_team_weekly_points'>
export type ApRankingsHistory = Tables<'ap_rankings_history'>
export type PlayoffTeam = Tables<'playoff_teams'>
export type HeismanWinner = Tables<'heisman_winners'>
export type WeeklyDoublePick = Tables<'weekly_double_picks'>
