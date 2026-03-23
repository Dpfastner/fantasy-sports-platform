# Rivyls Platform — Complete Language Audit

> **Purpose:** Every user-facing string on the platform, organized by area. Feed this to a Claude AI agent for voice & tone analysis.
>
> **Excluded:** Terms of Service, Privacy Policy, Do Not Sell pages.
>
> **Included:** All pages, components, constants, API error messages, Help Center, Support sections.

---

## TABLE OF CONTENTS

1. [Landing Page](#1-landing-page)
2. [Welcome / Onboarding Page](#2-welcome--onboarding-page)
3. [Auth Pages](#3-auth-pages)
4. [Dashboard](#4-dashboard)
5. [League Pages](#5-league-pages)
6. [League Settings](#6-league-settings)
7. [Events Pages](#7-events-pages)
8. [Profile Pages](#8-profile-pages)
9. [Account Settings](#9-account-settings)
10. [Help Center](#10-help-center)
11. [Support Page](#11-support--contributions-page)
12. [Support Tickets](#12-support-tickets)
13. [Unsubscribe Page](#13-unsubscribe-page)
14. [Header, Footer & Navigation](#14-header-footer--navigation)
15. [Chat Components](#15-chat-components)
16. [Key Components](#16-key-components)
17. [Constants & Config Strings](#17-constants--config-strings)
18. [Admin Pages](#18-admin-pages)
19. [API Error Messages](#19-api-error-messages)

---

## 1. LANDING PAGE

### Hero Section
- **Heading:** Rivyls
- **Description:** Brackets, survivor leagues, and fantasy rosters across every sport. Compete with friends — it's free.
- **Button:** Get Started
- **Button:** Sign In

### Live & Upcoming Events
- **Heading:** Live & Upcoming
- **Link:** Browse all →
- **Badge (dynamic):** Starts in {N}d
- **Badge (dynamic):** Live
- **Badge (format):** Bracket / Pick'em / Survivor / Roster
- **Text:** {N} pool / {N} pools

### Fallback Sport Cards (no events)
- Football — Fantasy leagues with college football programs
- Hockey — Bracket predictions for NCAA hockey tournaments
- Golf — Roster competitions for major golf tournaments
- Rugby — Survivor and pick'em for the Six Nations

### How It Works
- **Heading:** How It Works
- **Step 1:** Pick Your Game — Choose a bracket, survivor league, roster competition, or fantasy league
- **Step 2:** Make Your Picks — Fill your bracket, pick survivors, draft your roster, or set your lineup
- **Step 3:** Compete & Win — Track live scores, climb the rivalry board, and talk trash with your rivals

### CTA
- **Heading:** Jump into the action
- **Description:** Free to play. Pick an event and start competing.
- **Button:** Browse Events

---

## 2. WELCOME / ONBOARDING PAGE

### Metadata
- **Title:** Rivyls — Fantasy Sports Leagues
- **Description:** Draft real teams, compete with friends, and win weekly prizes. Fantasy college football and more — Rivyls makes it simple to run the league you've always wanted.

### Nav
- RIVYLS
- Sign In
- Sign Up

### Hero
- **Heading:** Your League. Your Rivals. Your Season.
- **Description:** Draft real teams, compete head-to-head with friends, and chase weekly prizes all season long. Rivyls makes it simple to run the league you've always wanted.
- **Button:** Sign Up Free

### Pick Your Sport
- **Heading:** Pick Your Sport
- CFB — Draft real college football programs and chase weekly prizes all season long.
- Hockey — Bracket predictions for the Frozen Four and NCAA hockey tournaments.
- Golf — Build your roster and compete through the biggest tournaments in golf.
- Rugby — Survivor and pick'em leagues for the Six Nations Championship.
- **Badge:** Coming Soon

### How It Works
- **Heading:** How It Works
- **Step 1:** Create Your League — Set up a private league in minutes. Invite friends, customize your scoring rules, and choose your draft format.
- **Step 2:** Draft Your Teams — Pick real college football programs in a live snake draft. Every school you roster earns points based on real-game results.
- **Step 3:** Compete & Win — Track live scores, battle for weekly high points, and fight for the championship all the way through bowl season.

### Commissioner CTA
- **Heading:** Be a Founding Commissioner
- **Description:** Build your league first, free for life. As a founding commissioner, you'll shape the Rivyls experience and lock in permanent perks for your league.

### Email Capture Form
- **Labels:** Name (optional), Email
- **Placeholders:** Your name, you@example.com
- **Error:** Email is required.
- **Error:** Something went wrong.
- **Error:** Network error. Please try again.
- **Button:** Sign Up Free / Signing up...
- **Success heading:** You're In!
- **Success text:** We'll let you know as soon as Rivyls is ready for you.
- **Success label:** Share your referral link:
- **Button:** Copy
- **Duplicate:** Try a different email

### Built for Fans
- **Heading:** Built for Fans
- Live Draft — Real-time snake or linear drafts with customizable timers. Draft from anywhere — desktop or mobile.
- Real-Time Scoring — Watch your points update as games unfold. Every win, upset, and shutout counts toward your total.
- Weekly Prizes — Compete for weekly high-point honors. Every week is a new chance to win, keeping the excitement alive all season.

---

## 3. AUTH PAGES

### Sign Up
- **Logo:** Rivyls
- **Subtitle:** Create your account
- **Labels:** Display Name (optional), Email, Password, Confirm Password
- **Placeholders:** Your name, you@example.com, At least 6 characters, Confirm your password
- **Password strength:** Too short / Weak / Fair / Good / Strong
- **Match feedback:** Passwords match / Passwords do not match
- **Checkbox:** I confirm that I am at least 18 years of age.
- **Checkbox sub-text:** Required for fantasy sports participation per state regulations.
- **Checkbox:** I agree to the Terms of Service and Privacy Policy.
- **Button:** Create Account / Creating account...
- **Errors:** Passwords do not match / Password must be at least 6 characters / You must confirm you are at least 18 years old / You must agree to the Terms of Service and Privacy Policy / Something went wrong creating your account. Please check your connection and try again.
- **Success heading:** Check your email
- **Success text:** We sent a confirmation link to {email}. Click the link and you'll be signed in automatically.
- **Success text:** Didn't receive it? Check your spam folder or resend the confirmation email
- **Toast:** Confirmation email resent! Check your inbox.
- **Link:** Already confirmed? Sign in
- **Footer:** Already have an account? Sign in

### Login
- **Logo:** Rivyls
- **Subtitle:** Sign in to your account
- **Labels:** Email, Password
- **Placeholders:** you@example.com, Your password
- **Link:** Forgot password?
- **Button:** Sign In / Signing in... / Redirecting...
- **Error:** Something went wrong. Please check your connection and try again.
- **Footer:** Don't have an account? Create one

### Forgot Password
- **Logo:** Rivyls
- **Subtitle:** Reset your password
- **Description:** Enter your email address and we'll send you a link to reset your password.
- **Label:** Email
- **Placeholder:** you@example.com
- **Button:** Send Reset Link / Sending...
- **Success:** Check your email for a password reset link.
- **Link:** Back to Sign In
- **Error:** Something went wrong sending the reset email. Please check your connection and try again.
- **Footer:** Remember your password? Sign in

### Reset Password
- **Logo:** Rivyls
- **Subtitle:** Set a new password
- **Labels:** New Password, Confirm New Password
- **Placeholders:** At least 6 characters, Confirm your password
- **Button:** Update Password / Updating...
- **Errors:** Passwords do not match / Password must be at least 6 characters / Something went wrong resetting your password. Please try again or request a new reset link.
- **Invalid link:** Invalid or expired reset link. Please request a new one.
- **Link:** Request New Reset Link

---

## 4. DASHBOARD

### Error Banner
- Something went wrong loading your data. Try refreshing the page. If the problem persists, check your internet connection.

### Fan Zone Widget
- **Button (dismissed):** Show Fan Zone
- **Heading:** Fan Zone
- **No school set:** Pick your team to join the rivalry! Set your favorite FBS team and see how your school stacks up against the competition.
- **Button:** Set Your Favorite Team
- **With rival:** Hey {schoolName} fan! Are you going to let these {rivalName} Rivyls outdo you? Invite your fellow {schoolName} fans so your Rivyls don't win again!
- **Without rival:** Represent {schoolName} on Rivyls! Invite fellow fans and grow your school's presence.
- **Stats:** {schoolName} fans: {count} · {rivalName} fans: {count}
- **Empty chart:** Be the first to rep your school!
- **Share title:** Join Rivyls — Fantasy College Football
- **Share text:** {displayName} wants you to rep {schoolName} on Rivyls!
- **Button:** Share

### Locker Room
- **Heading:** Locker Room
- **Buttons:** Join League, Create League, Browse Events →

### Empty State
- **Heading:** No games yet
- **Description:** Create or join a league, or browse prediction events to get started.
- **Buttons:** Join with Code, Create League, Browse Events

### Active Items (cards)
- **Badges:** Week {N}, Commissioner, Co-Commish, Live, Picks needed, Eliminated, Dormant
- **Type labels:** League, Bracket, Pick'em, Survivor, Roster, Event
- **Rank text:** {N}st of {M} / {N}nd of {M} / {N}rd of {M} / {N}th of {M}
- **Member count:** {N} member / {N} members
- **Score:** {N} pts

### Featured Events
- **Heading:** Featured Events
- **Link:** Browse all →
- **Badges:** Starts in {N}d, Live, Joined

### Past & Completed
- **Heading:** Past & Completed ({N})

---

## 5. LEAGUE PAGES

### Create League
- **Back:** ← Back to Dashboard
- **Heading:** Create
- **Description:** Start a season-long fantasy league or create a pool for an upcoming event.
- **Card:** Season League — Draft teams and compete across a full season with your friends.
- **Badge:** Selected
- **Card:** Event Pool — Brackets, pick'em, or survivor for a specific tournament.
- **Link:** Browse events →
- **Labels:** League Name *, Your Team Name *, Maximum Teams, Make this league public, Description (optional), Sport
- **Placeholders:** e.g., College Football Fanatics 2025 / e.g., The Gridiron Gang / Tell your friends what this league is about...
- **Help text:** Enter a number between 1-30 / Public leagues can be found by anyone. Private leagues require an invite code. / Standard scoring · Snake draft · Change anytime in Settings / Defaults to College Football
- **Errors:** League name is required / Team name is required / Please select a sport / No season available for this sport / Your team name is required / You must be logged in to create a league / Something went wrong creating the league. Please check your connection and try again.
- **Toggle:** Hide options — description, sport / Customize — description, sport
- **Preview panel:** Review Your League / League Name / Your Team / Sport / Max Teams / Visibility / Public / Private (invite only) / Description / After creating, you'll be able to configure draft settings, invite members, and start the draft.
- **Buttons:** Edit / Creating... / Confirm & Create / Cancel / Create League & Draft
- **Confirm dialog:** Unsaved changes — You have unsaved changes. Are you sure you want to leave?

### Join League
- **Back:** ← Back to Dashboard
- **Heading:** Join a League
- **Description:** Enter the invite code from your commissioner.
- **Success heading:** You're in!
- **Success text:** You've joined {leagueName}. Head to your league to see the standings, check the schedule, and get ready for the draft.
- **Button:** Go to League
- **Step 1 description:** Enter the invite code you received from your league commissioner.
- **Label:** Invite Code
- **Placeholder:** abc123
- **Button:** Looking up... / Look Up League
- **Step 2 labels:** Sport, Season, Members, (Full), Schools per team, Scoring, Custom, Draft, Completed / Not scheduled yet
- **Team name label:** Your Team Name *
- **Placeholder:** e.g., Touchdown Titans
- **Help text:** 3-25 characters. You can change this later.
- **Buttons:** Back / Joining... / Join League
- **Errors:** Please enter an invite code / League not found. Check your invite code and try again. / Please look up a league first / Please enter a team name / Team name must be at least 3 characters / Failed to join league / Something went wrong. Please check your connection and try again.
- **Browse mode link:** Or browse open leagues and events / ← Back to invite code
- **Browse empty:** Nothing open right now — Check back soon or use an invite code to join a private league.
- **Browse sections:** Open Leagues / Events & Tournaments

### League Overview
- **Metadata:** {name} — Rivyls / {name} Standings — Rivyls / Check out the latest standings in our Rivyls fantasy college football league!
- **Subtitle:** {sport} · {season} · Week {currentWeek}
- **Badge:** Commissioner
- **Sections:** Bulletin Board, Members ({count} / {max}), League Activity, Your Team, League Details
- **Tooltips:** Bulletin Board Settings, Activity Feed Settings
- **Your Team sidebar:** View Roster → / Rank #{n} of {total} / Points / Add/Drops / Trades / 2x Picks / HP Won
- **League Details sidebar:** Teams / Draft / Complete / Not scheduled / Trade Deadline / Entry Fee / Prize Pool / More details / Schools per Team / School Limit ({n}x max) / Draft Type / Add/Drops ({n} per season) / Trades ({n} per season) / High Points (${n}/wk) / Double Points (Enabled)
- **Pre-draft hint:** {N} spot(s) remaining. Share your invite code to fill the league.
- **Share:** Share Standings / Share Recap
- **Fallback name:** Unknown

### My Team
- **Banner stats:** Standing: {n} of {total} / Total Points: {n} / Add/Drops: {used} / {max} / Trades: {used} / {max}
- **Link:** Team Settings
- **Heading:** My Roster — {team.name}
- **Label:** Week {currentWeek}
- **Empty roster:** Your roster will be filled during the draft. / Go to Draft Room
- **Empty slot:** Empty slot — Add a school
- **Watchlist:** Watchlist ({count}) / Click to collapse / Available / Unavailable / Go to Add/Drop →
- **Roster History heading:** Roster History — Schools previously on your roster and points earned while rostered
- **Table headers:** #, School, Tenure, Earned
- **Add/Drop History heading:** Add/Drop History / {used} / {max} used / Week {n} / Dropped / → / Added

### Other Team View
- **Back:** ← Back to {league.name}
- **Deleted team:** This team's owner has left the league. Their roster is frozen.
- **Banner:** Owned by {ownerName}
- **Empty roster:** This team hasn't drafted yet.

### Edit Team
- **Back:** Back to Team
- **Heading:** Edit Team
- **Success:** Team updated successfully! Redirecting...
- **Labels:** Team Name, Color Presets, Primary Color, Secondary Color, Color Preview, Team Logo (optional)
- **Placeholders:** Enter team name, #1a1a1a, #ffffff, https://example.com/your-logo.png
- **Presets:** Classic, Navy/Gold, Crimson, Navy/Orange, Steel/Gold, Purple/Gold, Green/Gold, Red/Black
- **Preview fallback:** Your Team Name
- **Logo:** Current logo / Remove logo / Upload an image / PNG, JPG, GIF, WEBP, or SVG. Max 500KB. / Or paste an image URL / Team logo preview
- **File errors:** File too large. Maximum size is 500KB. / Invalid file type. Accepted: PNG, JPG, GIF, WEBP, SVG / Logo upload failed. Please try again.
- **Buttons:** Cancel / Saving... / Save Changes
- **Confirm:** Save changes? — Save changes to your team?

### Draft Room
- **Loading:** Loading draft room...
- **Error:** Failed to load draft data. Please refresh the page.
- **Back:** ← League
- **Heading:** {leagueName} Draft
- **Status badges:** Live, Paused, Done / Completed, Not Started
- **On the clock:** ON THE CLOCK: / AUTO / R{n} P{n} / {m}:{ss} / TIME! / AUTO...
- **Commissioner buttons:** Start Draft / Waiting for teams ({n}/{n}) / Resume / Pause / Reset Draft
- **Help button tooltip:** Draft room help
- **Timer warning:** TIME EXPIRED! {team.name} must make a selection to continue the draft.
- **Your turn:** Hurry! Only {n} seconds left to make your pick! / It's your turn! Select a school from the left panel. / Your time is up! Please make your selection now.
- **Mobile tabs:** Schools ({count}), History ({count}), Teams, Chat
- **Available Schools heading:** Available Schools / Search schools by name... / All Conf. / Draft / + Queue / #{n}
- **Auto-pick toggle:** Auto-Pick / Picks will be made automatically from your queue or best available when it's your turn. / Enable to auto-draft from your queue (or best available) when it's your turn. Useful if you need to step away.
- **Draft Queue:** Draft Queue ({count}) / Auto-pick order / Drag to reorder. Auto-pick uses this order. Click '+ Queue' on any school to add it. / Move up / Move down / Remove from queue
- **Maxed schools:** Schools below have reached the league draft limit ({n} teams max) and are no longer available.
- **Draft Order Setup:** Set Draft Order / Drag to reorder or use the arrows. / Waiting for the draft to begin / Scheduled: {date} / Need at least 2 teams to start the draft / Click 'Start Draft' when everyone is ready / The commissioner will start the draft when everyone is ready.
- **Draft Rules:** Draft Rules / Format ({type} Draft) / Pick Timer ({n}s per pick) / Roster Size ({n} schools) / Draft Limit (Unlimited / {n} teams per school) / Teams ({n} teams) / Total Rounds ({n} rounds) / Snake draft: pick order reverses each round (1->12, then 12->1, etc.) / Linear draft: same pick order every round. / If time expires, auto-pick selects the best available school.
- **Random order:** Draft order is set to Random. / Change this in League Settings
- **Status messages:** Draft is paused / Draft Complete! / Return to League
- **Draft History:** Draft History / No picks yet / Auto / R{n} P{n}
- **Team Roster:** Team Roster / My Team: {name} / {teamName} (Auto) / {picked}/{total} schools drafted / No picks yet / No team selected
- **Draft Help Modal:** Draft Room Guide / How to Pick — When it's your turn, click a school from the left panel, then confirm in the popup. Two clicks total: select, then confirm. / Pick Timer — Each pick has a countdown timer. The timer turns yellow at 30s and red at 10s. If time runs out, auto-pick selects the best available school for you. / Draft Queue — Click '+ Queue' on any school to add it to your draft queue. Drag to reorder. When auto-pick runs (timer expires or auto-pick enabled), it picks the first available school from your queue. / Auto-Pick — Toggle auto-pick on to have the system automatically draft for you when it's your turn. Picks come from your queue first, then best available. Useful if you need to step away. / Draft Limit — Each school can only be drafted by a limited number of teams (shown as X/{n}). Once maxed out, the school appears greyed out and struck through at the bottom of the list. / Search & Filter — Use the search box to find schools by name, and the conference dropdown to filter by conference. / Draft Chat — Chat with other league members during the draft. On desktop, the chat panel is at the bottom-right — drag the divider to resize. On mobile, use the 'Chat' tab. / Got it
- **Pick confirm:** Confirm Pick — Are you sure you want to draft {school.name}? / Round {n}, Pick {n} / Cancel / Drafting... / Confirm Pick
- **Reset confirm:** Reset Draft? / Warning: This action cannot be undone! / This will delete all draft picks, clear the draft order, and remove all schools from team rosters. The draft will return to 'Not Started' status. / Are you sure you want to reset the draft for {leagueName}? / Cancel / Resetting... / Reset Draft
- **Paused overlay:** Draft Paused / You have paused the draft. Click below to resume. / The commissioner has paused the draft. Please wait for it to resume. / Resume Draft
- **Toasts:** Successfully drafted {school.name}! / Auto-pick: {schoolName} selected for {teamName} / Auto-pick enabled — picks will be made automatically when it's your turn / Auto-pick disabled

### Schedule
- **Heading:** Schedule
- **Toggles:** Schedule / CFP Bracket
- **Week options:** All Games / Regular Season / Postseason / Bowl Games (All) / CFP Bracket Games / National Championship
- **Week labels:** All Games / Bowl Games / College Football Playoff / National Championship / Week 0 — Early Season / Week {n} / Week 15 — Conference Championships / Week 16 — Army-Navy / Rivalry Week
- **Decorations:** ✓ (completed weeks) / ◀ Current
- **Filters:** All Games ({count}) / My Roster ({count}) / Ranked / Live ({count})
- **Empty:** No games found for the selected filters.
- **Game text:** TBD / vs / Final / LIVE / Q{quarter} {clock}
- **Badges:** Conference / CFP
- **Legend:** My Roster / Live / Ranked (#)
- **Bracket heading:** College Football Playoff Bracket

### Bracket
- **Heading:** {year} College Football Playoff
- **Description:** 12-team bracket — top 4 seeds get a first-round bye. Schools on your roster are highlighted.
- **Share:** Share Bracket / {year} CFP Bracket — {league.name} / Check out the {year} College Football Playoff bracket on Rivyls!
- **How Playoff Scoring Works:** Schools on your roster earn bonus points for each playoff round they play in. Points are awarded on top of regular game scoring. / Schools from your roster are highlighted in purple on the bracket so you can track their progress.
- **How Teams Qualify:** The 12-team CFP field is selected by the College Football Playoff Committee based on regular season performance: / Seeds 1-4: Conference champions from the top conferences, earning a first-round bye / Seeds 5-12: Remaining at-large selections based on strength of schedule, win-loss record, and committee rankings / The bracket is automatically populated once the CFP Committee announces the final selections (typically the first Sunday in December).

### Stats
- **Heading:** League Stats
- **Toggles:** Conference Standings / AP Top 25 / Heisman / Ideal Team / Weekly Max
- **Conference Standings columns:** #, Team, Conf, Overall
- **Heisman:** Heisman Winner: {player_name} / Heisman Trophy / Ceremony: December 14, {year}
- **AP Top 25:** AP Top 25 / No AP rankings available for Week {selectedWeek}. Rankings are synced weekly from ESPN.
- **Ideal Team:** Ideal Team — Best possible {schoolsPerTeam}-school roster based on season results / total points
- **Weekly Maximum:** Week {selectedWeek} Maximum — Best {schoolsPerTeam} schools for Week {selectedWeek} / No data for Week {selectedWeek} / max points / pts
- **Loading:** Loading ideal team data... / Loading weekly data...

### Transactions (Add/Drop)
- **Heading:** Add/Drop / Week {currentWeek}
- **Usage:** {addDropsUsed} used of {maxAddDrops} / {N} remaining / Deadline:
- **Status messages:** The add/drop deadline has passed. No more transactions can be made this season. / You have used all {maxAddDrops} transactions for this season.
- **Progress steps:** Select Drop / Drop / Select Add / Add / Confirm
- **Step 1:** Select a school to drop / You have an empty roster slot — Add a school without dropping / Adding: / Clear
- **Step 2:** Select a school to add / Back / Dropping: / Search... / All Conf / By Points / By Rank / By Record / By Conf Record / By Name / Ranked only / Show unavailable / Your Watchlist ({N}) / Taken / Open / {N}/{N} taken / conf / No schools match your filters / Unavailable ({N})
- **Step 3:** Confirm Transaction / Back / Dropping / Adding / {points} pts this season / This transaction will use 1 of your remaining {N} transactions. / The new school will earn points starting from Week {currentWeek}. / This transaction is permanent and cannot be undone. / The dropped school's points will no longer count toward your total. / Cancel / Confirm Transaction / Processing...
- **Sidebar:** Current Roster
- **No transactions:** The transaction deadline has passed for this season. / You have used all your transactions for this season. / View My Team
- **History:** League Transaction History ({N}) / No transactions in this league yet / (You) / Week {N}
- **Toasts:** Successfully dropped {name} and added {name} / Successfully added {name} / Transaction failed

### League History
- **Heading:** League History
- **Empty:** No past seasons yet — Seasons are automatically archived 3 days after the season ends.
- **Sections:** Seasons at a Glance / Dynasty Tracker / League Records / Archived Seasons ({count})
- **Table headers:** Season, Champion, Pts, Runner-Up, Pts, Margin
- **Dynasty:** {name} {count}x Champion / {name} Back-to-Back / No dynasties yet — keep playing!
- **Records:** Highest Single-Week Score / Highest Season Total / Closest Championship Race / Most High Points Wins (Season)

---

## 6. LEAGUE SETTINGS

### Page Header
- **Heading:** League Settings
- **Commissioner subtitle:** Manage your league settings, draft, and members
- **Non-commissioner info:** You are viewing league settings in read-only mode. Only commissioners can edit these settings.
- **Draft warning:** Draft has started. Some settings cannot be changed.

### Quick Setup
- **Heading:** Quick Setup — The essentials for your league.
- **Labels:** Scoring Preset / Draft Type / Draft Date / Max Teams
- **Buttons:** Customize / Change / Set
- **Default:** Not scheduled
- **Toggle:** Show All Settings / Back to Quick Setup (← )

### Main Tabs
- League Settings / Draft Settings / Members / Miscellaneous

### Sub-tabs
- Basic Settings / Roster Settings / Scoring / Transactions / Trades / Double Points

### Basic Settings
- **Labels:** League Name / Number of Teams (2-30) / Public League (visible to everyone) / Entry Fee ($) (optional) / Prize Pool ($) (optional)
- **Help:** Can be any number from 2-30, not just even numbers
- **Prize Distribution:** Enable Weekly High Points Prize / Weekly Amount ($) / Number of Weeks / Number of Winners / Allow Ties for High Points
- **Winner options:** 1 Winner / 2 Winners / 3 Winners
- **Tie options:** Yes - Split Prize / No - Tiebreaker
- **Percentage labels:** 1st Place % / 2nd Place % / 3rd Place %
- **Button:** Saving... / Save Basic Settings

### Roster Settings
- **Labels:** Schools per Team / Max Times a School Can Be on One Team
- **Options:** 6-20 schools (even numbers)
- **Max options:** 1 time (recommended) / 2 times / 3 times
- **Help:** How many schools each team drafts (12 recommended) / Usually 1 — each team can only have a school once
- **Button:** Saving... / Save Roster Settings

### Scoring Settings
- **Heading:** Scoring Settings
- **Preset label:** Scoring Preset
- **Presets:** Standard / Conservative / Aggressive / Chaos Mode / Custom
- **Preset descriptions:** Balanced scoring with no loss penalties. Great for first-time leagues. / Lower bonuses keep scores tight. Wins matter most, fewer blowout swings. / Higher bonuses and loss penalties. Every game matters — bad weeks hurt. / Massive swings. Upsets rewarded, losses punished hard. Not for the faint of heart.
- **Custom note:** You have custom scoring values. Select a preset to reset all fields, or adjust individual values below.
- **Scoring Summary headers:** Scoring Summary / Win / Loss / Conference Game / Conference Game (L) / 50+ Points / Shutout / Beat Top 10 / Beat Top 25
- **Special Events:** Conf Championship Win / Heisman Winner / Bowl Appearance / CFP First Round / CFP Quarterfinal / CFP Semifinal / Championship Win / Championship Loss
- **Custom fields — Regular Game Points:** Wins / Losses
- **Win fields:** Base Win Points / Conference Game Bonus / Score Over 50 Bonus / Shutout Bonus / Beat Ranked Top 25 / Beat Ranked Top 10
- **Loss fields:** Base Loss Points / Conference Game Loss / Lose by 50+ Points / Get Shut Out / Lose to Ranked Top 25 / Lose to Ranked Top 10
- **Special Events fields:** Conference Championship Win / Conference Championship Loss / Heisman Winner / Bowl Appearance
- **Playoff Points:** First Round / Quarterfinal / Semifinal
- **National Championship:** Championship Win / Championship Loss
- **Buttons:** Reset to Defaults / Saving... / Save Scoring Settings
- **Confirm:** Reset scoring? — Reset all scoring values to the Standard preset? You can still adjust individual values after.

### Transaction Settings
- **Labels:** Final Add/Drop Deadline (optional) / Max Add/Drops per Season
- **Help:** Last date teams can make add/drop transactions (usually Monday before Week 7) / Total number of add/drops allowed per team (50 recommended)
- **Button:** Saving... / Save Transaction Settings

### Trade Settings
- **Toggle:** Enable Trades — Allow teams to propose and accept trades with each other
- **Labels:** Trade Deadline (optional) / Max Trades per Season
- **Help:** After this date, no new trades can be proposed or accepted. Pending trades will expire. Leave blank for no deadline. / Maximum number of completed trades allowed per team per season (10 recommended)
- **Button:** Saving... / Save Trade Settings
- **Trade Veto section:** Recent Trades — Veto accepted trades to reverse roster changes. Both teams will be notified.
- **Trade text:** traded / for / from
- **Badge:** Vetoed
- **Button:** Veto
- **Veto form:** Reason for veto / e.g. Unfair trade, collusion suspected / Cancel / Vetoing... / Confirm Veto

### Double Points
- **Heading:** Double Points Pick
- **Description:** Allow team owners to pick one school per week to receive double points. The pick must be made before the first game of the week.
- **Toggle:** Enable Double Points — Allow teams to pick one school per week for 2x points
- **Label:** Max Double Picks per Season
- **Options:** Unlimited / 3 picks / 5 picks / 8 picks / 10 picks / 12 picks / 15 picks
- **Help:** 0 = unlimited double picks throughout the season
- **Button:** Saving... / Save Double Points Settings

### Draft Configuration
- **Heading:** Draft Configuration
- **Labels:** Draft Date & Time (optional — visible to members as a countdown) / Draft Type / Draft Order / Pick Timer / Max Times a School Can Be Drafted (All Teams)
- **Help text:** When your league will draft. Members see a countdown on the league page. You still start the draft manually from the Draft Room. / Displays as: {formatted date} / Drag teams to set your preferred order below / Teams will be randomly ordered when the draft begins / How many different teams can draft the same school. 1 = exclusive (once drafted, nobody else can pick that school). 3 = up to 3 teams can share a school.
- **Draft Type options:** Snake (order reverses each round) / Linear (same order each round)
- **Draft Order options:** Random (shuffled when draft starts) / Manual (set order in draft room)
- **Pick Timer options:** 30 seconds / 45 seconds / 60 seconds (recommended) / 90 seconds / 120 seconds (2 min)
- **Max School options:** 1 time (exclusive) / 2 times / 3 times (recommended) / 4 times / 5 times / Unlimited
- **Draft Order section:** Draft Order / Drag to reorder or use the arrows. / Draft order cannot be changed after the draft has started.
- **Button:** Saving... / Save Draft Settings
- **Danger Zone:** Reset the draft to start over. This will delete all picks, clear the draft order, and remove all schools from team rosters. / Reset Draft

### Members
- **Heading:** League Members
- **Empty:** No members yet.
- **Table headers:** Team, Name, Email, Second Owner, Role, Paid
- **Fallbacks:** No team / Unknown / N/A / None / -
- **Second Owner actions:** Enter email / Add / Cancel / Remove / Add Second Owner
- **Roles:** Commissioner / Co-Commissioner / Member / Transfer Commissioner
- **Payment:** Paid / Unpaid
- **Button:** Remove
- **Summary:** Summary / Total Members: / With Teams: / Paid: /

### Miscellaneous
- **League Home Page Sections:** Choose which sections appear on your league home page.
- **Toggles:** Bulletin Board — Post updates and news for your league members / League Chat — Real-time chat with your league members / League Activity Feed — Auto-generated feed of draft picks, transactions, and more
- **More Tools / Coming Soon:** Export league data / Manual score adjustments

### Footer
- ← Back to League

### Messages
- League not found / You are not a member of this league / Settings saved successfully! / Failed to save settings. Please check your connection and try again. / League settings saved! / Failed to save league settings. Please check your connection and try again. / Please provide a reason for the veto / Trade vetoed. Rosters have been reversed. / Failed to veto trade / Failed to update payment status. Please try again. / Are you sure you want to remove {memberName} from the league? / Member removed successfully / Failed to remove member. Please try again. / Are you sure you want to transfer commissioner role? You will become a co-commissioner. / Role updated successfully / Failed to change role. Please try again. / No user found with that email address / Second owner added / Failed to update second owner. Please try again. / Second owner removed / Failed to remove second owner. Please try again. / Failed to update setting. Please try again. / Draft reset successfully!

---

## 7. EVENTS PAGES

### Events Listing
- **Metadata:** Events — Rivyls / Browse and join bracket predictions, survivor leagues, and pick'em competitions across multiple sports.
- **Heading:** Events
- **Subtitle:** Brackets, survivor leagues, and pick'em competitions across every sport.
- **Empty:** No events available yet — Check back soon for upcoming tournaments and competitions.
- **Sport labels:** Football / Hockey / Golf / Rugby / Basketball / Baseball / Soccer
- **Format labels:** Bracket / Pick'em / Survivor
- **Badges:** Starts in {N}d / Live / Joined

### Event Detail
- **Format labels:** Bracket Prediction / Pick'em / Survivor League / Roster Pool / Multi-format
- **Participant headers:** Teams / Field / Participants
- **Tier badges:** A / B / C
- **Rules toggle:** Rules

### Event Pools (EventPoolsClient)
- **Heading:** Pools ({count})
- **Buttons (logged in):** Join Pool / Create Pool
- **Join form:** Join with Invite Code / Enter code... / Join / Joining...
- **Create form heading:** Create a New Pool
- **Labels:** Pool Name / Game Type / Draft Mode / Visibility / Tiebreaker / Max Entries (optional) / Entries Per User
- **Placeholder:** My {format} Pool
- **Game types:** Bracket / Pick'em / Survivor / Roster / Multi-format
- **Draft modes:** Open Pick (Everyone picks independently) / Limited Pick (Shared picks with selection cap) / Snake Draft (Turn-based, reverses each round) / Linear Draft (Turn-based, same order each round)
- **Selection cap label:** Max times a golfer can be drafted across all rosters
- **Visibility:** Private / Public
- **Tiebreaker options:** None / Championship score / First match score / Most upsets / Random
- **Entries per user:** 1 (standard) / Up to 3 / Up to 5 / Up to 10
- **Helper:** How many entries each user can submit
- **Buttons:** Cancel / Create Pool / Creating...
- **Not logged in:** Sign in to create or join pools / Sign In
- **Empty pool list:** No pools yet — Be the first to create a pool for this event!
- **Pool card badges:** Joined / {formatLabel}
- **Pool card text:** {count} entry / {count} entries / / {max_entries} max / {N} entries/user / TB: {tiebreakerLabel}
- **Toasts:** Pool name must be at least 2 characters / Failed to create pool / Pool created! Invite code: {inviteCode} / Something went wrong / Enter an invite code / Failed to join pool / Joined pool!

### Pool Detail (PoolDetailClient)
- **Status badge:** {pool.status}
- **Creator badge:** Creator
- **Info line:** {tournament.name} · {count} member / {count} members / / {maxEntries} max
- **Invite code:** Code: / Copy / Copied! / Share
- **Share text:** Join {pool.name} on Rivyls / Join my {format} pool "{pool.name}" for {tournament.name}! Use code: {inviteCode}
- **Deadline:** Deadline: {date} / Locks at first game: {date}
- **Not a member:** You're not in this pool yet. / Use invite code {inviteCode} to join from the event page.
- **Bracket CTA:** Fill out your bracket! / Picks lock {date} / Start Your Bracket
- **Roster CTA:** Build your roster! / Rosters lock {date} / Rosters lock at first tee time / Build Your Roster
- **Other CTA:** Make your picks! / Picks lock {date} / Picks lock at first tee time / Make Your Picks
- **Rules toggle:** Tournament Rules
- **Tabs:** Overview / My Bracket / My Brackets ({count}) / My Roster / Draft Room / My Picks / Schedule / Rivalry Board / Members ({count}) / Settings
- **Entry selector:** Entry {index} / + Add Entry
- **Roster Schedule columns:** # / Golfer / R1 / R2 / R3 / R4 / Score
- **Score display:** E (even par) / +{number} / {negative number} / — / CUT
- **Roster empty:** No scores yet. Rivalry board will update when the tournament begins.
- **Toasts:** New entry created! / Failed to add entry / Something went wrong / Invite code copied! / Failed to copy

### Pool Members Tab
- **Member text:** {rank} / {displayName} / Eliminated / Picks in / No picks yet
- **Remove button:** Remove
- **Confirm:** Remove member — Remove {displayName} from the pool?
- **Toasts:** Member removed / Failed to remove / Something went wrong

### Pool Settings Tab
- **Pool Settings heading:** Pool Settings
- **Labels:** Pool Name / Visibility / Tiebreaker / Max Entries / Entries Per User
- **Buttons:** Private / Public / Saving... / Save Settings
- **Roster Settings:** Roster Settings / Draft Mode / Selection Cap / Roster Size / Count Best / Cut Penalty
- **Draft modes:** Open Pick / Everyone picks independently / Limited Pick / Shared picks with cap / Snake Draft / Reverses each round / Linear Draft / Same order each round
- **Selection cap options:** Max {n} entries per golfer
- **Roster size options:** {n} golfers
- **Count best options:** Best {n} of {rosterSize}
- **Cut penalty options:** Field High +1 / No Penalty
- **Scoring Rules:** Scoring Rules / Standard (Balanced scoring across all rounds) / Upset Heavy (Early rounds worth more — rewards bold picks) / Final Four Focus (Late rounds heavily weighted) / Custom (Custom scoring — adjust individual round values below.)
- **Round labels:** Quarterfinal / Regional Final / Frozen Four / Championship / pts
- **Invite Members:** Share this code or link with friends to invite them to your pool. / Copied! / Copy Code
- **Pool Info:** Pool Info / Format / Status / Members / Tiebreaker / Lock Time
- **Toasts:** Settings saved / Failed to save settings / Something went wrong

### Edit Entry
- **Back:** Back to {poolName} / Back to Pool
- **Heading:** Edit Bracket Entry / Edit Pick'em Entry / Edit Survivor Entry / Edit Roster Entry / Edit Entry
- **Success:** Entry updated! Redirecting...
- **Labels:** Entry Name / Color Presets / Primary Color / Secondary Color / Preview / Entry Logo (optional)
- **Placeholders:** Give your entry a name / #1a1a1a / #ffffff
- **Presets:** Classic / Navy/Gold / Crimson / Navy/Orange / Steel/Gold / Purple/Gold / Green/Gold / Red/Black
- **Preview fallback:** My Entry
- **Logo:** Upload an image / PNG, JPG, GIF, WEBP, or SVG. Max 500KB. / Current logo / Remove logo / Or paste an image URL
- **Errors:** File too large. Maximum size is 500KB. / Invalid file type. Accepted: PNG, JPG, GIF, WEBP, SVG / Logo upload failed. Please try again.
- **Buttons:** Cancel / Save Changes / Saving...

---

## 8. PROFILE PAGES

### My Profile
- **Back:** ← Dashboard
- **Fallback name:** Unknown User
- **Text:** Member since {date}
- **Button:** Edit Profile
- **Banner section:** Your Team / Click to change your featured banner / Your team banner / Choose your featured banner / Your banner / Tap to swap colors
- **Empty favorites:** Join a league to collect your first team banner →
- **Trophy Case:** Trophy Case / {badge.label} / Share
- **My Leagues heading:** My Leagues
- **Empty leagues:** You haven't joined any leagues yet. Create one or join with an invite code.
- **Section headings:** COMMISSIONER / MEMBER / PAST SEASONS
- **Badges:** (Co-Commissioner) / Dormant / {N} teams
- **Invite Friends heading:** Invite Friends
- **Invite text:** Share your referral link to invite friends to Rivyls. Referrals help you earn badges and unlock future rewards.
- **CopyButton:** Copy Link / Copied!
- **ShareButton:** Share / Copy Link / Copied! / Share on X / Facebook / WhatsApp / Instagram / TikTok / Download Image
- **Share data:** Join Rivyls — Fantasy College Football / {displayName} wants you to start a league on Rivyls!

### Other User's Profile
- **Metadata:** {name} — Rivyls / {name}'s Trophy Case — Rivyls / Check out {name}'s badges and achievements on Rivyls Fantasy Sports.
- **Fallback:** Rivyls Player / ?
- **Badge:** Pro
- **Text:** Member since {month} {year}
- **Empty trophies:** No badges earned yet.
- **CTA:** Play Fantasy College Football on Rivyls / Get Started Free

---

## 9. ACCOUNT SETTINGS

- **Back:** ← Dashboard
- **Heading:** Account Settings

### Profile Section
- **Heading:** Profile
- **Labels:** Display Name / Alma Mater or Favorite FBS Team (optional) / Timezone
- **Placeholder:** Your display name / Search for a school... / Loading schools...
- **School search:** No schools found / Type to search...
- **US timezone options:** Eastern (ET) / Central (CT) / Mountain (MT) / Pacific (PT) / Arizona (MST) / Alaska (AKT) / Hawaii (HST)
- **International:** Outside the US? Find your timezone / Current: / Search timezone (e.g. London, Tokyo, Sydney) / No timezones found. Try a city name like "London" or "Tokyo". / Back to US timezones
- **Button:** Save Profile / Saving...

### Email Section
- **Heading:** Email Address
- **Labels:** Current Email / New Email
- **Placeholder:** new@email.com
- **Button:** Update Email / Sending...
- **Help:** A confirmation email will be sent to your new address.

### Password Section
- **Heading:** Change Password
- **Labels:** New Password / Confirm New Password
- **Placeholders:** New password / Confirm new password
- **Button:** Update Password / Updating...

### Notifications Section
- **Heading:** Notifications

#### In-App Notifications
- **Title:** In-App Notifications — Notifications in your notification bell
- **Toggles:**
  - Draft Notifications — Draft started, your turn to pick, picks made, and draft completed
  - Game Results — Weekly score updates when games are completed
  - Trade Notifications — Trade proposals, acceptances, rejections, vetoes, and expirations
  - Transaction Confirmations — Confirmation when add/drop transactions are processed
  - Bulletin Board — Updates posted by your league commissioners
  - Chat Mentions — When someone mentions you in league chat
  - League Activity — Members joining your league and other league events

#### Push Notifications
- **Title:** Push Notifications — Browser notifications even when you're not on Rivyls
- **Blocked:** Blocked by browser settings
- **Toggle:** Enable Push Notifications / Updating...
- **Enabled text:** You will receive browser notifications
- **Disabled text:** Get alerts even when you're not on the site
- Same toggle list as In-App

#### Email Notifications
- **Title:** Email Notifications — Email notifications you'd like to receive
- **Toggles:** Game Results / Draft Reminders — Reminders when your draft is about to start / Transaction Confirmations / Bulletin Board — Updates from your league commissioners
- **Button:** Save Notifications / Saving...

### Danger Zone
- **Heading:** Danger Zone
- **Description:** Permanently delete your account and all associated data. This action cannot be undone.
- **Button:** Delete My Account
- **Teams list:** Your teams in active leagues: / {teamName} in {leagueName}
- **Confirm text:** This will permanently delete your account and anonymize your data. Your teams will be renamed to "Deleted Team" and frozen — league standings and history will be preserved. Type DELETE to confirm.
- **Placeholder:** Type DELETE to confirm
- **Buttons:** Cancel / Permanently Delete / Deleting...

### Toasts
- Profile updated successfully! / Failed to update profile: {error} / New email is the same as current email / Confirmation email sent to your new address. Please check your inbox. / Failed to update email: {error} / Passwords do not match / Password must be at least 6 characters / Password updated successfully! / Failed to update password: {error} / Notification preferences saved! / Failed to save notifications: {error} / Failed to update push notifications. Please try again.

---

## 10. HELP CENTER

### Page
- **Metadata:** Help Center — Rivyls / Get help with Rivyls fantasy college football. Learn how leagues, drafts, scoring, trading, and more work.
- **Nav:** RIVYLS / ← Back
- **Heading:** Help Center
- **Subtitle:** Everything you need to know about Rivyls fantasy college football.
- **Search placeholder:** Search help topics...
- **Empty search:** No results found for "{search}" / Clear search

### Getting Started

**What is Rivyls?**
Rivyls is a fantasy college football platform where you draft real schools (not individual players) and earn points based on actual game results throughout the season. Create or join a league, draft your schools, and compete against friends all season long.

**How do I create a league?**
Go to your Dashboard and click "Create League." You'll set a league name, choose the number of teams (4-16), and configure scoring rules. As the commissioner, you control all league settings. Once created, share the invite code with friends so they can join.

**How do I join a league?**
You need an invite code from the league commissioner. Go to your Dashboard, click "Join League," and enter the code. You'll be added to the league and can create your fantasy team. If you received a link, just click it and sign up — you'll be redirected to the league automatically.

**How many schools are available to draft?**
There are 134 FBS (Football Bowl Subdivision) college football programs available to draft. These include all major conference schools (SEC, Big Ten, Big 12, ACC) plus independents like Notre Dame and Army.

### Events & Prediction Games

**What are Events?**
Events are prediction-based competitions tied to real sports tournaments (like the NCAA Frozen Four or The Masters). Unlike fantasy leagues where you draft teams for a full season, events let you make predictions — fill out a bracket, pick game winners, or play survivor-style elimination games.

**What game formats are available?**
Three formats: Bracket (predict the winner of every game in a tournament), Pick'em (pick game winners each week), and Survivor (pick one team per week — if they lose, you're eliminated). Each pool can have its own scoring rules and tiebreakers.

**How do I create or join an event pool?**
Browse Events from the dashboard. Pick a tournament, then either create a new pool (you'll get an invite code to share) or join an existing one with a code. Pools can be public (anyone can find and join) or private (invite code required).

**Can I submit multiple brackets in one pool?**
If the pool creator allows it (via the "Entries Per User" setting), you can add multiple entries. Each entry has its own picks, name, colors, and logo. Switch between your entries using the selector on the My Bracket tab.

**How does bracket scoring work?**
You earn points for each correct pick. Points increase in later rounds — for example, 2 points for quarterfinals up to 16 points for the championship. The pool creator can choose from scoring presets (Standard, Upset Heavy, Final Four Focus) or set custom point values for each round.

**How do roster pools work?**
In a roster pool, you build a team by selecting participants from different skill tiers (e.g., Tier A: top-ranked, Tier B: mid-ranked, Tier C: lower-ranked). Each tier has a set number of picks. Your best scores count toward your total — for example, best 5 of 7 in a golf roster. This format is used for tournaments like The Masters where individual performance is scored.

**How is golf scoring calculated in roster pools?**
Golf roster pools use score-to-par (e.g., -5, E, +3). Your total is the sum of your best counting golfers' scores-to-par. Lower is better — just like real golf. Scores update live during tournament rounds, and you can see round-by-round breakdowns (R1-R4) for each golfer in your roster.

**What are multi-format events?**
Some tournaments offer multiple pool types under one event. For example, The Masters might have both pick'em pools (predict matchup winners) and roster pools (build a golfer roster). You can join different pool types within the same event and compete separately in each.

**What sports are available for events?**
Events are available across multiple sports including college hockey, golf, college football, and more as they're added. Each sport has its own tournaments and game formats.

### Drafts

**How does the draft work?**
The commissioner sets a draft date and time. When the draft starts, teams take turns selecting schools in real-time. Each pick has a timer (set by the commissioner). If the timer runs out, the system auto-picks for you. The draft room includes live chat so you can talk with your league while drafting.

**What draft formats are available?**
Two formats: Snake draft (pick order reverses each round — 1-2-3 then 3-2-1) and Linear draft (same order every round — 1-2-3 then 1-2-3). Snake is the most common and gives everyone a fair shot at top schools.

**What happens if I miss my draft pick?**
If the pick timer expires, the system auto-picks the highest-ranked available school for you. You can also enable auto-pick manually if you need to step away — the system will draft for you based on rankings.

**Can the commissioner pause the draft?**
Yes. The commissioner can pause and resume the draft at any time. This is useful for breaks or if someone is having technical issues. All league members are notified when the draft is paused or resumed.

**How is draft order determined?**
Draft order is randomized when the commissioner starts the draft. The commissioner can also manually set the draft order before starting.

### Scoring

**How are points calculated?**
Points are earned per game based on your drafted schools' real results. The default scoring is: Win (+1), Conference Game (+1), Score 50+ Points (+1), Shutout Opponent (+1), Beat a Top 10 Team (+2), Beat a #11-25 Team (+1). Commissioners can customize all point values.

**When do scores update?**
During gamedays (typically Saturdays), scores update every few minutes using live ESPN data. Final scores are locked after games complete, and points are calculated automatically. A nightly reconciliation job verifies all totals are accurate.

**What is Double Points?**
Each week, you can select one school on your roster to earn double points. If that school wins and earns 3 points, you get 6 instead. Choose wisely — you can only pick one school per week, and you must make your selection before games start.

**What is Weekly High Points?**
If enabled by the commissioner, the team that scores the most points in a given week wins a weekly prize. The commissioner sets the prize amount. This encourages week-to-week competition even if you're behind in the overall standings.

**Do bowl games and playoffs count?**
Yes! Bowl games, conference championships, and College Football Playoff games all count for points. Playoff games have escalating multipliers, making them especially valuable. The season spans 23 scoring weeks (Weeks 0-22), covering regular season through the National Championship.

**Can the commissioner customize scoring?**
Yes. Commissioners can adjust point values for every scoring category (wins, conference games, ranked upsets, shutouts, 50+ point games) and set multipliers for postseason games. Preset templates are available for quick setup.

### Roster Management

**How do add/drops work?**
You can drop a school from your roster and pick up an undrafted school. Go to your team page, click "Drop" next to a school, then select an available school to add. The commissioner sets limits on how many add/drops you can make per season.

**Are there add/drop limits?**
The commissioner configures the maximum number of add/drop transactions allowed per season. Check your league settings to see your limit and how many you've used. Once you hit the limit, you cannot make more moves until the next season.

**How does trading work?**
You can propose a trade to another team — offering one or more of your schools for one or more of theirs. The other team can accept or reject. If accepted, the commissioner (or league vote, depending on settings) can veto unfair trades. Once approved, the schools swap rosters immediately.

**Can trades be vetoed?**
Yes. The commissioner can veto any trade they believe is unfair or collusive. When a trade is vetoed, both teams are notified and the trade is cancelled. Schools stay on their original rosters.

### Commissioner Tools

**What can commissioners do?**
Commissioners have full control over their league: set scoring rules, configure draft settings, manage members (invite, remove), post to the bulletin board, veto trades, appoint co-commissioners, and manage season settings. Commissioners cannot edit scores — only the platform admin can override scores if needed.

**What is a co-commissioner?**
Commissioners can promote any member to co-commissioner. Co-commissioners have the same management powers as the commissioner, which is useful for sharing league administration duties.

**How does the Bulletin Board work?**
Commissioners can post to the Bulletin Board, which appears at the top of the league page. All members receive a notification when a new post is published. Use it for rule reminders, trade deadline warnings, weekly updates, or schedule posts in advance.

**Can I run my league again next season?**
Yes! After the season ends, your league goes dormant automatically. When the next season approaches, you'll see a "Start New Season" button on your league page. Reactivating keeps all your members — everyone gets a fresh team and a new draft.

### Account & Settings

**How do I change my display name?**
Go to Settings from the dropdown menu in the top right. You can update your display name, which appears across all your leagues.

**How do I change the color theme?**
Go to Settings and look for the Palette/Theme section. Rivyls offers 4 color palettes — pick the one you like best. Your choice is saved and applies across the whole site.

**Can I delete my account?**
Yes. Go to Settings and scroll to the bottom. Account deletion is permanent. Your fantasy teams will be soft-deleted to preserve league history integrity, but your personal data (email, name) will be removed.

**How do referral links work?**
Each user has a unique referral link on their Profile page. Share it with friends — when they sign up through your link, it's tracked on your profile. Referrals help you earn badges and may unlock future rewards.

### Troubleshooting

**I can't join a league with my invite code.**
Make sure the code is entered exactly as provided (codes are case-sensitive). If the league is full (reached max teams), you won't be able to join. Ask the commissioner to check the league capacity or send a new code.

**The draft timer seems frozen.**
Try refreshing the page. If the issue persists, the commissioner may have paused the draft. Check the draft chat for updates. If you're on a slow connection, the real-time updates may be delayed — your picks will still be saved.

**My scores don't look right.**
Scores update throughout gameday and may take a few minutes to reflect final results. A nightly reconciliation job runs every day to verify and fix any discrepancies. If scores still look wrong after 24 hours, use the "Report Issue" feature in Settings to let us know.

**I'm not receiving notifications.**
Check your notification preferences in Settings. Make sure in-app notifications are enabled for the categories you want (trades, draft reminders, game results). The notification bell in the header shows your unread count.

**How do I report a bug?**
Go to Settings and use the "Report an Issue" section at the bottom of the page. Describe what happened, what you expected, and include any relevant details. Our team reviews all reports.

---

## 11. SUPPORT / CONTRIBUTIONS PAGE

- **Metadata:** Support Rivyls / Help keep Rivyls free. Support the platform with a voluntary contribution.
- **Nav:** RIVYLS / ← Back
- **Heading:** Support Rivyls
- **Description:** Rivyls is built by one person, runs on zero outside funding, and is completely free to play. Every dollar of support goes directly toward keeping the platform running and making it better for your league.
- **Disclaimer:** This is not a required purchase and does not unlock any features or provide any in-game advantage. Rivyls is free. This is purely voluntary support for an independent platform.
- **Section heading:** Where your support goes
- **Cards:** Servers & hosting (Database, API, live scoring infrastructure) / New features (Multi-sport expansion, mobile app, tools) / Keeping it free (No entry fees, no house edge, no paywall) / Game day reliability (Live scoring, real-time drafts, zero downtime)
- **Buttons:** $3 (Buy a coffee) / $5 (Cover a day of hosting) / $10 (Fund a feature) / Custom (You choose)
- **Fallback:** Support links coming soon
- **Alternative support:** You can also support Rivyls by starting a league, inviting a friend, or sharing on social media.
- **Share button:** Share Rivyls
- **Share data:** Rivyls — Free Fantasy Sports / Check out Rivyls — a free fantasy sports platform for college sports!
- **Footer disclaimer:** Rivyls LLC is a for-profit company. Contributions are not tax-deductible.

---

## 12. SUPPORT TICKETS

### Ticket List (/tickets)
- **Heading:** My Support Tickets
- **Link:** Help Center
- **Empty:** No support tickets yet. / Use the report button in the bottom-left corner to submit a ticket.
- **Badges:** {category} (bug / feature / other) / {status} (new / in progress / resolved)
- **Reply count:** {N} reply / {N} replies
- **Timestamps:** Last activity {date} / Submitted {date}

### Ticket Detail (/tickets/[reportId])
- **Back:** ← Back to tickets
- **Badges:** {category} / {status} / {date}
- **Page source:** Submitted from: {page}
- **Resolved banner:** This ticket has been resolved. You can still reply to reopen it.
- **Empty thread:** No responses yet
- **Admin label:** Rivyls Team
- **AI indicator:** AI (AI-assisted response)
- **Reply form placeholder:** Type your reply...
- **Button:** Send Reply / Sending...
- **Error:** Failed to send reply

---

## 13. UNSUBSCRIBE PAGE

- **Loading:** Processing... / Updating your email preferences.
- **Success:** Unsubscribed / You've been unsubscribed from promotional emails. You'll still receive essential account notifications. / You can manage your preferences in Account Settings
- **Error:** Something went wrong / We couldn't process your unsubscribe request. Please try again or manage your preferences in Account Settings
- **Invalid:** Invalid Link / This unsubscribe link is missing or invalid. You can manage your email preferences in Account Settings
- **Footer:** ← Back to Rivyls

---

## 14. HEADER, FOOTER & NAVIGATION

### Header
- **Logo:** Rivyls
- **Fallback name:** User
- **Chat button tooltip:** Toggle chat
- **Confirm dialog:** Sign out? / Are you sure you want to sign out?
- **Mobile links:** My Team
- **Menu items:** Profile / Settings / Sign out

### Footer
- © 2026 Rivyls. All rights reserved.
- **Links:** Terms / Privacy / Do Not Sell / Help / Support Rivyls

### League Nav (active)
- Overview / My Team / Records / Schedule / Add/Drop / History / League Settings
- **Postseason:** Bracket

### League Nav (dormant)
- Overview / History

### Breadcrumbs
- Dashboard / My Team / Schedule / Standings / Add/Drop / Bracket / History / Settings / Draft / Edit

### League Dropdown
- **Header:** Your Leagues
- **Empty:** No leagues found

### Team Dropdown
- **Badge:** You

### Admin Nav
- **Logo:** Rivyls
- **Items:** Home / Data Sync / Badges / Analytics / Users / Reports / Scores / Monitoring

---

## 15. CHAT COMPONENTS

### Chat Messages
- **Time:** just now / {N}m ago / {N}h ago / yesterday / {N}d ago
- **Fallback name:** Unknown
- **Loading:** Loading messages...
- **Empty:** No messages yet. Start the conversation!
- **Buttons:** Unpin / Add reaction / Pin message / Unpin message
- **Reactions header:** Reactions
- **Reaction emoji set:** 👍 👎 😂 🔥 ❤️ 😮 🏈 🏆 🎉
- **Tooltip:** Click to react, double-click for details

### Chat Input
- **Placeholder:** Message...
- **Error:** Failed to send message
- **Buttons:** Trash Talk / GIF

### Chat Sidebar
- **Fallback:** You
- **No channel:** Chat
- **Sections:** Competitions / Direct Messages
- **Badge:** 99+ (overflow)
- **Button:** New Message
- **Button tooltips:** Open chat / Back to channels / Close chat

### Channel List
- **Sections:** Competitions / Direct Messages
- **DM picker:** Search members... / Loading... / No members found / No members available
- **Empty:** Join a league or pool to start chatting
- **Button:** New message

### GIF Picker
- **Heading:** GIFs
- **Placeholder:** Search GIFs...
- **States:** Loading... / No GIFs found
- **Attribution:** Powered by GIPHY

### Trash Talk Picker
- **Heading:** Trash Talk
- **Button:** Shuffle
- **Categories:** General / After a Win / After a Loss / Trade Taunt

### Trash Talk Strings (all prompts)

**General:**
- Your team is softer than a pillow fight
- I've seen better rosters in a dumpster fire
- My grandma could draft a better team
- You call that a roster? I call it charity
- Keep dreaming, that trophy is mine
- Your picks are giving participation trophy energy
- I'd say good luck but you're gonna need a miracle
- Is your team named after a disappointment? Because it should be
- You should rename your team 'Almost Good Enough'
- I'm not worried about your team. Nobody is.

**After a Win:**
- Another week, another W. You love to see it
- That win felt too easy honestly
- Scoreboard don't lie
- Somebody come get their team, they're lost out here
- Call me the commish of winning
- Your team took an L so hard it needs a timeout
- That wasn't a competition, that was a tutorial
- Better luck next week... actually, maybe not

**After a Loss:**
- That's called a fluke. Watch me bounce back
- I let you have that one. Don't get used to it
- One bad week doesn't make a season
- The comeback starts NOW
- I was sandbagging. Championship mode loading...
- My team was just resting for the playoffs

**Trade Taunt:**
- Thanks for the steal! Enjoy your consolation prize
- That trade is gonna haunt you all season
- You gave me a first-round pick for a benchwarmer? Thanks!
- Best trade I ever made. Can't say the same for you
- I'll send flowers when you realize what you gave up
- Thanks for making my team championship-ready

### Mobile Chat Peek
- Tap to open {channel.name} chat / Tap to open chat

---

## 16. KEY COMPONENTS

### Roster List (RosterList.tsx)
- **Header:** Roster / Preview Week:
- **Week options:** Week {n} (Current) / Week 17 (Bowls) / Week 18 (CFP R1) / Week 19 (CFP QF) / Week 20 (CFP SF) / Week 21 (NC) / Week 22 (Heisman)
- **Buttons:** Reset / Hide Weekly Points / Show Weekly Points
- **Column headers:** # / School / 2x / Opponent / Week {n} Matchup / Status / Total
- **Game status:** vs / @ / LIVE / Final / Upcoming / Bye week / TBD
- **Points:** pts / +{n} pts
- **W/L/T:** W / L / T
- **Event bonuses:** Conf Champ / Bowl / CFP R1 / CFP QF / CFP Semi / Natl Champ / Runner-up / Heisman
- **Schedule modal:** Season Schedule / No games scheduled
- **Footer info:** Double Points: {picksUsed}/{max} used / Double Points: Unlimited / Double Points: Disabled / Deadline passed for this week
- **Tooltips:** View schedule / Click to view schedule / Remove 2x / Deadline passed / Click to remove 2x selection / Cannot change after deadline

### Leaderboard (LeaderboardClient.tsx)
- **Heading:** Rivalry Board
- **Live indicator:** Live
- **Week/season:** Week {currentWeek} / {seasonName} - Week {currentWeek} / Updated {time}
- **High Points badge:** High Points: ${amount}/week
- **Share:** Share Recap / {leagueName} — Week {currentWeek} Recap / Check out the Week {currentWeek} standings!
- **Pre-season:** Scores will update when games begin. Check back once the season kicks off!
- **Scroll hint:** Scroll right for weekly breakdown
- **Table headers:** # / Team / Total / Heis / Bowls / CFP / Natty / HP $
- **HP tooltip:** High Points: weekly bonus for the highest-scoring team
- **Week labels:** W0 / W{n} / Bowls / CFP / Natty
- **Deleted team:** Deleted Team / --
- **HP section:** High Points Winners / {points} pts / ${amount}
- **Legend:** High Points / Your Team / Live / High Points Winner / Live Updates Active
- **League Insights:** League Insights / Ideal Team (Best possible draft based on season results) / total points / Week {currentWeek} Maximum (Best possible points this week) / max points

### Invite Code Card
- **Label:** Invite Code:
- **Tooltip:** Click to copy invite code
- **Feedback:** Copied!
- **Description:** Reusable — anyone can join with this code until the league is full.
- **Share:** Share Invite / Join {leagueName} on Rivyls! / Join my fantasy college football league "{leagueName}" on Rivyls! Use invite code: {inviteCode}

### League Activity Feed
- **Time:** just now / {N}m ago / {N}h ago / yesterday / {N}d ago
- **Empty:** No recent activity yet. Events like draft picks, transactions, and more will appear here.
- **Events:** {name} joined the league / {name} created the league / League settings were updated / Draft started / Draft completed / {name} made a draft pick / {name}'s pick was skipped / Draft was reset / Draft was paused / Draft was resumed / {name} made an add/drop / {name} set a double points pick / {name} removed a double points pick / {name}'s role was changed / A member was removed / Payment status updated / A second owner was added / A second owner was removed / {name} posted an announcement / {name} updated an announcement / {name} deleted an announcement / {name} updated their team / {proposer} proposed a trade to {receiver} / Trade accepted between {proposer} and {receiver} / A trade was executed / {name} rejected a trade offer / {name} cancelled a trade offer / A trade was vetoed by the commissioner / A trade offer expired / {name} countered a trade offer

### Draft Status Section
- **Countdown:** Starts in / {N}d {N}h {N}m / {N}h {N}m / {N}m {N}s
- **Banner:** The draft has started! / Join Draft Room
- **Heading:** Draft Status
- **Not started:** Draft Not Started / Scheduled: / No draft date set. / Schedule the draft so your league knows when to show up. / The commissioner hasn't scheduled the draft yet.
- **Buttons:** Start Draft / Go to Draft Room / Set Up Draft
- **Waiting:** Waiting for all members to create teams ({N}/{N}) / Need at least 1 team to start the draft / Waiting for commissioner to start the draft...
- **In progress:** Draft In Progress
- **Paused:** Draft Paused
- **Completed:** Draft Completed / The draft has been completed. Good luck this season!
- **Not set up:** Draft Not Set Up

### Draft Chat
- **Heading:** Draft Chat
- **Loading:** Loading...
- **Empty:** No messages yet. Start the conversation!
- **Fallback:** Unknown
- **Placeholder:** Chat...
- **Buttons:** Send / ...

### Pending Trades
- **Heading:** Trade Offers
- **Empty:** No pending trade offers.
- **Section:** Recent Trade Activity ({N})
- **Direction:** Incoming / Outgoing
- **Trade text:** from / to / trade / for
- **Time remaining:** Expired / {N}d {N}h remaining ({deadline}) / {N}h remaining ({deadline})
- **Status:** Accepted / Rejected / Cancelled / Vetoed / Expired / Countered
- **Buttons:** Accept / Reject / Counter / Cancel / ...
- **Toasts:** Trade accepted! Rosters updated. / Trade rejected. / Trade cancelled. / Select {N} school(s) to drop / Failed to load roster for counter-offer
- **Confirm dialogs:** Accept trade? — This cannot be undone. / Reject trade? — Are you sure you want to reject this trade?
- **Drop picker:** Select {N} school(s) to drop ({N}/{N})

### Trade Proposal Modal
- **Title:** Counter Trade / Trade with {partnerTeam.name}
- **Counter context:** Message from {counterToTrade.proposerTeamName}:
- **Sections:** You Give ({N}) / You Receive ({N}) / {myTeam.name}'s Roster — tap to give / {partnerTeam.name}'s Roster — tap to receive
- **Search:** Search... / No matching schools
- **Detail:** Already owned / {conference} · {record} · {points} pts
- **Drop section:** You need to drop {N} school(s) to make room / ({N}/{N} selected)
- **Preview:** Your roster after trade / {N}/{N} schools / Exceeds roster limit — select drops above / Empty
- **Message field:** Message (optional) / Add a note to your trade proposal...
- **Buttons:** Cancel / Send Counter / Send Proposal / Sending...
- **Toasts:** Counter-offer sent! / Trade proposed! / This school is already on their roster / This school is already on your roster / Failed to propose trade

### Dormant League View
- **Banner:** Season Complete
- **Champion section:** Champion / {points} pts
- **Standings:** Final Standings / {points} pts / ${winnings} / View Full History →
- **Commissioner:** Ready for a new season? Reactivate this league to draft with the same members.
- **Non-commissioner:** Waiting for your commissioner to start a new season.
- **Members:** Members ({N}) / Unknown

### Reactivate League Button
- **No seasons:** No upcoming seasons available yet. Check back later.
- **Label:** Season:
- **Button:** Start New Season
- **Confirm:** This will reactivate the league for {selectedSeason.name}. All members will keep their spots but get fresh teams and a new draft.
- **Buttons:** Cancel / Confirm Reactivation / Reactivating...

### Playoff Bracket
- **Heading:** College Football Playoff
- **Empty:** Playoff games have not been scheduled yet.
- **Legend:** On Roster / Winner
- **Section:** Your Schools in the Playoffs
- **Scroll hint:** Scroll right to see full bracket
- **Round headings:** First Round / Quarterfinals / Semifinals / Championship
- **Slots:** BYE / TBD / Final / Q{quarter} {clock}

### First Visit Explainer
- How it works: You drafted college programs. They score points from real games every Saturday. Highest total score wins the season. That's it.

### Report Issue
- **Float button:** Report an issue
- **Modal:** Report an Issue
- **Categories:** Bug / Feature Request / Other
- **Label:** Description
- **Placeholders:** What happened? What did you expect to happen? / What feature would you like to see? / Tell us what's on your mind...
- **Buttons:** Cancel / Submit / Submitting...
- **Toasts:** Please describe the issue / Report submitted! View your tickets at /tickets / Failed to submit report. Please try again.

### Report Content Button
- **Confirm:** Report this content as inappropriate?
- **Reported state:** Reported
- **Tooltip:** Report content

### TOS Gate
- **Heading:** Updated Terms of Service
- **Description:** We've updated our Terms of Service and Privacy Policy. Please review and accept to continue using Rivyls.
- **Links:** Terms of Service / Privacy Policy
- **Button:** I Accept the Updated Terms / Accepting...

### Notification Bell
- **Tooltip:** Notifications
- **Badge overflow:** 99+
- **Time:** just now / {N}m ago / {N}h ago / yesterday / {N}d ago
- **Dropdown header:** Notifications
- **Mark all read:** Mark all as read / Done!
- **Loading:** Loading...
- **Empty:** No notifications yet
- **Tooltips:** Mark as read / Mark as unread

### Double Points Picker
- **Heading:** Double Points
- **Description:** Pick one school to receive 2x points this week
- **Stats:** Week {currentWeek} / Picks remaining: {N} / Deadline:
- **Placeholder:** Select a school...
- **Buttons:** Set Double Points / Update Pick / Saving...
- **Current pick:** This week's pick: / 2x / +{N} bonus points earned!
- **Deadline passed:** Pick deadline has passed for this week.
- **History:** Pick History / Wk {N}: {schoolName}
- **Errors:** Please select a school / You've used all {N} double picks for the season / Failed to save pick
- **Success:** Double points pick saved!

### Share Button
- **Default label:** Share
- **Dropdown:** Copy Link / Copied! / Share on X / Facebook / WhatsApp / Instagram / TikTok / Download Image

### School Picker
- **Label:** Alma Mater or Favorite FBS Team (optional)
- **Placeholders:** Loading schools... / Search for a school...
- **Empty states:** No schools found / Type to search...

### Header School Badge
- **No school:** Pick a team / Set your favorite FBS team
- **With school:** {N} fan on Rivyls / {N} fans on Rivyls / Invite fans to rep {school.name} / Copy / Change team

### Announcements Manager
- **Welcome empty state:** Welcome to {leagueName}! / Post updates here to keep your league members informed. Click below to create your first post. / Bulletin board posts from your commissioner will appear here. Stay tuned!
- **Form:** Title / Write your post... / Pin to top / Schedule:
- **Buttons:** Cancel / Saving... / Update / Posting... / Schedule / Post / Post to bulletin board...
- **Tooltips:** Unpin / Pin / Edit / Delete / Clear schedule / Clear
- **Confirm:** Delete this announcement?
- **Badge:** Scheduled
- **Fallback name:** Commissioner
- **Date:** publishes {date}

### Nudge Commissioner Button
- **Button:** Remind Commissioner / Sending...
- **Success:** Reminder sent! Your commissioner has been notified.

### Confirm Dialog (defaults)
- Cancel / Confirm

### Palette Switcher
- **Header:** Color Palettes
- **Close:** Close
- **Modes:** DARK / LIGHT
- **Recommended:** ★
- **Active:** ACTIVE

### Copy Button
- Copy Link / Copied!

### Environment Badge
- Production / Sandbox / Development / Unknown
- **Sandbox suffix:** 2025 Data

### Error Boundary
- Something went wrong. / Something went wrong loading {sectionName}.
- **Button:** Try Again

### Loading Skeleton
- Loading...

### Logout Button
- Sign out

### Watchlist Star
- **Tooltips:** Remove from watchlist / Add to watchlist

---

## 17. CONSTANTS & CONFIG STRINGS

### Sport Config
| Sport | Name | Short | Icon | Description | Season Label | Tagline |
|-------|------|-------|------|-------------|-------------|---------|
| CFB | College Football | CFB | 🏈 | Draft real college football programs and chase weekly prizes all season long. | Season | Draft teams. Score points. Win your league. |
| Hockey | Hockey | Hockey | 🏒 | Bracket predictions for the Frozen Four and NCAA hockey tournaments. | Tournament | Fill your bracket. Predict the champion. |
| Golf | Golf | Golf | ⛳ | Build your roster and compete through the biggest tournaments in golf. | Tournament | Pick your golfers. Watch the leaderboard. |
| Rugby | Rugby | Rugby | 🏉 | Survivor and pick'em leagues for the Six Nations Championship. | Tournament | Survive each round. Be the last one standing. |

### Color Palettes
| Palette | Name | Description | Mode |
|---------|------|-------------|------|
| collegiate-fire | Collegiate Fire | Bold navy foundation with fierce red energy and championship gold accents | dark |
| heritage-field | Heritage Field | Deep forest greens with warm copper tones and vintage cream accents | dark |
| royal-gambit | Royal Gambit | Rich royal purple with amber brilliance and rose fire accents | dark |
| warm-kickoff | Warm Kickoff | Warm linen tones with slate blue depth and burnt orange energy | light |

### Scoring Presets
| Preset | Label | Description |
|--------|-------|-------------|
| standard | Standard | Balanced scoring with no loss penalties. Great for first-time leagues. |
| conservative | Conservative | Lower bonuses keep scores tight. Wins matter most, fewer blowout swings. |
| aggressive | Aggressive | Higher bonuses and loss penalties. Every game matters — bad weeks hurt. |
| chaos | Chaos Mode | Massive swings. Upsets rewarded, losses punished hard. Not for the faint of heart. |

### Scoring Field Labels (CFB)
**Wins:** Win / Conference Game / 50+ Points / Shutout / Beat Ranked (11-25) / Beat Ranked (1-10)
**Losses:** Loss / Conference Game (L) / 50+ Points (L) / Shutout (L) / Ranked (11-25) Loss / Ranked (1-10) Loss
**Special Events:** Conference Championship Win / Conference Championship Loss / Heisman Winner / Bowl Appearance / CFP First Round / CFP Quarterfinal / CFP Semifinal / National Championship Win / National Championship Loss

### Week Labels
| Week | Full Label | Short | Leaderboard | Schedule |
|------|-----------|-------|-------------|----------|
| 0-14 | Week 0-14 | W0-W14 | W0-W14 | Week 0-14 |
| 15 | Conference Championships | Conf | W15 | Conf Champ |
| 16 | Week 16 | W16 | W16 | Week 16 |
| 17 | Bowl Games | Bowl | Bowls | Bowl |
| 18 | CFP First Round | R1 | CFP | — |
| 19 | CFP Quarterfinals | QF | Natty | — |
| 20 | CFP Semifinals | SF | — | — |
| 21 | National Championship | NC | — | — |
| 22 | Heisman | H | — | — |

### Conference Abbreviations
B10, SEC, B12, ACC, P12, AAC, MW, SBC, CUSA, MAC, IND

### Badge Sport Labels
CFB / Hockey / Baseball / Basketball / Cricket

### Root Layout Metadata
- **Title:** Rivyls
- **Description:** Fantasy sports platform for college football, hockey, and more
- **OG title:** Rivyls — Fantasy College Football
- **OG description:** Draft teams. Compete with friends. Win prizes.
- **Site name:** Rivyls

---

## 18. ADMIN PAGES

### Admin Overview
- **Heading:** Admin Dashboard — Platform management tools.
- **Cards:** Data Sync (Sync schools, games, rankings, and live scores from external APIs.) / Badges (Manage badge definitions, grant/revoke badges, upload icons.) / Analytics (Platform metrics, user activity, and usage trends.) / Issue Reports (View and manage user-submitted bug reports and issues.)

### User Management
- **Heading:** User Management
- **Placeholder:** Search by name or email...
- **Period filters:** 24H / 7D / 30D / All
- **Table headers:** Name / Email / Joined / Leagues / Event Entries / Last Active / Actions
- **Empty:** No users found
- **Action:** View

### Analytics
- **Heading:** Platform Analytics
- **Sections:** Platform Overview / Engagement / Event Games / Growth / Favorite Schools / Commissioner Metrics / Recent Activity / Vercel Analytics Usage
- **Stats:** Total Users / Total Leagues / Active Users (7d) / Total Transactions / Drafts Completed / Tournaments / Pools Created / Total Entries / Total Picks / Waitlist Signups / Conversions / Referrals / Source Breakdown / Users with Favorite
- **Sub-labels:** +{n} this week / {n}% completion / {n}% rate
- **Vercel:** Estimated custom events this month / / 2,500 / Events tracked: signup, league create, draft complete / Approaching limit / Moderate usage / Low usage

### Score Override
- **Heading:** Manual Score Override
- **Labels:** Season / Week
- **Table headers:** Away / Score / @ / Score / Home / Status
- **Fallback:** TBD
- **Status options:** Scheduled / Live / Completed
- **Badge:** Manual
- **Empty:** No games found for {year} Week {week}.
- **Info:** Changes are highlighted in yellow. Click "Save & Recalculate" to update scores and recalculate points for all leagues. / When ESPN data syncs (daily or gameday), manual overrides are automatically cleared and replaced with ESPN data.
- **Buttons:** Saving... / Save & Recalculate ({count}) / Clear Overrides ({count})
- **Confirm:** Clear Manual Overrides — Clear all manual overrides for this week? ESPN data will be used on next sync.

### Badge Management
- **Heading:** Badge Management — Manage badge definitions and grant/revoke badges for users.
- **Sections:** Badge Definitions / Commissioners
- **Commissioner description:** Grant Founding Commissioner status to qualifying commissioners. Criteria: created a league with 6+ members and a completed draft.
- **Table headers:** Commissioner / Badges / Leagues / Members / Drafts Done / Actions
- **Empty:** No commissioners found. Leagues need to be created first.
- **Badge:** Qualifies
- **Grant Modal:** Grant Badge to {displayName} / Badge Type / Sport / Year / League Name / Select badge... / Select sport... / Sports: College Football / Hockey / Baseball / Basketball / Cricket
- **Buttons:** Grant Badge / Granting... / Grant / Cancel

### Data Sync
- **Heading:** ESPN Data Sync — Sync data from ESPN including school logos, game schedules, scores, and rankings.
- **Sync types:** School Logos / Single Week / AP Rankings / Bulk Sync / Live Scores
- **Labels:** Year / Week / Season Type / Start Week / End Week
- **Season types:** Regular Season / Postseason
- **Checkbox:** Include postseason (bowls, playoffs)
- **Bulk note:** Note: Bulk sync may take a while for large ranges. Each week is synced with a small delay to avoid rate limiting.
- **Live info:** Live score sync updates all games currently in progress. Use this during game days to get the latest scores. This also runs automatically every 15 minutes on Saturdays.
- **Scheduled Syncs:** Daily: Rankings and current week games sync at 6 AM ET / Saturdays: Live scores sync every 15 minutes
- **Results heading:** Sync Results
- **Result labels:** Total Schools / Matched / Total Games / Games Found / Ranked Teams / Synced / Games Synced / Updated / In Progress / Completed / Weeks Processed / Skipped / Games Skipped / Not Found / Errors

### Issue Reports
- **Heading:** Issue Reports
- **Filter tabs:** All / New / In Progress / Resolved
- **Empty:** No reports found.
- **Card text:** {N} reply / {N} replies / AI: {summary} / Last reply: {date}

### Report Detail
- **Not found:** Ticket not found.
- **Back:** ← Back to reports
- **Labels:** User: / Page:
- **AI:** AI Summary: {summary}
- **Reply placeholder:** Type your admin reply...
- **Button:** Sending... / Send Reply
- **Sidebar:** Status / Priority / AI Assistant / Admin Notes
- **Status buttons:** new / in progress / resolved
- **Priority buttons:** low / normal / high / urgent
- **AI placeholder:** AI suggestions not configured. Add ANTHROPIC_API_KEY to enable auto-triage and suggested responses.
- **Notes:** Internal only — not visible to user / Add internal notes...

### ESPN Monitoring
- **Heading:** ESPN API Monitoring
- **Button:** Testing... / Test Now
- **Success:** Test complete. Scoreboard: valid. Rankings: valid.
- **Endpoint headings:** Scoreboard / Rankings
- **Status badges:** Valid / Invalid
- **Labels:** Last Check / Status Code / Response Time / Avg Response Time / Structure Hash
- **Empty:** No health checks recorded yet.
- **History heading:** Recent Health Checks
- **Table headers:** Time / Endpoint / Status / Response / Valid / Hash / Issues
- **Values:** Yes / No / {N}ms

---

## 19. API ERROR MESSAGES

### Validation (Zod Schemas)
- Invalid email address
- Invite code is required
- Team name must be at least 3 characters
- Category is required
- Description is required
- Title is required
- Body is required
- Message is required
- Message too long
- Must offer at least one school
- Must request at least one school
- Veto reason is required
- Pool name too short
- Pool name too long
- Invite code is required
- Must submit at least one pick
- Response is required
- Response too long

### Rate Limiting
- Too many requests. Please try again later.

### Content Moderation
- Content contains inappropriate language. Please revise and try again.

### Authentication / Authorization
- Unauthorized
- Forbidden
- Not authenticated
- You must be logged in
- Only commissioners can reset the draft
- Only the commissioner can start the draft
- Only commissioners can veto trades
- Only the pool creator can edit settings
- Only the pool creator can post announcements
- Only the pool creator can delete announcements
- Only the pool creator can start the draft
- Only the pool creator can pause the draft
- Only the pool creator can resume the draft
- Only the pool creator can remove members
- Only commissioners can reactivate leagues
- Only the receiving team can accept
- Only the receiving team can reject
- Only the proposing team can cancel
- Not a league member
- Not a pool member
- Not your team
- Not your entry
- Forbidden

### Not Found
- League not found
- League not found. Please check your invite code.
- Team not found
- Team not found in this league
- Draft not found
- Trade not found
- Pool not found
- Pool not found. Check your invite code.
- Tournament not found
- Entry not found
- Ticket not found
- User not found
- School not found
- No draft found for this pool
- Message not found

### Conflict / Business Logic
- You are already a member of this league
- This league is full
- This pool is full
- This pool is no longer accepting entries
- This pool is locked
- You are already in this pool
- You've reached the maximum of {N} entries in this pool
- You have been eliminated from this pool
- Draft is already in progress
- Draft is not in progress
- Not your turn to pick
- {school} has already been drafted
- Trade is no longer pending
- Trade has expired
- Trading is disabled in this league
- The trade deadline has passed
- You have reached your trade limit for the season
- The other team has reached their trade limit for the season
- Cannot trade with yourself
- Cannot trade a school for the same school
- You already have one of the requested schools on your roster
- The other team already has one of the schools you are offering
- One or more schools you are offering are not on your roster
- One or more schools you are requesting are not on the other team's roster
- Trade would result in duplicate schools on a roster. It can no longer be completed.
- Your roster would exceed the maximum of {N}. Select {N} school(s) to drop.
- Cannot drop a school that is part of the trade
- Drop school is not on your roster
- The add/drop deadline has passed
- You have used all your transactions for this season
- Your roster is full. You must drop a school to add one.
- This school has already been dropped
- School ID mismatch
- This school is already on your roster
- This school has already been selected by {N} teams
- Cannot start conversation with yourself
- Cannot remove yourself from the pool
- Commissioners cannot nudge themselves
- League is not dormant
- You can nudge again in {N} hour(s)
- Tiebreaker prediction is required
- Tiebreaker scores cannot both be zero
- The deadline has passed
- The deadline for this week has passed
- This week has already been resolved
- You already used {participant} in a previous week
- The deadline has passed. Rosters are locked.
- You must pick exactly {N} golfers (got {N})
- Selection cap reached (max {N} per golfer)
- Need at least 2 entries to start a draft
- Need at least 1 team to start the draft
- Scheduled date must be at least 1 minute in the future
- New email is the same as current email

### Generic Server Errors
- Failed to delete account. Please contact support.
- Failed to join league
- Failed to create team
- Failed to fetch members
- Failed to fetch trades
- Failed to create trade
- Failed to save picks
- Failed to save pick
- Failed to save roster
- Failed to create pool
- Failed to join pool
- Failed to update pool
- Failed to fetch pools
- Failed to fetch activity
- Failed to create announcement
- Failed to delete announcement
- Failed to fetch announcements
- Failed to fetch messages
- Failed to send message
- Failed to fetch reaction details
- Failed to toggle reaction
- Failed to start draft
- Failed to create draft
- Failed to set draft order
- Failed to record pick
- Failed to pause draft
- Failed to resume draft
- Failed to reset draft
- Failed to fetch conversations
- Failed to create conversation
- Failed to add conversation members
- Failed to update notifications
- Failed to mark all as read
- Failed to post response
- Failed to update roster period
- Failed to add new school to roster
- Failed to fetch transactions
- Failed to fetch notifications
- Failed to save subscription
- Failed to fetch points
- Failed to fetch school points
- Failed to fetch standings
- Failed to fetch tournaments
- Failed to update profile
- Failed to process request
- An unexpected error occurred
- Internal server error
- Something went wrong
- Trade execution failed
- Scoring failed
- Sync failed
- Reconciliation failed
- Points calculation failed
- GIF service not configured
- Failed to fetch GIFs
