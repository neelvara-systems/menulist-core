# Stage 4 Output — Marketing Site Implementation

**Status:** Completed
**Date:** May 16, 2026
**Approved Direction:** Direction A — Official Source Authority, with limited Direction B deployment/placement support
**Scope Class:** Static marketing/homepage/content/locales/CSS/docs only

## Implementation Summary

Stage 4 implemented the homepage as a calmer, source-of-truth marketing experience. The new page leads with MenuList as the official customer-facing source for menu and business information, then proves that through public surfaces, browsing proof, quiet reliability, and real-world placement.

The existing website was preserved first in:

- Removed by canonical cleanup

## Protected Boundaries

These areas were intentionally not edited:

- Pricing page business/payment logic
- Razorpay APIs
- Subscription flows
- Billing hooks
- Auth/session logic
- Onboarding payment logic
- `/create-menu` implementation

The hero CTA now points to `/get-started`, not `/create-menu`, because `/create-menu` still carries older "digital menu creator" framing and should be refined separately before it becomes the homepage funnel.

## Files Changed

Homepage/components:

- `src/components/website/home/HeroSection.tsx`
- `src/components/website/home/HomePage.tsx`
- `src/components/website/home/ProblemSection.tsx`
- `src/components/website/home/SurfacesSection.tsx`
- `src/components/website/home/FinalCtaSection.tsx`
- `src/components/website/shared/StickyCta.tsx`

Styling:

- `src/styles/website.css`

Metadata/static website pages:

- `src/app/(website)/layout.tsx`
- `src/app/(website)/get-started/page.tsx`
- `src/app/layout.tsx`

Locales:

- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`

Docs/backup:

- `__docs__/main-website/main-website_content.md`
- Removed by canonical cleanup
- `__docs__/main-website/website-prep-codex-prompts/README.md`
- `__docs__/main-website/website-prep-codex-prompts/stage-04-output-marketing-site-implementation.md`

Build config:

- `tsconfig.json`

Canonical cleanup removed the copied backup code, so no TypeScript archive exclusion is required.

## Homepage Structure

The implemented homepage order is:

1. Hero
2. Problem
3. One-source solution
4. Source-to-public workflow
5. Public proof surfaces
6. Customer browse proof
7. Quiet reliability
8. Real-world deployment
9. Business fit
10. FAQ
11. Final CTA
12. Sticky CTA

The homepage intentionally removes `StatsSection`, `IndustrySection`, and `AnalyticsInsightsSection` from the main flow for now to avoid feature density and preserve a sharper official-source narrative.

## Validation

Passed:

- `node` JSON parse for `en-US.json` and `hi-IN.json`
- Website locale key parity check between English and Hindi
- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build`
- Local production HTTP check on `http://localhost:3010` with `x-forwarded-proto: https`

Confirmed locally:

- Homepage returns `200`
- Homepage title: `MenuList — The Official Source for What Customers See`
- Homepage description uses owner-approved source positioning
- Homepage keywords no longer use the old digital-menu-heavy keyword set
- Hero copy is present in production HTML
- `#public-proof` anchor exists for the hero secondary CTA
- `/get-started` returns `200`
- `/get-started` metadata uses official-source positioning

## Residual Build Noise

`npm run build` still logs existing Next.js dynamic-server messages for website routes that read cookies during static generation. The build exits successfully and emits those routes as dynamic. This was not introduced by the homepage implementation.

## Follow-Up Items

- Refine `/create-menu` page positioning before using it as the homepage hero CTA.
- Stage 5 should audit visual spacing and conversion polish with live screenshots.
- Stage 6 should produce final screenshot/composite assets and OG/social images from real product screens.
