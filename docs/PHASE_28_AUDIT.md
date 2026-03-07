# Phase 28.1 — User Journey Audit Results

> **Date**: March 6, 2026
> **Scope**: 3 user journeys across entire platform
> **Total friction points found**: ~150 (deduplicated to categories below)

---

## How to Read This Document

Each finding is tagged:
- **[PLANNED]** = Already covered by a Phase 28 task
- **[NEW]** = Not yet in Phase 28 — needs to be added or deferred
- **[MOBILE]** = Deferred to Phase 29 (mobile responsiveness)
- **[LOW]** = Nice-to-have, not a launch blocker
- Severity: **P1** (broken/blocking), **P2** (confusing/friction), **P3** (polish)

---

## Category 1: Authentication & Onboarding

### 1.1 Signup Flow
| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 1 | No real-time password match indicator — mismatch only shown on submit | P3 | [NEW] |
| 2 | No password strength indicator (just "6 chars min") | P3 | [LOW] |
| 3 | No "resend confirmation email" link on success page | P2 | [NEW] |
| 4 | Success page says "check your email" but no next-step guidance (will they auto-login? need to click link?) | P2 | [NEW] |
| 5 | Age gate checkbox lacks context (why 18+? fantasy sports compliance) | P3 | [LOW] |
| 6 | ToS/Privacy links open in new tabs, breaking signup flow | P3 | [LOW] |
| 7 | Display name labeled "(optional)" but not visually distinct from required fields | P3 | [LOW] |

### 1.2 Login Flow
| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 8 | Error parameter passed via URL — disappears on refresh, shareable with error message | P3 | [NEW] |
| 9 | No loading indicator after successful login while redirecting (looks frozen) | P2 | [NEW] |
| 10 | "Forgot password?" link positioned far right, easy to miss | P3 | [LOW] |

### 1.3 Post-Signup Redirect
| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 11 | Email confirmation redirects to login instead of auto-login to dashboard | P2 | [PLANNED 28.15] |
| 12 | No session timeout warning — expired session silently redirects to login | P2 | [NEW] |

### 1.4 Password Reset
| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 13 | Forgot-password and auth-callback reset are two different flows — potentially confusing | P3 | [LOW] |
| 14 | Expired reset link page shows error + "request new one" CTA (working correctly) | — | OK |

---

## Category 2: Dashboard

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 15 | Empty state: "No leagues yet" with 🏈 — feels dead, no onboarding guidance | P2 | [PLANNED 28.10] |
| 16 | League cards: no hover feedback (border color same on hover) | P2 | [PLANNED 28.10] |
| 17 | League cards: missing current week, user rank, draft status, member count | P2 | [PLANNED 28.10] |
| 18 | No commissioner badge for co-commissioners on dashboard cards | P3 | [NEW] |
| 19 | No error/empty state if Supabase query fails — dashboard just looks empty | P2 | [NEW] |
| 20 | "Join League" and "Create League" buttons appear in two places with different styling | P3 | [LOW] |

---

## Category 3: League Creation

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 21 | Season year auto-selects 2025 in code (should be current year 2026) | P1 | [NEW] |
| 22 | Max teams default (12) has no guidance ("Typical leagues have 10-12 teams") | P3 | [LOW] |
| 23 | Public vs Private toggle: no explanation of implications | P3 | [LOW] |
| 24 | No preview of league settings before creation — scoring rules, transaction limits hidden | P2 | [NEW] |
| 25 | No confirmation dialog if user clicks "Back to Dashboard" — form data lost silently | P3 | [NEW] |
| 26 | Submit button says "Create League" — doesn't indicate that a draft is also created | P3 | [LOW] |

---

## Category 4: Invite & Join Flow

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 27 | Invite code not passed as URL parameter — users must manually paste code | P1 | [NEW] |
| 28 | Unauthenticated users hitting `/leagues/join` get generic "must be logged in" error instead of signup redirect | P1 | [NEW] |
| 29 | Two-step join flow (enter code → confirm + team name) has no step indicator | P2 | [NEW] |
| 30 | League preview on join: missing draft date, scoring rules, season status | P2 | [NEW] |
| 31 | No indication if draft already happened when joining | P2 | [NEW] |
| 32 | No email invite option for commissioners — must copy/paste invite link manually | P2 | [NEW] |
| 33 | No success message after joining — just silently redirects to league page | P2 | [NEW] |
| 34 | Invite code field shows "abc123" placeholder — users might type this literally | P3 | [LOW] |
| 35 | "Find League" button label unclear — should be "Look Up League" | P3 | [LOW] |
| 36 | Invite code sharing: no explanation of code reusability, expiration, or regeneration | P2 | [NEW] |

---

## Category 5: League Home (Pre-Draft)

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 37 | Quick nav links (Schedule, Add/Drop, History) hidden until draft completes — pre-draft is a dead end | P2 | [PLANNED 28.8] |
| 38 | No member list visible on league home — commissioner can't see who joined | P2 | [NEW] |
| 39 | No countdown timer to scheduled draft date | P2 | [NEW] |
| 40 | Commissioner Tools button is small, grey, easy to miss | P2 | [NEW] |
| 41 | Announcements section empty with no affordance to create one | P2 | [NEW] |
| 42 | Activity feed empty pre-draft — feels abandoned | P3 | [LOW] |
| 43 | Sidebar "Rank #1 of 1 Teams" feels weird when you're the only member | P3 | [LOW] |
| 44 | Invite code in code block — clicking to copy not obvious, separate Share button | P2 | [NEW] |

