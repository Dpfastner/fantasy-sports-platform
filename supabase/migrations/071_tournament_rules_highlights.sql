-- Structured rules highlights for tournaments
-- Renders as a stat-card grid of icon tiles (kirkers30 pattern) replacing longform markdown as primary view.
-- Schema: JSONB array of { icon: string (emoji), label: string (uppercase short), description: string (one-liner) }

ALTER TABLE event_tournaments
  ADD COLUMN IF NOT EXISTS rules_highlights JSONB;

COMMENT ON COLUMN event_tournaments.rules_highlights IS
  'Array of rule highlight tiles: [{ icon, label, description }]. Used by RulesHighlights component. Fallback to rules_text if null.';

-- Masters 2026 — Roster format (primary)
UPDATE event_tournaments
SET rules_highlights = '[
  {"icon":"🎯","label":"PICK 7 GOLFERS","description":"2 from Tier A, 2 from Tier B, 3 from Tier C"},
  {"icon":"🏅","label":"BEST 5 COUNT","description":"Your 2 worst scores are dropped"},
  {"icon":"🏆","label":"LOWEST WINS","description":"Total score-to-par across counting golfers"},
  {"icon":"✂️","label":"CUT PENALTY","description":"Field high + 1 per missed round"},
  {"icon":"🔒","label":"ROSTER LOCK","description":"Locks at first tee time Thursday"},
  {"icon":"🔄","label":"FREE EDITS","description":"Swap picks anytime before lock"}
]'::jsonb
WHERE slug = 'masters-2026';

-- Frozen Four 2026 — Bracket format
UPDATE event_tournaments
SET rules_highlights = '[
  {"icon":"🏒","label":"PICK EVERY GAME","description":"Regionals through the Championship"},
  {"icon":"📈","label":"POINTS SCALE","description":"Later rounds are worth more"},
  {"icon":"🏆","label":"MOST POINTS WIN","description":"Highest total at the end of the tournament"},
  {"icon":"🎲","label":"TIEBREAKER","description":"Predict total combined goals in the final"},
  {"icon":"🔒","label":"BRACKET LOCK","description":"Locks before the first Regional puck drop"},
  {"icon":"📋","label":"16 TEAMS","description":"Full NCAA Frozen Four bracket"}
]'::jsonb
WHERE slug = 'frozen-four-2026';

-- Men's Six Nations 2026 — Survivor
UPDATE event_tournaments
SET rules_highlights = '[
  {"icon":"⚔️","label":"PICK ONE TEAM","description":"One survivor pick each round"},
  {"icon":"✅","label":"WIN = SURVIVE","description":"Lose or draw and you''re out"},
  {"icon":"🚫","label":"NO REPEATS","description":"Can''t pick the same team twice"},
  {"icon":"⏰","label":"WEEKLY LOCK","description":"1 minute before the first kickoff"},
  {"icon":"⚖️","label":"DRAWS LOSE","description":"Draws count as losses"},
  {"icon":"🏆","label":"LAST STANDING","description":"Outlast everyone else to win"}
]'::jsonb
WHERE slug = 'm-six-nations-2026';

-- Women's Six Nations 2026 — Survivor
UPDATE event_tournaments
SET rules_highlights = '[
  {"icon":"⚔️","label":"PICK ONE TEAM","description":"One survivor pick each round"},
  {"icon":"✅","label":"WIN = SURVIVE","description":"Lose or draw and you''re out"},
  {"icon":"🚫","label":"NO REPEATS","description":"Can''t pick the same team twice"},
  {"icon":"⏰","label":"WEEKLY LOCK","description":"1 minute before the first kickoff"},
  {"icon":"⚖️","label":"DRAWS LOSE","description":"Draws count as losses"},
  {"icon":"🏆","label":"LAST STANDING","description":"Outlast everyone else to win"}
]'::jsonb
WHERE slug = 'w-six-nations-2026';
