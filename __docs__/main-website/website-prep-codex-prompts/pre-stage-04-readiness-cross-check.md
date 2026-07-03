# Pre-Stage 4 Readiness Cross-Check

**Status:** Ready for Stage 4 with guardrails  
**Created:** May 16, 2026  
**Scope:** Audit of Stage 1-3 strategy outputs before marketing-site implementation  

## Verdict

Stage 1, Stage 2, and Stage 3 are coherent enough to use as the base for Stage 4 implementation.

Recommended next move:

- Proceed to Stage 4 using **Direction A - Official Source Authority** as the implementation base.
- Borrow limited Direction B deployment visuals for the real-world deployment and OG/social asset system.
- Keep Direction C as late-page proof and future chain/infrastructure expansion direction.

## What Was Checked

- Prompt-pack README includes:
  - codebase-first guardrail
  - current website as psychology/conversion context
  - static-vs-full-system scope rule
  - pricing/payment/auth/onboarding protection
  - completed Stage 1, Stage 2, and Stage 3 output links
- Stage 1 output includes:
  - codebase-first correction
  - product reality summary
  - infrastructure signals
  - screenshot-worthy systems
  - pricing/payment boundary
  - old website psychology to preserve
  - cross-check log
- Stage 2 output includes:
  - landing-page strategy
  - hero strategy
  - proof architecture
  - screenshot strategy
  - asset priorities
  - change-scope decision
  - Stage 2 cross-check log
- Stage 3 output includes:
  - three visual directions
  - screenshot/mockup systems
  - image generation prompts
  - cross-direction comparison
  - final recommendation
  - Stage 3 cross-check

## Canonical Website Verification

- The current website implementation is the default source.
- Older source-code backups are not restoration targets.
- Future implementation notes should list touched files and validation results instead of creating parallel website source copies.

## Source-Of-Truth Verification

The Stage 1-3 chain now uses this hierarchy:

1. Current runtime code, routes, feature flags, APIs, DAL, and UI components.
2. Current feature docs when they match code.
3. Founder/product strategy docs.
4. Existing website as historical psychology and conversion context.
5. External AI/web research only as optional secondary input.

This matches the owner's clarified direction that the old website should not limit the next website version.

## Current Product Surfaces Supporting Stage 3

The recommended visual direction is supported by real repo surfaces:

- Official Business Page:
  - `src/app/client/obp/OBPResolvedSurface.tsx`
- Public menu/customer route:
  - `src/app/client/[[...slug]]/page.tsx`
- Menu Kit:
  - `src/lib/menu-kit/menuKitGenerator.ts`
- Presence Monitor:
  - `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`
- Customer App/PWA:
  - `src/app/client/pwa/`
- Temporary status:
  - `src/components/templates/main-app/businessSettings/TempStatusCard.tsx`
- Health/trust signals:
  - `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx`
- Feature flags and infrastructure signals:
  - `src/config/features.ts`

## Workflow Docs Fixed During Audit

The website workflow docs had a stale reference to a non-existent file:

- Old stale reference:
  - Removed legacy hype-strategy doc
- Actual current file:
  - `__docs__/main-website/main-website_marketing.md`

Updated files:

- `.codex/workflows/website.md`
- `.windsurf/workflows/website.md`

Also corrected the old "never remove existing sections" wording into a product-truth preservation rule. Stage 4 should preserve real capabilities, but it should not blindly preserve the old homepage section count or old hierarchy.

## Stage 4 Scope Recommendation

Default Stage 4 scope:

- homepage components
- website locale copy
- website CSS/design tokens if needed
- content docs
- screenshot/asset placeholders
- implementation scope note

Protected out of scope:

- `/pricing`
- pricing components
- auth wrappers
- subscription logic
- Razorpay APIs
- billing hooks
- payment verification
- entitlement sync
- onboarding/account-state logic

These may only be touched after a separate risk review.

## Readiness Risks Before Implementation

1. Hero and screenshots must be product-truth based.
   - Do not use fake dashboard art or fantasy UI.
   - If real screenshots are not ready, Stage 4 should use clearly replaceable product-led placeholders.

2. Primary CTA route needs a small Stage 4 decision.
   - Stage 2 recommends `Create your official menu` / `Start from your menu`.
   - If `/create-menu` is used as the main CTA, verify its current readiness and wording first.
   - If not ready, keep `/get-started` or the existing safe funnel.

3. The next homepage should not become a feature catalog.
   - Current codebase is broad.
   - Stage 4 should tell one story: official customer-facing source, public surfaces, quiet reliability.

4. Screenshot assets are not yet fully produced.
   - Stage 4 can implement layout and placeholder wrappers.
   - Stage 6 remains necessary for final screenshot capture/composites/OG/social assets.

## Final Recommendation

Proceed to Stage 4, but do it as a careful implementation pass, not a broad website rewrite.

Use:

- Stage 1 for codebase-first product reality.
- Stage 2 for page architecture and conversion strategy.
- Stage 3 Direction A for the visual system.
- Direction B only for deployment/asset richness.
- Direction C only for advanced proof/future expansion.

Before writing runtime code in Stage 4:

1. Create a dated implementation note listing exact touched files.
2. Keep the first implementation scope homepage/static/locales/CSS/assets only.
3. Do not touch pricing/payment/auth/onboarding.
4. Verify CTA route choice before wiring it as the primary hero action.
