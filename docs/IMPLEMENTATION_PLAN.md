# Rivyls - Implementation Plan

> **Platform Name**: Rivyls (rivyls.com)
> **Current Sport**: College Football (base for multi-sport expansion)
> **Last Updated**: February 26, 2026
> **Audit Date**: February 22, 2026

---

## Table of Contents

1. [Completed Phases (0-10)](#completed-phases-0-10)
2. [Audit Findings & Corrections](#audit-findings--corrections)
3. [Priority Roadmap](#priority-roadmap)
4. [Phase 11: Platform Identity & Infrastructure](#phase-11-platform-identity--infrastructure) ✅
5. [Phase 12: Critical Bug Fixes](#phase-12-critical-bug-fixes) ✅
6. **MUST DO — Launch Blockers**
   - [Phase 13: Security Hardening](#phase-13-security-hardening) ✅
   - [Phase 14: Data Integrity & Database Fixes](#phase-14-data-integrity--database-fixes) ✅
7. **SHOULD DO — Launch Quality**
   - [Phase 16: Brand & UX](#phase-16-brand--ux) ✅
   - [Phase 17: Landing Page & Email Capture](#phase-17-landing-page--email-capture) ✅
8. **SHOULD DO IF TIME — Pre-Season Polish**
   - [Phase 18: Standard Practices](#phase-18-standard-practices)
   - [Phase 19: Analytics & Tracking](#phase-19-analytics--tracking)
   - [Phase 20: User Profiles & Tiers](#phase-20-user-profiles--tiers)
9. **DEFER — Post-Launch**
   - [Phase 21: Share & Social Features](#phase-21-share--social-features)
   - [Phase 22: Multi-Sport Architecture](#phase-22-multi-sport-architecture)
   - [Phase 23: Free Feature Enhancements](#phase-23-free-feature-enhancements)
   - [Future Phases](#future-phases)

---

## Completed Phases (0-10)

These phases represent the core feature build. All are **COMPLETE** but some contain bugs and inconsistencies documented in the [Audit Findings](#audit-findings--corrections) section.

### Phase 0: Foundation ✅
| Task | Description |
|------|-------------|
| 0.1 | Create Supabase project |
| 0.2 | Create Next.js project with TypeScript + Tailwind |
| 0.3 | Connect Supabase to Next.js |
| 0.4 | Deploy to Vercel |
| 0.5 | Design and create database schema |
| 0.6 | Set up authentication (Supabase Auth) |
| 0.7 | Seed database with FBS schools data |

### Phase 1: League Management ✅
| Task | Description |
|------|-------------|
| 1.1 | Create league creation flow |
| 1.2 | Build league settings page (all commissioner options) |
| 1.3 | Implement invite system (invite links or email) |
| 1.4 | Build team creation for users joining a league |
| 1.5 | Role-based access (commissioner vs member vs global admin) |

### Phase 2: Draft System ✅
| Task | Description |
|------|-------------|
| 2.1 | Build draft board UI (available schools, pick history) |
| 2.2 | Implement draft order (snake/linear, manual/random) |
| 2.3 | Real-time pick updates (Supabase Realtime) |
| 2.4 | Draft timer with server-side synchronization |
| 2.5 | Pick validation (max selections, already taken, etc.) |
| 2.6 | Draft state machine (not started → in progress → completed) |
| 2.7 | Post-draft roster confirmation |

### Phase 3: Season Schedule & ESPN Integration ✅
| Task | Description |
|------|-------------|
| 3.1 | ESPN API integration (fetch schedule, scores, rankings) |
| 3.2 | Scheduled jobs for daily schedule refresh |
| 3.3 | Live game polling during game days |
| 3.4 | Game state management (scheduled → live → completed) |
| 3.5 | Handle edge cases (Army-Navy week, Week 0, bowl games) |

> **⚠ CORRECTION (Resolved)**: Vercel free tier limits to 2 crons. The original design called for per-minute live score polling via `gameday-sync`, which requires per-minute scheduling. Resolution: keep `daily-sync` as the Vercel cron, move `gameday-sync` and `reconcile` to GitHub Actions (free per-minute scheduling). `rankings-sync` stays manual-only (admin panel) since `daily-sync` already syncs rankings daily. See [Phase 12](#phase-12-critical-bug-fixes) for implementation.
>
> **⚠ CORRECTION**: Cron routes cap `currentWeek` at 20 (`Math.min(weeksDiff + 1, 20)`). This misses weeks 21 (championship) and 22 (Heisman). Fixed in Phase 12.

### Phase 4: Points Calculator ✅
| Task | Description |
|------|-------------|
| 4.1 | Implement scoring engine (apply league rules to game results) |
| 4.2 | Calculate weekly points per school |
| 4.3 | Handle special scoring (bowls, playoffs, conference championships) |
| 4.4 | Trigger recalculation when games complete |
| 4.5 | Heisman winner tracking |
| 4.6 | Playoff team tracking (separate from AP Top 25) |

> **⚠ CORRECTION**: See [Audit Finding C1](#c1-league-settings-ignored-in-points-calculator) — league settings are never passed to the scoring function. All leagues score identically using hardcoded defaults.

### Phase 5: User Dashboard ✅
| Task | Description |
|------|-------------|
| 5.1 | Team customization (name, colors, image) |
| 5.2 | Roster display with current schools |
| 5.3 | This week's games view |
| 5.4 | Points breakdown (weekly, season total, per school) |
| 5.5 | Current standings display |
| 5.6 | Add/drop counter and deadline display |
| 5.7 | Historical view for dropped schools |

### Phase 6: Leaderboard & High Points ✅
| Task | Description |
|------|-------------|
| 6.1 | Main leaderboard (all teams, total points, weekly breakdown) |
| 6.2 | High points tracking (weekly winners, prize amounts) |
| 6.3 | High points leaderboard (grid: weeks × teams × winnings) |
| 6.4 | Real-time updates during games |
| 6.5 | Ideal team calculation |
| 6.6 | Current week max points calculation |

### Phase 7: Transaction System (Add/Drop) ✅
| Task | Description |
|------|-------------|
| 7.1 | Available schools browser with filters |
| 7.2 | Add/drop transaction flow (select drop → select add → confirm) |
| 7.3 | Eligibility validation |
| 7.4 | Deadline enforcement |
| 7.5 | Transaction counter tracking |
| 7.6 | Transaction history log |
| 7.7 | Roster period tracking |

### Phase 8: Polish & Launch Prep ✅ (Partial)
| Task | Description | Status |
|------|-------------|--------|
| 8.1 | Mobile responsiveness | Done |
| 8.2 | Error handling and user feedback | Done (partial) |
| 8.3 | Loading states and optimistic updates | Done |
| 8.4 | Report issue feature | Done |
| 8.5 | Entry fee tracking | Done |
| 8.6 | Nightly reconciliation jobs | Done |
| 8.7 | Testing with real users | **Not started** |
| 8.8 | Bug fixes from testing | **Not started** |

### Phase 9: Double Points Pick ✅
| Task | Description |
|------|-------------|
| 9.1 | Add double points settings to league settings |
| 9.2 | Create weekly pick selection UI on team page |
| 9.3 | Enforce pick deadline |
| 9.4 | Update points calculator to apply 2x multiplier |
| 9.5 | Show double pick history and results |

### Phase 10: Playoff Bracket Visualization ✅
| Task | Description |
|------|-------------|
| 10.1 | Create bracket component with 12-team CFP format |
| 10.2 | Pull playoff matchups from games table |
| 10.3 | Show which teams are on user rosters |
| 10.4 | Real-time score updates during playoff games |
| 10.5 | Add bracket page to league navigation |

---

## Audit Findings & Corrections

A full-codebase audit was conducted on February 22, 2026. The findings below document errors, inconsistencies, and gaps discovered in the "completed" phases. Each finding is referenced by ID in the new phases that address them.

### Critical Bugs

#### C1: League Settings Ignored in Points Calculator
- **File**: `src/lib/points/calculator.ts` — `calculateWeeklySchoolPoints()` (lines ~310, ~343)
- **Bug**: The function always uses `DEFAULT_SCORING` (hardcoded: 1pt win, 1pt conference, etc.) instead of passing league-specific settings from `league_settings` table.
- **Impact**: Commissioners can change scoring in the UI but it has **zero effect** on actual point calculations. Every league scores identically.
- **Root cause**: The `scoring` parameter exists in `calculateSchoolGamePoints()` but `calculateWeeklySchoolPoints()` never fetches or passes league settings — it always passes `DEFAULT_SCORING`.

#### C2: Client-Side Scoring Mismatch (RosterList)
- **Files**: `src/components/RosterList.tsx` (lines 422-465) vs `src/lib/points/calculator.ts` (lines 94-209)
- **Bug**: The client-side `calculateGamePoints()` in RosterList has diverged from the server version:
  - **Loss points**: Client always returns 0 for losses; server respects league settings
  - **Bowl games**: Client incorrectly includes ranked opponent bonuses for bowl games; server correctly excludes them
  - **Hardcoded values**: Client uses literal numbers (1, 2) instead of configurable settings
- **Impact**: Users see incorrect points preview in the game detail modal.

#### C3: Timezone Bug in Week Calculation
- **File**: `src/lib/week.ts` (line ~40)
- **Bug**: `new Date(year, 7, 24)` creates a date in the **local timezone** of the server, but `Date.now()` returns UTC milliseconds. Comparing local-time date against UTC time can produce different week numbers depending on the server's timezone.
- **Impact**: Week boundaries could shift by up to a day, affecting transaction deadlines, double points cutoffs, and which games count for which week.
- **Fix**: Use `new Date(Date.UTC(year, 7, 24))` for UTC consistency.

### Configuration Errors

#### A1: Live Scoring Architecture (Resolved)
- **Original problem**: Vercel free tier allows only 2 crons (minimum daily interval). The `gameday-sync` route was designed for per-minute polling with smart skip logic, but was registered as `"0 17 * * 6"` (once per Saturday at 5 PM UTC). Live scoring was not functioning.
- **Root cause**: Vercel free tier cron limitations.
- **Resolution decided**: Use **GitHub Actions** for per-minute scheduling (free, 2,000 min/month).

**New architecture:**

| Job | Scheduler | Schedule | Route |
|-----|-----------|----------|-------|
| Daily maintenance | Vercel cron | `0 10 * * *` (10 AM UTC daily) | `/api/cron/daily-sync` |
| Live game scores | GitHub Actions | `* * * * *` (every minute) | `/api/cron/gameday-sync` |
| Nightly reconcile | GitHub Actions | `0 8 * * *` (8 AM UTC daily) | `/api/cron/reconcile` |
| Rankings sync | Manual only | Admin panel | `/api/cron/rankings-sync` |

**How live scores work**: GitHub Actions calls `gameday-sync` every minute → smart skip logic: checks for games today, checks if within game window (30 min before first game → 4 hours after last game start, with late-game exception) → if in window, fetches ESPN scores → updates `games` table → Supabase Realtime pushes updates to all connected browsers.

**Rankings**: `daily-sync` already syncs AP rankings daily, so `rankings-sync` doesn't need automatic scheduling. Kept as manual route for admin re-pulls.

#### A2: Cron Week Cap Bug
- **Files**: `daily-sync/route.ts` (line 90), `gameday-sync/route.ts` (line 149), `rankings-sync/route.ts` (line 77)
- **Bug**: All three routes cap `currentWeek` with `Math.min(weeksDiff + 1, 20)`. This means:
  - Week 21 (National Championship) games are never synced or scored
  - Week 22 (Heisman) is never reached
  - `rankings-sync` caps at 15 (!) — rankings stop syncing after week 15
- **Fix**: Change cap to 22 in `daily-sync` and `gameday-sync`. Change to 22 in `rankings-sync` (or remove cap since rankings are relevant through the playoff).

#### A3: Season Timeline Week Numbering
- **Previous documentation**: Showed max week as 20 (Heisman)
- **Correct timeline**:

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

### Security Issues

#### S1: API Routes Missing Authentication
Five routes have no auth check:
- `GET /api/transactions` — anyone can view any team's/league's transactions
- `GET /api/leagues/[id]/standings` — any league's standings publicly accessible
- `GET /api/leagues/[id]/stats` — league statistics publicly accessible
- `GET /api/schools/[id]/points` — school performance data publicly accessible
- `POST /api/reports` — userId is client-provided and can be spoofed

#### S2: Hardcoded Sync API Key Fallback
Six sync routes use: `process.env.SYNC_API_KEY || 'fantasy-sports-sync-2024'`
If `SYNC_API_KEY` env var isn't set, anyone who finds the endpoint can trigger syncs with this predictable key.
- Files: `/api/points/calculate`, `/api/sync/bulk`, `/api/sync/games`, `/api/sync/schools`, `/api/sync/rankings`, `/api/sync/heisman`

#### S3: Cron Secret Logic Flaw
Cron routes accept requests if `CRON_SECRET` is undefined — the check passes when both the header and env var are undefined.

#### S4: Anonymous Issue Report Inserts
`issue_reports` RLS policy uses `WITH CHECK (true)` allowing unauthenticated inserts (spam vector).

### Database Issues

#### D1: TypeScript Types Out of Sync
`src/types/database.ts` is missing:
- 2 entire tables: `league_school_event_bonuses` (migration 013), `issue_reports` (migration 012)
- 8+ columns across `fantasy_teams`, `league_settings`, `weekly_double_picks`, `games`
- The `co_commissioner` value in the `LeagueRole` enum

#### D2: Missing Database Indexes
Critical query paths lack indexes:
- `leagues.created_by` — used in 8+ RLS policies
- `league_members(league_id, role)` composite — used in every permission check
- `school_weekly_points.game_id` — used in joins with games table
- `weekly_double_picks.fantasy_team_id` — used in every double pick query
- `issue_reports.user_id` — used in user-scoped queries

#### D3: Missing `updated_at` and Triggers
9 tables have no `updated_at` column or auto-update trigger:
- `sports`, `league_members`, `roster_periods`, `transactions`, `draft_order`, `draft_picks`, `ap_rankings_history`, `heisman_winners`, `school_season_bonuses`

#### D4: Missing CHECK Constraints
- `league_settings`: All numeric point values allow negative numbers, percentages allow >100
- `week_number`: No range validation on any table (allows negative or >21)
- `ap_rankings_history.rank`: No range validation (allows 0 or 999)
- `schools.external_api_id`: Not unique per sport (duplicate sync risk)

#### D5: Denormalized Data Risks
- `games` table has denormalized `home_team_name`, `home_team_logo_url`, `away_team_name`, `away_team_logo_url` that can drift from `schools` table
- `fantasy_teams.total_points` stored as materialized value that can diverge from sum of weekly points if update fails
- Two overlapping bonus tables: `school_season_bonuses` and `league_school_event_bonuses`

#### D6: Wide `league_settings` Table
40+ columns for all league configuration. Each new scoring type means adding more columns. Poor extensibility for new sports.

#### D7: No Audit Trail
- No `updated_by` or `created_by` on most tables
- No activity/audit log table for league events
- No soft deletes (`deleted_at`) on any table
- Cannot determine who changed league settings or when

### Tech Debt

#### T1: Duplicated Scoring Logic
`calculateGamePoints()` exists in both:
- `src/lib/points/calculator.ts` (server, authoritative, 115 lines)
- `src/components/RosterList.tsx` (client, simplified, 43 lines)

These have already diverged. See [C2](#c2-client-side-scoring-mismatch-rosterlist).

#### T2: Duplicated Leaderboard Components
`src/components/LeaderboardClient.tsx` (581 lines) and `src/components/EmbeddedLeaderboard.tsx` (487 lines) are ~80% identical:
- Same weekly points map building
- Same high points winner calculation
- Same week label generation
- Same table rendering logic

Any scoring display fix must be made in both places.

#### T3: Duplicated Page Logic
The `seasons` type assertion and year extraction pattern appears in 4+ page files:
```typescript
const seasons = league.seasons as unknown as { year: number } | ...
const year = Array.isArray(seasons) ? seasons[0]?.year : seasons?.year || new Date().getFullYear()
```

#### T4: 20+ Unsafe Type Assertions
Throughout pages and components, Supabase query results are cast with `as unknown as SomeType`, bypassing TypeScript's type checker. If the database schema changes, TypeScript won't warn about breakage.

#### T5: Hardcoded Week Numbers Everywhere
Week numbers (15=Conference Champs, 17=Bowls, 18-21=CFP, 22=Heisman) are hardcoded as magic numbers in:
- `RosterList.tsx` (lines 301, 303-307, 554, 904-914)
- `LeaderboardClient.tsx` (lines 210, 214)
- `EmbeddedLeaderboard.tsx` (lines 153, 157)
- Multiple API routes (daily-sync, gameday-sync, points calculate)

#### T6: Hardcoded Season Start Date
`new Date(year, 7, 24)` (August 24) appears in 5+ files:
- `src/lib/week.ts`
- `/api/points/calculate/route.ts`
- `/api/cron/daily-sync/route.ts`
- `/api/cron/gameday-sync/route.ts`
- `/api/leagues/[id]/stats/route.ts`

#### T7: Missing Error Handling in Components
- `RosterList.tsx`: Double points save/remove errors only log to console, no user feedback
- `LeaderboardClient.tsx`: Stats fetch error silently logged
- `PlayoffBracket.tsx`: Loading state exists but no error state
- No React error boundaries in the application

#### T8: Large Components
Files that need splitting for maintainability:
- Draft page: 1,755 lines
- Settings page: 1,471 lines
- RosterList: 996 lines
- TransactionsClient: 834 lines

#### T9: Missing Memoization
Several components rebuild expensive data structures on every render without `useMemo`:
- `RosterList.tsx`: `schoolPointsMap`, `schoolTotals`, `opponentSchoolsMap`
- `LeaderboardClient.tsx`: `weeklyPointsMap`, `highPointsWinners`, `weeksWithData`
- `EmbeddedLeaderboard.tsx`: Same as LeaderboardClient

### Missing Standard Practices

#### SP1: Zero Tests
No test framework, no test files, no test scripts in package.json. The duplicated scoring logic already has bugs that tests would catch.

#### SP2: No Error Monitoring
Console.log/console.error only. No Sentry, Datadog, or any error tracking service. Cron failures are invisible. API errors return `String(error)` which leaks implementation details.

#### SP3: No Input Validation
No request body validation on any API route. No Zod, Joi, or similar library. UUIDs, week numbers, and other params are not validated.

#### SP4: No CI/CD Pipeline
No CI/CD GitHub Actions (lint/type-check/test), no pre-commit hooks. Only Vercel auto-deploy from push. Note: Phase 12 adds GitHub Actions for cron scheduling, but not for CI/CD — that's separate.

#### SP5: Inconsistent API Response Format
Some routes return `{success, message, data}`, others return `{success, ...details}`, others return raw data, others return `{error}`. No standard response envelope.

#### SP6: No Rate Limiting
Every endpoint is unprotected against abuse. Particularly risky for `/api/transactions` and `/api/sync/*`.

#### SP7: No React Error Boundaries
A single component crash takes down the entire page.

#### SP8: No Response Caching
Every page load hits the database fresh. Standings, leaderboard, and schedule could be cached with short TTLs.

---

## Priority Roadmap

The roadmap is organized by **launch urgency**, not sequential phase numbers. The June 2026 deadline (platform operational before August season) drives the priority tiers.

### MUST DO — Launch Blockers

*Platform doesn't work or isn't safe without these. Non-negotiable.*

```
Phase 12: Critical Bug Fixes           ████████████  COMPLETE ✅
Phase 11: Platform Identity             ████████████  COMPLETE ✅
Phase 13: Security Hardening            ████████████  COMPLETE ✅
Phase 14: DB Fixes + Schema Now         ████████████  COMPLETE ✅
Phase 15: Tech Debt Resolution          ████████████  COMPLETE ✅
```

### SHOULD DO — Launch Quality

*Platform works but looks amateur and has no way to acquire users without these.*

```
Phase 16: Brand & UX                   ████████████  COMPLETE ✅
Phase 17: Landing Page & Email Capture  ████████████  COMPLETE ✅
```

### SHOULD DO IF TIME — Pre-Season Polish

*Important for quality and growth, but platform is functional without them. Do what you can before June.*

```
Phase 18: Standard Practices            ░░░░░░░░░░░░  Testing, monitoring, CI/CD
Phase 19: Analytics & Tracking          ░░░░░░░░░░░░  Know your numbers
Phase 20: User Profiles & Tiers         ░░░░░░░░░░░░  Founding Commissioner program
```

### DEFER — Post-Launch

*Build after Season 1 starts. None of these block the core experience.*

```
Phase 21: Share & Social Features       ░░░░░░░░░░░░  Organic growth tools
Phase 22: Multi-Sport Architecture      ░░░░░░░░░░░░  Year 2 expansion prep
Phase 23: Free Feature Enhancements     ░░░░░░░░░░░░  Extras (presets, watchlists, chat, etc.)
Future Phases 24-31                     ░░░░░░░░░░░░  Year 2+ features
```

### Visual Build Order

```
━━━ MUST DO (Launch Blockers) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 12 (Bug Fixes)         ████████████  COMPLETE ✅
Phase 11 (Rivyls Identity)   ████████████  COMPLETE ✅
Phase 13 (Security)          ████████████  COMPLETE ✅
        ↓
Phase 14 (DB + Schema Now)   ████████████  COMPLETE ✅
        ↓
Phase 15 (Tech Debt)         ████████████  COMPLETE ✅

━━━ SHOULD DO (Launch Quality) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ↓
Phase 16 (Brand & UX)        ████████████  COMPLETE ✅
        ↓
Phase 17 (Landing Page)      ████████████  COMPLETE ✅

━━━ SHOULD DO IF TIME (Pre-Season) ━━━━━━━━━━━━━━━━━━━━━━━━━
        ↓
Phase 18 (Std Practices)     ░░░░░░░░░░░░  ← START HERE
        ↓
Phase 19 (Analytics)         ░░░░░░░░░░░░
        ↓
Phase 20 (Profiles & Tiers)  ░░░░░░░░░░░░

━━━ DEFER (Post-Launch) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 21 (Share & Social)    ░░░░░░░░░░░░
Phase 22 (Multi-Sport)       ░░░░░░░░░░░░
Phase 23 (Free Enhancements) ░░░░░░░░░░░░
```

### June Deadline Decision Framework

If running out of time before the August 2026 season:

```
STOP POINT 1 (Minimum viable launch):  ★ REACHED ★
  ✅ Phase 13-15 done   → Platform is secure, schema solid, code clean
  ✅ Phase 16 done      → Platform looks professional
  ✅ Phase 17 done      → Users can find and sign up
  → Can launch with this. Everything else is post-launch polish.

STOP POINT 2 (If time allows):
  ✅ Phase 18 done      → Tests catch regressions, monitoring in place
  → Solid engineering foundation for Season 1.

STOP POINT 3 (If still more time):
  ✅ Phase 19 done      → Analytics measuring growth targets
  ✅ Phase 20 done      → Founding Commissioner program live
  → Full pre-launch experience.
```

---

## Phase 11: Platform Identity & Infrastructure

*Rebrand to Rivyls, set up domain, simplify to sandbox-only deployment*

**Status: COMPLETE**

### Background

The platform is being rebranded from "Fantasy Sports Platform" to **Rivyls** (rivyls.com). Additionally, maintaining separate production and sandbox environments adds complexity we don't need yet. We will **consolidate to a single deployment** using the sandbox Supabase database (with 2025 test data) until the platform is hardened and ready for real users.

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 11.1 | **Connect Rivyls.com domain to Vercel** | Add custom domain in Vercel dashboard → Domains. Update DNS records (A record + CNAME). Verify SSL certificate auto-provisioning. |
| 11.2 | **Set main branch as sandbox environment** | Change `NEXT_PUBLIC_ENVIRONMENT` to `sandbox` for Production environment in Vercel. This means the `main` branch deploys to rivyls.com with sandbox database and crons disabled. |
| 11.3 | **Remove production environment split** | Remove production-specific env var configuration from Vercel. We'll re-add production when we're ready for the 2026 season. Keep the code that supports environment detection (`src/lib/env.ts`) — just don't configure a production environment yet. |
| 11.4 | **Enable crons for sandbox** | Since sandbox is now the only environment, update cron logic to run in sandbox OR production (not just production). This is needed for the live test environment. Add a new env var `ENABLE_CRONS=true` that overrides the environment check. |
| 11.5 | **Update vercel.json crons** | Register all 4 cron routes (see [A1](#a1-vercel-cron-configuration-mismatch)). Fix gameday-sync schedule if live scoring is desired during testing. |
| 11.6 | **Rename project references** | Update `package.json` name, page titles, metadata, and `<title>` tags from "Fantasy Sports Platform" to "Rivyls". |
| 11.7 | **Update environment documentation** | Rewrite `docs/ENVIRONMENT_SETUP.md` to reflect single-environment setup with Rivyls.com domain. Document the plan to add production back when ready. |
| 11.8 | **Brand guidelines integration** | Import brand guidelines (colors, fonts, logo) and create a design token file / Tailwind theme extension. See [Phase 16](#phase-16-brand--ux) for full implementation. |
| 11.9 | **Test stable URL** | Verify rivyls.com loads correctly, SSL works, all routes function, auth redirects use correct domain. |

### Decision Record: Why Sandbox-Only

**Problem**: We have two Supabase projects (production + sandbox) with separate env var configs per Vercel environment. Preview branches get sandbox, main gets production. But production has no data and isn't ready.

**Decision**: Collapse to sandbox-only until platform is hardened.

**Benefits**:
- Every push to `main` deploys to rivyls.com (stable URL, no preview branch URLs)
- One database to maintain
- Test users get a real URL, not `fantasy-sports-platform-git-xxx.vercel.app`
- Crons can run against 2025 data for testing
- Simpler env var management

**When to add production back**: After Phases 12-16 are complete and the platform has been tested by real users on the sandbox. Production will be a new Supabase project with 2026 season data.

---

## Phase 12: Critical Bug Fixes
*Fix scoring errors, data correctness issues, and live scoring architecture*

**Status: COMPLETE**

**Addresses**: [C1](#c1-league-settings-ignored-in-points-calculator), [C2](#c2-client-side-scoring-mismatch-rosterlist), [C3](#c3-timezone-bug-in-week-calculation), [A1](#a1-live-scoring-architecture-resolved), [A2](#a2-cron-week-cap-bug), [A3](#a3-season-timeline-week-numbering)

This phase also corrects issues originally in Phase 3 (cron architecture) and Phase 4 (scoring engine). Those phases are marked complete because the features exist, but the bugs found during the audit are fixed here.

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| **Scoring Engine (Phase 4 corrections)** |||
| 12.1 | **Fix league settings passthrough in calculator** | In `src/lib/points/calculator.ts`, update `calculateWeeklySchoolPoints()` to accept a `leagueId` parameter, fetch that league's `league_settings`, and pass the settings to `calculateSchoolGamePoints()` instead of `DEFAULT_SCORING`. Keep `DEFAULT_SCORING` as fallback only when no league context exists (e.g., global school stats). |
| 12.2 | **Fix client-side scoring display** | In `src/components/RosterList.tsx`, remove the duplicate `calculateGamePoints()` function. Instead, either (a) read pre-calculated points from `school_weekly_points` table, or (b) import a shared utility that matches server logic. The modal should show the same numbers as the leaderboard. |
| 12.3 | **Fix bowl game bonus in client display** | Ensure bowl games do NOT get ranked opponent bonuses in the display (matching server behavior). |
| 12.4 | **Fix loss points display** | If league settings allow loss points, the client display should show them (not return 0). |
| **Week/Timezone (Phase 3 corrections)** |||
| 12.5 | **Fix timezone bug in week.ts** | Change `new Date(year, 7, 24)` to `new Date(Date.UTC(year, 7, 24))` in `src/lib/week.ts`. Audit all other `new Date()` calls in cron routes and API routes for timezone consistency. Ensure `getSimulatedDate()` and `getCurrentWeek()` both use UTC. |
| 12.6 | **Fix week cap in cron routes** | Update `Math.min(weeksDiff + 1, 20)` to `Math.min(weeksDiff + 1, 22)` in: `daily-sync/route.ts` (line 90), `gameday-sync/route.ts` (line 149). Update `Math.min(weeksDiff + 1, 15)` to `Math.min(weeksDiff + 1, 22)` in `rankings-sync/route.ts` (line 77). This ensures championship week (21) and Heisman week (22) are covered. |
| **Live Scoring Architecture (Phase 3 corrections)** |||
| 12.7 | **Create GitHub Actions workflow for gameday-sync** | Create `.github/workflows/gameday-sync.yml` that calls `/api/cron/gameday-sync` every minute. Uses `CRON_SECRET` stored as GitHub repository secret. The endpoint's smart skip logic handles the rest: skips if no games today, skips if outside game window (30 min before first game → 4 hours after last game start), only calls ESPN during actual game windows. |
| 12.8 | **Create GitHub Actions workflow for nightly reconcile** | Create `.github/workflows/nightly-reconcile.yml` that calls `/api/cron/reconcile` daily at 8 AM UTC via POST. Uses `CRON_SECRET` stored as GitHub repository secret. |
| 12.9 | **Update vercel.json** | Keep only `daily-sync` in vercel.json (the one Vercel cron). Remove `gameday-sync` from vercel.json since GitHub Actions now handles it. |
| 12.10 | **Add GitHub repository secrets** | Add `CRON_SECRET` to GitHub repository → Settings → Secrets → Actions. This is the same value as the Vercel env var so both schedulers authenticate with the same key. |
| 12.11 | **Fix gameday-sync late-game handling** | The Hawaii exception: verify the game window logic handles games that end after midnight (next calendar day). The current code checks `todaysGames` by `game_date = today` — a game that started at 11 PM and ends at 1 AM would be missed on the second day. Fix: also check for any games with `status = 'live'` regardless of date. |
| **Data Correction** |||
| 12.12 | **Recalculate all existing points** | After fixing the calculator, run a full recalculation for all leagues/weeks to correct any incorrect stored values. |

### Verification

After completing this phase:
- [ ] Create two test leagues with different scoring settings → verify they produce different point totals
- [ ] Compare RosterList modal points to leaderboard points → they should match
- [ ] Verify week boundary is consistent across UTC+0 and UTC-8 timezones
- [ ] Verify `daily-sync` fires from Vercel dashboard at 10 AM UTC
- [ ] Verify `gameday-sync` fires from GitHub Actions every minute
- [ ] Verify `reconcile` fires from GitHub Actions at 8 AM UTC
- [ ] Test with sandbox data: set sandbox week to 21 (championship) and verify sync/scoring works
- [ ] Test late-game scenario: game with `status = 'live'` after midnight

---

## Phase 13: Security Hardening
*Fix authentication gaps and credential exposure before any real users*

**Status: COMPLETE**

**Addresses**: [S1](#s1-api-routes-missing-authentication), [S2](#s2-hardcoded-sync-api-key-fallback), [S3](#s3-cron-secret-logic-flaw), [S4](#s4-anonymous-issue-report-inserts)

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 13.1 | **Add auth to unprotected GET routes** | Add `supabase.auth.getUser()` check to: `/api/transactions` (GET), `/api/leagues/[id]/standings`, `/api/leagues/[id]/stats`, `/api/schools/[id]/points`. Verify user is a member of the league being accessed. |
| 13.2 | **Fix issue reports auth** | Add auth check to `POST /api/reports`. Use `auth.uid()` from session instead of client-provided userId. Update RLS policy from `WITH CHECK (true)` to `WITH CHECK (auth.uid() IS NOT NULL)`. |
| 13.3 | **Remove hardcoded API key fallback** | In all 6 sync routes + cron routes, remove the `|| 'fantasy-sports-sync-2024'` fallback. Make `SYNC_API_KEY` required — if not set, reject the request. |
| 13.4 | **Fix cron secret validation** | Update cron routes to fail closed: if `CRON_SECRET` is not set in env, reject all cron requests. The check should be `if (!cronSecret \|\| header !== cronSecret)` not `if (cronSecret && header !== cronSecret)`. |
| 13.5 | **Add league membership middleware** | Create a reusable middleware/utility function `verifyLeagueMembership(userId, leagueId)` that all league-scoped routes can call. Prevents the current pattern of each route doing its own (or no) authorization check. |
| 13.6 | **Audit remaining routes** | Walk through every route in `/api/` and verify it has appropriate auth. Document which routes are public (none should be) and which require specific roles (commissioner). |
| 13.7 | **Regenerate all API keys** | After removing fallbacks, generate new strong keys for `SYNC_API_KEY` and `CRON_SECRET` using `openssl rand -hex 32`. Update Vercel env vars. |
| 13.8 | **Protect admin routes** | Verify `/admin/sync` and `/admin/reports` pages check for admin role or specific user IDs. Currently these may be accessible to any logged-in user. |
| 13.9 | **Transfer DNS to Cloudflare** | **DEFERRED — Wix ICANN 60-day lock until Apr 21, 2026.** Transfer `rivyls.com` DNS to Cloudflare after lock expires. Resend DNS records are incompatible with Wix DNS. Moved to Phase 15. |
| 13.10 | **Configure custom SMTP for auth emails** | **DEFERRED — depends on 13.9.** Moved to Phase 15. |

### Verification

After completing this phase:
- [ ] Unauthenticated requests to `/api/transactions`, `/api/leagues/[id]/standings`, `/api/leagues/[id]/stats` return 401
- [ ] Authenticated users can only access leagues they belong to
- [ ] Sync endpoints reject requests without valid `SYNC_API_KEY`
- [ ] Cron endpoints reject requests without valid `CRON_SECRET`

---

## Phase 14: Data Integrity & Database Fixes
*Fix schema issues, sync types, add missing constraints, indexes, and premium-ready schema*

**Status: COMPLETE**

**Addresses**: [D1](#d1-typescript-types-out-of-sync), [D2](#d2-missing-database-indexes), [D3](#d3-missing-updated_at-and-triggers), [D4](#d4-missing-check-constraints), [D5](#d5-denormalized-data-risks), [D7](#d7-no-audit-trail), Premium Features Spec ("Schema Now, Build Later")

### Tasks — Existing Schema Fixes

| Task | Description | Details |
|------|-------------|---------|
| 14.1 | **Sync TypeScript types with database** | Regenerate or manually update `src/types/database.ts` to include: `league_school_event_bonuses` table, `issue_reports` table, all columns added in migrations 005-013, `co_commissioner` role value. Consider using `supabase gen types typescript` for auto-generation. |
| 14.2 | **Add missing database indexes** | Create migration 014 with indexes: `idx_leagues_created_by`, `idx_league_members_league_role (league_id, role)`, `idx_school_weekly_points_game (game_id)`, `idx_weekly_double_picks_team (fantasy_team_id)`, `idx_issue_reports_user (user_id)`. |
| 14.3 | **Add missing `updated_at` columns** | Add `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()` to: `league_members`, `roster_periods`, `transactions`, `draft_order`, `draft_picks`. Add auto-update triggers for each. |
| 14.4 | **Add CHECK constraints** | Add to `league_settings`: all point values >= 0, percentages BETWEEN 0 AND 100, `draft_timer_seconds >= 0`, `schools_per_team > 0`. Add to `week_number` columns: `CHECK (week_number >= 0 AND week_number <= 22)`. Add to `ap_rankings_history.rank`: `CHECK (rank > 0 AND rank <= 25)`. |
| 14.5 | **Add UNIQUE constraint on external_api_id** | `ALTER TABLE schools ADD CONSTRAINT uq_schools_sport_api_id UNIQUE (sport_id, external_api_id)` to prevent duplicate syncs. |
| 14.6 | **Add activity log table** | Create `activity_log` table with: `id`, `league_id`, `user_id`, `action` (enum: draft_started, pick_made, transaction, settings_changed, member_joined, etc.), `details` (JSONB), `created_at`. This provides the audit trail missing from [D7](#d7-no-audit-trail). Start logging immediately in application code once table exists. |
| 14.7 | **Document denormalization decisions** | For [D5](#d5-denormalized-data-risks): Add SQL COMMENTs to `games.home_team_name` etc. explaining why they exist (FCS opponents). Add a reconciliation check in the nightly cron to detect drift between `fantasy_teams.total_points` and sum of weekly points. |

### Tasks — Premium-Ready Schema ("Schema Now, Build Later")

These tasks add database tables and columns needed for Year 2 premium features. **No UI or business logic is built** — only the schema. This follows the "Schema Now, Build Later" principle from the Premium Features Spec, ensuring we don't need disruptive migrations later.

| Task | Description | Details |
|------|-------------|---------|
| 14.8 | **Add `tier` column to profiles** | `ALTER TABLE profiles ADD COLUMN tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'founding_commissioner'))`. This enables Founding Commissioner grants in Year 1 and premium gating in Year 2. No application code changes — just the column. |
| 14.9 | **Create feature flags tables** | Create `feature_flags` table: `id`, `key` (unique, e.g. 'pre_draft_intelligence'), `name`, `description`, `tier_required` ('free', 'pro'), `enabled` (boolean), `created_at`. Create `user_feature_flags` table: `id`, `user_id`, `feature_flag_id`, `enabled`, `granted_at`, `expires_at`. These enable per-feature gating and individual overrides (e.g., granting a beta user early access). |
| 14.10 | **Add `referred_by` to profiles** | `ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES profiles(id)`. Tracks which user referred which signup. Used for referral attribution and Founding Commissioner program tracking. |
| 14.11 | **Expand league invites** | Create `league_invites` table: `id`, `league_id`, `code` (unique), `created_by`, `expires_at`, `max_uses`, `current_uses`, `created_at`. Replaces the single `invite_code` column on `leagues` table. Allows multiple invite links with expiration and usage limits. Keep old `leagues.invite_code` column for backward compatibility until migration is complete. |
| 14.12 | **Create notification preferences table** | Create `notification_preferences` table: `id`, `user_id` (unique), `email_game_results` (boolean, default true), `email_draft_reminders` (boolean, default true), `email_transaction_confirmations` (boolean, default true), `email_league_announcements` (boolean, default true), `push_enabled` (boolean, default false), `created_at`, `updated_at`. Schema only — no notification sending logic yet. |
| 14.13 | **Create trades table** | Create `trades` table: `id`, `league_id`, `proposer_team_id`, `receiver_team_id`, `status` (enum: 'proposed', 'accepted', 'rejected', 'cancelled', 'vetoed'), `proposed_at`, `resolved_at`, `commissioner_override` (boolean), `override_reason` (text). Create `trade_items` table: `id`, `trade_id`, `team_id`, `school_id`, `direction` ('giving', 'receiving'). Schema only — trading is a Year 2+ feature. |
| 14.14 | **Create watchlists table** | Create `watchlists` table: `id`, `user_id`, `school_id`, `league_id` (nullable — global or league-scoped), `notes` (text), `created_at`. Lets users bookmark programs they're interested in drafting or picking up via add/drop. Schema only — free feature, UI built in Phase 23. |
| 14.15 | **Add auction draft type** | `ALTER TYPE draft_type ADD VALUE 'auction'`. Extends the existing draft type enum. No auction logic built — just the enum value so we don't need a disruptive enum migration later. |
| 14.16 | **Add scoring presets to league_settings** | `ALTER TABLE league_settings ADD COLUMN scoring_preset TEXT DEFAULT 'custom'`. Allows future "Aggressive", "Conservative", "Chaos Mode" scoring templates. Does not change existing per-column scoring — just adds a label for preset tracking. |
| 14.17 | **Create waitlist table** | Create `waitlist` table: `id`, `email` (unique), `name` (text), `source` (text, e.g. 'landing_page', 'referral', 'social'), `referral_code` (text), `created_at`. Used by the landing page email capture (Phase 17). |
| 14.18 | **Re-sync TypeScript types** | After all schema changes, regenerate `src/types/database.ts` to include all new tables and columns from 14.8-14.17. |

### Migration Strategy

Split migrations by concern for clarity and safe rollback:
- `014a_indexes.sql` (task 14.2)
- `014b_constraints.sql` (tasks 14.4, 14.5)
- `014c_audit_columns.sql` (task 14.3)
- `014d_activity_log.sql` (task 14.6)
- `014e_premium_schema.sql` (tasks 14.8, 14.9, 14.10, 14.12, 14.14, 14.15, 14.16)
- `014f_trades.sql` (task 14.13)
- `014g_league_invites.sql` (task 14.11)
- `014h_waitlist.sql` (task 14.17)

Run against sandbox database first. Verify application still works. Then apply to production when production is set up.

### Verification

After completing this phase:
- [ ] TypeScript compilation catches type errors when accessing new columns
- [ ] `EXPLAIN ANALYZE` on common queries shows index usage
- [ ] Inserting invalid league_settings (negative points, >100 percentages) is rejected by database
- [ ] Activity log records draft starts, transactions, and settings changes

---

## Phase 15: Tech Debt Resolution
*Eliminate duplication, fix type safety, improve component architecture*

**Status: COMPLETE**

**Addresses**: [T1](#t1-duplicated-scoring-logic), [T2](#t2-duplicated-leaderboard-components), [T3](#t3-duplicated-page-logic), [T4](#t4-20-unsafe-type-assertions), [T5](#t5-hardcoded-week-numbers-everywhere), [T6](#t6-hardcoded-season-start-date), [T7](#t7-missing-error-handling-in-components), [T8](#t8-large-components), [T9](#t9-missing-memoization)

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 15.1 | **Extract shared scoring utility** | Create `src/lib/points/shared.ts` that exports a single `calculateGamePoints()` used by both server calculator and client components. Must accept league settings as parameter. Remove duplicates from `RosterList.tsx` and `TransactionsClient.tsx`. [Fixes T1] |
| 15.2 | **Merge leaderboard components** | Refactor `LeaderboardClient.tsx` and `EmbeddedLeaderboard.tsx` into a single component with a `variant` prop (`'full'` vs `'compact'`). Extract shared data transformation logic into a `useLeaderboardData()` hook. [Fixes T2] |
| 15.3 | **Extract shared page utilities** | Create `src/lib/league-helpers.ts` with: `getLeagueYear(league)` for the repeated seasons type assertion, `getWeekLabel(weekNumber)` for week name mapping, `buildWeeklyPointsMap(weeklyPoints)` for the repeated map construction. [Fixes T3] |
| 15.4 | **Create typed Supabase query helpers** | Create `src/lib/supabase/queries.ts` with properly typed query functions: `getLeagueWithSettings(leagueId)`, `getTeamsForLeague(leagueId)`, `getRosterForTeam(teamId, week)`, etc. These replace the `as unknown as` casts throughout pages. [Fixes T4] |
| 15.5 | **Create week/season constants** | Create `src/lib/constants/season.ts` with: `WEEK_CONFERENCE_CHAMPS = 15`, `WEEK_ARMY_NAVY = 16`, `WEEK_BOWLS = 17`, `WEEK_CFP_R1 = 18`, `WEEK_CFP_QF = 19`, `WEEK_CFP_SF = 20`, `WEEK_CHAMPIONSHIP = 21`, `WEEK_HEISMAN = 22`, `MAX_WEEK = 22`. Replace all magic numbers. [Fixes T5] |
| 15.6 | **Centralize season config** | Move season start date to database (`seasons.start_date`) or a config constant. Remove the 5+ hardcoded `new Date(year, 7, 24)` instances. [Fixes T6] |
| 15.7 | **Add error handling to components** | Add user-visible error feedback (toast notifications) to: RosterList double points save/remove, LeaderboardClient stats fetch, PlayoffBracket game load. [Fixes T7] |
| 15.8 | **Add React error boundaries** | Create `src/components/ErrorBoundary.tsx`. Wrap major page sections (leaderboard, roster, draft board) so a crash in one section doesn't take down the page. [Fixes T7] |
| 15.9 | **Add memoization to expensive calculations** | Wrap the data transformation logic in `RosterList`, `LeaderboardClient`, and `EmbeddedLeaderboard` with `useMemo`. Wrap callback functions with `useCallback`. [Fixes T9] |
| 15.10 | **Plan component splitting** | Identify sub-components to extract from large files. Don't refactor the 1,755-line draft page or 1,471-line settings page in this phase (too risky without tests). Flag these for post-Phase-16 when tests are in place. [Addresses T8 — planning only] |
| 15.11 | **Fix playoff bracket bye teams** | The bracket component doesn't show the 1-4 seed bye teams. Update `PlayoffBracket.tsx` to display first-round byes for seeds 1-4 in the 12-team CFP format. |
| 15.12 | **Fix settings back button navigation** | The back button on league settings page always navigates to `/dashboard` instead of returning to the previous screen. Use `router.back()` or track the referring page. |

### Order of Operations

1. **15.5 + 15.6** first (constants) — these are simple, low-risk, and unblock other refactors
2. **15.3 + 15.4** next (shared utilities) — reduces duplication in pages
3. **15.1** (scoring utility) — depends on Phase 12 being complete
4. **15.2** (leaderboard merge) — larger refactor, do after tests exist (Phase 18)
5. **15.7 + 15.8 + 15.9** (error handling, boundaries, memoization) — can be done independently

### 15.10: Component Splitting Plan (Post-Phase 18)

These large components should be split **after** Phase 18 adds tests, so regressions can be caught.

| Component | File | Lines | Recommended Splits |
|-----------|------|-------|--------------------|
| Draft page | `src/app/leagues/[id]/draft/page.tsx` | ~1,755 | `DraftBoard` (grid display), `DraftPickList` (pick history sidebar), `DraftTimer` (countdown + auto-pick), `DraftControls` (start/pause/reset buttons), `AvailableSchoolsList` (filterable school picker) |
| League settings | `src/app/leagues/[id]/settings/page.tsx` | ~1,471 | `ScoringSettingsForm`, `DraftSettingsForm`, `TransactionSettingsForm`, `MemberManagement` (invite/remove/role) |
| RosterList | `src/components/RosterList.tsx` | ~953 | `RosterRow` (single school row with points), `WeeklyPointsGrid` (the scrollable week columns), `SchoolScheduleModal` (opponent popup) |
| TransactionsClient | `src/components/TransactionsClient.tsx` | ~834 | `AvailableSchoolsBrowser` (search/filter/sort), `TransactionConfirmation` (add/drop confirm modal), `TransactionHistory` (past transactions list) |

**Approach**: Extract child components one at a time, passing data via props. Keep state in the parent. Write a test for the parent component first (Phase 18), then extract.

---

## Phase 16: Brand & UX
*Apply Rivyls brand identity, implement dark mode, and convert all components to themed design system*

**Status: COMPLETE**

**Summary**: Implemented a 4-palette CSS variable system (Collegiate Fire, Heritage Field, Royal Gambit, Warm Kickoff) with semantic tokens for all surfaces, text, borders, brand, accent, and functional colors. Loaded Montserrat (headings) + Inter (body) via next/font/google. Created PaletteProvider and PaletteSwitcher components. Converted all 1200+ hardcoded colors to semantic palette tokens. Brand typography utility classes (`.brand-h1`, `.brand-h2`, `.brand-h3`, `.brand-nav`) defined in globals.css.

**References**: `docs/Rivyls_Brand_Guidelines_v1.docx.pdf`, `docs/RIVYLS — Color Palette Exploration v2.pdf`

### Background

The codebase currently uses Next.js defaults: Geist Sans/Mono fonts, black/white color scheme, and a single CSS media query for OS-preference dark mode. Zero components use `dark:` Tailwind classes. This phase replaces all of that with the Rivyls brand identity.

The brand guidelines recommend **dark mode as the default** (matching industry patterns: Sleeper, PrizePicks, Underdog). This is a significant architectural change — every component needs theme-aware styling.

### Color System (Option A — Collegiate Fire)

**Primary Palette (60/30/10 rule):**

| Token | Name | Hex | Usage | Ratio |
|-------|------|-----|-------|-------|
| `--color-navy` | Deep Navy | `#1B2A4A` | Backgrounds, headers, nav, trust elements | 60% |
| `--color-red` | Fierce Red | `#E8513D` | CTAs, buttons, highlights, alerts, active states | 30% |
| `--color-gold` | Championship Gold | `#F5A623` | Rankings, achievements, pro features, badges | 10% |

**Supporting Palette:**

| Token | Name | Hex | Usage |
|-------|------|-----|-------|
| `--color-ice` | Ice White | `#F7F8FA` | Light mode backgrounds, cards, clean surfaces |
| `--color-midnight` | Midnight Black | `#0D1520` | Dark mode base background |
| `--color-green` | Win Green | `#2ECC71` | Wins, gains, streaks, confirmations |
| `--color-slate` | Slate Gray | `#8892A0` | Supporting text, captions, disabled states |

**Dark Mode Surface Layers:**

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-surface-dark-1` | `#0D1520` | Base background (Midnight Black) |
| `--color-surface-dark-2` | `#1A2235` | Cards, elevated surfaces |
| `--color-surface-dark-3` | `#243044` | Hover states, active surfaces |

**Color Rules (from brand guidelines):**
- Never use Fierce Red text on Deep Navy backgrounds (fails WCAG contrast)
- Never create gradients between Red and Gold
- Gold is for headlines, badges, and decorative elements only — never body text

### Typography

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Display/Headlines | **Montserrat** | ExtraBold 800 (H1), Bold 700 (H2), SemiBold 600 (H3/nav) | Page titles, section headers, nav items |
| Body/UI | **Inter** | Regular 400 (body), Medium 500 (labels/buttons), SemiBold 600 (emphasis) | Body text, form elements, UI chrome |

Both are Google Fonts, loaded via `next/font/google` for performance optimization (replaces current Geist Sans/Mono imports in `layout.tsx`).

### Tasks — Foundation

| Task | Description | Details |
|------|-------------|---------|
| 16.1 | **Install `next-themes`** | Add `next-themes` package for theme management. Wrap app in `ThemeProvider` with `attribute="class"` and `defaultTheme="dark"`. This enables class-based Tailwind dark mode with a toggle. Update `src/components/Providers.tsx` to include the ThemeProvider. |
| 16.2 | **Configure Tailwind v4 dark mode** | In `globals.css`, update `@theme inline {}` block to use class-based dark mode. Add `@variant dark (&:where(.dark, .dark *));` or equivalent Tailwind v4 config. This enables the `dark:` variant prefix across all components. |
| 16.3 | **Define color tokens in CSS** | In `globals.css`, replace the current minimal `:root` variables with the full brand color system. Define light mode and dark mode token sets: `--background`, `--foreground`, `--surface`, `--surface-elevated`, `--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--accent-hover`, `--success`, `--error`, `--warning`. Map these to the brand hex values for each mode. |
| 16.4 | **Register brand colors in Tailwind theme** | Update the `@theme inline {}` block to register all brand colors as Tailwind utilities: `--color-navy: #1B2A4A`, `--color-red: #E8513D`, `--color-gold: #F5A623`, `--color-ice: #F7F8FA`, `--color-midnight: #0D1520`, `--color-green: #2ECC71`, `--color-slate: #8892A0`, plus surface layer colors. This enables classes like `bg-navy`, `text-red`, `border-gold`. |
| 16.5 | **Import brand fonts** | In `layout.tsx`, replace `Geist` and `Geist_Mono` with `Montserrat` and `Inter` from `next/font/google`. Configure with the required weight subsets (400, 500, 600, 700, 800). Update `globals.css` font references. |
| 16.6 | **Create theme toggle component** | Build a simple light/dark mode toggle button component using `next-themes` `useTheme()` hook. Place in the header/nav. Default to dark mode. |

### Tasks — Component Conversion

| Task | Description | Details |
|------|-------------|---------|
| 16.7 | **Audit all hardcoded colors** | Search for hardcoded color values (`bg-white`, `bg-gray-*`, `text-gray-*`, `bg-black`, `border-gray-*`, hex values in inline styles) across all components. Create a list of every instance that needs conversion to theme tokens. |
| 16.8 | **Convert layout and navigation** | Update `layout.tsx`, any header/nav components, and sidebar to use brand colors and theme tokens. Nav should use Deep Navy background, Fierce Red for active states. |
| 16.9 | **Convert dashboard and league pages** | Update the dashboard, league home, and league list pages. Apply card styling with surface layer tokens, proper text hierarchy with Montserrat headlines and Inter body. |
| 16.10 | **Convert draft room** | Update the draft board, pick list, and timer. This is a high-visibility page — ensure it looks sharp in dark mode with clear contrast between available/drafted/on-clock states. |
| 16.11 | **Convert leaderboard and standings** | Update leaderboard tables, standings views, and stats pages. Use Gold for rankings/positions, Green for positive changes, Red for alerts. |
| 16.12 | **Convert team and roster pages** | Update roster display, school cards, game detail modals. Ensure school logos and colors work against both dark and light backgrounds. |
| 16.13 | **Convert transaction and settings pages** | Update add/drop flow, transaction history, and all league settings forms. Forms need clear input/label contrast in dark mode. |
| 16.14 | **Convert playoff bracket** | Update bracket visualization with brand colors. Ensure good contrast for matchup cards and score displays. |
| 16.15 | **Convert auth pages** | Update login, signup, and any auth-related pages with brand identity. First impression matters. |

### Tasks — Polish & Assets

| Task | Description | Details |
|------|-------------|---------|
| 16.16 | **Add Rivyls logo** | Place logo in header, landing page hero, favicon (`/public/favicon.ico`), and Apple touch icon. Create SVG versions for crisp rendering at all sizes. |
| 16.17 | **Create Open Graph images** | Design OG images for social sharing using brand colors and logo. Set up `@vercel/og` or static images for: default site image, league-specific images (if feasible). Update `<meta>` tags in `layout.tsx`. |
| 16.18 | **Update meta tags** | Update `<title>` to "Rivyls — Fantasy College Sports", `<meta description>` with brand-aligned copy, Twitter Card tags, and favicon references. |
| 16.19 | **WCAG contrast audit** | Test all color combinations against WCAG AA standards (4.5:1 for text, 3:1 for large text). Particular focus on: Red on Navy (known fail per brand guidelines), Gold on light backgrounds, text on dark surface layers. Fix any failures. |
| 16.20 | **Mobile dark mode testing** | Test all pages on iOS Safari and Android Chrome in dark mode. Verify: status bar theming (`<meta name="theme-color">`), input field styling, modal overlays, and scroll behavior. |
| 16.21 | **Design system page** | Create `/style-guide` page showing all brand elements in context: color palette swatches, typography scale, button variants, card styles, form elements, status indicators. Living reference for consistency. |

### Brand Guideline Testing Process

For each conversion task:
1. Create a feature branch
2. Apply the changes
3. Deploy to Vercel preview
4. Review on desktop + mobile, in both light and dark modes
5. Check WCAG contrast
6. Get feedback
7. Merge or iterate

### Decisions to Make Before Starting

- [ ] **Confirm Option A (Collegiate Fire) as the final color palette** — the brand guidelines present it as the recommendation, but the Color Palette Exploration PDF shows 5 other options
- [ ] **Confirm dark mode as default** — the brand guidelines recommend it, but this affects every component
- [ ] **Confirm font choice** — Montserrat + Inter are in the guidelines, but verify they feel right once applied

---

## Phase 17: Landing Page & Email Capture
*Build a marketing landing page for pre-launch signups*

**Status: COMPLETE**

**Depends on**: Phase 16 (brand colors, fonts, and dark mode must be defined before building the landing page)

**Summary**: Built `/welcome` landing page with brand typography (Montserrat headings, Inter body). Email capture form with referral tracking (`?ref=CODE`), rate-limited waitlist API, Commissioner CTA with palette tertiary color. Added waitlist-to-user conversion trigger (migration 015): auto-sets `founding_commissioner` tier for commissioner signups, links `referred_by` for referral signups. Deferred: waitlist confirmation email (waiting on Resend/SMTP setup).

### Background

The marketing plan identifies several pre-launch needs: email list building, commissioner recruitment, and a public-facing presence before the platform is open. Currently rivyls.com routes directly to the app (login screen). We need a proper marketing landing page that:
- Captures emails for a waitlist
- Communicates the Rivyls value proposition using the StoryBrand framework from the brand guidelines
- Has a clear CTA for commissioners to sign up early
- Works as the public face of Rivyls before full launch

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 17.1 | **Design landing page layout** | Hero section with headline + CTA, "How It Works" section (3-step flow), feature highlights, social proof section (placeholder for testimonials), commissioner CTA section, email capture form, footer. Follow StoryBrand messaging from brand guidelines: user is the hero, Rivyls is the guide. |
| 17.2 | **Build landing page route** | Create `/src/app/(marketing)/page.tsx` as a separate layout group from the app. This allows the landing page to have its own layout (no app nav, different header) while sharing the same domain. Unauthenticated users see the landing page; authenticated users redirect to dashboard. |
| 17.3 | **Build email capture form** | Form fields: name, email. Submits to `POST /api/waitlist` which inserts into the `waitlist` table (created in Phase 14.17). Show success confirmation. Add basic validation (valid email, not already on list). |
| 17.4 | **Build waitlist API route** | `POST /api/waitlist` — validates input, checks for duplicate email, inserts into `waitlist` table. Accepts optional `source` and `referral_code` query params for attribution tracking. No auth required (public endpoint). Add rate limiting. |
| 17.5 | **Add referral link support** | When a user shares the landing page with `?ref=CODE`, store the referral code in the waitlist entry. Generate unique referral codes for each waitlist signup (e.g., `RIVYLS-{short_id}`). Show "share your link" after signup with their unique code. |
| 17.6 | **Commissioner early access CTA** | Dedicated section on the landing page targeting commissioners: "Be a Founding Commissioner — Build your league first, free for life." Links to commissioner signup flow (or a separate form that flags them as commissioner-interest in the waitlist table). |
| 17.7 | **SEO and meta tags** | Set up proper meta tags for the landing page: title, description, OG image (from Phase 16.17), Twitter Card. Add structured data (JSON-LD) for the website. |
| 17.8 | **Mobile optimization** | Landing page must be mobile-first (80%+ of fantasy sports users are on mobile). Test on iOS Safari and Android Chrome. Ensure CTA buttons are thumb-friendly, email form is easy to fill on mobile. |

### Verification

- [x] Landing page at `/welcome` renders with brand typography
- [ ] Unauthenticated visit to rivyls.com shows landing page (currently shows app — deferred routing change)
- [x] Email capture form works and inserts into waitlist table
- [x] Referral links append `?ref=CODE` and code is stored
- [x] Waitlist-to-user conversion trigger marks `converted_at` and sets `founding_commissioner` tier
- [x] Referral attribution links `referred_by` on user profiles
- [ ] Landing page scores 90+ on Lighthouse mobile (not yet tested)
- [ ] OG image and meta tags render correctly when shared on Twitter/Facebook (OG image not yet created)

---

## Phase 18: Standard Practices
*Add testing, monitoring, validation, and CI/CD*

**Status: UP NEXT**

**Addresses**: [SP1](#sp1-zero-tests), [SP2](#sp2-no-error-monitoring), [SP3](#sp3-no-input-validation), [SP4](#sp4-no-cicd-pipeline), [SP5](#sp5-inconsistent-api-response-format), [SP6](#sp6-no-rate-limiting), [SP7](#sp7-no-react-error-boundaries), [SP8](#sp8-no-response-caching)

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| **Testing** |||
| 18.1 | **Set up Vitest** | Add `vitest` to devDependencies, create `vitest.config.ts`, add `"test"` script to `package.json`. |
| 18.2 | **Write points calculator tests** | Test every scoring rule: wins, losses, conference games, ranked opponents, bowls, playoffs, championship (0 points), shutouts, 50+ points, double points multiplier. Test with custom league settings AND default settings. This is the highest-value test. |
| 18.3 | **Write week calculation tests** | Test `getCurrentWeek()` across timezone boundaries, at season boundaries, at week transitions. Test sandbox overrides. |
| 18.4 | **Write API endpoint tests** | Test auth enforcement, input validation, error responses for key endpoints: `/api/transactions`, `/api/points/calculate`, `/api/drafts/reset`. |
| 18.5 | **Add test script to CI** | Ensure tests run before deploy (see 18.9). |
| **Monitoring** |||
| 18.6 | **Add Sentry** | Install `@sentry/nextjs`. Configure for both client and server. Set up source maps. Create free Sentry project. |
| 18.7 | **Add cron alerting** | Have cron routes report success/failure to Sentry (or a simple health-check service). Alert on consecutive failures. |
| 18.8 | **Add Vercel Analytics** | Enable Vercel Analytics (free) for Core Web Vitals and page performance tracking. |
| **CI/CD** |||
| 18.9 | **Create GitHub Actions workflow** | On PR: run `npm run lint`, `npx tsc --noEmit`, `npm test`. Block merge if any fail. |
| 18.10 | **Add pre-commit hooks** | Install `husky` + `lint-staged`. Run lint + type-check on staged files before commit. |
| **Validation** |||
| 18.11 | **Add Zod for API validation** | Install `zod`. Create request schemas for: transaction requests, league settings updates, sync requests. Validate at the top of each API route. |
| 18.12 | **Standardize API responses** | Create `src/lib/api/response.ts` with helpers: `successResponse(data)`, `errorResponse(message, status)`. Migrate all routes to use consistent `{ success, data?, error?, message? }` format. |
| **Resilience** |||
| 18.13 | **Add rate limiting** | Add rate limiting to public-facing API routes. Can use Vercel Edge Middleware with `@vercel/kv` or a simple in-memory solution for low-traffic phase. |
| 18.14 | **Add response caching** | Add `Cache-Control` headers or Next.js `revalidate` to: standings (30s TTL), leaderboard (30s), schedule (5min). |

### Recommended Order

1. **18.1-18.2** (Vitest + calculator tests) — highest value, catches scoring bugs
2. **18.6** (Sentry) — know when things break
3. **18.9** (GitHub Actions) — prevent regressions
4. **18.11-18.12** (Zod + response format) — clean up API layer
5. Everything else

---

## Phase 19: Analytics & Tracking
*Add user behavior tracking and business metric measurement*

**Status: NOT STARTED**

**Depends on**: Phase 14 (activity_log table), Phase 18.8 (Vercel Analytics for web vitals)

### Background

The business plan sets Year 1 targets: 1,000 users and 100 leagues. Without analytics, we can't measure progress toward these goals or understand user behavior. We need both:
1. **Product analytics** — what users do in the app (create league, start draft, make transactions)
2. **Growth analytics** — signups, referral attribution, waitlist conversion, retention

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 19.1 | **Instrument activity logging** | Wire up the `activity_log` table (from Phase 14.6) with application events. Add logging calls to: user signup, league creation, draft start/complete, transaction made, league join, settings changed. Create a `logActivity(userId, leagueId, action, details)` utility in `src/lib/analytics.ts`. |
| 19.2 | **Build admin analytics dashboard** | Create `/admin/analytics` page showing key metrics: total users, total leagues, users this week, leagues this week, active users (made a transaction or visited in last 7 days), draft completion rate. Query from `activity_log` and existing tables. |
| 19.3 | **Add referral attribution tracking** | When a new user signs up via an invite link with `?ref=USER_ID`, populate `profiles.referred_by` (from Phase 14.10). Track referral chains: who invited whom. Show referral counts on admin dashboard. |
| 19.4 | **Waitlist conversion tracking** | When a waitlist user signs up for the real platform, link their waitlist entry to their profile. Track conversion rate: waitlist signups → actual signups. Show on admin dashboard. |
| 19.5 | **Commissioner metrics** | Track per-commissioner: leagues created, total members across leagues, draft completion rate. These metrics help identify top commissioners for the Founding Commissioner program. |
| 19.6 | **Add Vercel Analytics** | Enable Vercel Analytics (free tier) for Core Web Vitals and page-level performance tracking. Install `@vercel/analytics` and add the `<Analytics />` component to `layout.tsx`. |
| 19.7 | **Add simple event tracking** | Evaluate lightweight analytics options: Vercel Analytics custom events (if sufficient), Plausible (privacy-focused, $9/mo), or PostHog (open source, self-hostable). Pick one and instrument key flows: signup, league creation, draft, first transaction. Avoid heavy solutions like Google Analytics for now. |

### Verification

- [ ] Activity log records events for all key user actions
- [ ] Admin dashboard shows accurate user/league counts
- [ ] Referral attribution correctly links referred users to referrers
- [ ] Vercel Analytics shows Core Web Vitals data

---

## Phase 20: User Profiles & Tiers
*Implement Founding Commissioner program, user profile enhancements, and tier management*

**Status: NOT STARTED**

**Depends on**: Phase 14 (tier column, feature_flags tables), Phase 19 (commissioner metrics for Founding Commissioner selection)

### Background

The business plan and marketing plan both highlight the Founding Commissioner program as a critical Year 1 acquisition tool. Commissioners who build leagues early get "free for life" premium access. This phase implements the tier system and enriches user profiles beyond the current bare-bones setup.

### Tier Definitions

| Tier | Cost | Access | Criteria |
|------|------|--------|----------|
| Free | $0 | Full league experience (Year 1: everything is free) | Default for all users |
| Founding Commissioner | $0 forever | All Pro features when they launch in Year 2 | Granted to early commissioners who create and fill a league during Year 1 |
| Rivyls Pro | $4.99/mo or $29.99/yr | Premium analytics, advanced tools | Year 2 launch — no payment processing in Year 1 |

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 20.1 | **Build user profile page** | Create `/profile` page showing: display name, email, tier badge, leagues (as commissioner and member), join date, referral link. Currently there's no dedicated profile page. |
| 20.2 | **Implement tier display** | Show the user's tier as a badge throughout the app: profile page, league member lists, leaderboard. Founding Commissioners get a distinctive gold badge. Free users see no badge (clean default). |
| 20.3 | **Build Founding Commissioner grant flow** | Admin tool to grant Founding Commissioner status: `/admin/founding-commissioners` page. Shows commissioners who meet criteria (created a league, league has X+ members, draft completed). Admin can manually grant tier. Updates `profiles.tier` to `'founding_commissioner'`. |
| 20.4 | **Define Founding Commissioner criteria** | Decide the exact criteria for auto-qualifying. Suggested: commissioner creates a league AND the league has 6+ members AND the draft is completed — all during Year 1 (before August 2026 season start). Store criteria in config, not hardcoded. |
| 20.5 | **Build feature flag checking utility** | Create `src/lib/features.ts` with: `hasFeature(userId, featureKey)` — checks user's tier against `feature_flags.tier_required`, with override from `user_feature_flags`. This is the gating function all premium features will use in Year 2. For now, all features return `true` (everything free in Year 1). |
| 20.6 | **Seed initial feature flags** | Populate the `feature_flags` table with the planned premium features: `'pre_draft_intelligence'`, `'live_analytics'`, `'transaction_intelligence'`, `'custom_scoring_templates'`, `'waiver_suggestions'`, `'what_if_simulator'`, `'power_rankings'`, `'custom_league_themes'`, `'early_draft_access'`. All set to `enabled = false` and `tier_required = 'pro'`. |
| 20.7 | **Profile edit functionality** | Let users update their display name and notification preferences (from Phase 14.12 schema). Basic form on the profile page. |

### Free Features (confirmed — no tier gating)

These features will NEVER be gated behind premium:
- Basic notifications (draft reminders, game results) — Phase 23.5 / 25
- League announcements (commissioner posts) — Phase 23.3
- Basic transaction history — ALREADY BUILT
- Draft chat — Phase 23.4
- League history / trophy room — Phase 23.6 / 26
- Watchlists (bookmark programs) — Phase 23.2
- Scoring presets (commissioner convenience) — Phase 23.1

### Verification

- [ ] User profile page shows correct tier and badge
- [ ] Founding Commissioner badge displays distinctly
- [ ] Admin can grant Founding Commissioner status
- [ ] `hasFeature()` returns `true` for all features in Year 1
- [ ] Feature flags table is populated with all planned premium features

---

## Phase 21: Share & Social Features
*Add social sharing capabilities for marketing and user engagement*

**Status: NOT STARTED**

**Depends on**: Phase 16 (brand styling for share cards), Phase 17 (landing page as share destination)

### Background

The marketing plan relies on organic sharing as a key growth channel. Users should be able to share their league standings, bracket results, and achievements on social media. Each share drives potential new users back to the landing page or directly to league invites.

### Tasks

| Task | Description | Details |
|------|-------------|---------|
| 21.1 | **Build share card generator** | Create a utility using `@vercel/og` (or `satori` + `sharp`) that generates branded image cards from data. Cards include: Rivyls logo, league name, the data being shared, and a call-to-action URL. Output as PNG for social media compatibility. |
| 21.2 | **Leaderboard share** | Add "Share Standings" button to the leaderboard page. Generates an image card showing top 5 teams and their points. Includes the user's position if not in top 5. Share via native Web Share API (mobile) or copy-to-clipboard (desktop). |
| 21.3 | **Bracket share** | Add "Share Bracket" button to the playoff bracket page. Generates an image of the bracket with user's teams highlighted. Particularly valuable during CFP for social engagement. |
| 21.4 | **Weekly recap share** | After each week's scores are finalized, generate a "Week X Recap" card for each league: top scorer, biggest mover, closest matchup. Users can share their team's weekly performance. |
| 21.5 | **League invite share** | Improve the existing invite flow with a shareable card: "Join my Rivyls league: [League Name]". Include league details (sport, team count, draft date). Make the invite link the primary CTA. |
| 21.6 | **Commissioner referral share** | Commissioners get a branded share card: "I'm running a Rivyls league — [League Name]. Join with code [CODE]." Optimized for WhatsApp, iMessage, and Twitter/X where most fantasy league recruitment happens. |
| 21.7 | **Add Web Share API integration** | Create a reusable `ShareButton` component that uses the Web Share API on supported devices (mobile Safari, Android Chrome) and falls back to a copy-to-clipboard modal on desktop. Include share options: Twitter/X, WhatsApp, copy link. |

### Verification

- [ ] Share cards generate correctly with brand colors and logo
- [ ] Web Share API works on mobile Safari and Android Chrome
- [ ] Desktop fallback (copy to clipboard) works
- [ ] Share links include correct UTM parameters for tracking
- [ ] Leaderboard, bracket, and invite shares produce clean images

---

## Phase 22: Multi-Sport Architecture
*Refactor the architecture so college football patterns don't block other sports*

**Status: NOT STARTED**

### Background

College football is sport #1. Future sports include hockey, baseball, basketball, and cricket. Some features are inherently sport-specific (Heisman is only for CFB, Stanley Cup is only for hockey), and that's expected. However, several core architectural patterns are currently hardcoded for football and would **break or require major rewrites** when porting to another sport.

### Analysis: What's Shared vs. Sport-Specific

| Concept | Shared (must generalize) | Sport-Specific (OK to keep) |
|---------|-------------------------|---------------------------|
| Season structure | Season start/end dates, week numbering | Specific week counts (CFB: 22 weeks, NHL: 26 weeks) |
| Game model | Home/away, scores, status, date | Bowl games, overtime format |
| Rankings | Concept of ranked opponents | AP Top 25 (CFB), power rankings (NHL/NBA) |
| Scoring rules | Points for wins, bonuses | Specific bonus types per sport |
| Playoffs | Playoff tracking, bracket display | Number of teams, format (single elim vs best-of-7) |
| Special events | Event-based bonuses | Conference championships (CFB), award winners |
| Individual awards | Award tracking system | Heisman (CFB), Hart Trophy (NHL), MVP (NBA/MLB) |
| Team model | Schools/teams, conferences, logos | "Schools" naming (college only) |

### Tasks — Generalize Shared Patterns

| Task | Description | Details |
|------|-------------|---------|
| 22.1 | **Abstract week/season structure** | Move season config (start date, max weeks, playoff start week, week labels) into the `seasons` table or a new `season_config` JSONB column. Replace all hardcoded week numbers with lookups from this config. The `getCurrentWeek()` function should accept sport/season and calculate based on DB config, not hardcoded August 24. |
| 22.2 | **Generalize ranking system** | Rename `ap_rankings_history` to `rankings_history`. Add `ranking_type` column (e.g., 'ap_poll', 'power_ranking', 'standings'). The scoring engine should look up the ranking type for the sport, not assume AP Top 25. Not all sports use rankings for bonus points — make ranking-based scoring optional per sport. |
| 22.3 | **Generalize game types** | Currently `games` has `is_bowl_game`, `is_playoff_game`, `bowl_name`, `playoff_round` — all football-specific. Replace with: `game_type` ENUM ('regular_season', 'conference_championship', 'postseason', 'playoff', 'championship', 'exhibition'). Add `game_type_detail` TEXT for sport-specific detail (e.g., bowl name for CFB, "Stanley Cup Finals" for NHL). Move `is_conference_game` logic to derive from the game data rather than storing as a separate boolean. |
| 22.4 | **Abstract scoring rules schema** | The `league_settings` table has 20+ football-specific point columns. Replace with a `scoring_rules` JSONB column or a normalized `scoring_rules` table: `{ rule_type: 'win', points: 1 }, { rule_type: 'conference_game', points: 1 }, { rule_type: 'ranked_opponent_top10', points: 2 }`. Each sport defines its available rule types. The scoring engine reads rules dynamically instead of accessing fixed columns. |
| 22.5 | **Generalize individual awards** | Rename `heisman_winners` to `individual_awards`. Add `award_type` column ('heisman', 'hart_trophy', 'mvp', etc.) and `sport_id`. The scoring engine checks for awards associated with schools on rosters, regardless of which specific award it is. |
| 22.6 | **Rename "schools" to "teams" (or keep with alias)** | College sports use "schools," pro sports use "teams." Options: (a) rename table to `teams` (breaking change), (b) keep `schools` for college sports and add `teams` for pro, (c) keep `schools` table name but use "teams" in the UI with a display alias per sport. Recommend option (c) for now — least disruptive. |
| 22.7 | **Create sport configuration table** | Create `sport_configs` table with: `sport_id`, `season_week_count`, `playoff_format` ('single_elimination', 'best_of_7', etc.), `ranking_type`, `available_scoring_rules` (JSONB), `api_provider`, `api_base_url`. This is the single source of truth for how each sport works. |
| 22.8 | **Create sport-specific API adapters** | Currently `src/lib/api/espn.ts` is football-specific. Create an adapter pattern: `src/lib/api/adapters/espn-cfb.ts`, `src/lib/api/adapters/nhl.ts`, etc. Each adapter implements a common interface: `fetchTeams()`, `fetchGames(week)`, `fetchRankings()`, `fetchScores()`. The sync routes call the adapter for the given sport. |
| 22.9 | **Abstract scoring engine** | Refactor `src/lib/points/calculator.ts` to be sport-agnostic. The engine reads scoring rules from the sport config and league settings, then applies them generically. Sport-specific logic (e.g., "bowl games don't get ranked bonus") lives in sport-specific rule files, not in the main calculator. |

### What NOT to Change

These are intentionally sport-specific and don't need generalization:
- **Heisman scraping logic** — only relevant for CFB; other sports will have their own award detection
- **CFP bracket component** — other sports will have different bracket formats; build new components per sport
- **Conference abbreviation mapping** — sport-specific display data
- **ESPN API endpoints** — each sport has different endpoints; handled by the adapter pattern (22.8)

### Migration Path

This phase is the largest refactor. Recommended approach:
1. Start with **additive changes** (new tables, new columns) — don't remove old schema yet
2. Update the scoring engine to read from new config, with **fallback to old columns**
3. Migrate CFB data to new format
4. Once verified, remove old columns in a cleanup migration
5. Build sport #2 (hockey?) using only the new patterns

---

## Phase 23: Free Feature Enhancements
*Post-launch free features that enhance the experience but aren't required for the core loop*

**Status: NOT STARTED — DEFERRED**

**Depends on**: Phase 16 (brand styling), Phase 14 (schema for watchlists, scoring_preset, notification_preferences)

### Background

These are features we've designated as free (never gated behind premium) but that are NOT needed for the core platform loop of create league → draft → play season → see who wins. All of these are "nice to have" enhancements that improve the user experience. Build them post-launch as time allows, in any order.

### Tasks

| Task | Description | Details | Schema Ready? |
|------|-------------|---------|---------------|
| 23.1 | **Scoring presets UI** | Add a preset dropdown to the league settings page ("Standard", "High Stakes", "Simple", "Chaos Mode"). When selected, auto-fills the existing scoring columns with predefined values. Commissioner can still tweak individual values after selecting a preset. This is a UX convenience for new commissioners — reduces the intimidation of 20+ scoring sliders. | Yes — `scoring_preset` column added in Phase 14.16 |
| 23.2 | **Watchlist UI** | Add a "Watch" button to school cards in the available schools browser and draft board. Create a `/watchlist` page (or section on team page) showing all watched programs with their upcoming games and recent performance. Helps users track programs they want to draft or pick up via add/drop. | Yes — `watchlists` table created in Phase 14.14 |
| 23.3 | **League announcements** | Add a commissioner announcement feature: text post that appears at the top of the league home page for all members. Simple CRUD — commissioner creates/edits/deletes announcements. Could be a new `league_announcements` table or a JSONB column on `leagues`. | No — needs schema (simple table: `id`, `league_id`, `author_id`, `content`, `pinned`, `created_at`) |
| 23.4 | **Draft chat** | Add a real-time chat panel to the draft room using Supabase Realtime. Messages appear alongside the draft board. Simple text messages only (no images/files). Could use a `draft_messages` table or Supabase Realtime broadcast channels. | No — needs schema (table: `id`, `draft_id`, `user_id`, `message`, `created_at`) |
| 23.5 | **Basic notifications** | Build notification delivery for key events: draft starting, your turn to pick, game results posted, transaction confirmed. Start with in-app notifications (a bell icon with unread count). Email notifications come later (Phase 24). Uses `notification_preferences` from Phase 14.12. | Partial — preferences schema ready, needs `notifications` table |
| 23.6 | **League history / trophy room** | Display past season results: league champion, final standings, individual awards (most points in a week, biggest comeback, etc.). For Year 1 this is empty — becomes valuable starting Season 2 when there's history to show. | No — needs `league_seasons` archive table |

### Priority Within This Phase

If building post-launch, suggested order:
1. **23.1 Scoring presets** — small effort, big UX win for new commissioners
2. **23.2 Watchlists** — schema ready, moderate effort, adds engagement
3. **23.5 Basic notifications** — users will ask for this first
4. **23.3 League announcements** — commissioner tool, moderate effort
5. **23.4 Draft chat** — fun but lowest priority (users already use group chats)
6. **23.6 League history** — only valuable after Season 1 ends

---

## Future Phases

| Phase | Features | Notes |
|-------|----------|-------|
| **Phase 24** | Auto-pick for draft, draft pause/resume | Enhancement to draft system |
| **Phase 25** | Email/push notifications | Game updates, draft reminders, transaction confirmations. Uses `notification_preferences` schema from Phase 14.12. Extends Phase 23.5 in-app notifications with email delivery. |
| **Phase 26** | Historical season caching | Archive past seasons, returning user experience. Extends Phase 23.6 with full multi-season data. |
| **Phase 27** | Multi-sport launch (Hockey) | First sport after CFB using Phase 22 architecture |
| **Phase 28** | Team-to-team trading | Mid-season roster trades between users. Uses `trades` schema from Phase 14.13. |
| **Phase 29** | Premium features launch (Year 2) | Activate feature flags, build premium UI, implement: pre-draft intelligence, live analytics, transaction intelligence, custom scoring templates, what-if simulator, power rankings, custom league themes, early draft access. Stripe integration for Pro subscriptions. |
| **Phase 30** | Payment integration (Stripe) | Entry fees, prize payouts, charity pooling, Pro subscription billing |
| **Phase 31** | Native mobile / PWA | Mobile-optimized experience |

---

## Appendix: Complete File Reference

### Files with Known Issues

| File | Issues | Fix Phase |
|------|--------|-----------|
| `src/lib/points/calculator.ts` | C1 (settings ignored), T1 (duplicated) | 12, 15 |
| `src/components/RosterList.tsx` | C2 (scoring mismatch), T1, T5, T7, T8, T9 | 12, 15 |
| `src/lib/week.ts` | C3 (timezone bug), T6 (hardcoded date) | 12, 15 |
| `vercel.json` | A1 (missing crons) | 12 |
| `src/types/database.ts` | D1 (out of sync) | 14 |
| `src/components/LeaderboardClient.tsx` | T2, T5, T9 | 15 |
| `src/components/EmbeddedLeaderboard.tsx` | ~~T2, T5, T9~~ DELETED (merged into LeaderboardClient) | 15 |
| `src/components/TransactionsClient.tsx` | T1, T8 | 15 |
| `src/app/api/transactions/route.ts` | S1 (no auth) | 13 |
| `src/app/api/leagues/[id]/standings/route.ts` | S1 (no auth) | 13 |
| `src/app/api/leagues/[id]/stats/route.ts` | S1 (no auth) | 13 |
| `src/app/api/sync/*/route.ts` | S2 (hardcoded key) | 13 |
| `src/app/api/cron/*/route.ts` | S3 (cron secret logic) | 13 |
| `src/components/PlayoffBracket.tsx` | Missing 1-4 seed bye display | 15 |
| League settings page | Back button goes to dashboard, not previous screen | 15 |

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.4 |
| UI | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Database | Supabase (PostgreSQL) | ^2.91.1 |
| Auth | Supabase Auth | via @supabase/ssr ^0.8.0 |
| External Data | ESPN API | Public endpoints |
| Hosting | Vercel | — |
| Domain | rivyls.com | — |

---

*Last Updated: February 26, 2026*
