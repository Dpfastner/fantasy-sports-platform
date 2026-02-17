# Project Implementation Plan

## Phase 0: Foundation
*Get the infrastructure in place*

| Task | Description |
|------|-------------|
| 0.1 | Create Supabase project |
| 0.2 | Create Next.js project with TypeScript + Tailwind |
| 0.3 | Connect Supabase to Next.js |
| 0.4 | Deploy to Vercel (even empty, to confirm pipeline works) |
| 0.5 | Design and create database schema |
| 0.6 | Set up authentication (Supabase Auth) |
| 0.7 | Seed database with FBS schools data |

**Deliverable:** Users can sign up, log in, and see a basic dashboard. Database is ready.

**Status: COMPLETE**

---

## Phase 1: League Management
*Commissioners can create and configure leagues*

| Task | Description |
|------|-------------|
| 1.1 | Create league creation flow |
| 1.2 | Build league settings page (all commissioner options) |
| 1.3 | Implement invite system (invite links or email) |
| 1.4 | Build team creation for users joining a league |
| 1.5 | Role-based access (commissioner vs member vs global admin) |

**Deliverable:** Commissioner creates a league, configures settings, invites friends, they join and create teams.

**Status: COMPLETE**

---

## Phase 2: Draft System
*The live draft experience*

| Task | Description |
|------|-------------|
| 2.1 | Build draft board UI (available schools, pick history) |
| 2.2 | Implement draft order (snake/linear, manual/random) |
| 2.3 | Real-time pick updates (Supabase Realtime) |
| 2.4 | Draft timer with server-side synchronization |
| 2.5 | Pick validation (max selections, already taken, etc.) |
| 2.6 | Draft state machine (not started → in progress → completed) |
| 2.7 | Post-draft roster confirmation |

**Deliverable:** Full live draft with timer, real-time updates, all validation rules.

**Status: COMPLETE**

---

## Phase 3: Season Schedule & ESPN Integration
*Pull real game data*

| Task | Description |
|------|-------------|
| 3.1 | ESPN API integration (fetch schedule, scores, rankings) |
| 3.2 | Scheduled jobs for daily schedule refresh |
| 3.3 | Live game polling during game days |
| 3.4 | Game state management (scheduled → live → completed) |
| 3.5 | Handle edge cases (Army-Navy week, Week 0, bowl games) |

**Deliverable:** Real-world game data flows into the system automatically.

**Status: COMPLETE**

**Implementation Details:**
- ESPN client: `src/lib/api/espn.ts` (teams, scoreboard, rankings)
- Sync routes: `/api/sync/schools`, `/api/sync/games`, `/api/sync/rankings`, `/api/sync/bulk`
- Admin UI: `/admin/sync` with all sync options
- Bowl/playoff detection in bulk sync