---

## Category 6: Draft

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 45 | No onboarding tour or walkthrough for draft room | P2 | [NEW] |
| 46 | No draft rules summary visible (max per team, format, pick order) | P2 | [NEW] |
| 47 | Watchlist/priority queue feature exists but not explained | P2 | [NEW] |
| 48 | Auto-pick toggle exists but no explanation of behavior | P2 | [NEW] |
| 49 | Pending pick requires two clicks (select + confirm) — no explanation why | P3 | [LOW] |
| 50 | Timer expiration: no alert/warning when time is almost up | P2 | [NEW] |
| 51 | Search + conference filter: no tooltip explaining they work together | P3 | [LOW] |
| 52 | Draft chat is below-the-fold on desktop, no notification when someone messages | P3 | [NEW] |
| 53 | Schools at draft limit appear with strikethrough but no explanation why | P3 | [LOW] |
| 54 | No "waiting for draft" state if draft hasn't started — shows empty draft UI | P2 | [NEW] |

---

## Category 7: My Roster / Team Page

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 55 | Team page title unclear if showing YOUR team vs opponent | P2 | [NEW] |
| 56 | Pending trades section: no empty state message when no trades exist | P3 | [LOW] |
| 57 | Team edit page: color picker has no preset palettes, hex-only is unfriendly | P2 | [PLANNED 28.4 adjacent] |
| 58 | Team edit page: logo is URL-only input, most users don't have a hosted image URL | P1 | [PLANNED 28.4] |
| 59 | Image URL validation: invalid URL fails silently (img onerror hides it) | P2 | [PLANNED 28.4] |
| 60 | Color preview only updates on blur, not real-time | P3 | [LOW] |
| 61 | No confirmation dialog on team edit "Save Changes" | P3 | [LOW] |

---

## Category 8: Transactions (Add/Drop)

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 62 | Full page reload after transaction — jarring UX | P2 | [PLANNED 28.11] |
| 63 | Transaction deadline not clearly displayed on the page | P2 | [NEW] |
| 64 | "5/50 Add/Drops" shown but no "45 remaining" context | P3 | [NEW] |
| 65 | No undo/reversal for completed transactions — no warning about permanence | P2 | [NEW] |
| 66 | No upcoming schedule preview for schools being considered | P2 | [PLANNED 28.11] |

---

## Category 9: Schedule

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 67 | Pre-season: no games shown, should default to "All Games" | P2 | [PLANNED 28.5] |
| 68 | Special weeks (Bowls, CFP, Natty) — terminology may confuse new users | P3 | [LOW] |
| 69 | No visual distinction between past/future weeks or completed/upcoming games | P2 | [NEW] |
| 70 | User's roster schools not obviously highlighted vs other games | P3 | [NEW] |

---

## Category 10: Standings / Leaderboard

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 71 | No way to navigate to full leaderboard from quick nav | P2 | [PLANNED 28.13] |
| 72 | Weekly points selector/toggle hidden — can't view historical weekly performance | P3 | [NEW] |
| 73 | High points feature not explained for new users | P3 | [LOW] |
| 74 | Post-draft, leaderboard shows all 0 points — feels empty | P3 | [LOW] |
| 75 | No export/share for standings data | P3 | [LOW] |

---

## Category 11: Commissioner Settings

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 76 | Save doesn't scroll to top — user may miss success confirmation | P2 | [PLANNED 28.7] |
| 77 | No visual distinction between required and optional settings | P3 | [LOW] |
| 78 | Scoring presets exist but aren't prominently shown | P3 | [LOW] |
| 79 | No "undo settings" or "reset to defaults" button | P3 | [LOW] |
| 80 | Trade deadline: no indication that blank = "trades allowed all season" | P2 | [NEW] |
| 81 | Draft order config for manual mode — unclear how to assign | P2 | [NEW] |
| 82 | No "copy settings from previous season" for returning commissioners | P3 | [LOW] |

---

## Category 12: Playoff Bracket

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 83 | Bracket positioning broken — R1/QF/SF games don't align | P1 | [PLANNED 28.6] |
| 84 | No indication of how teams qualify for playoffs | P2 | [NEW] |
| 85 | No documentation of when bracket is generated or if commissioner configures it | P3 | [NEW] |

---

## Category 13: Trading

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 86 | Commissioner veto is buried in Settings → Trades tab, not discoverable | P2 | [PLANNED 28.14] |
| 87 | No confirmation dialog before confirming destructive trade actions | P2 | [NEW] |

---

