# Website Prep Codex Prompts

**Status:** Prepared prompt pack with Stage 1-8.0 outputs
**Scope:** MenuList main marketing website preparation, strategy, visual direction, implementation, launch, and governance
**Source:** User-provided Perplexity + ChatGPT conversation, adapted for MenuList Codex execution
**Created:** May 16, 2026

## Purpose

This folder preserves the staged Codex prompt pack for future MenuList website work.

These files are execution prompts, not approved strategy outputs. Each stage must be run against the current repository before any recommendations or code changes are accepted. The current website implementation and website documentation are important historical context, but they do not outrank newer product code.

## Mandatory Codebase-First Guardrail

Before running any stage, Codex must treat the current MenuList codebase as the primary source of truth. The existing website was built with careful psychology and positioning work, so preserve what it teaches about owner perception, conversion framing, restraint, and why the page was shaped that way. Do not treat the existing website copy as the ceiling for current positioning, because many product capabilities were added after the current landing page was built.

Authority order:

1. Current runtime code, routes, DAL behavior, feature flags, APIs, and UI components.
2. Current feature docs and implementation docs when they match code.
3. Founder/product strategy docs as strategic intent.
4. Existing website implementation and website docs as historical psychology and conversion context.
5. External AI conversations or web research only as optional secondary input after codebase truth is established.

Always inspect at minimum:

- `AGENTS.md`
- `.codex/workflows/website.md`
- `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`
- `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`
- `src/config/features.ts`
- public runtime routes under `src/app/client/`
- owner/mobile surfaces under `src/components/templates/main-app/` and `src/components/mobile/`
- relevant DAL/API paths under `src/database/`, `src/lib/`, and `src/app/api/`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_design-system.md`
- `__docs__/main-website/main-website_impl.md`
- `src/components/website/home/HomePage.tsx`
- `src/app/(website)/page.tsx`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`

Do not replace the current landing page from generic SaaS assumptions. Use these prompts to audit, sharpen, and evolve the current canonical site from codebase truth.

## Mandatory Preservation And Scope Rules

These rules come from the owner's current direction and must be applied before any future website change.

1. Treat the current website as canonical.
   - Do not create parallel source-code versions or restoration copies.
   - Before implementation work, document the exact files that will be touched in the relevant stage output or implementation note.
   - After validation, remove dead alternate-version code instead of keeping backup source copies.

2. Think from MenuList's future point of view.
   - Every strategy, visual, copy, and implementation decision must be checked against the long-term MenuList direction, not only the immediate landing-page exercise.
   - Optimize for durable public business truth infrastructure, public-presence authority, multi-surface consistency, and future chain-grade credibility.

3. Decide static-vs-full-system scope before editing.
   - Classify proposed changes as one of:
     - static marketing/content/docs/locales only
     - homepage component/layout only
     - broader website surface change
     - pricing/auth/payment/onboarding-impacting change
   - Default to the smallest safe scope. Do not touch all website files because a homepage direction changed.
   - Treat `/pricing`, pricing components, auth wrappers, subscription flows, Razorpay APIs, billing hooks, and payment/onboarding logic as high-risk production code.
   - Pricing/payment logic must not be edited unless the approved stage explicitly requires it and a risk analysis confirms the exact code paths to preserve.

## Prompt Index

| Stage | File | Purpose |
| --- | --- | --- |
| 1 | [stage-01-repo-context-synthesis.md](./stage-01-repo-context-synthesis.md) | Repo-grounded MenuList product and marketing context synthesis |
| 2 | [stage-02-landing-page-strategy-brief.md](./stage-02-landing-page-strategy-brief.md) | Decision-ready homepage strategy, positioning, proof, CTA, and visual blueprint |
| 3 | [stage-03-visual-directions-mock-exploration.md](./stage-03-visual-directions-mock-exploration.md) | Three visual territories, screenshot systems, and mock generation plan |
| 4 | [stage-04-marketing-site-implementation.md](./stage-04-marketing-site-implementation.md) | Implementation prompt for an approved direction |
| 5 | [stage-05-post-build-refinement-cro.md](./stage-05-post-build-refinement-cro.md) | Post-build refinement, CRO, trust, screenshot, and mobile audit |
| 6 | [stage-06-screenshot-asset-production-system.md](./stage-06-screenshot-asset-production-system.md) | Screenshot staging, asset production, composites, and OG/social planning |
| 7 | [stage-07-final-launch-polish-production-readiness.md](./stage-07-final-launch-polish-production-readiness.md) | Final pre-launch audit and production-readiness checklist |
| 8 | [stage-08-post-launch-optimization-expansion.md](./stage-08-post-launch-optimization-expansion.md) | Post-launch optimization, proof accumulation, SEO, and expansion roadmap |
| 9 | [stage-09-continuous-brand-governance-marketing-system.md](./stage-09-continuous-brand-governance-marketing-system.md) | Long-term brand, messaging, visual, screenshot, SEO, and campaign governance |

## Stage Outputs