**Cron Job Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/gameday-sync",
      "schedule": "* * * * *"
    }
  ]
}
```

**Daily Sync** (`/api/cron/daily-sync`) - Runs once daily at 10 AM UTC:
- Syncs AP Rankings for current week
- Syncs current week games from ESPN
- **FAILSAFE**: Recalculates points for games completed in past 2 days (catches any missed completions)
- Calculates points for current week if games were synced

**Gameday Sync** (`/api/cron/gameday-sync`) - Runs every minute with smart skip logic:
- Checks if there are games today → skips instantly if no games
- Checks if all games are complete → skips if nothing active
- Checks if current time is within game window (30 min before first game → 4 hours after last game starts) → skips if outside window
- Only calls ESPN API when actually in game window with active games
- Updates live scores and game status
- Calculates points when games complete

**Why Every Minute:**
- CFB games can end at any time
- Smart window logic means ~95% of calls skip instantly (no API usage)
- Only ~5% actually hit ESPN API (during actual game hours)
- Vercel free tier allows this because skips are fast/cheap

**Week Calculation:**
```typescript
const seasonStart = new Date(year, 7, 24) // August 24
const weeksDiff = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
const currentWeek = Math.max(0, Math.min(weeksDiff + 1, 20)) // Weeks 0-20 (including postseason)
```

---

## Phase 4: Points Calculator
*Automatic scoring based on game results*

| Task | Description |
|------|-------------|
| 4.1 | Implement scoring engine (apply league rules to game results) |
| 4.2 | Calculate weekly points per school |
| 4.3 | Handle special scoring (bowls, playoffs, conference championships) |
| 4.4 | Trigger recalculation when games complete |
| 4.5 | Heisman winner scraper (Wikipedia) |
| 4.6 | Playoff team tracking (separate from AP Top 25) |

**Deliverable:** Points calculate automatically and correctly based on commissioner's rules.

**Status: COMPLETE**

**Implementation Details:**
- Points calculator: `src/lib/points/calculator.ts`
- API endpoint: `/api/points/calculate` (week/season/league modes)
- Standings API: `/api/leagues/[id]/standings`
- School points API: `/api/schools/[id]/points`
- Integrated with cron jobs for automatic calculation
- Ranked bonus logic: 1-10 = 2pts, 11-25 = 1pt (mutually exclusive)
- Playoffs: 1-12 = 2pts (12 playoff seeds)

---

## Phase 5: User Dashboard
*The main interface users interact with*

| Task | Description |
|------|-------------|
| 5.1 | Team customization (name, colors, image) |
| 5.2 | Roster display with current schools |
| 5.3 | This week's games view (your schools' matchups, times, live scores) |
| 5.4 | Points breakdown (weekly, season total, per school) |
| 5.5 | Current standings display (place, points, winnings) |
| 5.6 | Add/drop counter and deadline display |
| 5.7 | Historical view for dropped schools |

**Deliverable:** Full team dashboard with real-time updates during games.

**Status: COMPLETE**

**Implementation Details:**
- Team page: `/leagues/[id]/team`
- Team edit page: `/leagues/[id]/team/edit` (name, colors, logo URL)
- Roster display with school logos, conferences, and points
- This week's games with live/scheduled/completed states
- Weekly points breakdown in sidebar
- Roster history section (shows when add/drop transactions exist)

---

## Phase 6: Leaderboard & High Points
*Competition tracking*

| Task | Description |
|------|-------------|
| 6.1 | Main leaderboard (all teams, total points, weekly breakdown) |
| 6.2 | High points tracking (weekly winners, prize amounts) |
| 6.3 | High points leaderboard (grid: weeks × teams × winnings) |
| 6.4 | Real-time updates during games |
| 6.5 | Ideal team calculation (best possible draft) |
| 6.6 | Current week max points calculation |

**Deliverable:** Full leaderboard with high points tracking, updates live.

**Status: COMPLETE**

**Implementation Details:**
- Leaderboard page: `/leagues/[id]/leaderboard`
- Real-time updates via Supabase Realtime subscriptions
- High points winners highlighted with weekly breakdown
- Collapsible "League Insights" section showing:
  - Ideal team (best possible draft based on season results)
  - Current week maximum points
- Stats API: `/api/leagues/[id]/stats`

---

## Phase 7: Transaction System (Add/Drop)
*Mid-season roster changes*

| Task | Description |
|------|-------------|
| 7.1 | Available schools browser with filters (conference, points, ranked, etc.) |
| 7.2 | Add/drop transaction flow (select drop → select add → confirm) |
| 7.3 | Eligibility validation (max selections, already on team, etc.) |
| 7.4 | Deadline enforcement (weekly lock, season lock) |
| 7.5 | Transaction counter tracking |
| 7.6 | Transaction history log |
| 7.7 | Roster period tracking (points only for active weeks) |

**Deliverable:** Full add/drop system with all rules enforced.

**Status: COMPLETE**

**Implementation Details:**
- Transactions page: `/leagues/[id]/transactions`
- 3-step flow: Select Drop → Select Add → Confirm
- School browser with filters: conference, search (name + abbreviation), ranked only, sort by points/rank/name
- Validation: max selections per school, deadline enforcement, transaction limits
- Transaction API: `/api/transactions` (POST for new, GET for history)
- League-wide transaction history on add/drop page (shows team names, highlights user's team)
- Abbreviation search enabled via ESPN sync (`/api/sync/schools` now saves abbreviations)
- Roster period tracking already integrated in points calculator

---

## Phase 8: Polish & Launch Prep
*Get ready for real users*

| Task | Description |
|------|-------------|
| 8.1 | Mobile responsiveness |
| 8.2 | Error handling and user feedback |
| 8.3 | Loading states and optimistic updates |
| 8.4 | Report issue feature |
| 8.5 | Entry fee tracking (paid/unpaid per user) |
| 8.6 | Nightly reconciliation jobs (data integrity checks) |
| 8.7 | Testing with real users (your league) |
| 8.8 | Bug fixes from testing |

**Deliverable:** Production-ready for first season.

**Status: IN PROGRESS**

**Implementation Details:**
- **Mobile Responsiveness (8.1)**: Draft room with tabbed mobile interface, leaderboard with scroll hint, responsive headers and filters
- **Error Handling (8.2)**: Toast notification system (`/src/components/Toast.tsx`), integrated in transactions and draft pages
- **Loading States (8.3)**: Skeleton components (`/src/components/LoadingSkeleton.tsx`), loading.tsx files for all key routes
- **Report Issue (8.4)**: Floating button + modal (`/src/components/ReportIssue.tsx`), API at `/api/reports`
- **Entry Fee Tracking (8.5)**: Already in schema - commissioners can toggle paid/unpaid in settings, shows summary counts
- **Reconciliation (8.6)**: Nightly job at `/api/cron/reconcile` - verifies team totals and high points winners
- **Remaining**: User testing (8.7, 8.8)

---

## Phase 9: Double Points Pick
*Weekly gamble feature - pick one school to earn 2x points*

| Task | Description |
|------|-------------|
| 9.1 | Add double points settings to league settings (enabled, max picks per season) |
| 9.2 | Create weekly pick selection UI on team page |
| 9.3 | Enforce pick deadline (before first game of week) |
| 9.4 | Update points calculator to apply 2x multiplier |
| 9.5 | Show double pick history and results |

**Deliverable:** Users can pick one school per week to earn double points.

**Status: COMPLETE**

**Implementation Details:**
- Settings UI: League settings page has "Double Points" sub-tab with toggle and max picks setting
- Pick UI: `src/components/DoublePointsPicker.tsx` - client component for school selection
- Deadline enforcement: Picker checks first game time for the week, locks after games start
- Points multiplier: `src/lib/points/calculator.ts` updated to apply 2x to picked school
- Migration: `supabase/migrations/011_add_double_points.sql` (weekly_double_picks table)
- History: Picker shows last 5 picks with bonus points earned

---

## Phase 10: Playoff Bracket Visualization
*Visual bracket for college football playoffs*

| Task | Description |
|------|-------------|
| 10.1 | Create bracket component with 12-team CFP format |
| 10.2 | Pull playoff matchups from games table |
| 10.3 | Show which teams are on user rosters |
| 10.4 | Real-time score updates during playoff games |
| 10.5 | Add bracket page to league navigation |

**Deliverable:** Visual playoff bracket showing all CFP matchups.

**Status: COMPLETE**

**Implementation Details:**
- Bracket component: `src/components/PlayoffBracket.tsx` - 12-team CFP format
- Bracket page: `src/app/leagues/[id]/bracket/page.tsx` with loading state
- Real-time updates: Supabase Realtime subscription for playoff game updates
- Roster highlighting: Schools on user's roster shown in purple
- Navigation: Bracket link added to league overview Quick Links section
- Round detection: Automatic round assignment based on bowl_name and playoff_round fields

---

## Phase 11: Environment Separation
*Production vs Sandbox for safe testing*

| Task | Description | Status |
|------|-------------|--------|
| 11.1 | Create separate Supabase project for production | Pending |
| 11.2 | Create environment variable templates (.env.example) | **DONE** |
| 11.3 | Add environment detection utilities | **DONE** |
| 11.4 | Add environment badge UI component | **DONE** |
| 11.5 | Update crons to skip in non-production | **DONE** |
| 11.6 | Document environment switching process | **DONE** |
| 11.7 | Set up Vercel environment variables | Pending |
| 11.8 | Run migrations on production database | Pending |
| 11.9 | Seed production with 2026 schools | Pending |

**Deliverable:** Two environments - production (2026 real season) and sandbox (2025 test data) that can be used independently.

**Status: IN PROGRESS**

**Completed Work:**
- Environment detection: `src/lib/env.ts` with helpers like `isProduction()`, `areCronsEnabled()`
- Environment badge: `src/components/EnvironmentBadge.tsx` (floating badge in sandbox/dev)
- Cron protection: All 4 cron routes skip execution in non-production environments
- Documentation: `docs/ENVIRONMENT_SETUP.md` with full setup instructions
- Env template: `.env.local.example` with all variables documented

**Remaining (Manual Steps):**
1. Create production Supabase project
2. Configure Vercel environment variables (production vs preview)
3. Run migrations on production database
4. Sync 2026 FBS schools to production

**Why This Matters:**
- Test changes without affecting production data
- Simulate game days and score updates safely
- Develop new features against real-ish data
- Practice cron job timing before real season

---

## Phase 12: Error Tracking & Monitoring
*Know when things break*

| Task | Description |
|------|-------------|
| 12.1 | Add Sentry for error tracking (free tier) |
| 12.2 | Configure Sentry for both client and server errors |
| 12.3 | Set up Vercel Analytics (free, included) |
| 12.4 | Add health check endpoint for monitoring |
| 12.5 | Create cron job success/failure alerting |

**Deliverable:** Get notified when errors occur, track performance, know if cron jobs fail.

**Status: NOT STARTED**

**Why This Matters:**
- Currently errors happen silently during cron jobs
- No visibility into API failures or slow pages
- Critical during live game days when issues need quick fixes

---

## Phase 13: Database Backups & Recovery
*Protect user data*

| Task | Description |
|------|-------------|
| 13.1 | Enable Supabase daily backups (included in Pro) |
| 13.2 | Document manual backup procedure for free tier |
| 13.3 | Create backup script for critical tables |
| 13.4 | Test restore procedure |
| 13.5 | Set up pre-season backup checklist |

**Deliverable:** Regular backups with tested recovery process.

**Status: NOT STARTED**

**Why This Matters:**
- All rosters, picks, and season data are in the database
- One bad migration or accidental deletion could lose everything
- Free tier doesn't auto-backup - need manual process

---

## Phase 14: Testing Infrastructure
*Catch bugs before production*

| Task | Description |
|------|-------------|
| 14.1 | Set up Jest or Vitest for unit tests |
| 14.2 | Write tests for points calculator (most critical logic) |
| 14.3 | Write tests for week calculation across components |
| 14.4 | Add tests for cron job verification logic |
| 14.5 | Set up CI to run tests on pull requests |

**Deliverable:** Critical business logic is tested, CI catches regressions.

**Status: NOT STARTED**

**Why This Matters:**
- Points calculator affects everyone's standings
- Week calculation is duplicated in many files
- Changes to one area can break another

---

## Phase 15: Documentation
*Make the project maintainable*

| Task | Description |
|------|-------------|
| 15.1 | Create README with setup instructions |
| 15.2 | Document environment variables and their purposes |
| 15.3 | Create deployment checklist (pre-season, mid-season) |
| 15.4 | Document cron job schedule and what each does |
| 15.5 | Create troubleshooting guide for common issues |

**Deliverable:** Anyone (including future you) can understand and maintain the project.

**Status: NOT STARTED**

---

## Future Phases (Post-Operations)

| Phase | Features |
|-------|----------|
| **Phase 16** | Auto-pick for draft, draft pause/resume |
| **Phase 17** | Email/push notifications |
| **Phase 18** | Historical season caching, returning user experience |
| **Phase 19** | Multi-sport expansion (hockey, baseball, etc.) |
| **Phase 20** | Team-to-team trading |
| **Phase 21** | Charity/donation pooling feature |

---

## Build Order

```
Phase 0 (Foundation)     ████████████  COMPLETE
        ↓
