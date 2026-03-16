# Rivyls — Business Strategy Update for Development Planning

> **Date:** March 15, 2026
> **From:** Claude Chat (Business/Strategy instance)
> **To:** Claude Code (Development instance)
> **Purpose:** This document explains recent business decisions, strategic shifts, and new priorities that should inform what gets built next and how the platform evolves.

---

## Core Identity (Guide All Decisions With This)

**What Rivyls Is:** Fantasy sports for college football fans — instead of drafting individual players, you draft the schools you already care about, so you never have to root against your own team.

**Brand Palette — Royal Gambit (default):**
- Deep Purple (primary): `#2A1A3E`
- Amber (accent): `#F59E0B`
- Off-White (background): `#FAF5EE`
- Soft Lavender (secondary surface): `#E8E0F0`
- Dark Plum (dark mode / headers): `#1A0F2E`

**9 Insights That Guide Every Decision:**
1. Divided loyalty is the unlock — the core mechanic, not a feature
2. The commissioner is the actual customer — win them, win the league
3. Social connection IS the product — scoring enables it
4. Trust is the widest open lane — every point traceable, always transparent
5. College football space is unoccupied by anyone who cares
6. Simplicity expands the market — can a first-timer use it without reading anything?
7. Off-season is existential — multi-sport solves it
8. Word of mouth before season ends is the only Year 1 metric
9. Multi-season history is the moat — build for it from Day 1

---

## What Happened

The business side completed a full evaluation of the platform against the original business plan, marketing strategy, financial projections, and competitive landscape. Several significant strategic shifts came out of that analysis. This document captures those shifts so development priorities can be adjusted accordingly.

**Status as of March 15, 2026:** Phases 0-42, Platform Audit, 43A (multi-sport abstraction), and 43C (platform simplification) are all complete and deployed. Most items from this document have been addressed. Remaining: accessibility audit, load testing, email notifications (blocked on DNS transfer Apr 21).

---

## 1. DONE: Age Gate Changed from 13+ to 18+

**Status: DONE** (Phase 32)

The platform age gate has been updated from 13+ to 18+ across signup flow, Terms of Service, and Privacy Policy.

---

## 2. Revised Premium Tier Strategy — DO NOT Gate Existing Features

**This is the biggest strategic shift.**

### The Problem
The original plan put features like trading, watchlists, league chat, custom scoring, season history, and advanced draft options behind a Pro paywall. But all of these were built into the free tier during Phases 25-31. More importantly, **every competitor offers these features for free.** Gating them would drive users away, not generate revenue.

### The New Strategy
Pro tier ($4.99/mo or $29.99/yr) should be built around two pillars:

**Pillar 1: Intelligence That Helps You Win**
These are data-heavy features that provide a genuine competitive edge. No other platform offers program-level analytics because no other platform drafts programs.

- **AI Draft Assistant** — program power rankings, strength of schedule analysis, recruiting pipeline data, coaching staff analysis, composite "draft value" score. Uses data from `program_analytics` and `program_trends` tables (exist but are empty).
- **Live Game Insights** — real-time push/in-app notifications during gameday like "Georgia just took the lead — your team is now projected to win weekly high points" or "Based on current scores, you need 3 more points to overtake the league leader."
- **Season Projections** — weekly updated probability model: "Your team has a 34% chance of finishing in the top 3 based on remaining schedule." Updates every week as results come in.
- **Transaction Intelligence** — smart add/drop recommendations based on remaining schedule difficulty, recent performance trends, and which programs are undervalued in the current meta. "Drop Baylor (6 remaining games, 3 against Top 25) → Add TCU (6 remaining games, 0 against Top 25, favorable conference schedule)."
- **Waiver Wire Rankings** — ranked list of available (undrafted) programs with composite scores showing who's trending up.

**Pillar 2: Premium Formats (New Ways to Play)**
These create entirely new game modes that justify a subscription because they're additional experiences, not locked-away versions of the free experience.

- **Head-to-Head Weekly Matchups** — instead of season-long cumulative points, Pro leagues can enable weekly matchups where users are paired against each other each week (like traditional fantasy football). Win/loss records determine standings. This is a fundamentally different competitive format.
- **Conference-Specific Leagues** — draft only SEC schools, or only Big Ten, or only Big 12. Tighter draft pools create more strategic, more competitive leagues. Available only in Pro leagues.

