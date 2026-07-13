# Helpdoc: Import From Existing Menu Link

**Boundary Reviewed:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current help publication or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## What This Does

Use this when your menu is already available through a public link. MenuList will create a draft for review before anything is published.

## Steps

1. Sign in to MenuList. If you started on `/create-menu`, submitting the link takes you to sign-in before MenuList reads it.
2. Open the menu upload screen or return to the `/create-menu` link tab.
3. Choose "Import from existing menu link."
4. Paste the public menu link.
5. Confirm the menu belongs to your business or you have permission to import it.
6. Wait while MenuList reads the source.
7. Review the draft.
8. Edit or remove anything that is not right.
9. Publish when ready.

## If The Link Cannot Be Read

Upload a photo/PDF of the menu or add the menu manually.

## Supported Sources

- Public menu pages.
- Business homepages that link to a public menu, service list, catalog, or rate card on the same website.
- Menus split across a few pages on the same website.
- Direct PDF links.
- Direct image links.
- Public QR menu destination links.

## Not Supported

- Links that need login.
- Blocked pages.
- Delivery app pages.
- CAPTCHA pages.
- Links where the menu is only available after choosing a location, signing in, or opening another company's website.
