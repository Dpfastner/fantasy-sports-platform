# Rivyls — Business & Platform Status Reference

> **Last updated:** March 23, 2026
> **Purpose:** Shared context document between Claude Chat (business/strategy) and Claude Code (development). Informs architecture decisions, feature flags, and business model constraints.

---

## What Rivyls Is

**One sentence:** Rivyls is fantasy college sports — instead of drafting individual players, you draft the schools you already care about. Your fandom and your fantasy team can finally be the same thing.

**Tagline:** Draft Programs. Not Players.

**One paragraph:** Rivyls is a fantasy sports platform built for college sports fans. Instead of drafting individual players the way traditional fantasy works, you draft entire college football programs — schools like Alabama, Ohio State, or Georgia — and those schools earn you points based on how they actually perform each week. You win games, beat ranked opponents, make the playoff, win championships — your fantasy team wins right alongside you. There's no studying snap counts, no divided loyalty conflicts, no needing to know every player on every roster. If you already watch college football on Saturdays, you already know everything you need to play.

---

## 9 Strategic Insights (Decision-Making Context)

These insights should guide every product, design, and business decision:

1. **Divided loyalty is the unlock.** Fans hate rooting against their team. This is the core mechanic, not a feature.
2. **The commissioner is the actual customer.** Win them, win the league. Every feature should make their life easier.
3. **Social connection IS the product.** Scoring enables it. Chat, reactions, recaps — these are the reason anyone opens the app.
4. **Trust is the widest open lane.** Every point must be traceable. Transparency costs nothing and differentiates immediately.
5. **College football space is unoccupied.** No one built this for college fans specifically. Fantrax users say "I use it because nothing better exists."
6. **Simplicity expands the market.** Every new feature must pass: can a first-timer use it without reading anything?
7. **Off-season is existential.** Multi-sport solves it. Without year-round engagement, users churn and must be re-acquired.
8. **Word of mouth before season ends is the only Year 1 metric.** Not downloads, not sign-ups.
9. **Multi-season history is the moat.** It compounds and can't be copied. Build for it from Day 1.

---

## Brand Identity

- **Color Palette:** Royal Gambit (default)
  - Deep Purple (primary): `#2A1A3E`
  - Amber (accent): `#F59E0B`
  - Off-White (background): `#FAF5EE`
  - Soft Lavender (secondary surface): `#E8E0F0`
  - Dark Plum (dark mode / headers): `#1A0F2E`
- **Tagline:** Draft Schools. Not Players.
- **Secondary:** Your fandom and your fantasy team can finally be the same thing.

---

## Company

- **Entity:** Rivyls LLC (Georgia, approved March 2026)
- **EIN:** 41-4753664
- **NAICS:** 713990 — All Other Amusement and Recreation Industries
- **Domain:** rivyls.com (live, Wix DNS — Cloudflare transfer unblocked Apr 21, 2026)
- **Trademark:** "Rivyls" — USPTO intent-to-use application FILED, Class 41 (fantasy sports contests + leagues)
- **Bank:** Mercury (business checking, active)
- **Accounting:** Custom spreadsheet (Rivyls_Accounting.xlsx) — expenses, income, mileage, P&L, deductions guide

---

## Platform Status (Production at rivyls.com)

### Completed — Phases 0-45 + Platform Audit, all deployed:

**Foundation & Core (Phases 0-10):**
- Supabase + Next.js setup, full auth system
- League creation, join via invite codes, configurable settings (40+ columns)
- Real-time snake and linear drafts with chat, auto-pick, pause/resume
- ESPN API integration — daily sync, per-minute live scoring, nightly reconciliation
- Points calculator with league-specific customizable scoring
- Dashboard, leaderboard, weekly high points, team standings
- Add/drop transactions with configurable limits and deadline enforcement
- Double points pick (one school per week for 2x scoring)
- 12-team CFP playoff bracket with real-time scores and escalating multipliers