**Pillar 3: Experience**
- **Ad-free experience** — add non-intrusive ads to the free tier (footer banner, interstitial between page loads). Pro users see no ads. This gives a clear, tangible reason to upgrade without locking functionality.

### What This Means for Development
- Do NOT build any feature-gating on existing features (trading, chat, watchlist, custom scoring, etc.)
- The `feature_flags` and `user_feature_flags` tables are still the right infrastructure
- Pro features should be **additive** (new pages, new data, new modes) not **restrictive** (hiding existing functionality)
- The `program_analytics` and `program_trends` tables need to be populated with real data — this is a data engineering task, not a UI task
- Head-to-Head matchup mode requires a new scoring/standings calculation path alongside the existing cumulative system

---

## 3. DONE: ESPN API Resilience

**Status: Items 1-2 DONE** (Platform Audit + Phase 32). Item 3 remains for future consideration.

1. ~~**API Response Monitoring**~~ — DONE. Sentry error tracking added to all 21 sync routes. Rate limiting on 17 routes.
2. ~~**Admin-Only Manual Score Override**~~ — DONE. Admin dashboard has manual score entry with automatic league point recalculation.
3. **Backup Data Source Research** — Not yet started. Investigate SportsDataIO, The Odds API, or CBS Sports API as fallback providers when time permits.

---

## 4. DONE: FAQ / Help Center

**Status: DONE** (Phase 32)

Built at `/help` with 40+ FAQs organized in 7 categories (Getting Started, Leagues, Drafts, Scoring, Roster Management, Trading, Events & Prediction Games). Linked from footer and settings. Searchable accordion layout.

**Future enhancement:** Layer a Claude-powered AI chatbot on top of this FAQ content (Phase 41b — deferred until Anthropic API key is set up).

---

## 5. Accessibility Audit

The 4 color palettes are currently for testing — final brand colors will be chosen based on user feedback. But before launch, verify:

- All 4 palettes pass WCAG AA contrast ratios for text on backgrounds
- Interactive elements are keyboard-navigable (tab, enter, escape)
- Screen readers can parse the draft room, leaderboard, and league pages
- Color is not the only indicator for important states (use icons + color, not color alone)

This doesn't need to be perfect for launch, but a basic pass prevents accessibility complaints and potential ADA exposure.

---

## 6. Infrastructure Preparedness

### Load Testing
The platform hasn't been tested under realistic load. Before August:
- Simulate 100+ simultaneous users in a draft room
- Simulate 50+ leagues checking scores during a Saturday (multiple API calls per second)
- Verify Supabase free tier handles concurrent connections
- Verify Vercel free tier handles request volume
- Identify which tier upgrades are needed and when

### Supabase Storage
Calculate expected data growth for 1,000 users over a 23-week season:
- Roster periods, game results, weekly points, chat messages, notifications, activity logs
- The free tier is 500MB. Know when you'll exceed it so the upgrade to Pro ($25/mo) isn't an emergency mid-season

---

## 7. DONE: Multi-Sport Architecture

**Status: Foundation DONE** (Phase 43A). Full season engine is Phase 36d (Summer 2026).

The multi-sport abstraction layer is built:
- **Sport Scoring Registry** (`src/lib/scoring/sport-scoring-registry.ts`) — `SportScoringConfig` interface with fields + presets per sport. CFB registered with 21 fields and 4 presets.
- **Sport Season Config** (`src/lib/constants/sport-seasons.ts`) — `SportSeasonConfig` interface with week definitions, labels, types per sport. CFB registered with week 0-22.
- **SportCalculator interface** + calculator router (`src/lib/points/index.ts`) — dispatches to correct sport calculator by slug.
- **JSONB scoring** — `scoring_values JSONB` column on `league_settings` for sport-agnostic storage (migration 055).
- **Event system** — bracket, pick'em, survivor engines already handle Hockey, Golf, Rugby events.

Adding a new sport is now a configuration task (register in scoring + season registries, implement SportCalculator).

---

## 8. Ads Infrastructure (Pre-Revenue, Year 2)

The revised financial model includes modest ad revenue as a third revenue stream. Non-intrusive ads on the free tier, removed for Pro users.

