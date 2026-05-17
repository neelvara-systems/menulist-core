# Stage 6.1 Output - Synthetic Launch Asset Pack

**Date:** May 17, 2026  
**Status:** Completed  
**Base implementation:** v3.2 Official Source Authority + Conversion Recovery  
**Scope:** Safe synthetic P0/P1 asset generation, OG image backfill, and asset-production documentation update

## Scope Guardrail

- This pass did not redesign the homepage.
- This pass did not edit pricing, payment, subscription, Razorpay, billing, auth, onboarding payment behavior, or `/create-menu` runtime logic.
- This pass did not write to tenant/store/project data.
- This pass did not use real extracted third-party menu data.
- Generated visuals use synthetic demo content only and should be treated as launch placeholders until a founder-approved demo tenant is ready.

## Why Synthetic Assets Were Used

The owner confirmed that current tenant-store data is temporary and that some extracted menu data came from another business. That is not safe for public marketing assets without permission.

Decision:

- Use a synthetic demo business as the asset source.
- Keep the visual language aligned with current MenuList product truth.
- Avoid real customer names, logos, phone numbers, addresses, item photos, menu files, analytics data, and private identifiers.
- Avoid any claim that MenuList automatically syncs to outside platforms such as Google, Instagram, or WhatsApp.

## Demo Identity

- Business name: `The Daily Plate`
- Location: `Indiranagar, Bengaluru`
- Currency style: `Rs.`
- Content source: synthetic demo data only
- Positioning: owner-approved source, public menu, Official Business Page, QR/share surfaces, customer app, digital screen, PDF/export, setup relief, post-publish confirmation

## Generated Public Assets

Assets were saved under `public/images/website/`:

| Asset | File | Type | Role |
| --- | --- | --- | --- |
| Hero official-source composite | `menulist-hero-official-source.webp` | WebP | Hero/product-led composite placeholder |
| Open Graph image | `menulist-og-official-source.png` | PNG | Social/link preview |
| Mobile public menu visual | `menulist-public-menu-mobile.webp` | WebP | Customer browse proof placeholder |
| OBP browser visual | `menulist-obp-browser.webp` | WebP | Official Business Page proof placeholder |
| Setup relief workflow | `menulist-setup-relief-workflow.webp` | WebP | Upload/review/publish proof placeholder |
| Public surfaces matrix | `menulist-public-surfaces-matrix.webp` | WebP | Multi-surface consistency visual |
| Analytics proof visual | `menulist-analytics-proof.webp` | WebP | Post-publish confidence placeholder |
| Launch square image | `menulist-launch-square.png` | PNG | Square launch/social asset |
| LinkedIn launch image | `menulist-linkedin-launch.png` | PNG | LinkedIn/social asset |

Compatibility backfill:

- `public/og-image.png` is a copy of `public/images/website/menulist-og-official-source.png` so older metadata paths do not resolve to a missing file.

## Generator

The reproducible generator lives at:

- `scripts/website-assets/generate-stage6-assets.mjs`

It uses the installed `@napi-rs/canvas` dependency already present in the lockfile and does not add any new dependency.

## Metadata Update

The website metadata now points to:

- `/images/website/menulist-og-official-source.png`

The compatibility copy remains at:

- `/og-image.png`

## Asset Note

The generated pack note lives at:

- `__docs__/main-website/asset-production/stage-06-1/stage-06-1-synthetic-asset-pack.md`

## Remaining Approval Gate

These generated visuals are safe synthetic placeholders. They are not final real-product screenshots.

Before replacing them with final screenshot-led proof, prepare a clean founder-approved demo tenant and recapture:

1. real mobile public menu,
2. real Official Business Page,
3. real setup/upload/review flow,
4. real owner dashboard or mobile dashboard with safe demo metrics,
5. real share/QR/public surface states.

## Cross-Check

- Pricing/payment/billing/Razorpay/subscription files were not touched.
- Generated images were visually inspected and regenerated after layout overlap issues were found.
- Generated file sizes are below the Stage 6 target limits.
- No real customer or third-party extracted menu data appears in the assets.