**Security & Infrastructure (Phases 11-15):**
- Rebrand to Rivyls, critical bug fixes, API security hardening
- Row-Level Security (RLS) on all tables
- Rate limiting on sensitive routes

**Brand & Features (Phases 16-21):**
- 4 color palette system (user-selectable themes)
- Landing page with email capture, referral tracking, waitlist
- 149 automated tests + Sentry + rate limiting + Vercel Analytics
- User profiles (public + private), badges, Founding Commissioner tier
- Admin dashboard with analytics
- OG image generation (7 routes), social sharing buttons

**Compliance & Schema (Phases 22-24):**
- Terms of Service, Privacy Policy, CCPA page — all published
- Age gate (18+), ToS consent logging, account deletion
- Schema additions for remaining tables

**Season 1 Features (Phases 25-27):**
- Scoring presets, watchlist, announcements, league chat with emoji reactions
- In-app notification system, league history
- Draft enhancements (auto-pick, pause/resume)
- Team-to-team trading (proposal/accept/reject/veto)

**Polish (Phases 28-31):**
- 113 UX friction points resolved
- Mobile responsiveness (375px / 390px / 768px)
- Favorite teams and banner collection
- Season history caching, dormant/reactivate league lifecycle
- Season-scoped data architecture, pre-season commissioner reminders

**Pre-Launch Tasks & Push Notifications (Phase 32, 34):**
- Pre-launch checklist, admin tools, ESPN monitoring
- Browser push notifications with VAPID, notification preferences UI
- Manual score override for admin

