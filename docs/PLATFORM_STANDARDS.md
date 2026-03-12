# Rivyls Platform Standards

Reference document for maintaining consistency across all features.

## Buttons

### Primary Action (CTA)
```
bg-brand hover:bg-brand-hover text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors
```
- `text-text-primary` (white) on `bg-brand` (red) — **never** `text-brand-text` on brand background
- Full width: add `w-full`
- Disabled: add `disabled:bg-brand/50 disabled:cursor-not-allowed`

### Secondary Action
```
bg-surface hover:bg-surface-subtle text-text-primary font-semibold py-3 px-4 rounded-lg transition-all border border-border hover:border-brand/40 hover:shadow-md
```

### Small Inline Button
```
text-sm px-3 py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:border-brand/40 transition-colors
```

### Destructive Action
```
bg-danger hover:bg-danger/80 text-text-primary font-semibold py-3 px-4 rounded-lg transition-colors
```

## Cards

### Standard Card
```
bg-surface rounded-lg border border-border p-5
```

### Interactive/Link Card
```
bg-surface rounded-lg border border-border hover:border-brand/40 hover:shadow-md transition-all p-5
```

### Card Grid
```
grid md:grid-cols-2 lg:grid-cols-3 gap-6
```

## Page Structure

```tsx
<div className="min-h-screen bg-gradient-to-b from-gradient-from to-gradient-to">
  <Header userName={...} userEmail={...} userId={...} />
  <main className="container mx-auto px-4 py-8">
    {/* Content */}
  </main>
</div>
```

## Typography

- Page titles: `brand-h1` (800 weight, uppercase) — `text-3xl sm:text-4xl text-text-primary`
- Section headers: `brand-h2` (700 weight) — `text-2xl text-text-primary`
- Card/sub headers: `brand-h3` (600, no uppercase) — `text-lg text-text-primary`
- Body text: `text-text-secondary`
- Muted/label: `text-text-muted`
- Fonts: Montserrat (headings) + Inter (body)

## Status Badges

```tsx
// Open/Active/Success
'bg-success/20 text-success-text'

// Upcoming/Brand
'bg-brand/20 text-brand'

// Warning/Locked
'bg-warning/20 text-warning-text'

// Inactive/Completed
'bg-surface-inset text-text-muted'

// Danger/Eliminated
'bg-danger/20 text-danger-text'
```

## Form Inputs

```
w-full bg-surface-inset border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/50
```

### Select
Same as input, with `appearance-none` if custom arrow needed.

### Toggle Buttons (e.g., visibility)
```tsx
// Active state
'border-brand bg-brand/10 text-brand'
// Inactive state
'border-border text-text-muted hover:text-text-secondary'
```

## Color Tokens (never use raw colors)

| Token | Purpose |
|-------|---------|
| `bg-brand` | Primary action backgrounds |
| `text-brand` | Brand-colored text (on dark bg) |
| `text-text-primary` | White text (headings, button text on brand bg) |
| `text-text-secondary` | Body text |
| `text-text-muted` | Labels, captions, deemphasized |
| `bg-surface` | Card backgrounds |
| `bg-surface-inset` | Input backgrounds, inset areas |
| `border-border` | Standard borders |

## API Patterns

### Every API Route Must Have
1. **Sentry**: `import * as Sentry from '@sentry/nextjs'` + `captureException` in catch blocks
2. **Rate limiting**: `createRateLimiter` from `@/lib/api/rate-limit`
3. **Zod validation**: Schemas in `@/lib/api/schemas.ts`, validate via `validateBody()`
4. **Auth check**: `supabase.auth.getUser()` — fail with 401 if missing
5. **Activity logging**: `logActivity()` for significant actions

### ESPN API Calls
- Always use `monitoredFetch` or `monitoredEventFetch` — never raw `fetch`
- Log to `espn_api_health` table with structure hashing
- Set 10s timeout on all ESPN fetches
- Alert via Sentry on structure changes

### Cron Jobs
- Verify `CRON_SECRET` header (fail closed)
- Check `areCronsEnabled()` for environment
- Log results, never silently swallow errors

## UX Patterns

### After Save/Submit
- Show toast notification (success/error)
- Scroll to top: `window.scrollTo({ top: 0, behavior: 'smooth' })`
- Refresh data: `router.refresh()`

### Navigation
- Breadcrumbs on detail pages
- Back links: `text-text-muted hover:text-text-secondary text-sm transition-colors`
- Active tab: `border-b-2 border-brand text-brand`
- Inactive tab: `border-transparent text-text-muted hover:text-text-secondary`

### Modals
- Backdrop: `fixed inset-0 bg-black/60 z-50`
- Content: `bg-surface rounded-lg border border-border shadow-lg`
- Close on backdrop click + X button

### Loading States
- Buttons: change text to "Saving..." / "Loading..." + `disabled`
- Sections: show "Loading..." text centered
- Never block entire page

### Empty States
- Centered text: `bg-surface rounded-lg p-8 text-center`
- Primary message: `text-text-secondary`
- Secondary hint: `text-text-muted text-sm mt-1`

## Activity Logging

### Platform Actions (`activity_log`)
- All significant user actions logged via `logActivity()` from `@/lib/activity.ts`
- Fire-and-forget (never blocks request)
- Uses admin client to bypass RLS

### Event Actions (dual logging)
- `event_activity_log` — game-specific actions
- `activity_log` — mapped via `trackEventActivity()` server action
- Client components use `trackEventActivity()` from `@/app/actions/activity.ts`

### Vercel Analytics
- Client-side conversion events via `track()` from `@vercel/analytics`
- Track: signups, league creation, pool creation, pick submissions

## Palette System

- 4 palettes: default (Collegiate Fire), Heritage Field, Midnight Navy, Classic Gold
- Set via `data-palette` attribute on `<html>`
- CSS variables: `--palette-*` tokens
- Config: `src/lib/palettes.ts`, `src/app/globals.css`, `src/components/PaletteProvider.tsx`
