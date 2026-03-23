-- Update tournament descriptions and rules text to match voice guide
-- These tournaments are already live — this patches the database to match the updated seed route

UPDATE event_tournaments
SET description = '16-team bracket for the 2026 NCAA Frozen Four. Pick every game from Regionals to the Championship.',
    rules_text = E'## How to Play\n\n1. Pick the winner of every game \u2014 Regionals through the Championship.\n2. Later rounds are worth more points.\n3. All picks lock before the first Regional game.\n\nScoring details are in your pool''s Settings tab.\n\n## Tiebreaker\nPredict the total combined goals in the Championship game.'
WHERE slug = 'frozen-four-2026';

UPDATE event_tournaments
SET description = E'The 90th Masters at Augusta National. Pick matchup winners or draft a golfer roster.',
    rules_text = E'## Pick''em\nPick matchup winners each round. Check your pool''s Settings tab for scoring details.\n\n## Roster\nDraft 7 golfers \u2014 2 from Tier A (OWGR 1\u201315), 2 from Tier B (16\u201330), 3 from Tier C (31+). Your best 5 of 7 scores count. Lowest total score-to-par wins. Cut golfers get the field high + 1 per missed round. Rosters lock at first tee time.'
WHERE slug = 'masters-2026';

UPDATE event_tournaments
SET description = E'Men''s Six Nations 2026. Pick one team to win each round \u2014 lose and you''re out. Can''t reuse a pick.',
    rules_text = E'## How to Play\n\n1. Pick one team each round to win their match.\n2. Win \u2014 you survive. Lose or draw \u2014 you''re out.\n3. Can''t pick the same team twice. Choose wisely.\n4. Last one standing wins.\n\n## Deadlines\n- Picks lock 1 minute before the first kickoff of each round.\n- Miss the deadline and you''re eliminated.\n- Draws count as losses.'
WHERE slug = 'm-six-nations-2026';

UPDATE event_tournaments
SET description = E'Women''s Six Nations 2026. Pick one team to win each round \u2014 lose and you''re out. Can''t reuse a pick.',
    rules_text = E'## How to Play\n\n1. Pick one team each round to win their match.\n2. Win \u2014 you survive. Lose or draw \u2014 you''re out.\n3. Can''t pick the same team twice. Choose wisely.\n4. Last one standing wins.\n\n## Deadlines\n- Picks lock 1 minute before the first kickoff of each round.\n- Miss the deadline and you''re eliminated.\n- Draws count as losses.'
WHERE slug = 'w-six-nations-2026';