**Event System (Phases 36a-39):**
- Core event schema (bracket/pick'em/survivor engines), ESPN adapters
- Frozen Four, Masters, Six Nations (M pick'em + W survivor) seeded
- Live scores via event-gameday-sync cron (GitHub Actions)
- Pool chat, announcements, activity feed, schedule view, scoring breakdown
- Scoring customization with presets, share buttons + OG images
- Multi-entry per user, member management, collapsible rules, team logos

**Dashboard & Support (Phases 40-41a):**
- Unified dashboard (leagues + events in one view), Sleeper-inspired header
- Toast component (110+ usages), 4 sports in sports-config
- Support ticket system with conversation threads

**UX Friction Audit (Phase 42):**
- League settings extracted into 6 sub-components
- Notification settings with collapsible category groups
- Pool detail extraction (MembersTab + SettingsTab)
- Trade system redesign (chip builder, inline preview)
- Event entry identity (colors in pills + members tab)

**Platform Audit:**
- Sentry added to 21 routes, rate limiting to 17 routes
- ErrorBoundary wrappers, URL-based tabs, loading skeletons
- Activity feed polling, typography standardization
- Survivor tiebreaker standardization

**Phase 43A — Multi-Sport Abstraction:**
- Game Rules document (docs/GAME_RULES.md)
- Sport scoring registry (SportScoringConfig interface, CFB: 21 fields + 4 presets)
- Sport season config (SportSeasonConfig interface, CFB: week 0-22)
- SportCalculator interface and calculator router
- JSONB scoring column (migration 055), refactored presets/season/week to registries

**Phase 43C — Platform Simplification:**
- League creation: 5 fields + "Customize" expander (progressive disclosure)
- Scoring settings: preset summary view, fields only for Custom
- Settings page: Quick Setup mode with "Show All Settings" toggle
- League join: invite code primary, browse as text link
- League detail sidebar: 3 cards → 1 dynamic compact card
- First-visit explainer: dismissible one-liner for new members

**Phases 43D, 44, 44b — Social, Game Audit, Support Page:**
- Phase 43D: Chat sidebar, DMs, @mentions, GIPHY, trash talk prompts, reaction details, pinning, Web Share, bulletin board, weekly recaps
- Phase 44: "Leaderboard" → "Rivalry Board" rename, bracket nav visibility by season, sportSlug/currentWeek context
- Phase 44b: `/support` page for voluntary contributions via Stripe Payment Links (no backend). Moved ticket system to `/tickets`. Env var fallback for pre-Stripe setup. Footer "Support Rivyls" link. NAICS 713990 language compliance (no "donation")
- Phase 44C: Shared tier utility, GamePicker extraction, EntryAvatar component
- Phase 44D: Fan Zone dismissible + header school ring badge with dropdown

**Phase 45 — Mobile & UX Audit v2 (55 issues, all shipped Mar 22-23, 2026):**
- P1 (blocking): Disabled pinch zoom, safe area insets, max teams input fix, draft complete notification on auto-pick, public pool one-click join, mobile chat positioning
- P2 (layout): LeagueNav auto-scroll, school ring on mobile, league overview reordered, settings tab overflow, color picker responsive, profile overflow, keyboard optimization (inputMode/autoComplete on all inputs), text sizes bumped, grids responsive, toast full-width on mobile, modal scroll, leaderboard links visible
- P3 (UX): Scoring default to Standard, removed Customize expander, auto-pick toast format, Done button clickable, schedule score font, ranked badge overflow, add/drop navigates to team, Drop label clickable, support page reordered, draft help icon, mobile draft tabs, upload error scroll
- P4 (features): Sport-first create flow (events page shows public leagues + events + "Create New"), draft confetti on completion, Top 25 ranked filter in draft, scrollable mini bracket for mobile, BracketList horizontal scroll
- Follow-up: Draft help icon circled, settings sub-tabs scrollable, "Coming Soon" removed, leaderboard overflow-hidden, dashboard overflow, bracket logos/times, roster history overflow

### Platform Metrics:
| Metric | Value |
|--------|-------|
| Database Tables | 60+ |
| API Routes | 73 |
| Pages | 44 |
| Components | 63 |
| Automated Tests | 149 |
| Migrations | 62 |
| FBS Schools | 134 |
| Scoring Weeks | 23 (CFB) |
| Color Palettes | 4 |
| Cron Jobs | 4 (daily-sync, gameday-sync, event-gameday-sync, reconcile) |
| Sports Configured | 4 (CFB, Hockey, Golf, Rugby) |

### Upcoming Phases:
| Phase | Feature | Notes |
|-------|---------|-------|
| 45b | Stripe SDK | Subscription-ready: embedded checkout, webhooks, customer portal, donor tracking |
| 45c | Draft Improvements | Live event draft (Jackbox TV mode), manual input, sound effects |
| 46 | Cross-Sport League Continuity | **Key differentiator** — leagues roll between sports. Must be ready for CFB→CBB (Nov 2026) |
| 47 | Game Night Live + Halftime Heist | Saturday second-screen: live ticker, scoring animations, halftime predictions |
| 48 | PWA & Mobile App | PWA install prompt + Capacitor for App Store |
| 33 | Email Notifications | Blocked until DNS transfer (Apr 21, 2026) |
| 49 | Rivalry Wagers | Stake schools for a week on rivalry games |
| 50 | Campus Conquest (War Map) | Territory visualization, conference control |

### Deferred (Year 2+):
| Phase | Feature |
|-------|---------|
| 41b | Claude AI / AI Commentator (needs API key) |
| 51-52 | Time Capsules, Chaos Mode |
| 53-54 | Dynasty/Keeper Leagues, Auction Draft |
| 55 | Stock Market Mode |
| 56-58 | Ads, Pro Features, New Game Modes |

---

## NAICS Classification Context (713990)

### Year 1 approach:
- No payment collection between users in the initial release
- Prize/payout calculators in commissioner tools are informational
- Leaderboards display points and rankings
- Any monetary arrangements between league members happen outside the platform

### Context for future decisions:
If the platform later adds features that move money between users tied to contest outcomes, Rivyls may need to reclassify to NAICS 713290. A full cost/benefit/risk analysis is in the NAICS Reclassification Analysis document. This is a future business decision.

---

## Tech Stack

### In Use
| Layer | Technology | Cost |
|-------|-----------|------|
| Framework | Next.js 16 (App Router) | $0 |
| UI | React 19, TypeScript 5, Tailwind CSS 4 | $0 |
| Database | Supabase (PostgreSQL) with RLS | $0 free tier |
| Auth | Supabase Auth (email/password) | Included |
| Real-time | Supabase Realtime | Included |
| Storage | Supabase Storage (badge icons) | Included |
| Validation | Zod 4 | $0 |
| Error Monitoring | Sentry (@sentry/nextjs) | $0 free tier |
| Testing | Vitest 4 (149 tests) | $0 |
| Analytics | Vercel Analytics | Included |
| OG Images | next/og (Satori) | $0 |
| External Data | ESPN API (public endpoints) | $0 |
| CI/CD | GitHub Actions | $0 free tier |
| Hosting | Vercel | $0 free tier |
| Domain | rivyls.com (Wix) | $22.80/yr |
| Fonts | Montserrat + Inter | $0 |
| AI Dev | Claude (Anthropic) | $100/mo |

### Planned
| Layer | Technology | Timeline | Cost |
|-------|-----------|----------|------|
| DNS/CDN | Cloudflare | Apr 21, 2026 | $0 |
| Email | Resend | After DNS transfer | $0 free tier |
| Payments | Stripe (Payment Links live, SDK next) | Phase 45b | 2.9% + $0.30/txn |

---

## Revenue Model

### Year 1 (2026): Free
- Goal: 100 leagues, 1,000 users
- Revenue: $0 (proving product-market fit)
- Founding Commissioner tier: fully implemented

### Year 2 (2027): Subscriptions
- Rivyls Pro: $4.99/mo or $29.99/yr
- Founding Commissioners: Pro features free via feature flags

---

## Legal & Compliance Status (COMPLETE)

All legal features built and deployed in Phases 22-24:
- [x] Terms of Service (published)
- [x] Privacy Policy (GDPR/CCPA, published)
- [x] CCPA "Do Not Sell" page
- [x] Age gate on signup
- [x] ToS consent logging with timestamps
- [x] Account deletion (soft-delete, preserves league integrity)
- [x] Notification preferences table

### Still needed (non-platform):
- [ ] Review ToS/Privacy content against competitor policies
- [ ] Attorney review recommended ($500-2,000)
- [ ] Contact emails (legal@, privacy@) pending DNS transfer (Apr 21, 2026)

---

## Competitor ToS/Privacy Reference Links

| Platform | ToS | Privacy | Notes |
|----------|-----|---------|-------|
| Sleeper | support.sleeper.com/en/articles/5486620 | sleeper.com/privacy | Closest comp — free leagues + paid DFS |
| PrizePicks | prizepicks.com/terms | prizepicks.com/privacy-policy | Georgia LLC like Rivyls |
| Underdog | underdogfantasy.com/terms | underdogfantasy.com/privacy | Season-long + DFS hybrid |
| ESPN Fantasy | disneytermsofuse.com | privacy.thewaltdisneycompany.com | Broad ToS, focus on fantasy rules |
| DraftKings | draftkings.com/help/terms | sportsbook.draftkings.com/legal/privacy-notice | Full compliance reference |

---

## Blockers & Key Dates

| Date | Item | Status |
|------|------|--------|
| Mar 2026 | LLC approved, EIN, Mercury bank | DONE |
| Mar 2026 | Trademark filing ($350) | DONE — filed via USPTO |
| Mar 2026 | Atlanta Occupational Tax Certificate ($191) | DONE — submitted via ATLBIZ |
| Mar 2026 | Set up accounting | DONE — custom spreadsheet |
| Apr 21, 2026 | Cloudflare DNS transfer | Blocked on ICANN lock |
| Apr 21+, 2026 | Resend email (Phase 33) | Blocked on DNS |
| May 2026 | Marketing begins | Platform ready |
| Jul 2026 | Public launch | — |
| Aug 2026 | Season kickoff | Scoring operational |

---

## Business Formation Checklist

### Done:
- [x] LLC formation, EIN, bank account
- [x] Domain secured
- [x] Trademark search
- [x] Platform Phases 0-42 + Platform Audit + 43A + 43C (complete feature set)
- [x] Legal compliance (ToS, Privacy, CCPA, age gate 18+, deletion, consent logging)
- [x] Trading, chat, notifications, season history, mobile responsive, social sharing
- [x] Event system (bracket, pick'em, survivor engines)
- [x] FAQ / Help Center (40+ FAQs, 7 categories)
- [x] ESPN monitoring (Sentry), manual score override, push notifications
- [x] Multi-sport abstraction layer, platform simplification

### Do now:
- [x] Trademark filing ($350) — FILED, Class 41, intent-to-use
- [x] Atlanta Occupational Tax Certificate ($191 — submitted via ATLBIZ)
- [x] Set up accounting — custom spreadsheet

### Before launch:
- [ ] Cloudflare DNS + Resend email (Apr 21+)
- [ ] Attorney review of ToS/Privacy ($500-2,000)
- [ ] General liability insurance ($30-60/mo)

### Year 2:
- [ ] Stripe integration (Phase 36)
- [ ] Updated ToS for subscriptions
- [ ] Sales tax compliance
- [ ] Gaming attorney (only if paid entry leagues)

---

## Claude Code Tasks (From Business Review)

**Completed:**
1. ~~Age gate: Update 13+ to 18+~~ — DONE (Phase 32)
2. ~~ESPN API monitoring~~ — DONE (Sentry on all sync routes, Platform Audit)
3. ~~Admin-only manual score override~~ — DONE (Phase 32)
4. ~~FAQ / Help Center page~~ — DONE (/help with 40+ FAQs in 7 categories, Phase 32)
5. ~~Multi-sport abstraction~~ — DONE (Phase 43A — sport scoring registry, sport season config, SportCalculator interface)
6. ~~Platform simplification~~ — DONE (Phase 43C — progressive disclosure across 6 areas)

**Remaining:**
- Accessibility audit — color palettes for colorblind users, keyboard navigation, screen reader
- Load testing — verify 100+ simultaneous draft users, 50+ leagues checking scores on gameday
- Supabase storage estimation — calculate data growth for 1,000 users over 23 weeks

---

## Revised Pro Tier Strategy (March 2026)

Do NOT gate features that are free everywhere else (trading, chat, scoring, auction drafts). Users expect these free. Pro = intelligence that helps you win + premium formats:

**Intelligence (what users pay for):**
- AI Draft Assistant — program power rankings, schedule analysis, draft value scores
- Live Game Insights — "your team is now projected to win weekly high points"
- Season Projections — weekly win probability and standings forecast
- Transaction Intelligence — add/drop recommendations, waiver rankings

**Premium Formats (new ways to play):**
- Head-to-Head Weekly Matchups (different from cumulative season points)
- Conference-Specific Leagues (draft only SEC or Big Ten)

**Experience:**
- Ad-free (add non-intrusive ads to free tier, Pro removes them)

---

## Tax & Compliance Notes

### Current Structure
- Single-member LLC: income flows to personal tax return (Schedule C)
- Self-employment tax: 15.3% on profit (Social Security 12.4% + Medicare 2.9%)
- When subscription revenue starts (Year 2), quarterly estimated tax payments required (Apr 15, Jun 15, Sep 15, Jan 15)

### Deductions to Track from Day 1
Every dollar of legitimate business expense reduces taxable income. Log ALL of these in the Accounting spreadsheet:

**Direct business costs (100% deductible):**
- Claude subscription ($100/mo) — including months before LLC was formed (startup costs)
- Domain registration ($22.80/yr)
- LLC filing fee ($100)
- Trademark filing ($350) + Statement of Use ($150)
- Occupational Tax Certificate ($191/yr)
- Insurance premiums ($30-60/mo)
- Accounting: custom spreadsheet ($0)
- Future: Supabase Pro, Vercel Pro, Resend, Stripe fees, attorney fees

**Home office deduction (if you have a dedicated workspace):**
- Simplified method: $5/sq ft, up to 300 sq ft = up to $1,500/yr deduction
- OR actual method: percentage of rent/mortgage, utilities, insurance based on office square footage as % of total home
- The space must be used "regularly and exclusively" for business

**Partial deductions (business-use percentage):**
- Internet bill — estimate % used for business (development, research, platform monitoring)
- Phone bill — estimate % used for business
- Computer, monitor, keyboard, any equipment used for development
- Note: be reasonable with percentages. 50-70% for internet is defensible if you work from home full-time on Rivyls

**Mileage and travel:**
- 2025 IRS rate: $0.70/mile (2026 rate TBD, usually similar)
- Track mileage to: notary, bank (Mercury is online but any in-person banking), business meetings, investor meetings, any business-related travel
- Use a mileage tracking app (Everlance, MileIQ) or a simple spreadsheet with date, destination, purpose, miles

**Startup costs (pre-LLC formation):**
- Any business expenses incurred before the LLC was formed (Claude subscription, domain purchase, research) can be deducted as startup costs
- First $5,000 is deductible in Year 1, remainder amortized over 15 years
- Keep receipts/records for everything going back to when you started building Rivyls

**Education and research:**
- Books, courses, or subscriptions related to building the business
- Conference tickets or online events related to fantasy sports, sports tech, or startups

### S-Corp Election (Future — Not Now)
- An S-Corp election lets you split profit into salary (subject to SE tax) and distributions (not subject to SE tax)
- Saves money when profit consistently exceeds ~$40K-50K/yr
- Costs ~$1,500-3,000/yr in overhead (payroll service, corporate tax return, additional filings)
- Does NOT make sense until Year 3 at earliest
- Election can be made retroactively for current tax year if filed by March 15
- When the time comes, a 1-hour CPA consultation ($100-200) to plan the election is worth it

### Quarterly Estimated Tax Payments (Year 2+)
- Required when you expect to owe $1,000+ in taxes for the year
- Due dates: April 15, June 15, September 15, January 15
- Penalty for underpayment — easier to overpay slightly and get a refund
- Calculate: (expected profit × 15.3% SE tax) + (expected profit × your income tax bracket)
- The P&L Summary sheet in the Accounting spreadsheet estimates these automatically

---

## Seasonality & Multi-Sport Plan

College football: August-January. Events system fills gaps year-round.

**Already built (Phase 36a-c, 43A):**
- Event system with 3 game engines: bracket, pick'em, survivor
- Sports configured: CFB, Hockey, Golf, Rugby
- Events seeded: Frozen Four (bracket), Masters (pick'em), Six Nations (M pick'em + W survivor)
- Multi-sport abstraction layer: sport scoring registry, sport season config, SportCalculator interface

**Tier 1 (Summer-Nov 2026):** Full multi-sport season engine — Men's/Women's CBB, NCAA Hockey, College Baseball, Women's Volleyball
**Tier 2 (Year 1):** WNBA, MLS, Softball, Lacrosse, annual events (reuse engines)
**Tier 3 (Year 2+):** NFL (Winner/Loser format), Premier League, Champions League, Liga MX, NBA/MLB/NHL

Year-round engagement reduces seasonal revenue concentration risk.

---

## Cost Summary

**Current monthly burn:** $140/mo (Claude $100 + insurance ~$40)
**At scale (500+ users):** ~$460/mo (adds Supabase, Vercel, Resend, marketing, backup data)
**Spent to date:** $1,574.47 (see Accounting spreadsheet for full breakdown)
**One-time costs remaining:** ~$1,150 (attorney review $1,000 + statement of use $150)
**Annual recurring:** ~$264/yr (domain $23 + LLC renewal $50 + occ tax cert renewal $191)
