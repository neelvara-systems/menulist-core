# Menu Link Import Website Notes

**Boundary Reviewed:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current website publication or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Website Impact

Main website copy now includes owner-provided existing menu links as one setup source beside photo, PDF, and typed input. The copy is limited to source intake and review:

> Start with a photo, PDF, typed menu, or permission-confirmed public menu link. MenuList prepares the official customer-facing version from one owner-approved source.

Updated surfaces:

- Homepage hero subline and workflow source map.
- `/how-it-works` hero/source map/upload explanation.
- Features setup card.
- Homepage FAQ trust answers for existing menu link import and review-before-publish behavior.
- Public `/create-menu` input mode beside photo upload.

The public `/create-menu` page supports owner-provided menu-link input directly. The page may be viewed and filled before sign-in, but submit redirects unauthenticated visitors to sign in before the `withAuth`-protected route performs acquisition or extraction. After sign-in, the flow requires permission confirmation, reuses the SSRF-safe acquisition helper, creates an owner-bound temporary draft, and still requires authenticated claim before publishing.

Website copy may mention "paste a public menu link" on `/create-menu`, but the main homepage CTA should stay "Upload your menu →" so the top-level conversion action remains simple for non-technical owners.

## Do Not Use

- "AI-powered scraper"
- "Scrape any restaurant website"
- "Automatic publishing"
- "Works with delivery apps"

## Current Source And Copy Status

- Feature flag is enabled for the current rollout.
- Public copy may mention permission-confirmed public menu links as a setup source.
- Website copy must continue to say owner review is required before publishing.
- Website copy must not describe link acquisition, extraction, or preview creation as anonymous or pre-sign-in behavior.
- Failure-rate, extraction-quality, and real-owner URL review remain ongoing operational checks.
