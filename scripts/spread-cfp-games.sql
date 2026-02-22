-- Spread CFP games across different weeks to avoid multi-game-per-week constraint issues
-- This ensures each school has at most one game per week

-- Move CFP Semifinal games from week 18 to week 19
UPDATE games
SET week_number = 19
WHERE is_playoff_game = true
  AND playoff_round = 'semifinal';

-- Move CFP Championship game from week 18 to week 20
UPDATE games
SET week_number = 20
WHERE is_playoff_game = true
  AND playoff_round = 'championship';

-- Verify the changes
SELECT
  playoff_round,
  week_number,
  COUNT(*) as game_count
FROM games
WHERE is_playoff_game = true
GROUP BY playoff_round, week_number
ORDER BY week_number, playoff_round;
