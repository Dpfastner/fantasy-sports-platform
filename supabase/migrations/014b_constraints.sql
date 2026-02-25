-- ============================================
-- 014b: Add CHECK and UNIQUE constraints
-- ============================================

-- Add CHECK constraints to league_settings (14.4)
ALTER TABLE league_settings
    ADD CONSTRAINT chk_points_non_negative CHECK (
        points_win >= 0 AND points_loss >= 0 AND
        points_conference_game >= 0 AND points_conference_game_loss >= 0 AND
        points_over_50 >= 0 AND points_over_50_loss >= 0 AND
        points_shutout >= 0 AND points_shutout_loss >= 0 AND
        points_ranked_25 >= 0 AND points_ranked_25_loss >= 0 AND
        points_ranked_10 >= 0 AND points_ranked_10_loss >= 0 AND
        points_conference_championship_win >= 0 AND points_conference_championship_loss >= 0 AND
        points_bowl_appearance >= 0 AND
        points_playoff_first_round >= 0 AND points_playoff_quarterfinal >= 0 AND
        points_playoff_semifinal >= 0 AND
        points_championship_win >= 0 AND points_championship_loss >= 0 AND
        points_heisman_winner >= 0
    ),
    ADD CONSTRAINT chk_draft_timer CHECK (draft_timer_seconds >= 0),
    ADD CONSTRAINT chk_schools_per_team CHECK (schools_per_team > 0);

-- Add week_number range checks (14.4)
-- NOT VALID allows adding to tables with existing data without full scan,
-- then VALIDATE confirms all existing rows satisfy the constraint
ALTER TABLE school_weekly_points
    ADD CONSTRAINT chk_week_number_range CHECK (week_number >= 0 AND week_number <= 22)
    NOT VALID;
ALTER TABLE school_weekly_points VALIDATE CONSTRAINT chk_week_number_range;

ALTER TABLE fantasy_team_weekly_points
    ADD CONSTRAINT chk_week_number_range CHECK (week_number >= 0 AND week_number <= 22)
    NOT VALID;
ALTER TABLE fantasy_team_weekly_points VALIDATE CONSTRAINT chk_week_number_range;

-- Add AP rankings rank range check (14.4)
ALTER TABLE ap_rankings_history
    ADD CONSTRAINT chk_rank_range CHECK (rank > 0 AND rank <= 25)
    NOT VALID;
ALTER TABLE ap_rankings_history VALIDATE CONSTRAINT chk_rank_range;

-- Add UNIQUE constraint on external_api_id per sport (14.5)
ALTER TABLE schools
    ADD CONSTRAINT uq_schools_sport_api_id UNIQUE (sport_id, external_api_id);
