# Public Menu Entry - Verification

**Status:** HISTORICAL SOURCE/LOCAL/QA EVIDENCE — not current launch or deploy certification
**Current local result:** PDF intake source implementation and current-worktree verification passed on August 7, 2026; QA deploy and external evidence remain pending

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

It does not certify the current worktree, target environment, external providers, deploy state, or production host.

The August 7 current-worktree audit additionally source-gates browser-only PDF conversion, bounded multi-page multipart admission, versioned source ownership, exact worker binding, complete private page attribution, per-page project promotion, and retry-safe multi-source cleanup. Preview polling remains 5 seconds apart with a maximum of 36 status reads, and expired claimed draft receipts preserve every promoted project source. The July 28 audit source-gated one in-flight intake submission and the shared exact draft UUID projector across browser response, preview route, poll, and claim boundaries. Local source complete status is supported by the current-worktree gates below; approved app release remains pending.

## Required current-worktree gates

```bash
npm run verify:public-menu-entry-boundary
npm run verify:menu-extraction-pipeline
npm run verify:public-business-truth
npm run verify:public-customer-delivery
npm run verify:auth-security-failure-matrix
npm run verify:menulist-api-tenant-safety
npm run verify:menu-project-editor-boundary
npm run verify:pricing-integrity-boundary
npm run verify:menu-correctness-quality-boundary
npm run verify:dependency-freeze
npx tsc --noEmit --pretty false
npm --prefix functions run build
npm --prefix functions run lint
npm run verify:functions-deploy-preflight
npm run docs:check-links
git diff --check
```

## Pending evidence

- Scoped QA deploys were attempted for `functions:processMenuImagesJob,functions:menulistMaintenanceScheduler` and `firestore:indexes` with project `menulist-qa`. Both stopped before remote mutation because the Firebase CLI was not authenticated: `Failed to authenticate, have you run firebase login?` Local Functions deploy preflight passed.
- Approved app release; no Vercel deploy is authorized by this audit.
- Signed-in new/existing/partial-session browser matrix.
- Real iOS/Android browser and installed-PWA camera/saved-photo/link/poll/retry/claim/session handoff.
- Real one-page/15-page/rotated/scanned/password-protected/corrupt PDF conversion and low-memory browser behavior.
- Gemini extraction provider smoke and Razorpay sandbox evidence only where conversion is being certified.
- Hosted cache, menu, OBP, screen, and production-host observation.

Historical evidence before July 16 remains archived and must not be read as current certification.
