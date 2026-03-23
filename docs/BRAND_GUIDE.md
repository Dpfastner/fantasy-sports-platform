# Rivyls — Brand Guide & Platform Tenets
**The authoritative reference for what Rivyls is, what it isn't, and how every decision gets filtered.**

*Last Updated: March 14, 2026*

---

## 1. What Rivyls Is

**Rivyls is where college football fans play fantasy — by drafting the programs they already love.**

- A **skill-based entertainment platform**, not a gambling product
- Built for **alumni and fans who never played fantasy** because traditional fantasy made them root against their own team
- The **only dedicated college football program fantasy platform** in the market
- **Commissioner-first** — the commissioner is the customer, the players are the community

---

## 2. Core Tenets

These filter every product decision. If a feature or change violates a tenet, it doesn't ship.

### Tenet 1: Loyalty Preserved

> You should never have to root against your own team to win.

Program-based drafting is the structural advantage. Every feature must reinforce this — never undermine it. No feature should create a scenario where a fan's fantasy interest conflicts with their fandom.

### Tenet 2: Transparency Always

> Every point traceable. Every rule visible. Every dollar accounted for.

Scoring breakdowns are complete. Rules are documented. Prize pools are visible. This is the direct inversion of every trust failure across PrizePicks, DraftKings, and FanDuel. Transparency is not a feature — it's a brand attribute.

### Tenet 3: The Commissioner is the Customer

> Win the commissioner, get the league for free.

Commissioners recruit, organize, and retain 8-20 users each. Every tool that makes a commissioner's life easier has 10x the retention value of a player-facing feature. Commissioner experience is never an afterthought.

### Tenet 4: Simple Enough for Your First Time

> If a first-time user can't draft and understand their score in 15 minutes, the product is broken — not the user.

The knowledge barrier is lower with programs than players. Protect that advantage. Never add complexity that requires deep football knowledge to participate. Expert features can exist but must not gate the core experience.

### Tenet 5: Social is the Product

> Fantasy sports without social connection is a spreadsheet.

Chat, trash talk, weekly recaps, rivalry records, league history — these aren't features bolted onto a scoring engine. They ARE the product. The scoring engine enables the social experience, not the other way around. Every week the app should give users a reason to talk to each other.

### Tenet 6: Mobile-First, Without Exception

> Every interaction — draft, score check, trade, chat — designed for a phone screen first.

College football fans are at tailgates, in bars, on couches. Desktop is the adaptation, not the origin. If it doesn't work on mobile, it doesn't ship.

### Tenet 7: No Gambling Adjacency

> Rivyls is skill-based entertainment. There is no house. There is no edge.

No prop bets. No lines. No DFS salary caps. No features that blur the line between fantasy entertainment and gambling. The regulatory and trust positioning as NAICS 713990 is a strategic asset — protect it absolutely. Paid leagues with peer-to-peer prize pools are acceptable. House-vs-player structures are not.

---

## 3. Brand Voice

**Tone:** Confident, direct, fun — like a knowledgeable friend who's running the league and actually wants everyone to have a good time.

### We sound like:
- A commissioner who's been running a league for 10 years and knows exactly how to make it work
- Someone explaining the game at a tailgate, not in a boardroom
- Competitive but inclusive — trash talk is welcome, gatekeeping is not

### We never sound like:
- A sportsbook — no odds language, no "lock of the week," no prediction confidence percentages
- Corporate marketing — no "leverage synergies" or "unlock your potential"
- Condescending to new users — never "it's easy," instead "here's how it works"

### Language Rules

| Use This | Never This |
|----------|------------|
| Programs / schools | Assets / selections |
| Commissioner | Admin / manager |
| League | Contest / lobby |
| Entry fee | Buy-in / wager |
| Prediction game / pool | Bet / gamble |
| Team owner / member | Player (ambiguous with athletes) |
| Draft | Auction (unless literally an auction format) |

---

## 4. Who We're Building For

### Primary: The Alumni Fan
- Graduated from a college with a football program (or has strong school loyalty)
- Watches college football every Saturday
- Has never played fantasy sports, or tried NFL fantasy and quit because of time commitment or divided loyalty
- Has a group of friends or alumni network that stays connected through college football
- Doesn't want to study snap counts — wants to argue about whether Alabama or Georgia will have a better season

### Secondary: The Tired Commissioner
- Currently runs a league on ESPN/Yahoo/Fantrax and is frustrated
- Wants better tools, better social features, better mobile experience
- Will switch platforms and bring their entire league with them if the product is meaningfully better

### We are NOT building for:
- Hardcore DFS grinders who optimize lineups algorithmically
- Sports bettors looking for another platform to place wagers
- Individual player stat obsessives who want to track snap counts and target shares

---

## 5. The Tenet Check

Before building any new feature, answer these seven questions:

1. **Does it preserve loyalty alignment?** (Tenet 1)
2. **Is the outcome transparent and explainable?** (Tenet 2)
3. **Does it help the commissioner?** (Tenet 3)
4. **Can a first-timer use it without documentation?** (Tenet 4)
5. **Does it create a social moment?** (Tenet 5)
6. **Does it work on mobile?** (Tenet 6)
7. **Does it stay on the right side of the gambling line?** (Tenet 7)

If a feature fails any of these, redesign before building.

---

## 6. Content Standards

- All scoring must include a full breakdown (never just a total)
- All league rules must be visible to all members
- All deadlines must be surfaced with advance notice (push notification + in-app)
- All modals must close on backdrop click
- All forms must show inline validation, not post-submit errors
- All empty states must include a clear next action

