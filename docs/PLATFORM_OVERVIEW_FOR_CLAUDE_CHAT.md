# Rivyls Platform Overview — March 2026

> This document provides a complete snapshot of the Rivyls fantasy sports platform for business planning, marketing, legal, and strategic discussions. Last updated: March 10, 2026.

---

## 1. What Is Rivyls?

Rivyls is a **fantasy college football platform** where users draft real schools (not individual players) and earn points based on actual game results throughout the season. Users create or join leagues, participate in real-time drafts, manage rosters via add/drops and trades, and compete for weekly high-points prizes and season championships.

- **Live at**: rivyls.com
- **Status**: Production-ready, Phases 0-31 complete
- **Target launch**: August 2026 (start of college football season)

---

## 2. How It Works

### League Lifecycle
1. **Commissioner creates a league** — sets rules, scoring, team limits, prizes
2. **Members join via invite code** — each creates a fantasy team
3. **Draft** — snake or linear draft of 134 FBS schools (real-time, with chat)
4. **Season play** — points accumulate weekly from real game results (ESPN data)
5. **Mid-season management** — add/drops, trades, double-points picks, weekly high-points prizes
6. **Playoffs & Championship** — CFP bracket visualization, escalating point multipliers
7. **Season archive** — final standings recorded, league goes dormant
8. **Reactivation** — commissioner starts a new season with the same members

### Scoring System
Points are earned per game when a drafted school:
| Event | Points |
|-------|--------|
| Win | +1 |
| Conference game | +1 |
| Score 50+ points | +1 |
| Shutout opponent | +1 |
| Beat a Top 10 team | +2 |
| Beat a #11-25 team | +1 |

Additional multipliers apply for bowl games, CFP rounds, and conference championships. Commissioners can customize all scoring values.

### Key Features
- **Real-time draft room** with chat, auto-pick, pause/resume
- **Live game scores** updated every minute during gamedays (ESPN API)
- **Add/drop transactions** with configurable season limits
- **Team-to-team trading** with proposal/accept/reject/veto flow
- **Double Points** — pick one school per week for 2x scoring
- **Weekly High Points** — cash prize for top weekly scorer
- **League announcements** and **league chat** with emoji reactions
- **Playoff bracket** visualization (12-team CFP format)
- **Notification system** — in-app notifications for drafts, trades, game results
- **Shareable OG images** — auto-generated leaderboard/recap cards for social media
- **4 color palettes** — users can switch visual themes
- **Favorite teams & banners** — fan engagement / profile customization
- **Season history** — archived standings and champion records across years
- **Dormant/reactivate flow** — leagues persist across seasons (Phase 31)

---

## 3. User Roles & Tiers

### League Roles
- **Commissioner**: Full control (scoring rules, draft settings, member management, announcements, veto trades)
- **Co-Commissioner**: Same powers as commissioner (delegated)
- **Member**: Standard league participant

### User Tiers
- **Founding Commissioner**: Early adopters who create leagues before public launch — permanently badged, future premium perks
- **Standard**: Regular users
- **Admin**: Platform administrators (internal)

### Badge System
Users earn achievement badges displayed on their profile (e.g., "Founding Commissioner", "League Champion", custom badges from admin).

---

## 4. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes (45+ endpoints) |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel (rivyls.com, auto-deploy from main branch) |
| Data Source | ESPN API (scores, rankings, schedules) |
| Monitoring | Sentry (error tracking), Vercel Analytics (performance) |
| CI/CD | GitHub Actions (lint, type-check, 149 tests on every push) |
| Cron Jobs | Vercel cron (daily sync) + GitHub Actions (per-minute gameday sync, nightly reconciliation) |

---

## 5. Database & Data Model

**40 PostgreSQL tables** across these domains:

