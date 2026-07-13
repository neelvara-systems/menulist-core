# Menu Link Import Mobile Support

**Boundary Reviewed:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Admission

Mobile support is required because menu setup is an owner workflow and owners often operate from phones. The feature passes the mobile gate because it reduces upload friction and keeps the action recoverable through review.

## Mobile Behavior

- The upload sheet shows "Import from existing menu link" only when `ENABLE_MENU_LINK_IMPORT` is true.
- The owner enters a URL and confirms permission.
- The sheet creates a project first when no current project exists, matching existing mobile upload behavior.
- The API creates the extraction job.
- The existing mobile processing/review flow continues from the job id.
- Mobile exposes link import only from the select step; once files are selected, the sheet uses the normal file review/upload path.

## Touch and Copy

- Buttons use 44px+ targets through antd-mobile large buttons.
- Copy is short and non-technical.
- Errors do not expose fetch/security details.

## Parity

Desktop and mobile call the same `createMenuLinkImportJob` client helper and protected API route. Both submit the job-create request with same-origin credentials, `no-store` cache policy, and manual redirect handling before bounded acknowledgement parsing, then route into the same `menuImageProcessingJobs` and review path.

The responsive public `/create-menu` page is a separate website entry point, not a MobileShell screen. It may show link input before sign-in, but submit redirects an unauthenticated visitor to sign in before the protected public-draft route performs acquisition or extraction.
