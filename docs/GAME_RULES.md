# Rivyls — The Game

> This document defines the game itself. Everything on the platform serves these rules.

---

## The Game in One Paragraph

You draft college football programs. Your programs score points when they win games, score 50+ points, shut out opponents, beat ranked teams, and play conference games. You compete against your league for the highest score each week (Weekly High Points) and for the season (Champion). You can add/drop programs and trade with other teams during the season.

---

## Scoring Rules

| Event | Win | Loss |
|-------|-----|------|
| Game result | +1 | 0 |
| Conference game | +1 | 0 |
| Score 50+ points | +1 | 0 |
| Shutout opponent | +1 | 0 |
| Beat a Top 10 team | +2 | 0 |
| Beat a #11-25 team | +1 | 0 |

These are the **Standard** preset values. Commissioners can choose Conservative, Aggressive, or Chaos Mode presets, or set Custom values (including loss penalties).

### Special Events

| Event | Points |
|-------|--------|
| Conference Championship Win | +10 |
| Heisman Winner | +10 |
| Bowl Appearance | +3 |
| CFP First Round | +3 |
| CFP Quarterfinal | +4 |
| CFP Semifinal | +5 |
| National Championship Win | +20 |
| National Championship Loss | +6 |

### Scoring Modifiers

- **Double Points:** Pick one program per week to score 2x on regular game points.
- **Weekly High Points:** Highest-scoring team each week wins a bonus (configurable amount).
- **Bowl games:** Win + 50+ + shutout only. No conference or ranked bonuses.
- **Playoff games:** Win + 50+ + shutout + ranked (1-12 only). No conference bonus.
- **Championship:** No regular scoring — only the championship win/loss event bonus applies.

---

## What You're Competing For

- **Weekly:** Highest score that week (Weekly High Points)
- **Season:** Highest total score at end of season (Champion)

---

## What You Can Do During the Season

- **Add/Drop:** Swap a program on your roster for an available one (configurable limits and deadlines)
- **Trade:** Exchange programs with another team in your league (propose, accept, reject, commissioner veto)
- **Double Points:** Pick one program per week to score 2x

---

## Everything Else Serves These Rules

| Platform Feature | What It Serves |
|-----------------|----------------|
| Draft Room | How you select your programs |
| Roster Page | How you see your team |
| Leaderboard | How you see who's winning |
| Schedule/Records | How you see how your programs perform |
| Add/Drop Page | How you change your roster |
| Trade System | How you swap programs with others |
| Chat & Announcements | How your league talks and stays connected |
| Notifications | How you know when something happens |
| Scoring Breakdown | How you verify every point (transparency) |

---

## The Feature Test

Every new feature must pass this filter:

1. **Does this make a core element of the game better?** (drafting, scoring, managing roster, competing) — If it makes a core element more complicated without being better, don't build it.
2. **Does this help with social and engagement?** (the reason people come back) — Features that create conversation, sharing moments, or daily reasons to open the app pass.
3. **Does this follow platform standards?** (PLATFORM_STANDARDS.md patterns, brand tenets)
4. **Does this work across sports and events?** — If it only works for CFB, it's too narrow. Build sport-agnostic.

Must pass #1 or #2 (or both), AND pass #3 and #4.

---

## The Core Features

| Category | Features | What They Serve |
|----------|----------|----------------|
| **Draft** | Draft room, timer, auto-pick, watchlist, chat | How you select your programs |
| **Score** | Points calculator, scoring breakdown, presets | How programs earn points from real games |
| **Manage** | Add/drop, trading, double points | How you change your roster |
| **Compete** | Leaderboard, weekly high points, playoffs, season history | How you know who's winning |
| **Connect** | Chat, announcements, activity feed, notifications, sharing, profiles | How your league stays engaged |

---

## Multi-Sport Portability

The game is identical across sports. Only the scoring events change:

| Sport | Example Scoring Events |
|-------|----------------------|
| College Football | Win, 50+ pts, shutout, beat ranked, conference game |
| College Basketball | Win, beat ranked, conference, tournament rounds, Final Four, Championship |
| College Hockey | Win, shutout, beat ranked, conference, Frozen Four, Championship |
| College Baseball | Win, series sweep, beat ranked, regional, College World Series |
| Softball | Win, shutout, beat ranked, Women's College World Series |

Draft, roster, leaderboard, add/drop, trading, chat, notifications — all identical across sports. Only the `scoring_events` configuration changes per sport.