### Users & Leagues
- `profiles` — user accounts (display name, email, tier, badges)
- `leagues` — fantasy leagues with status (active/dormant), invite codes, sport/season links
- `league_members` — membership with roles (commissioner/co-commissioner/member)
- `league_settings` — 40+ columns of configurable scoring, draft, transaction, and prize rules

### Draft & Teams
- `drafts` — draft instances (status, current pick, timer)
- `draft_order` / `draft_picks` — draft sequencing and selections
- `fantasy_teams` — user teams (name, colors, logo, points, soft-delete support)
- `roster_periods` — school ownership by week (tracks full add/drop history)
- `transactions` — add/drop transaction log

### Scoring & Data
- `schools` — 134 FBS college football teams
- `games` — game schedule + live results (from ESPN)
- `seasons` — season records (year, start/end dates)
- `fantasy_team_weekly_points` — calculated points per team per week
- `school_weekly_points` — per-game point breakdown
- `weekly_double_picks` — double-points selections
- `ap_rankings_history` — weekly AP Top 25

### Engagement
- `league_announcements` — commissioner posts
- `league_messages` / `draft_messages` — chat with emoji reactions
- `notifications` — in-app notification system
- `activity_log` — event logging for league activity feeds
- `user_sport_favorites` — favorite school banners

### Season History (Phase 31)
- `league_seasons` — archived final standings, champion records, season_id links
- Season-scoped data via `season_id` FK on points, double picks, roster periods, transactions

### Compliance
- `tos_agreements` — ToS acceptance tracking
- `issue_reports` — user-reported bugs
- `waitlist` — early access signups

---

## 6. Season Calendar

The college football season maps to **23 scoring weeks** (0-22):

| Weeks | Period |
|-------|--------|
| 0-14 | Regular season (conference play) |
| 15 | Conference championships |
| 16 | Army-Navy game |
| 17 | Bowl games (non-CFP) |
| 18-20 | College Football Playoff rounds |
| 21 | National Championship |
| 22 | Heisman Trophy announcement |

Auto-archive triggers 3 days after the National Championship completes. Leagues go dormant automatically.

---

## 7. Development Phases Completed (0-31)

### Foundation & Core (Phases 0-10)
Supabase + Next.js setup, league management, real-time drafts, ESPN integration, points calculator, dashboard, leaderboard, transactions, double points, playoff bracket.

### Security & Infrastructure (Phases 11-15)
Rebrand to Rivyls, critical bug fixes, API security hardening, database integrity fixes, tech debt resolution.

### Brand & Features (Phases 16-21)
Palette system, landing page + waitlist, testing (149 tests) + Sentry + rate limiting, analytics, user profiles + tiers, social sharing with OG images.

### Compliance & Schema (Phases 22-24)
113 UX friction points fixed, Terms of Service, Privacy Policy, CCPA compliance, age gate, account deletion, schema additions.

### Season 1 Features (Phases 25-27)
Scoring presets, watchlist, announcements, league chat, notification system, league history, draft enhancements (auto-pick, pause/resume), team-to-team trading.

### Polish (Phases 28-31)
UX audit (113 friction points), invite flow fix, account deletion safety, mobile responsiveness (375px/390px/768px), favorite teams & banner collection, **historical season caching** (dormant/reactivate league lifecycle, season-scoped data, nudge commissioner, pre-season reminders).

---

## 8. Security & Compliance

### Authentication & Authorization
- Supabase Auth with JWT tokens and secure HTTP-only cookies
- Row-Level Security (RLS) on all tables — data isolated per league membership
- Role-based access: commissioner/co-commissioner/member per league

### Input Validation & Rate Limiting
- Zod schema validation on all write endpoints
- Rate limiting on sensitive routes (join: 10/min, transactions: 10/min, reports: 5/min, draft reset: 3/min)
- CRON_SECRET and SYNC_API_KEY protect cron and sync endpoints

