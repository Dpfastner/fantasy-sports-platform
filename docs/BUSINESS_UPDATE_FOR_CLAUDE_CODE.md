# Rivyls — Business Strategy Update for Development Planning

> **Date:** March 11, 2026
> **From:** Claude Chat (Business/Strategy instance)
> **To:** Claude Code (Development instance)
> **Purpose:** This document explains recent business decisions, strategic shifts, and new priorities that should inform what gets built next and how the platform evolves.

---

## What Happened

The business side has completed a full evaluation of the platform (Phases 0-31) against the original business plan, marketing strategy, financial projections, and competitive landscape. Several significant strategic shifts came out of that analysis. This document captures those shifts so development priorities can be adjusted accordingly.

---

## 1. CRITICAL: Age Gate Must Change from 13+ to 18+

**Priority: IMMEDIATE — before any public marketing begins**

The platform currently enforces a 13+ age requirement. Every business document, legal analysis, and competitor comparison specifies 18+. Every relevant competitor (Sleeper, PrizePicks, DraftKings, Underdog) requires 18+. The fantasy sports industry standard is 18+ because:

- Users discuss and manage off-platform financial arrangements (entry fees, prizes)
- Future paid-entry contests will require 18+ in every state
- The NAICS 713990 classification is safer with 18+
- Investors and attorneys will flag this immediately

**What to change:**
- Signup flow age gate: require 18+
- Terms of Service: update all age references from 13 to 18
- Privacy Policy: update "children's privacy" section to reflect 18+ (not 13+)
- Any validation logic that checks age

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

## 3. ESPN API Is a Single Point of Failure — Build Resilience

The entire scoring system depends on ESPN's undocumented public API endpoints. ESPN could change, rate-limit, or shut down these endpoints at any time without notice. If this happens during a Saturday with 100+ leagues watching live scores, the platform goes dark.

**Build these (in priority order):**

1. **API Response Monitoring** — automated alerting when ESPN responses change format, return errors, or stop returning data. Log response structure hashes and alert when they change. This gives early warning before users notice.

2. **Admin-Only Manual Score Override** — if ESPN goes down, the platform admin (D) can manually enter final game scores from the admin dashboard. The override should:
   - Be accessible ONLY from the existing admin dashboard (not commissioner panels)
   - Allow entering W/L result and final score for any game
   - Automatically recalculate league points for ALL leagues based on manual entries
   - Show a visual indicator on affected games that scores were manually entered
   - Be reversible if ESPN data comes back (admin can re-sync from ESPN)
   - Commissioners should NOT have access to edit scores — one update from admin pushes correct data to every league

3. **Backup Data Source Research** — investigate SportsDataIO, The Odds API, or CBS Sports API as fallback providers. Don't integrate yet, but know what the fallback plan is and estimate integration effort.

---

## 4. Build a FAQ / Help Center Before Launch

**Priority: Before any public marketing**

With 1,000 users and 100 commissioners, support volume will be real. A comprehensive self-service help page handles 60-70% of questions without human intervention.

**Build a /help page covering:**
- How to create a league (commissioner flow)
- How to join a league (invite code flow)
- How drafts work (snake, linear, timer, auto-pick, pause/resume)
- Scoring rules explained (with examples of how points are calculated)
- How add/drops work (limits, deadlines)
- How trading works (propose, accept, reject, veto)
- How double points works
- How weekly high points works
- Commissioner tools (announcements, settings, member management)
- Account settings and deletion
- Common troubleshooting (can't join league, draft timer issues, score discrepancy)

**Design:** Organized by category, searchable. Could be a simple accordion/FAQ layout or a dedicated help page with sections. Link to it from the footer of every page and from the user settings menu.

**Future enhancement:** Layer a Claude-powered AI chatbot on top of this FAQ content to handle natural language questions. But the static FAQ comes first.

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

## 7. Multi-Sport Architecture (Phase 32 — Planning)

The business plan calls for multi-sport expansion to address seasonality:
- College football: August–January
- College basketball: November–April (fills the gap)
- College baseball: February–June
- Future: NHL, international rugby, FIFA World Cup, Olympics

Phase 32 should design the **abstract scoring architecture** that makes adding a new sport a configuration task, not a code rewrite. Key considerations:
- Sport-agnostic league settings (sport_id, scoring_rules per sport)
- Different draft pool structures per sport (134 FBS football schools vs different sets for other sports)
- Different season lengths, week structures, and playoff formats
- Shared infrastructure: drafts, trading, chat, notifications, OG images
- The `seasons` table already has season_id — make sure new sports can have their own seasons

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

Based on the business evaluation, here's the recommended priority for what to build next:

### Before Launch (March–July 2026)
1. Age gate update (13+ → 18+) — 1 hour
2. FAQ / Help Center page — 1-2 days
3. ESPN API monitoring — 1-2 days
4. Manual score override for commissioners — 2-3 days
5. Accessibility quick audit — 1 day
6. Load testing — 1-2 days
7. Supabase storage estimation — 1 hour

### Phase 33: Email Notifications (After April 21 DNS transfer)
- Transactional emails via Resend: password reset, draft reminders, trade proposals, weekly recaps, pre-season commissioner reminders
- Unsubscribe links on all non-transactional emails (CAN-SPAM)

### Phase 34: Push Notifications
- Browser push for real-time draft alerts, gameday scoring, trade activity

### Phase 35: Pro Tier (Year 2)
- AI Draft Assistant (populate program_analytics, build recommendation engine)
- Season Projections (weekly probability model)
- Transaction Intelligence (add/drop recommendations)
- Live Game Insights (real-time smart notifications)
- Head-to-Head Weekly Matchup mode
- Conference-Specific League format
- Ad infrastructure (free tier shows ads, Pro removes them)
- Stripe integration for subscription billing

### Phase 36: Multi-Sport Architecture (Year 2)
- Abstract scoring by sport
- College basketball as first expansion sport

### Phase 37: Mobile App (Year 2-3)
- iOS/Android native app
- Push notifications (native)

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

## Summary of Immediate Actions

| # | Task | Effort | Priority |
|---|------|--------|----------|
| 1 | ~~Age gate 13+ → 18+ (signup, ToS, privacy)~~ Already 18+ | Done | COMPLETE |
| 2 | FAQ / Help Center at /help | 1-2 days | HIGH |
| 3 | ESPN API monitoring/alerting | 1-2 days | HIGH |
| 4 | Manual score override for admin | 2-3 days | HIGH |
| 5 | Accessibility audit (color palettes, keyboard nav) | 1 day | MEDIUM |
| 6 | Load testing (drafts, gameday scoring) | 1-2 days | MEDIUM |
| 7 | Supabase storage growth estimation | 1 hour | LOW |

After these, Phase 33 (email notifications) is next once DNS transfers on April 21.