## Category 14: Header & Navigation

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 88 | Header is inconsistent — some pages build their own, others use shared component | P1 | [PLANNED 28.2] |
| 89 | No league dropdown (must go back to dashboard to switch leagues) | P1 | [PLANNED 28.2] |
| 90 | No team dropdown (can't navigate to other team rosters easily) | P1 | [PLANNED 28.2] |
| 91 | No breadcrumbs on any page | P2 | [PLANNED 28.2/28.8] |
| 92 | No current page indicator in header | P2 | [PLANNED 28.2] |
| 93 | Quick nav not standardized across league pages | P2 | [PLANNED 28.8] |
| 94 | Quick nav not sticky — lost on scroll | P2 | [PLANNED 28.9] |
| 95 | "Back" button missing from many pages (draft room, team edit, transactions) | P2 | [NEW] |

---

## Category 15: Notifications

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 96 | Bell icon is tiny and easy to miss | P2 | [NEW] |
| 97 | No notification sound or browser push notification | P3 | [NEW] |
| 98 | "Mark all as read" has no confirmation or feedback | P3 | [LOW] |
| 99 | Notification icons are emojis — inconsistent rendering across browsers | P3 | [LOW] |
| 100 | Max-height dropdown with no pagination — old notifications lost | P3 | [LOW] |
| 101 | Hash-link notifications (#announcements) don't scroll-to if already on page | P2 | [NEW] |

---

## Category 16: Homepage / Welcome

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 102 | Homepage hardcoded for college football — no multi-sport structure | P2 | [PLANNED 28.3] |
| 103 | Logged-in users see same homepage as anonymous — no "Go to Dashboard" | P2 | [NEW] |
| 104 | Root `/` and `/welcome` are separate pages with different content | P3 | [NEW] |

---

## Category 17: Profile & Account

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 105 | Badges shown on profile but purpose/earning criteria unexplained | P3 | [LOW] |
| 106 | Referral URL shown without explanation of benefits | P3 | [LOW] |
| 107 | "Edit Profile" redirects to /settings — mixes profile editing with security settings | P3 | [LOW] |
| 108 | Timezone setting exists but no explanation of its impact | P3 | [LOW] |
| 109 | No logout confirmation | P3 | [LOW] |

---

## Category 18: League History

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 110 | Empty history for new leagues — "No past seasons" feels abandoned | P3 | [NEW] |
| 111 | Collapsible sections have no expand/collapse icon indicator | P3 | [LOW] |

---

## Category 19: General UX Patterns

| # | Finding | Severity | Tag |
|---|---------|----------|-----|
| 112 | No unsaved changes warning on form pages (settings, team edit) | P2 | [NEW] |
| 113 | Error messages use technical language / include debug info in sandbox | P2 | [NEW] |
| 114 | Generic "unexpected error" messages don't guide user on next steps | P2 | [NEW] |
| 115 | No retry mechanism for failed API calls — user must re-fill forms | P3 | [NEW] |
| 116 | Field validation on submit only, not on blur | P3 | [LOW] |
| 117 | No in-app help, tooltips, or onboarding walkthrough | P2 | [NEW] |
| 118 | "Fantasy Team" / "Team" / "Roster" terminology used inconsistently | P3 | [LOW] |
| 119 | SandboxWeekSelector appears on production pages — should be dev-only | P2 | [NEW] |

---

## Summary by Status

| Status | Count |
|--------|-------|
| **[PLANNED]** — Already in Phase 28 | ~25 |
| **[NEW]** — Needs to be added to Phase 28 or deferred | ~50 |
| **[LOW]** — Nice-to-have, defer post-launch | ~35 |
| **[MOBILE]** — Deferred to Phase 29 | ~10 |

---

## Top Priority NEW Items (P1 + P2, not already planned)

These are the most impactful friction points discovered that are NOT yet in Phase 28:

### Must Fix (P1)
1. **#27 — Invite code not in URL** — Users must manually paste code instead of clicking a link
2. **#28 — Unauthenticated join flow** — No signup redirect, just generic error
3. **#21 — Season year defaults to 2025** — Probably a bug, should auto-detect current year

### Should Fix (P2 — High Impact)
4. **#38 — No member list on league home** — Commissioner can't see who joined
5. **#44 — Invite code copy UX** — Code in code block, clicking to copy not obvious
6. **#45 — No draft room onboarding** — Complex UI with zero guidance
7. **#54 — No "waiting for draft" state** — Empty draft UI shown before draft starts
8. **#55 — Team page title ambiguity** — Unclear if viewing your team or opponent's
9. **#63 — Transaction deadline not shown** — Users don't know when add/drops close
10. **#69 — No past/future week distinction** on schedule
11. **#95 — Missing back buttons** on many pages
12. **#103 — Logged-in users see anonymous homepage** — Should redirect to dashboard
13. **#112 — No unsaved changes warning** on form pages
14. **#113 — Debug info in error messages** — Sandbox mode leaking internals
15. **#119 — SandboxWeekSelector on production** — Dev tool visible to users

---

## STOP POINT

**Per the Phase 28 plan, we stop here to review these findings together before proceeding.**

Questions for review:
1. Which NEW items should be added to Phase 28?
2. Which items should be deferred to post-launch?
3. Any items marked [LOW] that you actually consider important?
4. Should any PLANNED tasks be re-prioritized based on these findings?
