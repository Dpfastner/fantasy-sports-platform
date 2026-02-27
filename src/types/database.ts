export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type SportType = 'college_football' | 'hockey' | 'baseball' | 'basketball' | 'cricket'
export type DraftType = 'snake' | 'linear' | 'auction'
export type DraftStatus = 'not_started' | 'in_progress' | 'paused' | 'completed'
export type GameStatus = 'scheduled' | 'live' | 'completed' | 'postponed' | 'cancelled'
export type LeagueRole = 'commissioner' | 'co_commissioner' | 'member'
export type UserRole = 'user' | 'admin'
export type DraftOrderType = 'random' | 'manual'
export type UserTier = 'free' | 'pro'

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
          tier: UserTier
          referred_by: string | null
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
          tier?: UserTier
          referred_by?: string | null
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
          tier?: UserTier
          referred_by?: string | null
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
          draft_order_type: DraftOrderType
          manual_draft_order: string[] | null // UUID array
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
          // Double points
          double_points_enabled: boolean
          max_double_picks_per_season: number
          // Scoring preset
          scoring_preset: string | null
          // Locks
          settings_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          draft_date?: string | null
          draft_type?: DraftType
          draft_timer_seconds?: number
          draft_order_type?: DraftOrderType
          manual_draft_order?: string[] | null
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
          double_points_enabled?: boolean
          max_double_picks_per_season?: number
          scoring_preset?: string | null
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
          draft_order_type?: DraftOrderType
          manual_draft_order?: string[] | null
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
          double_points_enabled?: boolean
          max_double_picks_per_season?: number
          scoring_preset?: string | null
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
          updated_at: string | null
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          role?: LeagueRole
          has_paid?: boolean
          joined_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          role?: LeagueRole
          has_paid?: boolean
          joined_at?: string
          updated_at?: string | null
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
          second_owner_id: string | null
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
          second_owner_id?: string | null
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
          second_owner_id?: string | null
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
          slot_number: number
          start_week: number
          end_week: number | null // null = still active
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          school_id: string
          slot_number: number
          start_week: number
          end_week?: number | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          school_id?: string
          slot_number?: number
          start_week?: number
          end_week?: number | null
          created_at?: string
          updated_at?: string | null
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
          updated_at: string | null
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          week_number: number
          dropped_school_id: string
          added_school_id: string
          slot_number: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          week_number?: number
          dropped_school_id?: string
          added_school_id?: string
          slot_number?: number
          created_at?: string
          updated_at?: string | null
        }
      }

      // Weekly double points pick
      weekly_double_picks: {
        Row: {
          id: string
          fantasy_team_id: string
          week_number: number
          school_id: string
          picked_at: string | null
          points_earned: number | null
          bonus_points: number | null
          created_at: string
        }
        Insert: {
          id?: string
          fantasy_team_id: string
          week_number: number
          school_id: string
          picked_at?: string | null
          points_earned?: number | null
          bonus_points?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          fantasy_team_id?: string
          week_number?: number
          school_id?: string
          picked_at?: string | null
          points_earned?: number | null
          bonus_points?: number | null
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
          pick_deadline: string | null
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
          pick_number: number
          position_in_round: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          draft_id: string
          fantasy_team_id: string
          round: number
          pick_number: number
          position_in_round: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          draft_id?: string
          fantasy_team_id?: string
          round?: number
          pick_number?: number
          position_in_round?: number
          updated_at?: string | null
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
          updated_at: string | null
        }
        Insert: {
          id?: string
          draft_id: string
          fantasy_team_id: string
          school_id: string
          round: number
          pick_number: number
          picked_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          draft_id?: string
          fantasy_team_id?: string
          school_id?: string
          round?: number
          pick_number?: number
          picked_at?: string
          updated_at?: string | null
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
          external_game_id: string | null
          week_number: number
          week_name: string | null
          game_date: string
          game_time: string | null
          bowl_name: string | null
          home_school_id: string | null // Nullable for FCS opponents
          away_school_id: string | null // Nullable for FCS opponents
          home_team_name: string | null // Denormalized for FCS opponents
          home_team_logo_url: string | null
          away_team_name: string | null
          away_team_logo_url: string | null
          home_score: number | null
          away_score: number | null
          home_rank: number | null
          away_rank: number | null
          status: GameStatus
          is_conference_game: boolean
          is_bowl_game: boolean
          is_playoff_game: boolean
          playoff_round: string | null
          quarter: string | null
          clock: string | null
          possession_team_id: string | null
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
          home_school_id?: string | null
          away_school_id?: string | null
          home_team_name?: string | null
          home_team_logo_url?: string | null
          away_team_name?: string | null
          away_team_logo_url?: string | null
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
          home_school_id?: string | null
          away_school_id?: string | null
          home_team_name?: string | null
          home_team_logo_url?: string | null
          away_team_name?: string | null
          away_team_logo_url?: string | null
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
          base_points: number
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
          bonus_type: string
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

      // League-specific event bonuses (per league scoring)
      league_school_event_bonuses: {
        Row: {
          id: string
          league_id: string
          school_id: string
          season_id: string
          week_number: number
          bonus_type: string
          points: number
          game_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          school_id: string
          season_id: string
          week_number: number
          bonus_type: string
          points?: number
          game_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          school_id?: string
          season_id?: string
          week_number?: number
          bonus_type?: string
          points?: number
          game_id?: string | null
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
          eliminated_round: string | null
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

      // Issue reports (bug reports from users)
      issue_reports: {
        Row: {
          id: string
          category: string
          description: string
          user_id: string | null
          page: string | null
          user_agent: string | null
          status: string
          resolved_at: string | null
          resolved_by: string | null
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          description: string
          user_id?: string | null
          page?: string | null
          user_agent?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category?: string
          description?: string
          user_id?: string | null
          page?: string | null
          user_agent?: string | null
          status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          admin_notes?: string | null
          created_at?: string
        }
      }

      // ============================================
      // AUDIT & ACTIVITY TABLES
      // ============================================

      // Activity log (audit trail)
      activity_log: {
        Row: {
          id: string
          league_id: string | null
          user_id: string | null
          action: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          league_id?: string | null
          user_id?: string | null
          action: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string | null
          user_id?: string | null
          action?: string
          details?: Json
          created_at?: string
        }
      }

      // ============================================
      // PREMIUM / FEATURE FLAG TABLES
      // ============================================

      // Feature flags (global feature toggles)
      feature_flags: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          tier_required: string
          enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          tier_required?: string
          enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          tier_required?: string
          enabled?: boolean
          created_at?: string
        }
      }

      // User feature flag overrides
      user_feature_flags: {
        Row: {
          id: string
          user_id: string
          feature_flag_id: string
          enabled: boolean
          granted_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          feature_flag_id: string
          enabled?: boolean
          granted_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          feature_flag_id?: string
          enabled?: boolean
          granted_at?: string
          expires_at?: string | null
        }
      }

      // Notification preferences
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_game_results: boolean
          email_draft_reminders: boolean
          email_transaction_confirmations: boolean
          email_league_announcements: boolean
          push_enabled: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email_game_results?: boolean
          email_draft_reminders?: boolean
          email_transaction_confirmations?: boolean
          email_league_announcements?: boolean
          push_enabled?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          email_game_results?: boolean
          email_draft_reminders?: boolean
          email_transaction_confirmations?: boolean
          email_league_announcements?: boolean
          push_enabled?: boolean
          created_at?: string
          updated_at?: string | null
        }
      }

      // Watchlists (user school bookmarks)
      watchlists: {
        Row: {
          id: string
          user_id: string
          school_id: string
          league_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_id: string
          league_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          school_id?: string
          league_id?: string | null
          notes?: string | null
          created_at?: string
        }
      }

      // ============================================
      // TRADE TABLES
      // ============================================

      // Trades (proposals between teams)
      trades: {
        Row: {
          id: string
          league_id: string
          proposer_team_id: string
          receiver_team_id: string
          status: string
          proposed_at: string
          resolved_at: string | null
          commissioner_override: boolean
          override_reason: string | null
        }
        Insert: {
          id?: string
          league_id: string
          proposer_team_id: string
          receiver_team_id: string
          status?: string
          proposed_at?: string
          resolved_at?: string | null
          commissioner_override?: boolean
          override_reason?: string | null
        }
        Update: {
          id?: string
          league_id?: string
          proposer_team_id?: string
          receiver_team_id?: string
          status?: string
          proposed_at?: string
          resolved_at?: string | null
          commissioner_override?: boolean
          override_reason?: string | null
        }
      }

      // Trade items (schools being exchanged)
      trade_items: {
        Row: {
          id: string
          trade_id: string
          team_id: string
          school_id: string
          direction: string
        }
        Insert: {
          id?: string
          trade_id: string
          team_id: string
          school_id: string
          direction: string
        }
        Update: {
          id?: string
          trade_id?: string
          team_id?: string
          school_id?: string
          direction?: string
        }
      }

      // ============================================
      // INVITE & WAITLIST TABLES
      // ============================================

      // League invites (multiple invite links per league)
      league_invites: {
        Row: {
          id: string
          league_id: string
          code: string
          created_by: string
          expires_at: string | null
          max_uses: number | null
          current_uses: number
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          code: string
          created_by: string
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          code?: string
          created_by?: string
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_at?: string
        }
      }

      // Waitlist (landing page email capture)
      waitlist: {
        Row: {
          id: string
          email: string
          name: string | null
          source: string | null
          referral_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          source?: string | null
          referral_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          source?: string | null
          referral_code?: string | null
          created_at?: string
        }
      }

      // ============================================
      // BADGE TABLES
      // ============================================

      // Badge definitions (catalog of badge types)
      badge_definitions: {
        Row: {
          id: string
          slug: string
          category: string
          label: string
          description: string | null
          icon_url: string | null
          fallback_icon: string
          color: string
          bg_color: string
          sort_order: number
          is_active: boolean
          requires_metadata: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          category: string
          label: string
          description?: string | null
          icon_url?: string | null
          fallback_icon?: string
          color?: string
          bg_color?: string
          sort_order?: number
          is_active?: boolean
          requires_metadata?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          category?: string
          label?: string
          description?: string | null
          icon_url?: string | null
          fallback_icon?: string
          color?: string
          bg_color?: string
          sort_order?: number
          is_active?: boolean
          requires_metadata?: boolean
          created_at?: string
        }
      }

      // User badges (instances earned by users)
      user_badges: {
        Row: {
          id: string
          user_id: string
          badge_definition_id: string
          metadata: Json
          granted_by: string | null
          granted_at: string
          revoked_at: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          badge_definition_id: string
          metadata?: Json
          granted_by?: string | null
          granted_at?: string
          revoked_at?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          badge_definition_id?: string
          metadata?: Json
          granted_by?: string | null
          granted_at?: string
          revoked_at?: string | null
          source?: string
          created_at?: string
        }
      }

      // Season champions (permanent winner records)
      season_champions: {
        Row: {
          id: string
          league_id: string
          season_id: string
          user_id: string | null
          email: string | null
          fantasy_team_id: string | null
          team_name: string
          total_points: number
          final_rank: number
          sport: string
          year: number
          league_name: string
          recorded_at: string
        }
        Insert: {
          id?: string
          league_id: string
          season_id: string
          user_id?: string | null
          email?: string | null
          fantasy_team_id?: string | null
          team_name: string
          total_points: number
          final_rank?: number
          sport: string
          year: number
          league_name: string
          recorded_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          season_id?: string
          user_id?: string | null
          email?: string | null
          fantasy_team_id?: string | null
          team_name?: string
          total_points?: number
          final_rank?: number
          sport?: string
          year?: number
          league_name?: string
          recorded_at?: string
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
      draft_order_type: DraftOrderType
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
export type LeagueSchoolEventBonus = Tables<'league_school_event_bonuses'>
export type FantasyTeamWeeklyPoints = Tables<'fantasy_team_weekly_points'>
export type ApRankingsHistory = Tables<'ap_rankings_history'>
export type PlayoffTeam = Tables<'playoff_teams'>
export type HeismanWinner = Tables<'heisman_winners'>
export type WeeklyDoublePick = Tables<'weekly_double_picks'>
export type IssueReport = Tables<'issue_reports'>
export type ActivityLog = Tables<'activity_log'>
export type FeatureFlag = Tables<'feature_flags'>
export type UserFeatureFlag = Tables<'user_feature_flags'>
export type NotificationPreference = Tables<'notification_preferences'>
export type Watchlist = Tables<'watchlists'>
export type Trade = Tables<'trades'>
export type TradeItem = Tables<'trade_items'>
export type LeagueInvite = Tables<'league_invites'>
export type WaitlistEntry = Tables<'waitlist'>
export type BadgeDefinition = Tables<'badge_definitions'>
export type UserBadge = Tables<'user_badges'>
export type SeasonChampion = Tables<'season_champions'>

// Composite type for badge display (badge instance + joined definition)
export interface UserBadgeWithDefinition {
  id: string
  user_id: string
  badge_definition_id: string
  metadata: Record<string, unknown>
  granted_at: string
  badge_definitions: BadgeDefinition
}