---

## 7. Performance Standards

- Pages load in under 3 seconds on 4G mobile
- Draft room supports real-time updates with sub-second latency
- No blocking spinners on primary content — use skeleton loading
- Background data refreshes never interrupt active user interaction

---

## 8. AI Content

**Principle: AI-Assisted, Human Feel**

AI can generate recaps, matchup narratives, draft grades, and suggestions — but the output must feel like it was written by a knowledgeable friend, not a bot. The quality bar: "Would a commissioner write this?"

- No "AI-generated" labels or disclaimers on content
- AI narratives must use the brand voice (confident, fun, direct)
- AI should never generate gambling-adjacent language (predictions with confidence %, "locks," odds)
- AI-generated content that doesn't meet the quality bar gets suppressed, not displayed with a caveat

---

## 9. Go-to-Market Principles

- **Full NCAA from day one.** The product supports all FBS programs across all conferences. No artificial geographic narrowing — let traction data guide where to invest marketing effort.
- **Groups, not individuals.** Every marketing dollar targets commissioners, alumni groups, tailgate crews — never solo users.
- **The draft is the event.** The draft is the primary social moment. It must feel like an occasion, not a form submission.
- **Off-season is product, not dead time.** Transfer portal, historical records, early registration — the app stays alive year-round.
- **Word of mouth is the growth engine.** The first 50 users telling their friends before the season ends determines everything.
- **Conference communities are natural marketing segments.** Target alumni networks, booster clubs, and tailgate groups within conferences — but don't limit to one conference.

---

## 10. Feature Audit (vs. Opportunity Doc)

Features from the Feature Opportunities document mapped against what's already built. Prevents duplicate work and highlights true gaps.

### Already Built

| Feature | Where It Lives |
|---------|---------------|
| League Activity Feed | League detail page, pool overview tab |
| Commissioner Bulletin Board | Pool announcements system |
| Trade Mediation Tools | Trade veto system in league settings |
| Scoring Transparency Log | Scoring breakdown in pool detail |
| Push Notifications | Phase 34 — browser push with granular preferences |
| League Chat | League chat + pool chat |
| Invite Link System | League invite links with context |
| Live Game Tracker | ESPN API integration, live scores in pool detail |

### Partially Built

| Feature | Current State | Gap |
|---------|--------------|-----|
| Custom League Rules | League settings cover rules | No dedicated "constitution" page |
| School Color Themes | 4 palette themes | Not per-school |
| Alumni Badge | User badges system exists | No school-specific alumni badge |
| League Trophy / Championship | Banner collection exists | No championship-specific trophy |

### Not Built — High Priority

| Feature | Why It Matters |
|---------|---------------|
| Public League Browser | Fills Sleeper's biggest gap; critical for cold-start users without a group |
| Weekly Recap Cards | Shareable content = organic marketing flywheel |
| Draft Party Mode | The draft is the primary social event; no platform owns this natively |
| Transfer Portal Watchlist | Off-season engagement hook; keeps users active Jan–Aug |
| Program Power Rankings | Fills Fantrax's explicitly stated gap |
| Platform Status Page | Simple to build; enormous trust signal |

### Not Built — Year 2+

| Feature | Timeline |
|---------|----------|
| Mock Draft Tool | Year 2 |
| Multi-Season Hall of Fame | Year 2 (needs multi-year data) |
| Rivalry Tracker | Year 2 (needs season of H2H history) |
| Prize Pool Transparency Dashboard | Year 2 (needs payment integration) |
| Remaining Schedule Difficulty | Long-term |
| Conference Standings Integration | Long-term |
| Program Strength Projections | Long-term |
| Commissioner Dashboard w/ Engagement Metrics | Long-term |

---

## 11. Design System Reference

### Visual & Brand Identity

The original brand guidelines PDF ([`Rivyls_Brand_Guidelines_v1.docx.pdf`](Rivyls_Brand_Guidelines_v1.docx.pdf)) is the authoritative reference for visual design:

- Color palette with hex codes, usage rules, and 60/30/10 ratio (Deep Navy / Fierce Red / Championship Gold)
- Typography hierarchy with specific sizes, weights, and spacing rules
- Logo guidelines (wordmark, icon, clear space, misuse rules)
- Photography & imagery style (stadium atmosphere, fan reactions — never individual player hero shots)
- Patterns & textures (diagonal stripe, bracket grid)
- Iconography (outlined, 2px stroke, consistent style)
- Data visualization color usage
- Dark mode specifications
- Social media template structure
- Brand story framework (StoryBrand)
- Tagline system ("Draft the Program. Own the Rivalry." + contextual alternates)
- Palette exploration (4 themes: Collegiate Fire, Heritage Field, Royal Gambit, Warm Kickoff)

### Technical & Product Standards

[`docs/PLATFORM_STANDARDS.md`](PLATFORM_STANDARDS.md) covers implementation-level standards:

- Color token system (semantic tokens, never raw colors)
- Button hierarchy (primary / secondary / destructive / small inline)
- Card patterns and page structure
- Typography (Montserrat headings + Inter body)
- Form inputs, toggles, modals
- Status badges
- API patterns (Sentry, rate limiting, Zod, auth, activity logging)
- Palette system (4 themes via CSS variables)
- UX patterns (toast after save, loading states, empty states)

---

*Rivyls LLC | rivyls.com | Confidential — For Internal Use*