Phase 1 (Leagues)        ████████████  COMPLETE
        ↓
Phase 2 (Draft)          ████████████  COMPLETE
        ↓
Phase 3 (ESPN Data)      ████████████  COMPLETE
        ↓
Phase 4 (Points)         ████████████  COMPLETE
        ↓
Phase 5 (Dashboard)      ████████████  COMPLETE
        ↓
Phase 6 (Leaderboard)    ████████████  COMPLETE
        ↓
Phase 7 (Transactions)   ████████████  COMPLETE
        ↓
Phase 8 (Polish)         ████████████  COMPLETE
        ↓
Phase 9 (Double Points)  ████████████  COMPLETE
        ↓
Phase 10 (Bracket)       ████████████  COMPLETE ← CORE FEATURES DONE

====== OPERATIONS & INFRASTRUCTURE (Pre-Season) ======

Phase 11 (Environments)  ████████░░░░  IN PROGRESS ← CODE DONE, MANUAL SETUP NEEDED
        ↓
Phase 12 (Monitoring)    ░░░░░░░░░░░░  NOT STARTED
        ↓
Phase 13 (Backups)       ░░░░░░░░░░░░  NOT STARTED
        ↓
Phase 14 (Testing)       ░░░░░░░░░░░░  NOT STARTED
        ↓
Phase 15 (Documentation) ░░░░░░░░░░░░  NOT STARTED
```

## Recommended Priority

**Before 2026 Season (Immediate):**
1. Phase 11 - Environment Separation (protect production, enable testing)
2. Phase 13 - Database Backups (protect user data)

**During Offseason (Soon):**
3. Phase 12 - Error Tracking (know when crons fail)
4. Phase 15 - Documentation (remember how things work)

**When Time Allows:**
5. Phase 14 - Testing (catch bugs before they hit production)
