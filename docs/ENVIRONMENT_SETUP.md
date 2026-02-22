# Rivyls - Environment Setup Guide

This document explains the environment and deployment structure for Rivyls (rivyls.com).

## Current Strategy: Sandbox-Only

The platform is currently running a **single sandbox environment** at rivyls.com. Production will be added when the platform is hardened and ready for the 2026 season.

| Environment | URL | Crons | Badge | Database |
|-------------|-----|-------|-------|----------|
| **sandbox** (primary) | rivyls.com | Enabled (via `ENABLE_CRONS` flag) | Yellow "Sandbox" badge | Sandbox Supabase (2025 data) |
| **development** | localhost:3000 | Disabled | Blue "Development" badge | Your choice |

**Why sandbox-only**: We need a stable URL (rivyls.com, not preview branch URLs) for test users, but the platform isn't hardened enough for a real production season yet. The sandbox has 2025 season data for realistic testing.

**When production gets added back**: After Phases 12-16 of the implementation plan are complete (bug fixes, security, database integrity, tech debt, testing). Production will be a new Supabase project with 2026 season data.

## Environment Detection

The environment is determined by the `NEXT_PUBLIC_ENVIRONMENT` variable.

```typescript
import { isProduction, isSandbox, areCronsEnabled } from '@/lib/env'

if (isSandbox()) {
  // Sandbox-specific code
}

if (areCronsEnabled()) {
  // Runs when ENABLE_CRONS=true OR in production
}
```

## Domain Setup (rivyls.com)

### Vercel Custom Domain
1. Go to Vercel dashboard → Project → Settings → Domains
2. Add `rivyls.com` and `www.rivyls.com`
3. Update DNS records at your domain registrar:
   - `A` record: `76.76.21.21` (Vercel)
   - `CNAME` for `www`: `cname.vercel-dns.com`
4. Vercel auto-provisions SSL certificate

### Vercel Environment Variables

