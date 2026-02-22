-- Fix school_weekly_points unique constraint to allow multiple games per week
-- Run this in Supabase SQL Editor before running calculate-all-points.ts

-- Step 1: Drop the old constraint (school_id, season_id, week_number)
-- Try multiple possible constraint names
ALTER TABLE school_weekly_points
DROP CONSTRAINT IF EXISTS school_weekly_points_school_id_season_id_week_number_key;

ALTER TABLE school_weekly_points
DROP CONSTRAINT IF EXISTS school_weekly_points_school_id_key;

-- Step 2: Add new unique constraint on (school_id, game_id)
-- This allows multiple games per week (e.g., CFP quarterfinal AND semifinal in week 18)
ALTER TABLE school_weekly_points
ADD CONSTRAINT school_weekly_points_school_id_game_id_key
UNIQUE (school_id, game_id);

-- Step 3: Clear existing data to allow recalculation
-- (Optional - the script will upsert correctly after constraint change)
TRUNCATE TABLE school_weekly_points;

-- Verify the constraint
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'school_weekly_points'::regclass;