**When ready to implement (Year 2):**
- Footer banner ads on league pages, leaderboard, dashboard
- Interstitial between page navigations (not on draft or live scoring — those are sacred)
- Pro users see no ads (clean experience is part of the value proposition)
- Track ad impressions for revenue reporting

**Don't build this yet.** Just be aware that the page layout should have space for a footer ad component that can be toggled via user tier.

---

## 9. Revised Development Priority Order

Based on the business evaluation and current platform state (Phases 0-42, Platform Audit, 43A, 43C complete):

### Done (Pre-Launch)
- ~~Age gate update (13+ → 18+)~~ — DONE
- ~~FAQ / Help Center page~~ — DONE (40+ FAQs, 7 categories)
- ~~ESPN API monitoring~~ — DONE (Sentry on all sync routes)
- ~~Manual score override~~ — DONE (admin dashboard)
- ~~Push notifications~~ — DONE (Phase 34, browser push with VAPID)
- ~~Multi-sport abstraction~~ — DONE (Phase 43A)
- ~~Platform simplification~~ — DONE (Phase 43C, progressive disclosure)

### Remaining Before Launch (March–July 2026)
1. Accessibility quick audit — 1 day
2. Load testing — 1-2 days
3. Supabase storage estimation — 1 hour

### Phase 33: Email Notifications (After April 21 DNS transfer)
- Transactional emails via Resend: password reset, draft reminders, trade proposals, weekly recaps
- Unsubscribe links on all non-transactional emails (CAN-SPAM)

### Phase 43D: Social Features
- @Mentions in chat, weekly recap cards, trash talk prompts, GIF support

### Phase 43E: PWA & Mobile App
- PWA manifest + service worker (installable web app), then Capacitor wrapper

### Phase 36d: Multi-Sport Season Engine (Summer 2026)
- Full season leagues for Men's/Women's CBB, NCAA Hockey, College Baseball, Women's Volleyball

### Phase 35: Pro Tier (Year 2)
- AI Draft Assistant, Season Projections, Transaction Intelligence, Live Game Insights
- Head-to-Head Weekly Matchup mode, Conference-Specific League format
- Ad infrastructure + Stripe integration

---

## 10. Key Business Context for Development Decisions

### Revenue Model (Path A — Bootstrap)
- **Year 1:** $0 revenue. 100 leagues, 1,000 users. Prove product-market fit.
- **Year 2:** Pro subscriptions ($4.99/mo) + modest ad revenue. Target: $5K-15K revenue.
- **Year 3:** Paid-entry contests (requires $150K-500K investment for gaming compliance). Target: $250K-2.5M.
- **Year 1-2 are bootstrapped.** No external funding needed. Current burn: ~$155/mo.

### Founding Commissioner Program
Already implemented. Commissioners who create leagues in Year 1 get lifetime Pro access when it launches. This is the primary incentive for early commissioner adoption. Protect this — don't change the tier system or badge behavior.

### NAICS Classification
Currently 713990 (recreation/entertainment). Platform does not handle money between users. Any future features involving entry fees, prize pools, or payment processing between users would require reclassification to 713290 (gambling), which triggers $150K-500K in state licensing costs. This is a Year 3 decision, not a current constraint. Do not build payment/prize pool features without explicit instruction.

### Competitive Position
Rivyls is the **only** platform that drafts programs instead of individual players. This is the core differentiator. Every feature should reinforce this: program-level analytics, school-based scoring, conference-based competition formats. Never drift toward individual player features — that's where every competitor already exists.

---

## Summary of Remaining Actions

| # | Task | Effort | Priority |
|---|------|--------|----------|
| ~~1~~ | ~~Age gate 13+ → 18+~~ | ~~DONE~~ | ~~DONE~~ |
| ~~2~~ | ~~FAQ / Help Center~~ | ~~DONE~~ | ~~DONE~~ |
| ~~3~~ | ~~ESPN API monitoring~~ | ~~DONE~~ | ~~DONE~~ |
| ~~4~~ | ~~Manual score override~~ | ~~DONE~~ | ~~DONE~~ |
| 5 | Accessibility audit (color palettes, keyboard nav) | 1 day | MEDIUM |
| 6 | Load testing (drafts, gameday scoring) | 1-2 days | MEDIUM |
| 7 | Supabase storage growth estimation | 1 hour | LOW |

Phase 33 (email notifications) is next once DNS transfers on April 21, 2026.
