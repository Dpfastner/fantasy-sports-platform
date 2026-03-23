# Rivyls Voice & Tone Guide

This is the permanent spec for all user-facing text on Rivyls. Every page, component, notification, error message, and help article should be written and reviewed against these rules.

---

## The Voice in One Sentence

Rivyls sounds like a knowledgeable friend who runs your fantasy league — direct, confident, knows the game, never talks down to you, and always tells you what to do next.

---

## 5 Voice Principles

### 1. Say it once, say it short
If a sentence can be cut in half, cut it. If a paragraph can be one sentence, make it one sentence. Users scan. Respect their time. The first visit explainer is the gold standard: "You drafted college programs. They score points from real games every Saturday. Highest total score wins the season. That's it."

### 2. Tell them what to do, not how it works
Users want the next action, not the architecture. "Click a school to draft it" is better than "When it's your turn, select a school from the available schools panel on the left side of the screen, then confirm your selection in the popup dialog." Front-load the action. Explain the mechanism only when asked (Help Center).

### 3. Sound like a person in the room
Read every string out loud. If it sounds like a legal document, a technical manual, or a corporate FAQ, rewrite it. "Required for fantasy sports participation per state regulations" → "You must be 18 or older to play." The test: would you say this to someone at a tailgate?

### 4. Confidence, not hype
Rivyls doesn't oversell. No "amazing," "incredible," "revolutionary," "ultimate." No exclamation marks in body copy (buttons and celebrations are exceptions). State what it does and let the product speak. "Draft schools. Not players." is more confident than "The most amazing new way to play fantasy sports!!!"

### 5. When something goes wrong, be helpful
Every error message answers two questions: what happened and what to do next. Never show a single-word error. Never show a technical process name. Never blame the user. "Couldn't save your pick. Try again." is always better than "Failed to record pick" or "Error."

---

## Word List

### Always Use → Never Use

| Always | Never | Why |
|--------|-------|-----|
| Schools | Teams (when referring to drafted entities) | "Teams" is ambiguous — it could mean the fantasy team or the school. "Schools" is the Rivyls differentiator. |
| Commissioner | Admin, manager, owner | Commissioner is the established fantasy sports term and signals authority. |
| Pool host | Pool creator, creator | "Host" is warmer and more human. |
| Roster | Lineup, squad | Roster is standard. Lineup implies weekly changes (which Rivyls doesn't have). |
| Rivalry Board | Leaderboard, standings | More distinctive. Embeds the brand. |
| Support | Donation, donate | Rivyls is for-profit. "Donation" implies tax-deductibility. |
| Entry fee | Buy-in, wager, bet | Legal distinction. Never use gambling language. |
| League | Contest, lobby, game room | League signals community and persistence. |
| Schools per team | Roster size (in user-facing copy) | More immediately understandable. |
| Sign in | Log in | Consistency. Pick one. |

### Never Use These Words in Marketing Copy

"Revolutionary," "game-changing," "disruptive," "ultimate," "best-in-class," "cutting-edge," "next-gen," "world-class," "innovative," "leverage," "synergy"

### When to Say "College Football" vs "Fantasy Sports"

| Context | Use | Example |
|---------|-----|---------|
| Landing page, app store, marketing, metadata | "Fantasy sports" | "Draft the schools you already care about." |
| Help Center for CFB-specific features | "College football" | "134 FBS schools — every conference." |
| Sport-specific onboarding (CFB league) | "College football" | "Draft college football schools and compete all season." |
| Sport-specific onboarding (Hockey event) | "Hockey" | "Fill your bracket for the Frozen Four." |
| General platform description | "Fantasy sports" | Never limit the platform to one sport in general copy. |

**The rule:** If the copy is about a specific sport's product, name that sport. If the copy describes Rivyls as a whole, say "fantasy sports" — never "fantasy college football." The platform is multi-sport from day one.

### Language That Reinforces NAICS 713990

Always frame as entertainment/competition, never as gambling:
- "Compete" not "wager"
- "Earn points" not "win money" (unless referring to specific cash prizes in paid leagues)
- "Entry fee" not "buy-in"
- "Prize pool" not "pot" or "jackpot"
- "Skill-based" not "chance-based"
- "League" not "contest" (in season-long context)

---

## Tone by Context

The voice stays the same. The tone adjusts:

| Context | Tone | Example |
|---------|------|---------|
| Landing page / marketing | Confident, inviting | "Draft the schools you already care about." |
| Onboarding / first use | Encouraging, simple | "Pick the schools you believe in. They earn points when they win." |
| Draft room | Energetic, urgent | "Hurry! Only 15 seconds left to pick!" |
| League chat / social | Playful, competitive | "Another week, another W. You love to see it." |
| Error messages | Calm, helpful | "Couldn't save your pick. Try again." |
| Settings / configuration | Neutral, clear | "How many schools each team drafts. 12 recommended." |
| Help Center | Direct, concise | "134 FBS schools — every major conference plus independents." |
| Account deletion / legal | Honest, straightforward | "This is permanent. Your teams will be kept in league records, but your personal info will be removed." |
| Support/contributions | Warm, transparent | "Built by one person. Every dollar keeps the platform running." |

---

## Copy Patterns

### Buttons
- Always verb-first: "Create League," "Join Draft," "Save Changes"
- Never "Click here" or "Submit"
- Loading states: append "..." — "Creating..." / "Saving..." / "Joining..."

### Empty States
Always include a direction: what should the user do?
- Bad: "No leagues found"
- Good: "No leagues yet. Create one or join with an invite code."

### Error Messages
Template: "[What happened]. [What to do]."
- "Couldn't save your pick. Try again."
- "That invite code didn't work. Double-check it and try again."
- "Something went wrong loading your data. Try refreshing the page."

Never: single-word errors, technical process names, blame the user.

### Success Messages
Brief. Don't over-celebrate.
- "Pick saved!" not "Congratulations! Your pick has been successfully saved!"
- "Team updated!" not "Your team has been successfully updated. Redirecting..."

### Help Center Answers
One short paragraph. Max 2-3 sentences. If it needs more, use a follow-up paragraph — never a wall of text.
- Lead with the answer, not context
- End with the action if there is one
- Don't define acronyms unless the user specifically asked

### Tooltips
5 words or fewer. No periods.
- "View schedule"
- "Add to watchlist"
- "Copy invite code"

### Confirm Dialogs
[Action name] — [What happens if you confirm]. [Optional: is it reversible?]
- "Reset draft? — This deletes all picks and clears rosters. This can't be undone."
- "Remove member? — They'll lose access to this league."

---

## The Complexity Test

Before shipping any copy, run it through these three filters:

1. **The tailgate test:** Would you say this to someone at a tailgate? If not, rewrite it.
2. **The half test:** Can this be said in half the words? If yes, cut it.
3. **The action test:** Does the user know what to do next? If not, add direction.

If a string passes all three, it ships.

---

## Things to Protect

These patterns already work. Don't change them:

- First Visit Explainer voice (direct, ends with "That's it.")
- Scoring preset descriptions (personality, brevity)
- Trash talk strings (authentic, fun)
- Sport taglines (rhythmic, action-oriented)
- Button text patterns (verb-first, clear)
- Draft room help modal (thorough but scannable)
