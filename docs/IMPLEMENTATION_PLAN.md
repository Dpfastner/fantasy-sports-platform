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
- Cron jobs: `/api/cron/daily-sync` (6 AM ET), `/api/cron/gameday-sync` (every 15 min on Saturdays)
- Admin UI: `/admin/sync` with all sync options
- Bowl/playoff detection in bulk sync

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

## Future Phases (Post-Launch)

| Phase | Features |
|-------|----------|
| **Phase 11** | Auto-pick for draft, draft pause/resume |
| **Phase 12** | Email/push notifications |
| **Phase 13** | Historical season caching, returning user experience |
| **Phase 14** | Multi-sport expansion (hockey, baseball, etc.) |
| **Phase 15** | Team-to-team trading |
| **Phase 16** | Charity/donation pooling feature |

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
Phase 10 (Bracket)       ████████████  COMPLETE ← USER TESTING READY
```
