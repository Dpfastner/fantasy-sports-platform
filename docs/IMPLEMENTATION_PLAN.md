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

**Status: NOT STARTED**

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

**Status: NOT STARTED**

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

**Status: NOT STARTED**

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

**Status: NOT STARTED**

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

**Status: NOT STARTED**

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

**Status: NOT STARTED**

---

## Future Phases (Post-Launch)

| Phase | Features |
|-------|----------|
| **Phase 9** | Auto-pick for draft, draft pause/resume |
| **Phase 10** | Double points pick (weekly gamble feature) |
| **Phase 11** | Email/push notifications |
| **Phase 12** | Historical season caching, returning user experience |
| **Phase 13** | Multi-sport expansion (hockey, baseball, etc.) |
| **Phase 14** | Playoff bracket visualization |
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
Phase 3 (ESPN Data)      ████████████  ← NEXT
        ↓
Phase 4 (Points)         ████████████
        ↓
Phase 5 (Dashboard)      ████████████
        ↓
Phase 6 (Leaderboard)    ████████████
        ↓
Phase 7 (Transactions)   ████████████
        ↓
Phase 8 (Polish)         ████████████  ← LAUNCH
```
