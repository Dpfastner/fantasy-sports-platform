# Rivyls - Architecture Reference

> **Purpose**: This document serves as a comprehensive reference for the platform's architecture, data models, and scoring system. Reference this document when context is needed about how the system works.
> **Domain**: rivyls.com

---

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Application Flow](#application-flow)
3. [Route Structure](#route-structure)
4. [Data Models](#data-models)
5. [Scoring System](#scoring-system)
6. [Draft System](#draft-system)
7. [Transaction System](#transaction-system)
8. [Roster Period System](#roster-period-system)
9. [Data Sync (ESPN)](#data-sync-espn)
10. [Sandbox Time Travel](#sandbox-time-travel)
11. [Real-Time Features](#real-time-features)
12. [Key Files Reference](#key-files-reference)

---

## Platform Overview

A multi-tenant fantasy sports platform where users draft **college football schools** (not players) and earn points based on real-world game results.

**Core Concept**: Users join leagues, draft FBS schools to their roster, and earn points when those schools win games. Points are calculated automatically from ESPN data.

**Key Differentiators**:
- Draft schools, not players
- Points based on team performance (wins, ranked opponents, etc.)
- Roster periods track ownership across weeks
- Add/drop transactions allow mid-season roster changes
- Special event bonuses (bowls, playoffs, Heisman)

---

## Application Flow

```
User Signs Up → Joins/Creates League → Commissioner Configures Settings
                                              ↓
                                    All Members Create Teams
                                              ↓
                                    Commissioner Starts Draft
                                              ↓
                                    Real-time Snake/Linear Draft
                                              ↓
                                    Rosters Populated (roster_periods created)
                                              ↓
                                    Season Begins
                                              ↓
                    ┌─────────────────────────┼─────────────────────────┐
                    ↓                         ↓                         ↓
            ESPN Data Syncs           Add/Drop Transactions      Points Calculate
            (games, scores)           (roster period updates)    (weekly totals)
                    ↓                         ↓                         ↓
                    └─────────────────────────┼─────────────────────────┘
                                              ↓
                                    Leaderboard Updates
                                              ↓
                                    Season Ends → Final Standings
```

---

## Route Structure

### Authentication
| Route | Purpose |
|-------|---------|
| `/(auth)/signup` | User registration |
| `/(auth)/login` | User login |
| `/(auth)/forgot-password` | Password reset request |
| `/(auth)/reset-password` | Password reset completion |
| `/auth/callback` | OAuth/email confirmation callback |

### Main Application
| Route | Purpose |
|-------|---------|
| `/dashboard` | User's league hub (all joined leagues) |
| `/settings` | User profile settings |
| `/leagues/create` | Create new league (becomes commissioner) |
| `/leagues/join` | Join league with invite code |

### League Pages
| Route | Purpose |
|-------|---------|
| `/leagues/[id]` | League homepage with embedded leaderboard |
| `/leagues/[id]/draft` | Real-time draft room |
| `/leagues/[id]/team` | User's roster + this week's games |
| `/leagues/[id]/team/edit` | Customize team name, colors, logo |
| `/leagues/[id]/settings` | Commissioner tools (scoring, members, draft) |
| `/leagues/[id]/schedule` | Week-by-week game schedule |
| `/leagues/[id]/leaderboard` | Full league standings |
| `/leagues/[id]/transactions` | Add/drop management interface |
| `/leagues/[id]/stats` | League-wide statistics |
| `/leagues/[id]/bracket` | CFP playoff bracket visualization |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin/sync` | Manual ESPN data sync controls |
| `/admin/reports` | System reporting |

---

## Data Models

### Entity Relationship Overview

```
profiles (users)
    └── league_members (many-to-many with roles)
            └── leagues
                    ├── league_settings (scoring rules, prizes)
                    ├── drafts
                    │       ├── draft_order
                    │       └── draft_picks
                    └── fantasy_teams
                            ├── roster_periods (school ownership by week)
                            ├── transactions (add/drop history)
                            ├── fantasy_team_weekly_points
                            └── weekly_double_picks

schools (134 FBS teams)
    ├── games (schedule + results)
    │       └── school_weekly_points (per-game point breakdown)
    ├── ap_rankings_history (weekly AP rankings)
    ├── playoff_teams (CFP seeds)
    └── heisman_winners
```

### Key Tables

#### `leagues`
- `id`, `name`, `season_id`, `invite_code`
- `created_by` (commissioner user_id)
- `max_teams`, `is_public`

#### `league_settings`
- Draft config: `draft_type`, `draft_date`, `draft_timer_seconds`
- Roster: `schools_per_team`, `max_school_selections_total`
- Transactions: `max_add_drops_per_season`, `add_drop_deadline`
- Scoring: See [Scoring System](#scoring-system) section
- Prizes: `entry_fee`, `prize_pool`, `high_points_*`

#### `fantasy_teams`
- `id`, `league_id`, `user_id`, `name`
- `primary_color`, `secondary_color`, `image_url`
- `total_points`, `high_points_winnings`
- `add_drops_used`, `draft_position`

#### `roster_periods`
- `fantasy_team_id`, `school_id`, `slot_number`
- `start_week` (when school was added)
- `end_week` (null = still active, or week when dropped)

#### `games`
- `season_id`, `week_number`, `game_date`, `game_time`
- `home_school_id`, `away_school_id`
- `home_score`, `away_score`
- `home_rank`, `away_rank` (AP rank at time of game)
- `status` (scheduled, live, completed)
- `is_conference_game`, `is_bowl_game`, `is_playoff_game`
- `playoff_round` (first_round, quarterfinal, semifinal, championship)

#### `school_weekly_points`
- `school_id`, `season_id`, `week_number`, `game_id`
- `base_points`, `conference_bonus`, `over_50_bonus`
- `shutout_bonus`, `ranked_25_bonus`, `ranked_10_bonus`
- `total_points`

#### `fantasy_team_weekly_points`
- `fantasy_team_id`, `week_number`, `points`
- `is_high_points_winner`, `high_points_amount`

---

## Scoring System

### Per-Game Points (stored in `school_weekly_points`)

Calculated by `src/lib/points/calculator.ts` when games complete:

| Condition | Points | Notes |
|-----------|--------|-------|
| Win | +1 | Base points for winning |
| Conference Game | +1 | Only regular season, NOT bowls/playoffs |
| Score 50+ | +1 | Team scores 50 or more points |
| Shutout | +1 | Opponent scores 0 |

**Ranked Opponent Bonus** (for beating a ranked opponent):

| Context | Opponent Rank | Bonus |
|---------|---------------|-------|
| Regular Season | #1-10 | +2 |
| Regular Season | #11-25 | +1 |
| Bowls & Playoffs | #1-12 | +2 |
| Bowls & Playoffs | #13-25 | +0 (no bonus) |

**IMPORTANT**: Ranked bonus is for beating a **ranked opponent**, NOT for being ranked yourself.

### Special Event Bonuses (stored in `fantasy_team_weekly_points`)

Applied per-team based on roster at time of event, NOT per-game:

| Event | Week | Setting Field |
|-------|------|---------------|
| Conf Champ Win | 15 | `points_conference_championship_win` |
| Conf Champ Loss | 15 | `points_conference_championship_loss` |
| Bowl Appearance | 17 | `points_bowl_appearance` |
| CFP First Round | 18 | `points_playoff_first_round` |
| CFP Quarterfinal | 19 | `points_playoff_quarterfinal` |
| CFP Semifinal | 20 | `points_playoff_semifinal` |
| Championship Win | 21 | `points_championship_win` |
| Championship Loss | 21 | `points_championship_loss` |
| Heisman Winner | 22 | `points_heisman_winner` |

Special events are calculated by `scripts/calculate-special-events.ts`.

> **Note**: Championship games (week 21) score 0 game points — only the event bonus applies. Heisman (week 22) is a virtual scoring week with no games.

### Double Points Feature

- User picks one school per week before games start
- That school's points are doubled (2x multiplier)
- Tracked in `weekly_double_picks` table
- Applied in `calculateFantasyTeamPoints()` function

### Points Flow

```
Game Completes → calculateWeeklySchoolPoints() → school_weekly_points
                                                        ↓
                                              calculateFantasyTeamPoints()
                                                        ↓
                                              fantasy_team_weekly_points
                                                        ↓
                                              fantasy_teams.total_points
```

---

## Draft System

### Draft Types
- **Snake**: Order reverses each round (1-8, 8-1, 1-8...)
- **Linear**: Same order every round (1-8, 1-8, 1-8...)

### Draft Flow

1. **Pre-Draft**:
   - All members must create fantasy teams
   - Commissioner sets draft order (random or manual)
   - Commissioner configures timer duration

2. **Starting Draft**:
   - Commissioner clicks "Start Draft"
   - `draft_order` records generated (snake/linear pattern)
   - Draft status changes to "in_progress"
   - Pick deadline set (now + timer_seconds)

3. **During Draft**:
   - Real-time via Supabase Realtime + 5-second polling fallback
   - Current team "on the clock" highlighted
   - Timer countdown shows remaining time
   - Schools filtered by selection limits
   - Confirmation modal before pick finalized

4. **Making a Pick**:
   - Insert to `draft_picks` table
   - Create `roster_period` for school (start_week = 0)
   - Advance draft to next pick
   - Update `pick_deadline`

5. **Draft Completion**:
   - Status changes to "completed"
   - League enters season mode

### Key Files
- `/src/app/leagues/[id]/draft/page.tsx` - Draft room
- `/src/components/DraftBoard.tsx` - Main draft UI
- `/src/components/DraftStatusChecker.tsx` - Polling component

---

## Transaction System

### Add/Drop Flow

1. User selects school to DROP from roster
2. User selects school to ADD from available schools
3. System validates:
   - Transaction deadline not passed
   - Team has remaining transactions
   - New school not already on roster
   - New school not at league selection limit
4. Execute transaction:
   - Set `end_week` on dropped school's roster_period
   - Create new roster_period for added school
   - Record in `transactions` table
   - Increment `fantasy_teams.add_drops_used`

### Validation Rules
- `max_add_drops_per_season`: Limit per team
- `add_drop_deadline`: Season-wide cutoff date
- `max_school_selections_total`: How many teams can have same school

### Key Files
- `/src/app/leagues/[id]/transactions/page.tsx` - Server page
- `/src/components/TransactionsClient.tsx` - Client component
- `/src/app/api/transactions/route.ts` - API endpoint

---

## Roster Period System

**Critical Concept**: Schools aren't directly "on" rosters. Instead, `roster_periods` track ownership windows.

### Structure
```typescript
roster_periods: {
  fantasy_team_id: string
  school_id: string
  slot_number: number      // 1-12, for UI ordering
  start_week: number       // When school was added
  end_week: number | null  // null = active, or week when dropped
}
```

### Querying Active Roster

To get schools active at week X:
```sql
SELECT * FROM roster_periods
WHERE fantasy_team_id = ?
  AND start_week <= X
  AND (end_week IS NULL OR end_week > X)
```

### Points Calculation

When calculating team points for a week:
1. Query active roster_periods for that week
2. Get school_weekly_points for those schools
3. Sum points (apply double points multiplier if applicable)

This ensures points are only counted for weeks the school was on roster.

---

## Data Sync (ESPN)

### API Endpoints
- Teams: `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams`
- Scoreboard: `https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard`
- Rankings: `https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings`

### Sync Routes
| Route | Purpose |
|-------|---------|
| `/api/sync/schools` | Sync FBS schools, logos, colors |
| `/api/sync/games` | Sync game schedule and scores |
| `/api/sync/rankings` | Sync AP rankings for week |
| `/api/sync/rankings-backfill` | Historical rankings |
| `/api/sync/heisman` | Heisman winners |
| `/api/sync/bulk` | Batch operations |

### Automated Jobs

The platform uses two scheduling systems due to Vercel free tier limits (2 cron jobs max):

**Vercel Crons** (registered in `vercel.json`):

| Route | Schedule | Purpose |
|-------|----------|---------|
| `/api/cron/daily-sync` | `0 10 * * *` (10 AM UTC daily) | Sync rankings, sync current week games, failsafe recalculation for games completed in past 2 days |

**GitHub Actions** (registered in `.github/workflows/`):

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `gameday-sync.yml` | `* * * * *` (every minute) | Live score updates during games. The endpoint has smart skip logic: skips if no games today, skips if outside game window (30 min before first game → 4 hours after last game), only calls ESPN API during actual game windows. ~95% of calls skip instantly. |
| `nightly-reconcile.yml` | `0 8 * * *` (8 AM UTC daily) | Verifies fantasy team point totals match weekly point sums. Fixes high points winners. Safety net for data integrity. |

**Manual-Only Routes** (not scheduled, triggered from admin panel):

| Route | Purpose |
|-------|---------|
| `/api/cron/rankings-sync` | Dedicated AP rankings sync. Redundant with daily-sync but useful for manual re-pulls from `/admin/sync`. |
| `/api/sync/schools` | Sync FBS schools from ESPN |
| `/api/sync/games` | Sync game schedule for specific weeks |
| `/api/sync/rankings-backfill` | Historical rankings |
| `/api/sync/heisman` | Heisman winner tracking |
| `/api/sync/bulk` | Batch operations |

**Why two systems**: Vercel free tier allows 2 cron jobs with a minimum interval of once per day. Live scoring requires per-minute polling during games. GitHub Actions provides free per-minute scheduling (2,000 min/month free tier). The gameday-sync smart skip logic means most calls cost <100ms and don't count against ESPN rate limits.

**How live scores reach users**: GitHub Actions calls gameday-sync → endpoint fetches ESPN scores → updates `games` table in Supabase → Supabase Realtime pushes changes to all connected browsers instantly.

### Key File
- `/src/lib/api/espn.ts` - ESPN API client

---

## Sandbox Time Travel

### Environments

Currently running sandbox-only (rivyls.com points to sandbox). Production will be added when the platform is hardened for the 2026 season.

| Environment | Crons | Badge | Database |
|-------------|-------|-------|----------|
| sandbox (rivyls.com) | Enabled (via ENABLE_CRONS flag) | Yellow | Sandbox Supabase (2025 data) |
| development | Disabled | Blue | Local |

### Time Travel Cookies
- `sandbox_week_override`: Override current week (0-22)
- `sandbox_date_override`: Override day of week
- `sandbox_time_override`: Override time (HH:MM)

### Usage
1. `SandboxWeekSelector` component shows in non-production
2. User sets week override via cookie
3. All date/week calculations use `getSimulatedDate()` and `getCurrentWeek()`
4. Deadlines, points queries, etc. respect the override

### Key Files
- `/src/lib/week.ts` - Week calculation with overrides
- `/src/lib/env.ts` - Environment detection
- `/src/components/SandboxWeekSelector.tsx` - UI widget

---

## Real-Time Features

### Supabase Realtime

Used for:
1. **Draft State** - Tracks current pick, timer, status
2. **Draft Picks** - New picks appear instantly
3. **Leaderboard** - Can stream score updates (infrastructure ready)

### Implementation Pattern
```typescript
supabase
  .channel(`draft:${draftId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'drafts',
    filter: `id=eq.${draftId}`
  }, (payload) => {
    // Update local state
  })
  .subscribe()
```

### Fallback
- 5-second polling in draft room
- Prevents issues from disconnections

---

## Key Files Reference

### Core Libraries
| File | Purpose |
|------|---------|
| `/src/lib/supabase/server.ts` | Server-side Supabase client |
| `/src/lib/supabase/client.ts` | Browser Supabase client |
| `/src/lib/points/calculator.ts` | Points calculation engine |
| `/src/lib/week.ts` | Week calculation with sandbox support |
| `/src/lib/env.ts` | Environment detection |
| `/src/lib/api/espn.ts` | ESPN API client |

### Key Components
| File | Purpose |
|------|---------|
| `/src/components/Header.tsx` | Navigation header |
| `/src/components/RosterList.tsx` | Roster display with schedule modal |
| `/src/components/TransactionsClient.tsx` | Add/drop interface |
| `/src/components/DraftBoard.tsx` | Draft room UI |
| `/src/components/PlayoffBracket.tsx` | CFP bracket |
| `/src/components/LeaderboardClient.tsx` | Standings display |
| `/src/components/SandboxWeekSelector.tsx` | Time travel widget |

### Scripts
| File | Purpose |
|------|---------|
| `/scripts/calculate-special-events.ts` | Bowl/playoff/Heisman bonuses |

### Types
| File | Purpose |
|------|---------|
| `/src/types/database.ts` | Full Supabase type definitions |

---

## Known Issues / Technical Debt

For the full list of audit findings, see `docs/IMPLEMENTATION_PLAN.md` — Audit Findings & Corrections section.

### Critical Bugs
- **League settings ignored**: `calculator.ts` always uses `DEFAULT_SCORING` instead of league-specific settings. All leagues score identically. (Phase 12)
- **Client scoring mismatch**: `RosterList.tsx` has a duplicate scoring function that diverges from server logic (bowl bonuses wrong, loss points always 0). (Phase 12)
- **Timezone bug**: `week.ts` creates season start date in local timezone but compares against UTC. (Phase 12)
- **Cron week cap**: `daily-sync` and `gameday-sync` cap at week 20, missing weeks 21 (championship) and 22 (Heisman). (Phase 12)

### Tech Debt
- **Duplicated calculateGamePoints()**: Exists in `RosterList.tsx`, `TransactionsClient.tsx`, and `calculator.ts`. Must be extracted to shared utility. (Phase 15)
- **Duplicated leaderboard**: `LeaderboardClient.tsx` and `EmbeddedLeaderboard.tsx` are ~80% identical. (Phase 15)
- **Hardcoded week numbers**: Magic numbers (15, 17, 18-21) throughout components and API routes. (Phase 15)
- **TypeScript types out of sync**: `database.ts` missing 2 tables and 8+ columns from recent migrations. (Phase 14)

---

## Season Timeline

| Week | Events |
|------|--------|
| 0 | Week 0 games (early start) |
| 1-14 | Regular season |
| 15 | Conference Championships |
| 16 | Army-Navy game |
| 17 | Bowl Games (non-CFP) |
| 18 | CFP First Round |
| 19 | CFP Quarterfinals |
| 20 | CFP Semifinals |
| 21 | National Championship (0 game points, event bonus only) |
| 22 | Heisman announcement (virtual scoring week, no games) |

> **Code note**: The cron routes currently cap `currentWeek` at 20 (`Math.min(weeksDiff + 1, 20)`). This needs to be updated to 22 to cover the championship and Heisman weeks. See Phase 12 in IMPLEMENTATION_PLAN.md.

---

*Last Updated: February 22, 2026*