| Stage | Output | Status |
| --- | --- | --- |
| 1 | [stage-01-output-repo-context-synthesis-codebase-first.md](./stage-01-output-repo-context-synthesis-codebase-first.md) | Completed May 16, 2026 - codebase-first revision |
| 2 | [stage-02-output-landing-page-strategy-brief.md](./stage-02-output-landing-page-strategy-brief.md) | Completed May 16, 2026 |
| 3 | [stage-03-output-visual-directions-mock-exploration.md](./stage-03-output-visual-directions-mock-exploration.md) | Completed May 16, 2026 |
| Pre-4 | [pre-stage-04-readiness-cross-check.md](./pre-stage-04-readiness-cross-check.md) | Completed May 16, 2026 - Stage 1-3 readiness audit |
| 4 | [stage-04-output-marketing-site-implementation.md](./stage-04-output-marketing-site-implementation.md) | Completed May 16, 2026 |
| 5 | [stage-05-output-post-build-refinement-cro.md](./stage-05-output-post-build-refinement-cro.md) | Completed May 16, 2026 |
| 5.5 | [stage-05-1-output-old-new-comparison-conversion-recovery.md](./stage-05-1-output-old-new-comparison-conversion-recovery.md) | Completed May 16, 2026 - old live site vs new homepage comparison |
| 6 | [stage-06-output-screenshot-asset-production-system.md](./stage-06-output-screenshot-asset-production-system.md) | Completed May 17, 2026 - screenshot staging, asset production, composites, and OG/social planning |
| 6.1 | [stage-06-1-output-synthetic-launch-asset-pack.md](./stage-06-1-output-synthetic-launch-asset-pack.md) | Completed May 17, 2026 - safe synthetic launch asset pack and OG backfill |
| 6.2 | [stage-06-2-output-clean-demo-screenshot-capture.md](./stage-06-2-output-clean-demo-screenshot-capture.md) | Completed May 17, 2026 - private browser-rendered synthetic demo captures for asset planning |
| 7 | [stage-07-output-final-launch-polish-production-readiness.md](./stage-07-output-final-launch-polish-production-readiness.md) | Completed May 17, 2026 - final launch polish, mobile hero fix, language cleanup, and readiness scoring |
| 7.2 | [stage-07-2-output-reference-revenue-readiness-pass.md](./stage-07-2-output-reference-revenue-readiness-pass.md) | Completed May 17, 2026 - reference-site/web review and footer revenue-readiness pass |
| 7.3 | [stage-07-3-output-reference-informed-page-layout-pass.md](./stage-07-3-output-reference-informed-page-layout-pass.md) | Completed May 17, 2026 - reference learning applied to whole homepage layout and conversion flow |
| 7.5 | [stage-07-5-output-supporting-page-revenue-polish.md](./stage-07-5-output-supporting-page-revenue-polish.md) | Completed May 17, 2026 - supporting-page revenue polish, pricing copy hardening, and shared hero/proof components |
| 8.0 | [stage-08-output-chatgpt-homepage-feedback-compression-pass.md](./stage-08-output-chatgpt-homepage-feedback-compression-pass.md) | Completed May 21, 2026 - external homepage feedback validation, homepage compression, demo path, copy safety, and docs sync |

## Execution Order

Run stages in order:

1. Stage 1 - Context synthesis
2. Manual review against codebase truth and old-website psychology
3. Stage 2 - Landing page strategy brief
4. Manual review of positioning and current site fit
5. Stage 3 - Visual directions
6. Choose direction or hybrid
7. Stage 4 - Implementation
8. Stage 5 - Refinement and CRO
9. Stage 6 - Asset production
10. Stage 6.1 - Synthetic launch asset pack if no founder-approved demo tenant exists yet
11. Stage 6.2 - Private clean demo screenshot captures if real tenant screenshots are still not approved
12. Stage 7 - Final launch polish
13. Stage 7.2 - Reference-informed revenue readiness if new reference sites are introduced before launch
14. Stage 7.3 - Whole-page reference-informed layout pass if the reference review reveals homepage flow gaps
15. Stage 7.5 - Supporting-page revenue polish if secondary pages feel weaker than the homepage
16. Stage 8.0 - External homepage feedback validation if live-site audit reveals density or proof-path gaps
17. Stage 8 - Post-launch optimization
18. Stage 9 - Continuous governance

## MenuList Constraints To Preserve

- MenuList is not a generic restaurant software product.
- MenuList is not a digital menu maker, restaurant website builder, AI menu tool, or QR menu generator.
- MenuList is customer-facing business truth infrastructure.
- The current website is already implemented, documented, locale-backed, and versioned.
- Menus are the wedge, not the category.
- Public truth consistency is the deeper system.
- Simplicity at the surface, infrastructure underneath.
- Trust beats decoration.
- Product truth beats aesthetic fantasy.
- Operational calm beats flashy SaaS aesthetics.
- Real workflows beat fake dashboard art.
- Authority surfaces beat growth hacks.
