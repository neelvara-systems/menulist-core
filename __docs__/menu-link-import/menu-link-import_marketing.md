# Menu Link Import Marketing

**Boundary Reviewed:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current sales use or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Positioning

Bring the menu source you already have. MenuList creates a reviewed draft you can keep correct.

## Public Claim Boundary

Allowed:

- Import from an existing menu link.
- Sign in before MenuList reads the source.
- Review before anything is published.
- Works with many public menu pages, PDFs, and image links.

Not allowed:

- Scrape any website.
- Automatically clone a menu.
- Import from delivery apps.
- Auto-publish menu changes.
- Bypass blocked or login-required pages.

## Owner Benefit

Owners do not need to download a public menu source before setup. They paste the link, review the extracted draft, and publish only after checking it.
