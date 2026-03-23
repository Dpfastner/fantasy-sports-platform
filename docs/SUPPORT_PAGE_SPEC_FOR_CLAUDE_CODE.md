# Rivyls — Support Page Specification

> **For:** Claude Code (development instance)
> **From:** Claude Chat (business/strategy instance)
> **Purpose:** Build a `/support` page on rivyls.com where users can voluntarily contribute money to support the platform. This page uses Stripe Payment Links (no backend integration needed — just links to Stripe-hosted checkout).

---

## Why This Page Exists

Rivyls is free to play in Year 1 with $0 revenue by design. This support page gives enthusiastic early users a way to voluntarily contribute to keeping the platform running. It is NOT a purchase, NOT a subscription, and does NOT unlock any features or in-game advantages. This distinction is critical for NAICS 713990 (skill-based entertainment) positioning.

---

## Route

**URL:** `/support`

**Navigation:** Link in the site footer only. Do NOT add to main navigation. This should be discoverable but not prominent.

**Footer link text:** "Support Rivyls"

---

## Page Layout

Single-column, centered, max-width ~620px. Clean and simple. Uses the Royal Gambit palette already in the design system.

### Section 1: Header

**Title:** "Support Rivyls"

**Subtitle/body text:**
"Rivyls is built by one person, runs on zero outside funding, and is completely free to play. Every dollar of support goes directly toward keeping the platform running and making it better for your league."

### Section 2: Legal Disclaimer Callout

This MUST be visible and prominent — styled as a callout box with a left amber border.

**Text:**
"This is not a required purchase and does not unlock any features or provide any in-game advantage. Rivyls is free. This is purely voluntary support for an independent platform."

### Section 3: Where Your Support Goes

**Section label:** "Where your support goes"

Four cards in a 2x2 grid:

1. **Servers & hosting** — "Database, API, live scoring infrastructure"
2. **New features** — "Multi-sport expansion, mobile app, tools"
3. **Keeping it free** — "No entry fees, no house edge, no paywall"
4. **Game day reliability** — "Live scoring, real-time drafts, zero downtime"

Each card should have a small colored dot/accent, the bold title, and the description below it. Use the existing component patterns in the codebase.

### Section 4: Support Buttons

Stripe Payment Links will be used. The founder will create these in the Stripe dashboard — no backend integration needed. The page just needs buttons that link to external Stripe-hosted checkout URLs.

**Button layout:** A row of 3-4 amount options, styled as buttons or cards:

- **$3** — "Buy a coffee"
- **$5** — "Cover a day of hosting"  
- **$10** — "Fund a feature"
- **Custom amount** — links to a Stripe payment link with flexible amount

**Implementation:** Each button is an `<a>` tag linking to a Stripe Payment Link URL. These URLs will be hardcoded or pulled from environment variables. Use `NEXT_PUBLIC_STRIPE_SUPPORT_3`, `NEXT_PUBLIC_STRIPE_SUPPORT_5`, `NEXT_PUBLIC_STRIPE_SUPPORT_10`, `NEXT_PUBLIC_STRIPE_SUPPORT_CUSTOM` as the env var names so the founder can drop in the Stripe Payment Link URLs after creating them.

If the env vars are not set yet, show a fallback state: "Support links coming soon" with the buttons disabled/grayed out.

**Target:** `target="_blank" rel="noopener noreferrer"` — opens Stripe checkout in a new tab.

### Section 5: Alternative Support

**Text:**
"You can also support Rivyls by starting a league, inviting a friend, or sharing on social media."

Include the existing social share buttons if they're available as a component, or just the text.

### Section 6: Footer Disclaimer

Small, muted text at the bottom:

"Rivyls LLC is a for-profit company. Contributions are not tax-deductible."

---

## Design Notes

- Use the existing page layout/shell components (header, footer, nav) — this is a standard page, not a special layout
- Royal Gambit palette: primary `#2A1A3E`, accent `#F59E0B`, background `#FAF5EE`, lavender `#E8E0F0`, dark plum `#1A0F2E`
- The callout box in Section 2 should have a left border in amber (`#F59E0B`) with a light amber/cream background
- The support amount buttons should feel like the primary CTA — use the purple (`#2A1A3E`) background with off-white text, or amber for the primary one
- Mobile responsive — the 2x2 grid should stack to 1 column on mobile
- The page should feel warm, honest, and confident — not desperate or charity-like

---

## What NOT to Build

- **No Stripe backend integration.** This page uses Stripe Payment Links (external URLs). No webhooks, no API calls, no server-side Stripe code.
- **No donation tracking in the database.** Stripe handles receipts and records. We don't need to store contributions in Supabase.
- **No user authentication required.** Anyone can view this page, logged in or not.
- **No "donor wall" or public recognition.** Keep it simple.
- **No recurring subscription option on this page.** That's Rivyls Pro (Year 2). This is one-time support only.
- **Do not use the word "donation" anywhere in the UI.** Use "support" or "contribution." Rivyls is a for-profit LLC and "donation" implies tax-deductibility.

---

## Language Rules (Critical)

| Always Say | Never Say |
|-----------|-----------|
| Support | Donation / Donate |
| Contribution | Gift (in financial context) |
| Support Rivyls | Donate to Rivyls |
| Voluntary support | Required payment |
| For-profit company | Nonprofit / charity |

---

## Environment Variables Needed

```
NEXT_PUBLIC_STRIPE_SUPPORT_3=https://buy.stripe.com/[link-for-3-dollar]
NEXT_PUBLIC_STRIPE_SUPPORT_5=https://buy.stripe.com/[link-for-5-dollar]
NEXT_PUBLIC_STRIPE_SUPPORT_10=https://buy.stripe.com/[link-for-10-dollar]
NEXT_PUBLIC_STRIPE_SUPPORT_CUSTOM=https://buy.stripe.com/[link-for-custom-amount]
```

The founder will create these Payment Links in the Stripe dashboard and populate the env vars. The page should work gracefully when these are not yet set (show disabled state or "coming soon").

---

## Testing Checklist

- [ ] Page renders at `/support`
- [ ] Footer contains "Support Rivyls" link pointing to `/support`
- [ ] All four amount buttons render
- [ ] Buttons link to correct env var URLs (or show fallback if not set)
- [ ] Links open in new tab
- [ ] Legal disclaimer callout is visible
- [ ] "Not tax-deductible" footer text is present
- [ ] The word "donation" or "donate" does NOT appear anywhere on the page
- [ ] Page is mobile responsive (2x2 grid stacks to 1 column)
- [ ] Page works when not logged in
- [ ] Page matches existing site design system
