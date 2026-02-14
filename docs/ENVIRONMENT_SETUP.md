# Environment Setup Guide

This document explains how to set up and manage the dual-environment structure for the Fantasy Sports Platform.

## Overview

The platform supports three environments:

| Environment | Purpose | Crons | Badge | Database |
|-------------|---------|-------|-------|----------|
| **production** | Real 2026 season | Enabled | None | Production Supabase |
| **sandbox** | Testing with 2025 data | Disabled | Yellow "Sandbox" badge | Sandbox Supabase |
| **development** | Local development | Disabled | Blue "Development" badge | Your choice |

## Environment Detection

The environment is determined by the `NEXT_PUBLIC_ENVIRONMENT` variable.

```typescript
import { isProduction, isSandbox, areCronsEnabled } from '@/lib/env'

if (isProduction()) {
  // Production-only code
}

if (areCronsEnabled()) {
  // Only runs in production
}
```

## Setting Up Dual Environments

### Step 1: Create Production Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project: `fantasy-sports-production`
3. Wait for it to initialize
4. Go to Settings > API and copy:
   - Project URL
   - anon/public key
   - service_role key

### Step 2: Run Migrations on Production

In the Supabase SQL editor, run all migrations in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_...
... (all migration files)
```

Or use the Supabase CLI:
```bash
supabase db push --db-url "postgres://..."
```

### Step 3: Seed Production with Schools Only

Run the schools sync from the admin panel (`/admin/sync`) or:

```bash
curl -X POST "https://your-production-url.vercel.app/api/sync/schools" \
  -H "Authorization: Bearer YOUR_SYNC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"year": 2026}'
```

### Step 4: Configure Vercel Environment Variables

In Vercel dashboard → Settings → Environment Variables:

#### Production Environment (applies to `main` branch)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_ENVIRONMENT` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx-production.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `production-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `production-service-role-key` |
| `CRON_SECRET` | (generate with `openssl rand -hex 32`) |
| `SYNC_API_KEY` | (generate with `openssl rand -hex 32`) |

#### Preview Environment (applies to all other branches)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_ENVIRONMENT` | `sandbox` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx-sandbox.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sandbox-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sandbox-service-role-key` |
| `CRON_SECRET` | (different from production) |
| `SYNC_API_KEY` | (different from production) |

### Step 5: Local Development Setup

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your preferred database (sandbox or a local Supabase).

## Cron Job Behavior

Cron jobs automatically check the environment and skip execution in non-production:

```typescript
// In all cron routes:
if (!areCronsEnabled()) {
  return NextResponse.json({
    success: true,
    skipped: true,
    reason: `Crons disabled in ${getEnvironment()} environment`,
  })
}
```

This prevents sandbox deployments from syncing real ESPN data or affecting production data.

## Environment Badge

A floating badge appears in the bottom-left corner of the screen in non-production environments:

- **Yellow "Sandbox"** - Test environment with 2025 data
- **Blue "Development"** - Local development

The badge is hidden in production.

## Manual Sync in Sandbox

Even though crons are disabled in sandbox, you can still manually trigger syncs via the admin panel (`/admin/sync`). This is useful for:

- Testing the sync endpoints
- Populating sandbox with specific week data
- Debugging sync issues

## Switching Environments

### To test production-like behavior locally:

```env
# In .env.local
NEXT_PUBLIC_ENVIRONMENT=production
```

**Warning:** This enables crons locally. Only do this for testing.

### To test sandbox behavior on production Vercel:

Deploy to a preview branch (not `main`). Preview deployments use the sandbox environment variables.

## Database Reset Procedures

### Reset Sandbox (preserve 2025 test data)

No action needed. Sandbox keeps historical 2025 data for testing.

### Reset Production for New Season

Before the 2026 season starts:

1. Create a backup (see BACKUP_GUIDE.md)
2. Clear season-specific data:

```sql
-- Clear old season data
DELETE FROM fantasy_team_weekly_points;
DELETE FROM school_weekly_points;
DELETE FROM weekly_double_picks;
DELETE FROM roster;
DELETE FROM games WHERE season_id IN (SELECT id FROM seasons WHERE year < 2026);
DELETE FROM drafts;
DELETE FROM fantasy_teams;
DELETE FROM league_members WHERE role != 'commissioner';
-- Keep leagues and users for returning commissioners
```

3. Create the 2026 season:

```sql
INSERT INTO seasons (year, name, start_date, end_date)
VALUES (2026, '2026 College Football Season', '2026-08-24', '2027-01-15');
```

4. Sync 2026 schools via admin panel

## Troubleshooting

### Badge not showing in sandbox
- Check `NEXT_PUBLIC_ENVIRONMENT` is set to `sandbox`
- Clear browser cache / hard refresh

### Crons running in sandbox
- Verify `NEXT_PUBLIC_ENVIRONMENT` is not `production`
- Check Vercel environment variable scoping (Production vs Preview)

### Database pointing to wrong environment
- Check Vercel environment variable scoping
- Verify branch is deploying to correct environment
- Check `.env.local` for local development

## File Reference

| File | Purpose |
|------|---------|
| `.env.local.example` | Template with all variables documented |
| `src/lib/env.ts` | Environment detection utilities |
| `src/components/EnvironmentBadge.tsx` | Visual environment indicator |
| `src/app/api/cron/*/route.ts` | Cron jobs with environment checks |