All variables apply to the Production environment (main branch → rivyls.com):

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_ENVIRONMENT` | `sandbox` | Sandbox until platform is production-ready |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx-sandbox.supabase.co` | Sandbox Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sandbox-anon-key` | Public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `sandbox-service-role-key` | Server-side only |
| `CRON_SECRET` | (generate: `openssl rand -hex 32`) | Shared with GitHub Actions |
| `SYNC_API_KEY` | (generate: `openssl rand -hex 32`) | For manual sync endpoints |
| `ENABLE_CRONS` | `true` | Allows crons to run in sandbox environment |

## Scheduled Jobs

### Architecture

The platform uses two scheduling systems:

```
Vercel Cron (1 job)          GitHub Actions (2 jobs)
─────────────────            ──────────────────────
daily-sync                   gameday-sync (every minute)
(10 AM UTC daily)            nightly-reconcile (8 AM UTC daily)
         │                            │
         └──────────┬─────────────────┘
                    ↓
            rivyls.com/api/cron/*
                    ↓
              Smart skip logic
                    ↓
            ESPN API (when needed)
                    ↓
              Supabase DB
                    ↓
           Supabase Realtime → All connected browsers
```

### Vercel Cron (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 10 * * *"
    }
  ]
}
```

**daily-sync**: Runs once at 10 AM UTC daily. Syncs AP rankings, syncs current week's games from ESPN, runs failsafe recalculation for any games completed in the last 2 days.

### GitHub Actions

**gameday-sync** (`.github/workflows/gameday-sync.yml`):
- Runs every minute
- Calls `/api/cron/gameday-sync` with `CRON_SECRET`
- Smart skip logic in the endpoint handles everything:
  - No games today? Skip instantly
  - Outside game window? Skip instantly
  - In game window? Fetch ESPN, update scores, calculate points
- Only ~5% of calls actually hit the ESPN API

**nightly-reconcile** (`.github/workflows/nightly-reconcile.yml`):
- Runs daily at 8 AM UTC
- Calls `/api/cron/reconcile` via POST with `CRON_SECRET`
- Verifies fantasy team point totals match weekly point sums
- Fixes high points winners if incorrect

### GitHub Actions Setup

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add repository secret: `CRON_SECRET` (same value as Vercel env var)
3. Add repository secret: `SITE_URL` = `https://rivyls.com`
4. Workflow files are in `.github/workflows/`

### Manual Sync (Admin Panel)

Crons handle automated syncing, but you can also manually trigger syncs from `/admin/sync`:
- Sync schools (FBS teams)
- Sync games for specific weeks
- Sync rankings
- Sync Heisman winners
- Bulk sync operations

These use `SYNC_API_KEY` for authentication (different from `CRON_SECRET`).

## Cron Behavior in Sandbox

By default, crons are disabled in sandbox environments. Since sandbox is currently the primary (and only) environment, we use `ENABLE_CRONS=true` to override this:

```typescript
// In src/lib/env.ts
export function areCronsEnabled(): boolean {
  if (process.env.ENABLE_CRONS === 'true') return true
  return isProduction()
}
```

This means:
- rivyls.com (sandbox + ENABLE_CRONS=true) → crons run
- Preview branches (sandbox, no ENABLE_CRONS) → crons skip
- Local development → crons skip

## Local Development Setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with sandbox database credentials (or a local Supabase):

```env
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_SUPABASE_URL=https://xxx-sandbox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# ENABLE_CRONS is intentionally not set for local dev
```

## Sandbox Time Travel

The sandbox includes time travel for testing deadlines and weekly transitions:

### Override Cookies
- `sandbox_week_override`: Override current week (0-22)
- `sandbox_date_override`: Override day of week (mon, tue, wed, thu, fri, sat, sun)
- `sandbox_time_override`: Override time (HH:MM format)

### Usage
1. `SandboxWeekSelector` component appears in non-production environments
2. Set week override to test different parts of the season
3. All date/week calculations use `getSimulatedDate()` and `getCurrentWeek()`
4. Deadlines, points queries, and scoring respect the overrides

## Adding Production Back (Future)

When the platform is ready for the 2026 season:

1. Create a new Supabase project: `rivyls-production`
2. Run all migrations on the production database
3. In Vercel, add a second set of env vars scoped to Production environment:
   - `NEXT_PUBLIC_ENVIRONMENT=production`
   - Production Supabase credentials
   - New `CRON_SECRET` and `SYNC_API_KEY`
4. Update GitHub Actions to use production URL
5. Remove `ENABLE_CRONS` from sandbox config (production uses `isProduction()` check)
6. Sync 2026 schools via admin panel
7. Deploy `main` branch — rivyls.com is now production

## Troubleshooting

### Badge not showing in sandbox
- Check `NEXT_PUBLIC_ENVIRONMENT` is set to `sandbox`
- Clear browser cache / hard refresh

### Crons not running in sandbox
- Verify `ENABLE_CRONS=true` is set in Vercel env vars
- Check GitHub Actions workflow runs in the Actions tab

### GitHub Actions not calling endpoints
- Verify `CRON_SECRET` matches between GitHub Secrets and Vercel env vars
- Check workflow run logs in GitHub → Actions tab
- Verify `SITE_URL` secret is correct (`https://rivyls.com`)

### Database pointing to wrong environment
- Check Vercel environment variable scoping
- Verify `.env.local` for local development

## File Reference

| File | Purpose |
|------|---------|
| `.env.local.example` | Template with all variables documented |
| `src/lib/env.ts` | Environment detection utilities |
| `src/lib/week.ts` | Week calculation with sandbox time travel |
| `src/components/EnvironmentBadge.tsx` | Visual environment indicator |
| `src/components/SandboxWeekSelector.tsx` | Time travel widget |
| `src/app/api/cron/*/route.ts` | Cron job endpoints with environment checks |
| `.github/workflows/gameday-sync.yml` | Per-minute live scoring trigger |
| `.github/workflows/nightly-reconcile.yml` | Nightly data integrity check |
| `vercel.json` | Vercel cron configuration |

---

*Last Updated: February 22, 2026*
