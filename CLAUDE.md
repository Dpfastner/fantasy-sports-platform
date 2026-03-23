# Rivyls — Claude Code Instructions

## Project Overview
Rivyls (rivyls.com) is a fantasy sports platform where users draft entire college football
programs (schools) rather than individual players. It is a live, production web application.

**Entity:** Rivyls LLC (Georgia)
**Classification:** Skill-based entertainment (NAICS 713990) — never gambling. All language
must reinforce this distinction.
**Trademark:** RIVYLS is a registered USPTO trademark (Class 41, filed March 17, 2026).

---

## Tech Stack
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Hosting:** Vercel
- **CI/CD:** GitHub Actions
- **Error Tracking:** Sentry
- **Testing:** Vitest, Zod
- **Data:** ESPN API integration
- **Domain:** Cloudflare (post DNS transfer April 21, 2026)
- **Email:** Resend (pending Cloudflare setup)
- **Payments:** Stripe (deferred to Year 2)

---

## Schema Reference
See `/docs/rivyls_supabase_schema.md` for the full Supabase schema.

Key tables at a glance:
- `profiles` — user accounts (extends Supabase auth)
- `leagues` → `league_members` → `fantasy_teams` — core league structure
- `league_settings` — all scoring, draft, and transaction configuration per league
- `roster_periods` — school ownership history with `start_week` / `end_week`
- `transactions` — add/drop records
- `trades` + `trade_items` — trade system
- `drafts` → `draft_order` → `draft_picks` — draft state
- `games` → `school_weekly_points` → `fantasy_team_weekly_points` — scoring pipeline
- `schools` — all FBS programs with colors, conference, ESPN API ID
- `tos_agreements` — CCPA/legal consent logging

---

## Debugging Protocol
1. **Find the root cause** — trace errors through the full data flow before proposing a fix.
   Do not patch symptoms.
2. **Verify assumptions against actual code** — read the file before stating what it does.
   Never assume a function, column, or variable exists without confirming it.
3. **Identify which layer the bug lives in** — UI, API route, Supabase query, RLS policy,
   or data shape. Solve at that layer.
4. **State the diagnosis explicitly** before writing any code fix.

---

## Code Update Policy
- Always provide **complete function replacements** — never partial snippets, never
  `// ... rest of function` abbreviations.
- All code must be **fully copy-pasteable** with no placeholders.
- When multiple functions need changes, provide each one in full.
- Prefer **existing patterns and utilities already in the codebase** over introducing
  new libraries or abstractions.

---

## Architecture Rules (Non-Negotiable)
- **Age gate enforces 18+** — adults only. Never suggest or implement 13+ logic.
- **NAICS 713990 positioning** — all feature language, UI copy, and documentation must
  frame this as skill-based entertainment, never gambling or chance.
- **Year 1 scope:** Stripe and paid-entry leagues are intentionally deferred. This is a
  scope decision, not a permanent architectural constraint. Do not treat it as a hard
  limit in code comments or documentation.
- **CCPA compliance, consent logging, and account deletion are implemented** — no new
  feature may regress these.

---

## Supabase / Database Rules
- **RLS policies are security-critical** — always consider Row Level Security implications
  when suggesting schema changes or queries.
- **Never suggest disabling RLS** as a debugging shortcut.
- Use the **existing Supabase client patterns** already in the codebase — do not mix
  supabase-js v1 and v2 patterns.
- If schema is ambiguous, **read the schema file before assuming** column names or
  relationships.

---

## Business & Legal Constraints
- Legal documents (ToS, Privacy Policy) are pending attorney review — do not suggest
  modifying their legal language directly.
- **legal@rivyls.com** and **privacy@rivyls.com** are the designated contact addresses.

---

## What to Do When Context Is Missing
- Task involves DB queries → read `/docs/rivyls_supabase_schema.md` first.
- Task involves a specific file → read it before making any assumptions.
- Debugging an error → ask for the full error message, stack trace, and relevant file(s)
  if not already provided.
- Never invent schema, column names, or file structure.
