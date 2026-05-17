# Stage 5.5 Output - Old/New Comparison + Conversion Recovery

**Date:** May 16, 2026
**Status:** Implemented
**Base implementation:** Stage 5 Official Source Authority refinement
**Scope:** Static homepage composition, homepage section component, locale copy, and docs only

## Scope Guardrail

- Canonical cleanup later removed the old website source-code backup; use the current implementation as the only source version.
- Canonical cleanup later removed the pre-comparison restore snapshot.
- Pricing, payment, subscription, Razorpay, auth wrappers, onboarding payment behavior, and `/create-menu` runtime implementation were not edited.
- The current codebase and Stage 1-5 strategy remain the source of truth. The old live site was used as conversion psychology and content-flow evidence only.

## Old Live Site Findings

Old site strengths worth preserving:

- The page sold the transformation quickly with "Upload your menu. Your business is online."
- `Everything is prepared for you` made the effort-removal promise obvious.
- `Your official menu appears everywhere customers look` made the surface map tangible.
- `Customers find what they want faster` gave end-customer proof.
- `Your menu keeps learning after it goes live` explained post-publish owner insight.
- `One upload. Every surface. Zero extra tools` was a fast reduction-of-work proof strip.
- `Designed for every business that publishes public offers` prevented the product from feeling restaurant-only.

Old site risks not restored:

- Automatic external-platform sync claims.
- "Always accurate" and "everywhere within seconds" overclaims.
- Generic "digital menu maker" or "QR menu" framing.
- AI-hype framing or unchecked automation language.

## New Homepage Decision

The v3 official-source strategy was correct, but Stage 5 had become too sparse for fast self-selling. The homepage now keeps the official-source spine and restores the strongest old-site conversion jobs in safer language.

Implemented order:

1. Hero
2. Problem
3. Solution
4. Stats
5. Source-to-public workflow
6. Setup effort removed
7. Public proof surfaces
8. Customer browse proof
9. Analytics and intent proof
10. Quiet reliability
11. Real-world deployment
12. Business fit
13. Industry breadth
14. FAQ
15. Final CTA
16. Sticky CTA

## Implemented Changes

- Restored `StatsSection` after the solution section with cautious official-source proof copy.
- Added `SetupReliefSection` to restore the old effort-removal narrative without old hype claims.
- Restored `AnalyticsInsightsSection` after customer browse proof so owners see post-publish value.
- Restored and strengthened `IndustrySection` with a clear "Not only restaurants" heading.
- Removed the "Soon" badge from the Google/Instagram/WhatsApp surface card because the current language is about manual placement tracking, not automatic external sync.
- Updated English and Hindi locale copy for the restored sections.
- Updated website docs and preserved a v3.1 backup snapshot.

## External Research Notes

The web check reinforced three practical decisions:

- SaaS pages need enough information to explain complex value without overwhelming visitors.
- Feature sections should lead with outcomes before mechanics.
- Screenshots and visual proof should be informational and product-led, especially on mobile.

## Validation Status

- Locale JSON parse: passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run lint`: passed.
- `npm run build`: passed. Existing dynamic-cookie warnings remained and build exited 0.
- Local dev server HTML check at `http://127.0.0.1:3002/`: passed for all expected homepage section strings.
- Chrome old-site check: completed against `https://menulist.online/`.
- Chrome local check: passed after syncing `en-GB` Website copy. Chrome was selecting the British English locale, which still contained old homepage strings; this is now corrected.

## Final Recommendation

Proceed to Stage 6 only after this recovered homepage flow passes technical validation and a fresh browser review. Stage 6 should now produce assets for the expanded flow, especially hero proof, setup-relief proof, customer browse proof, analytics proof, and industry-breadth support.