### Legal Compliance
- **Terms of Service** — comprehensive, age requirement (18+)
- **Privacy Policy** — GDPR/CCPA compliant, third-party disclosures
- **CCPA** — "Do Not Sell My Personal Information" page
- **Age Gate** — implemented on signup flow
- **Account Deletion** — soft-deletes teams, preserves league history integrity
- **ToS Acceptance Tracking** — stored in database with timestamps

---

## 9. Monetization (Planned — Not Yet Implemented)

### Current State
The platform is **100% free**. No payment processing is integrated.

### Planned Revenue Streams (Future Phases)
1. **Premium tier** — advanced analytics, priority support, exclusive features
2. **Stripe integration** — subscription billing for premium
3. **Commissioner prize pool facilitation** — optional platform-managed prize payouts
4. **Multi-sport expansion** — new sports = new user segments

### Founding Commissioner Program
Early league creators get permanent "Founding Commissioner" badge and will receive premium perks when the paid tier launches. This creates urgency for early adoption.

---

## 10. Growth & Marketing Assets

### Built-In Viral Mechanics
- **Invite codes** — every league needs members, commissioners share codes
- **Shareable OG images** — auto-generated leaderboard and weekly recap cards for social media
- **Referral links** — each user has a unique referral URL (tracked in profiles)
- **Share buttons** — native sharing on standings, recaps, invites

### Landing Page
- Hero: "Your League. Your Rivals. Your Season."
- Feature highlights, founding commissioner CTA, waitlist capture
- SEO-optimized with structured schema markup

### Platform Analytics
- Vercel Analytics for page performance
- Activity logging for user engagement metrics
- Program analytics (pre-computed school performance data)

---

## 11. Upcoming Phases (Post-31)

| Phase | Feature | Notes |
|-------|---------|-------|
| 32 | Multi-Sport Architecture | Abstract scoring by sport, add basketball/hockey/etc. |
| 33 | Email Notifications | Transactional emails for drafts, trades, season events |
| 34 | Push Notifications | Browser/mobile push for real-time alerts |
| 35 | Premium Tier | Paid features, advanced analytics |
| 36 | Stripe Integration | Subscription billing, prize pool management |
| 37 | Mobile App | iOS/Android native app |

---

## 12. Key Metrics (Platform Capacity)

| Metric | Value |
|--------|-------|
| FBS Schools | 134 |
| Database Tables | 40 |
| API Endpoints | 45+ |
| React Components | 50+ |
| Automated Tests | 149 |
| SQL Migrations | 45 |
| Cron Jobs | 3 (daily sync, gameday sync, reconciliation) |
| Color Palettes | 4 |
| Scoring Weeks | 23 (weeks 0-22) |

---

## 13. Operational Architecture

### Daily Operations (Automated)
- **10 AM UTC**: Daily sync — rankings update, game schedule refresh, auto-archive check, pre-season reminders
- **8 AM UTC**: Nightly reconciliation — verify point totals, fix discrepancies
- **Gameday**: Per-minute live score polling via ESPN API (GitHub Actions)

### Season Lifecycle (Automated)
1. Season starts (August) — leagues active, drafts begin
2. Regular season (Sept-Nov) — weekly scoring, add/drops, trades
3. Playoffs (Dec-Jan) — escalating multipliers, bracket visualization
4. Championship + 3 days — auto-archive triggers, leagues go dormant
5. Pre-season (30 days before next season) — commissioner reminders sent
6. Commissioner reactivates — new teams created, fresh draft

### Error Handling
- Sentry captures all server/client/edge errors with cron job tagging
- Error boundaries prevent full-page crashes
- Graceful degradation on API failures

---

## Summary

Rivyls is a production-ready fantasy college football platform with a complete feature set for the 2026 season. The technical foundation supports multi-sport expansion, premium monetization, and mobile apps. The platform emphasizes commissioner empowerment, social engagement (chat, reactions, sharing), and automated season management. All 31 development phases are complete and deployed to rivyls.com.
