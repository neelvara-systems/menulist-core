---
description: Product-aware Taste Skill workflow for auditing public product websites without changing product truth, routes, legal copy, analytics, or runtime behavior.
---

# Product Website Taste Audit

Use this when applying the repo-local Taste skills to a public product website:

- `$design-taste-frontend`
- `$redesign-existing-projects`
- `$full-output-enforcement`

This is an audit and polish workflow. It is not a brand strategy rewrite, product positioning rewrite, launch approval, legal review, dependency upgrade, or production deploy workflow.

## Load Order

1. Read `AGENTS.md`.
2. Read `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md` when the work may lead to implementation, docs, audit, or workflow changes.
3. Detect the product site and load its product rules and docs from the matrix below.
4. Read the three Taste skill files from `.agents/skills/`.
5. Audit first. Do not edit files until the audit output is reviewed or the user explicitly asks for implementation.

## Product Matrix

| Product | Public site code | Primary docs | Local route | Product boundary |
| --- | --- | --- | --- | --- |
| MenuList | `src/app/(website)/`, `src/components/website/`, `src/styles/website.css`, `public/locales/menulist.ai/` | `__docs__/main-website/`, `.codex/workflows/website.md` | `http://localhost:3000/` or configured local host | Public business truth infrastructure for SMB restaurants. Preserve localization, SEO/discovery, consent, public claims, and the main website story. |
| Answerlattice | `src/app/sites/answerlattice/` | `__docs__/answerlattice/doctrine/`, `__docs__/answerlattice/answerlattice-website/` | `http://localhost:3000/__answerlattice/` | Governed Answer Infrastructure for SaaS support. Do not turn it into a helpdesk, chatbot, docs CMS, or generic AI support tool. |
| Neelvara | `src/app/sites/neelvara/`, `src/constants/neelvara/` | `__docs__/neelvara-main-website/` | `http://localhost:3000/__neelvara/` | Quiet operating-entity and trust surface. No Firebase project, app runtime, auth, API routes, CMS, analytics, cookie banner, or product funnel in v1. |
| CampaignCue | `src/app/sites/campaigncue/`, `src/constants/campaigncue/` | `__docs__/campaigncue/campaigncue-product/` plus touched feature docs under `__docs__/campaigncue/` | `http://localhost:3000/__campaigncue/` | Daily Campaign Desk for local businesses. Preserve source-checked campaign packs, manual handoff, export/download boundaries, Firebase cost posture, and product separation from MenuList. |

## Taste Role

Use Taste to evaluate:

- visual hierarchy
- typography quality
- spacing rhythm
- section repetition
- card overuse
- generic SaaS patterns
- fake or placeholder visual proof
- CTA clarity
- responsive fit
- motion restraint
- visible placeholder copy
- incomplete generated output

Do not use Taste to silently change:

- routes or URL structure
- nav labels that are part of SEO or product architecture
- form fields, submission behavior, API contracts, or analytics hooks
- legal, privacy, consent, terms, or compliance copy
- product claims or doctrine
- Firebase, auth, billing, or app runtime behavior
- dependency versions
- icon-library rules from `AGENTS.md`
- localization architecture

## Audit Output

Return this before any implementation:

```text
Design Read:
Current Stack:
Product Boundary:
Preserve:
Taste Findings:
- P0:
- P1:
- P2:
Ranked Improvements:
Likely Files:
Risks / Do Not Touch:
Recommended Verification:
```

## Implementation Rules

When implementation is approved:

1. Apply only P0 and the highest-leverage P1 items unless the user asks for a broader redesign.
2. Keep the current stack and route structure.
3. Prefer local product-site components and CSS patterns over new abstractions.
4. Preserve existing SEO-critical metadata and public copy meaning unless the audit explicitly calls out the change.
5. Do not run production builds or Vercel deploys unless explicitly requested.
6. Run focused checks for the touched product:
   - Always: `git diff --check`
   - MenuList website copy: locale key parity and relevant website checks
   - Answerlattice website assets/runtime: `npm run verify:answerlattice-pwa` when PWA assets are touched, `npm run verify:answerlattice-runtime-truth` when runtime truth is touched
   - CampaignCue runtime/site assets: `npm run verify:campaigncue` when CampaignCue runtime or assets are touched
   - Neelvara static site: lint the touched site files and verify no Firebase/API/runtime dependency was added
   - TypeScript: `npx tsc --noEmit --incremental false --pretty false` when app code changed and the user has not constrained checks

## Prompt Template

```text
Use $design-taste-frontend, $redesign-existing-projects, and $full-output-enforcement.

Audit the [PRODUCT] public website only. Do not edit files yet.

Product boundary:
[One or two sentences from the product docs.]

Goal:
Raise the site from generic product-site patterns to product-specific authority while preserving current routes, product truth, legal copy, analytics behavior, forms, SEO structure, and runtime behavior.

Process:
1. Identify the frontend stack, route group, styling system, component structure, assets, metadata, nav, CTAs, and motion.
2. Load the product docs and current code before making design judgments.
3. Find generic AI/frontend slop: weak hierarchy, repeated card grids, numbered-eyebrow habits, default gradients, placeholder examples, fake proof, vague copy blocks, poor responsive fit, unrestrained motion, and inconsistent component quality.
4. Rank findings by expected impact.
5. Split findings into P0, P1, and P2.
6. Do not propose product features.

Return:
- Design Read
- Current Stack
- Product Boundary
- Preserve
- Taste Findings
- Ranked Improvements
- Likely Files
- Risks / Do Not Touch
- Recommended Verification
```
