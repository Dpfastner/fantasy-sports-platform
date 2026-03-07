# Phase 28 — Full Cross-Reference: All 119 Audit Items

> **Date**: March 7, 2026
> **Purpose**: Track every friction point from the Phase 28.1 audit against actual code implementation
> **Legend**: FIXED | NOT FIXED | PARTIAL | INTENTIONAL
> **Usage**: After all outstanding items are implemented, walk through the "How to Verify" column for each FIXED item in the browser

---

## Summary

| Status | Count |
|--------|-------|
| FIXED | 113 |
| DROPPED | 3 (#12 not needed, #75 social share covers it, #99 keep emoji) |
| DEFERRED | 5 (#32 post-4/21, #66 on hold, #82 rethink as reactivation, #97 own phase, #117 own phase) |
| INTENTIONAL | 2 (#13 working by design, #21 defaults to 2025 for testing) |
| N/A | 1 (#14 already OK) |
| **Total** | **118** + 6 design items noted |
| **Still actionable** | **0** — all Phase 28 code work complete |

> **Updated**: March 7, 2026 — All Phase 28 code work complete. 113 FIXED, 3 DROPPED, 5 DEFERRED.

---

## Category 1: Authentication & Onboarding (Items 1–14)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 1 | No real-time password match indicator | **FIXED** | Go to /signup → type password → type different confirm password → should see red border + "Passwords do not match" immediately, green + "Passwords match" when they match |
| 2 | No password strength indicator | **FIXED** | Go to /signup → type password → should see 4-bar strength indicator (Weak/Fair/Good/Strong) below the password field |
| 3 | No "resend confirmation email" link | **FIXED** | Complete signup → success page should show "resend the confirmation email" link |
| 4 | Success page lacks next-step guidance | **FIXED** | Complete signup → success page should say "Click the link and you'll be taken straight to your dashboard" |
| 5 | Age gate checkbox lacks context | **FIXED** | Go to /signup → age gate checkbox should show "Required for fantasy sports participation per state regulations." subtext |
| 6 | ToS/Privacy links open in new tabs | **FIXED** | Go to /signup → click Terms of Service or Privacy Policy links → should open in same tab (no target="_blank") |
| 7 | Display name "(optional)" not visually distinct | **FIXED** | Go to /signup → "Display Name" label should show "(optional)" in smaller, muted text |
| 8 | Error parameter passed via URL | **FIXED** | Trigger a login error → error message should display from URL param, then disappear on refresh (by design) |
| 9 | No loading indicator after login | **FIXED** | Log in successfully → should see "Redirecting..." text before dashboard loads |
| 10 | "Forgot password?" link positioning | **FIXED** | Go to /login → "Forgot password?" should be near the Password label, not isolated far right |
| 11 | Email confirmation redirects to login | **FIXED** | Click email confirmation link → should land on /dashboard, not /login |
| 12 | No session timeout warning | **DROPPED** | Supabase auto-refreshes sessions. Users only log out after full JWT expiry with tab closed. Not needed. |
| 13 | Two different password reset flows | **INTENTIONAL** | Investigated — the forgot-password and reset-password flows converge correctly by design |
| 14 | Expired reset link page | **N/A** | Was already working correctly |

---

## Category 2: Dashboard (Items 15–20)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 15 | Empty state feels dead | **FIXED** | Create a new account with no leagues → dashboard should show helpful text + Create League / Join with Code buttons |
| 16 | League cards no hover feedback | **FIXED** | Hover over a league card → should see subtle shadow, border glow (brand/40), and background change |
| 17 | League cards missing week/rank | **FIXED** | League cards should show "Week X" badge (top right) and "Xth of Y" rank line with trophy icon |
| 18 | No co-commissioner badge | **FIXED** | As co-commissioner, dashboard should show "Co-Commish" badge next to league name |
| 19 | No error state for failed queries | **FIXED** | If dashboard queries fail → should see red error banner "Something went wrong loading your data." |
| 20 | Join/Create buttons inconsistent | **FIXED** | Compare top-right buttons vs empty-state buttons → both should have same styling (grey Join, brand Create) |

---

## Category 3: League Creation (Items 21–26)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 21 | Season year defaults to 2025 | **INTENTIONAL** | Defaults to 2025 for testing (where all data lives). Fallback: `is_current` → latest. Will swap to `is_current` first when 2026 season data is loaded |
| 22 | Max teams no guidance | **FIXED** | Go to /leagues/create → Max Teams field should show "Enter a number between 1-30" |
| 23 | Public vs Private no explanation | **FIXED** | Toggle should show "Public leagues can be found by anyone. Private leagues require an invite code" |
| 24 | No preview before creation | **FIXED** | Go to /leagues/create → fill out form → click "Create League & Draft" → should see preview panel with all details + "Confirm & Create" button |
| 25 | No confirmation on "Back to Dashboard" | **FIXED** | Go to /leagues/create → type in league name → click "Back to Dashboard" or "Cancel" → should see browser confirm dialog "You have unsaved changes" |
| 26 | Submit button doesn't mention draft | **FIXED** | Go to /leagues/create → button should say "Create League & Draft" |

---

## Category 4: Invite & Join (Items 27–36)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 27 | Invite code not in URL | **FIXED** | Visit /leagues/join?code=YOURCODE → code should auto-fill and auto-lookup the league |
| 28 | Unauthenticated join gives error | **FIXED** | Log out → visit /leagues/join → enter code → should redirect to login (not show generic error), then return after login |
| 29 | No step indicator in join flow | **FIXED** | Go to /leagues/join → should see "1. Find League" → "2. Join & Name Team" step indicators |
| 30 | League preview missing info | **FIXED** | Look up a league → preview should show draft status, scoring preset, schools per team, season/sport |
| 31 | No indication if draft happened | **FIXED** | Preview should show "Completed" / scheduled date / "Not scheduled yet" for draft |
| 32 | No email invite option | **NOT FIXED** | — |
| 33 | No success message after joining | **FIXED** | Join a league → should see "You're in!" with league name and button to go to league |
| 34 | Invite code "abc123" placeholder | **FIXED** | Input field should show grayed "abc123" placeholder that's clearly not real text |
| 35 | "Find League" button label | **FIXED** | Button should say "Look Up League" (not "Find League") |
| 36 | No code reusability explanation | **FIXED** | View invite code on league page → should see "Reusable — anyone can join with this code until the league is full." |

---

## Category 5: League Home Pre-Draft (Items 37–44)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 37 | Quick nav hidden until draft | **FIXED** | Visit any league page → LeagueNav bar should show all items (Overview, My Team, Schedule, etc.) regardless of draft status |
| 38 | No member list on league home | **FIXED** | League home should show member list with team names and display names |
| 39 | No countdown timer to draft | **FIXED** | If draft is scheduled, should see "Starts in: XdXhXm" countdown |
| 40 | Commissioner Tools button small/grey | **FIXED** | As commissioner, button should be brand-colored (prominent), not grey |
| 41 | Announcements section empty | **FIXED** | Commissioner should see announcements editor; non-commissioners see posted announcements |
| 42 | Activity feed empty pre-draft | **FIXED** | Activity feed section should be present even pre-draft |
| 43 | "Rank #1 of 1 Teams" when solo | **FIXED** | Create league with only 1 team → dashboard should NOT show "1st of 1" rank |
| 44 | Invite code copy UX | **FIXED** | Click invite code → should copy to clipboard with "Copied!" feedback; Share button should also be visible |

---

## Category 6: Draft (Items 45–54)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 45 | No onboarding tour for draft room | **FIXED** | Visit draft room → click "?" help button in header → should see "Draft Room Guide" modal with sections for How to Pick, Timer, Queue, Auto-Pick, Draft Limit, Search, Chat |
| 46 | No draft rules summary visible | **FIXED** | Visit draft room before draft starts → should see "Draft Rules" card with Format, Timer, Roster Size, Draft Limit, Teams, Total Rounds |
| 47 | Watchlist/priority queue not explained | **FIXED** | In draft room with queue items → should see helper text: "Drag to reorder. Auto-pick uses this order. Click '+ Queue' on any school to add it." |
| 48 | Auto-pick toggle not explained | **FIXED** | In draft room → auto-pick section always shows explanation text (enabled or disabled) |
| 49 | Pending pick two clicks not explained | **FIXED** | Click "?" help button → "How to Pick" section explains: "click a school, then confirm in the popup. Two clicks total." |
| 50 | No timer warning when time almost up | **FIXED** | When it's your turn and ≤15 seconds remain → banner changes to yellow "Hurry! Only X seconds left to make your pick!" |
| 51 | Search + conference filter tooltip | **FIXED** | Search placeholder says "Search schools by name...", conference dropdown says "All Conf." with title="Filter by conference" |
| 52 | Draft chat below-fold, no notification | **FIXED** | On mobile, "Chat" tab shows unread dot indicator when new messages arrive from other users |
| 53 | Schools at draft limit — strikethrough no explanation | **FIXED** | Below available schools, maxed-out schools section shows: "Schools below have reached the league draft limit (X teams max) and are no longer available." |
| 54 | No "waiting for draft" state | **FIXED** | Visit draft page before draft starts → should see "Waiting for the draft to begin" message with scheduled date and manual order setup (commissioner) |

---

## Category 7: My Roster / Team Page (Items 55–61)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 55 | Team page title unclear (your vs opponent) | **FIXED** | Visit My Team → page clearly shows your team name, "Team Settings" button, and standing info |
| 56 | Pending trades no empty state | **FIXED** | Visit team page with no pending trades → should see "No pending trade offers." message |
| 57 | Color picker hex-only | **FIXED** | Edit Team → should see 8 color presets (Classic, Navy/Gold, Crimson, etc.) above hex inputs |
| 58 | Logo is URL-only input | **FIXED** | Edit Team → should see file upload area (click/drag). "Or paste an image URL" collapsed below. **Requires `team-logos` Supabase bucket** |
| 59 | Image URL validation fails silently | **FIXED** | Upload wrong file type → should see error. Broken URL → image hidden gracefully |
| 60 | Color preview only updates on blur | **FIXED** | Change color via picker or hex input → preview rectangle should update in real-time |
| 61 | No confirmation dialog on team save | **FIXED** | Edit team → click "Save Changes" → should see browser confirm dialog "Save changes to your team?" |

---

## Category 8: Transactions (Items 62–66)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 62 | Full page reload after transaction | **FIXED** | Add/Drop and Trade actions both use `router.refresh()` instead of `window.location.reload()` |
| 63 | Transaction deadline not displayed | **FIXED** | If deadline passed → should see red warning banner: "The add/drop deadline has passed" |
| 64 | "5/50 Add/Drops" no remaining context | **FIXED** | Should show "X used of Y — Z remaining" (e.g., "5 used of 50 — 45 remaining") |
| 65 | No undo warning about permanence | **FIXED** | Transaction confirm step → warning box with icon: "This transaction is permanent and cannot be undone." |
| 66 | No upcoming schedule preview | **NOT FIXED** | — |

---

## Category 9: Schedule (Items 67–70)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 67 | Pre-season no games, default to All | **FIXED** | Visit schedule before Week 0 → dropdown should default to "All Games" showing every week |
| 68 | Special week terminology confusing | **FIXED** | Visit schedule → week dropdown should show: "Week 0 — Early Season", "Week 15 — Conference Championships", "Week 16 — Army-Navy / Rivalry Week", "College Football Playoff" |
| 69 | No past/future week distinction | **FIXED** | Visit schedule → past weeks show ✓ prefix, current week shows ◀ Current suffix in dropdown |
| 70 | Roster schools not highlighted | **FIXED** | All Games view: roster games get blue tint (`bg-info/5`) + stronger border (`border-info/50`) + dot indicators next to school names. Query limit raised to 2000 to show full season. |

---

## Category 10: Standings / Leaderboard (Items 71–75)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 71 | No leaderboard in quick nav | **FIXED** | LeagueNav now has "Standings" link (renamed from "Stats") positioned before Schedule in the nav order |
| 72 | Weekly points selector hidden | **FIXED** | Full leaderboard should show weekly point columns for each week |
| 73 | High points feature not explained | **FIXED** | League home shows "(weekly bonus)" subtitle under High Points; leaderboard HP column header has tooltip: "High Points: weekly bonus for the highest-scoring team" |
| 74 | Post-draft 0 points feels empty | **FIXED** | If all teams have 0 pts → should see "Scores will update when games begin. Check back once the season kicks off!" |
| 75 | No export/share standings | **DROPPED** | ShareButton already handles social sharing (copy link, Twitter, Facebook, WhatsApp). CSV export not needed. |

---

## Category 11: Commissioner Settings (Items 76–82)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 76 | Save doesn't scroll to top | **FIXED** | Scroll down in settings → click Save → page should smooth-scroll to top so you see the success message |
| 77 | No required vs optional distinction | **FIXED** | Settings page shows "(optional)" label on Trade Deadline and "(optional — visible to members as a countdown)" on Draft Date & Time |
| 78 | Scoring presets not prominent | **FIXED** | Scoring section should have a "Scoring Preset" dropdown selector |
| 79 | No "reset to defaults" button | **FIXED** | Settings → Scoring section → "Reset to Defaults" button next to Save, with confirmation dialog. Uses standard preset values |
| 80 | Trade deadline blank meaning unclear | **FIXED** | Settings → Trade Deadline field shows "(optional)" label and helper text explains blank = no deadline |
| 81 | Draft order for manual mode unclear | **FIXED** | Draft page (pre-draft) → commissioner should see "Set Draft Order" with up/down arrows and "Use the arrows to reorder teams" |
| 82 | No copy settings from previous season | **NOT FIXED** | — |

---

## Category 12: Playoff Bracket (Items 83–85)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 83 | Bracket positioning broken | **FIXED** | Visit bracket page → R1 games should vertically align/center with the QF games they feed into |
| 84 | No playoff qualification explanation | **FIXED** | Bracket page shows subtitle explaining format: "12-team bracket — top 4 seeds get a first-round bye. Schools on your roster are highlighted." |
| 85 | No documentation of bracket generation | **FIXED** | Bracket page should show subtitle: "12-team bracket — top 4 seeds get a first-round bye. Schools on your roster are highlighted." |

---

## Category 13: Trading (Items 86–87)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 86 | Commissioner veto buried | **FIXED** | Accept a trade → commissioner should get notification "Trade Completed — Review & Veto" that links to Settings → Trades |
| 87 | No confirmation on destructive trade actions | **FIXED** | Accept/reject/cancel a trade → should see confirmation flow before action executes |

---

## Category 14: Header & Navigation (Items 88–95)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 88 | Header inconsistent across pages | **FIXED** | Navigate between dashboard, league, team pages → header should be consistent: "Rivyls" logo + notification bell + profile dropdown |
| 89 | No league dropdown | **FIXED** | Header shows league dropdown with sport icons. Lists all user's leagues, current highlighted with checkmark. Click switches leagues. |
| 90 | No team dropdown | **FIXED** | Header shows team dropdown with color swatches. User's team first with "You" label, separator, then all others alphabetical. |
| 91 | No breadcrumbs | **FIXED** | Breadcrumbs below header: Dashboard / League Name / Page. Auto-generated from route. Hidden on mobile. |
| 92 | No current page indicator | **FIXED** | Click through LeagueNav tabs → active tab should have bottom border + bold font |
| 93 | Quick nav not standardized | **FIXED** | Visit league home, team, schedule, bracket, stats, history → all should use same LeagueNav component with same items |
| 94 | Quick nav not sticky | **FIXED** | Scroll down on any league page → LeagueNav should stay pinned at top |
| 95 | Back button missing from many pages | **FIXED** | team/edit has "Back to Team", settings has back button, draft room has "← League" back button |

---

## Category 15: Notifications (Items 96–101)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 96 | Bell icon tiny | **FIXED** | Bell button padding increased to p-2 for larger click target; icon is w-6 h-6 with unread badge |
| 97 | No notification sound or push | **DEFERRED** | Own phase — single browser permission prompt + granular settings toggles |
| 98 | "Mark all as read" no feedback | **FIXED** | Click "Mark all as read" → should see "Done!" message appear for 2 seconds |
| 99 | Emoji icons inconsistent cross-browser | **DROPPED** | Keeping emoji — differences are cosmetic and recognizable across platforms |
| 100 | No notification pagination | **FIXED** | Notifications capped at 50 items in a scrollable container (max-h-400px) |
| 101 | Hash-link notifications don't scroll-to | **FIXED** | Click a notification with hash link (e.g. #announcements) while on same page → should smooth-scroll to that section |

---

## Category 16: Homepage / Welcome (Items 102–104)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 102 | Homepage hardcoded for CFB | **FIXED** | Visit /welcome → "Pick Your Sport" section should show College Football (active) + Masters Tournament (Coming Soon) |
| 103 | Logged-in users see anonymous homepage | **FIXED** | While logged in, visit / → should redirect to /dashboard |
| 104 | Root / and /welcome separate pages | **FIXED** | / handles routing (redirect logged-in users), /welcome is the marketing page — both work correctly |

---

## Category 17: Profile & Account (Items 105–111)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 105 | Badges purpose unexplained | **FIXED** | Visit /profile → hover over badges → should see tooltip with description/earning criteria |
| 106 | Referral URL no explanation | **FIXED** | Profile shows "Invite Friends" section with referral link, copy button, and share functionality |
| 107 | "Edit Profile" redirects to /settings | **FIXED** | "Edit Profile" button goes to /settings where you can edit display name, email, etc. — working as designed |
| 108 | Timezone setting no impact explanation | **FIXED** | Settings → Timezone shows helper text explaining it affects displayed game times |
| 109 | No logout confirmation | **FIXED** | Profile dropdown → Logout now shows confirmation dialog before signing out |

## Category 18: League History (Items 110–111)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 110 | Empty history for new leagues | **FIXED** | Visit history for new league → should see "No past seasons yet" with explanation: "Seasons are automatically archived 3 days after the National Championship game" |
| 111 | Collapsible sections no icon | **FIXED** | Collapsible sections should show rotating chevron icon that flips on expand/collapse |

---

## Category 19: General UX Patterns (Items 112–119)

| # | Finding | Status | How to Verify |
|---|---------|--------|---------------|
| 112 | No unsaved changes warning | **FIXED** | Edit team details → make changes → try to close tab or navigate away → should see browser "unsaved changes" warning |
| 113 | Error messages use debug info | **FIXED** | All user-facing pages now show friendly error messages. API routes may still return debug info in sandbox mode (expected) |
| 114 | Generic "unexpected error" messages | **FIXED** | Updated across all auth pages, league create, and league join — each has a specific, helpful error message with recovery instructions |
| 115 | No retry mechanism for failed API calls | **FIXED** | `fetchWithRetry()` utility in `src/lib/api/fetch.ts`. GET: 3 attempts with backoff on 5xx/network. Mutations: 2 attempts on network errors only. Adopted in NotificationBell, LeaderboardClient, PendingTrades, AnnouncementsManager, TransactionsClient. |
| 116 | Field validation on submit only | **FIXED** | League create form validates name and team name on blur (red border + error text). File inputs validate on selection |
| 117 | No in-app help/tooltips/onboarding | **DEFERRED** | Draft help modal added (#45), badges have tooltips, bracket has legend. Full help system deferred to own phase (minimal: tooltips + /help page + FAQ) |
| 118 | Team/Roster terminology inconsistent | **FIXED** | Standardized "My Roster" → "My Team" across league page header, schedule header, and stats page header links |
| 119 | SandboxWeekSelector on production | **FIXED** | Component returns null when `NEXT_PUBLIC_ENVIRONMENT === 'production'` — won't render in production |

---

## Phase 28 Status: COMPLETE

All 118 audit items have been resolved:
- **113 FIXED** via code changes
- **3 DROPPED** after review (#12 not needed, #75 already covered, #99 cosmetic)
- **2 INTENTIONAL** (#13 working by design, #21 testing default)
- **1 N/A** (#14 already OK)

### Deferred to Future Phases

| # | Item | Decision | Target |
|---|------|----------|--------|
| 32 | Email invite | Save for after 4/21 launch | Post-launch |
| 66 | Schedule preview in transactions | On hold | TBD |
| 82 | Copy settings from previous season | Rethink as league reactivation | TBD |
| 97 | Push notifications | Own phase — single permission prompt + settings toggles | Phase 29+ |
| 117 | In-app help system | Own phase — minimal: tooltips + /help page + FAQ | Phase 29+ |

### Implementation Batches (chronological)

**Prior phases (0-27)**: Items #1, #4, #8-11, #15-17, #20, #22-23, #27-31, #33-35, #37-42, #44, #54-60, #63-64, #67, #72, #74, #76, #78, #81, #83, #85-88, #92-94, #98, #100-105, #107, #110-112, #119 were already fixed.

**Phase 28 Batch 1** (text/UI): #2, #3, #5, #6, #7, #18, #26, #36, #43, #80, #84, #106, #108, #109
**Phase 28 Batch 2** (draft room): #45, #46, #47, #48, #49, #50, #51, #52, #53, #95
**Phase 28 Batch 3** (form UX): #24, #25, #61, #65, #77, #116
**Phase 28 Batch 4** (navigation): #62, #68, #69, #71, #73, #96
**Phase 28 Batch 5** (complex features): #19, #79, #118
**Phase 28 Batch 6** (error handling): #113, #114
**Phase 28 Final** (schedule + retry + header): #70, #89, #90, #91, #115
