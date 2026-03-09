# Phase 28 — User Verification Notes (Complete)

> **Source**: Extracted from conversation transcript (March 8, 2026)
> **Purpose**: Preserve all user feedback and decisions from Phase 28 verification

---

## Verification Notes (March 8, 2026 — First Pass)

### Items Verified & Approved
- **#4**: Verified
- **#8**: Verified
- **#11**: Understood
- **#13**: Verified
- **#20**: Verified
- **#74**: Can't verify right now because testing is set to week 22
- **#91**: Verified
- **#101**: Verified

### Items Requiring Fixes (done)
- **#38**: Go ahead with clickable names — DONE
- **#80**: Improve calendar icon visibility — DONE
- **#83**: Rework the bracket — DONE
- **#108**: Fix timezone abbreviations — DONE
- **#110**: Fix "season ends" wording — DONE

### Items Requiring Discussion / Decision

- **#71**: "Overview is our leaderboard, stats was our school standings. Changing it to just 'standings' could confuse people. We want this to be clear that it is the records of how the schools are doing." → Renamed to "Records" (done)

- **#72 & #73**: "I know what the leaderboard and HP boards are. I meant what is this random thing you changed? Cause I don't see any difference to those areas" → Need to clarify what changed

- **#81**: "Can I set draft order in the settings too? Like before we get into the draft?" → Add draft order config to league settings

- **#86**: "co-commissioner error doesn't explain why the regular single commissioner did not get the notification" → Need to investigate single-commissioner notification bug

- **#95**: "Which is better for UX? Browser history or parent page links?" → Need to decide on pattern

- **#119**: "We combined production and sandbox because in reality we were not ready for production yet and I was annoyed updating two locations. Right now production is our only project and it is in testing mode and should use sandbox weeks. If we need to update the name to not be production and make it clear we are in development we should do that."

### Items Deferred
- **#45**: Make this a phase to discuss help sections and explanation wordings across the entire platform
- **#12**: "Do we need this? Do we care if they get logged out?" → Dropped
- **#32**: Save for after 4/21 date
- **#66**: "I don't know if we need this" → On hold
- **#75**: No CSV export needed. Social share covers it.
- **#82**: "Ideally they just reactivate last year's league instead of creating a whole new one" → Hold for now, rethink as reactivation
- **#97**: Push notifications → Make its own phase later
- **#99**: Keep emojis
- **#117**: Help system → Own phase

---

## Pre-Audit Notes (March 6, 2026)

### Commissioner Tools / Settings
- "The UX around the commissioner tools is clunky. When they save a new setting it doesn't bring them to the top to see that it saved."

### Headers (Key Vision)
- "The headers are all over the place. Certain ones should be in locked positions and always there for users."
- "Maybe we think about having the My Roster be the user's team name and it can be a dropdown to take them to the other users' team rosters?"
- "The leagues could be a dropdown to take them to the other league or sports they are using?"
- "These headers will be across sports and leagues so we should think about them that way."

### Schedule
- "The default for the schedule should be the current week BUT in pre-season before Week 0 we should have it default to a dropdown called All Games that shows every game for the full season."

### Bracket
- "The playoff bracket is not setup properly. It's not showing the teams in the correct locations so R1 games don't then line up next to the QF games correctly."

### Homepage
- "Rivyls homepage is eventually going to be the homepage for multiple sports and platform announcements. It should reflect that right?"

---

## Second Pass Verification (March 8, 2026 — After Deploy)

### Timezone
- First version (flat list with optgroups): "This is not helpful either."
- Requested: "Default to US timezones but have an option at the bottom of the dropdown for outside US? And then it lets them choose their real timezone?"
- Final: Search input for international users — APPROVED

### Commissioner Tools Header
- "When I click into commissioner tools I lose the main header (Rivyls, Notifications and profile). Should be static across the entire platform."
- Fixed: shared Header component added — DONE

### Header Team Dropdown Discussion
- "No I made a note since those changes a note about where they should be located and if we should discuss them being your own team or the teams in the league."
- Decision: Add to multi-sport phase discussion

### Week 22 / Schedule
- "If it was loading week 22 then that should have been the National Championship week right?"
- Explained: Week 22 = Heisman (no games), Week 21 = Championship. Defaulting to All Games is correct.
- All Games now loads properly with all 932 games.

### Breadcrumbs
- "I don't need to see the breadcrumbs in the header" — Removed

---

## Final Discussion Decisions (March 8, 2026)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Commissioner Tools | Rename to "League Settings", make viewable by all users but only editable by commissioner |
| 2 | Team dropdown (header) | Add to multi-sport phase discussion |
| 3 | Chat clickable names | Draft chat: no. League chat on overview: yes |
| 4 | Draft header | Leave alone |
| 5 | Mobile header | Save for Phase 29 |
| 6 | Week labels 17-22 | "I never had them as 17-22, you asked to add those. Before it was bowls, CFP, NC, and Heisman etc" |
| 7 | Week selector | Should be 0-16 then Bowls, CFP, and National Championship |
| 8 | Archived history | Acceptable without links |
| 9 | In-app notification controls | Yes please |
| 10 | Profile badges | Leave alone, flesh out as more badges are introduced |
| 11 | Dark/light mode | Not yet |
| 12 | Bracket page header | Use shared header |
| 13 | Transaction deadline enforcement | User didn't understand — needs explanation (server-side validation) |
| 14 | Trade member voting | Not right now, save for future |
| 15 | Second owner permissions | Same as primary owners |

---

## Actionable Items for Next Phase

### Do Now
1. Rename "Commissioner Tools" → "League Settings" in nav, make viewable by all but editable by commissioners only
2. Make league chat names clickable (not draft chat)
3. Week selector: 0-16 then Bowls, CFP, National Championship (remove Heisman from selector)
4. Add in-app notification controls to settings
5. Bracket page: integrate shared header
6. Investigate #86: why single commissioner didn't get notification
7. #81: Add draft order config to league settings (pre-draft)
8. #95: Decide back button pattern (browser history vs parent links)

### Discuss in Multi-Sport Phase
- Header team dropdown: your team vs all teams
- Homepage as multi-sport hub

### Defer to Own Phase
- #45: Help system / explanation wording
- #97: Push notifications
- #117: In-app help tooltips
- #82: League reactivation (vs create new)
