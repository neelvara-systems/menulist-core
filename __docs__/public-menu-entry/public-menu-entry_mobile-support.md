# Public Menu Entry - Mobile Support

**Status:** Local source complete; physical-device evidence pending
**Last reviewed:** August 7, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. Polling is every 5 seconds with a 36-read maximum and retry state. An expired claimed draft receipt is cleaned while its menu source remains. Approved app release and device evidence remain pending.

## Admission decision

This is a responsive owner-app onboarding funnel, not a MobileShell sub-screen: the route is reachable before sign-in on the canonical app host, while all source-processing controls remain owner-authenticated. After claim, owner work continues through the existing dashboard/MobileShell routes.

## Mobile behavior

- The file input accepts JPEG, PNG, WebP, and PDF and intentionally has no forced `capture="environment"` hint. The native chooser can offer camera, saved photos, or files according to the device/browser.
- A PDF stays on the device while the existing lazy PDF.js utility converts at most 15 pages sequentially. Only bounded JPEG pages are uploaded. The first converted page becomes the local preview.
- The input value resets before open so selecting the same photo after a rejection or transient failure triggers a new change event.
- An immediate shared in-flight lock prevents rapid chooser/drop/link events from starting duplicate requests before the disabled UI renders.
- Link intake remains available when its flag is enabled and requires the existing permission confirmation.
- Unauthenticated source actions go to sign-in and return to the funnel.
- Status polling stops after 36 reads rather than leaving an indefinite spinner.
- Existing accounts are not asked for city; new accounts still supply city/area for subdomain setup.
- All claim/session/browser handoffs use bounded responses and bounded session refresh. The dashboard handoff uses full navigation after the retry.
- Intake responses and preview path segments require the canonical draft UUID; malformed or whitespace-mutated IDs do not navigate or poll.

## Physical-device checks still pending

Test iOS Safari, installed iOS PWA, Android Chrome, and installed Android PWA for camera and saved-photo choice, Files-app PDF choice, one-page and 15-page conversion, rotated/mixed-size/scanned PDF, corrupt/password-protected PDF, 10MB source rejection, converted aggregate rejection, same-file retry, background/foreground conversion and polling, link keyboard/paste, auth return, timeout retry, claim, copy/share, delayed session refresh, and dashboard handoff. These checks are external evidence and do not reopen Local source complete status.
