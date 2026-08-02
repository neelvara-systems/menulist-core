# Public Menu Entry - Verification

**Status:** HISTORICAL SOURCE/LOCAL/QA EVIDENCE — not current launch or deploy certification
**Current local result:** Local source complete on July 16, 2026; external evidence pending

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

It does not certify the current worktree, target environment, external providers, deploy state, or production host.

The July 28 current-worktree audit additionally source-gates one in-flight intake submission and the shared exact draft UUID projector across browser response, preview route, poll, and claim boundaries. The earlier local audit source-gates 5 seconds / 36-check preview polling, signed-in admission, current existing-account extraction/publish permissions, canonical price/slug/project truth, safe claimed draft cleanup, and session handoff. Approved app release remains pending.

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

- Scoped QA deploy was attempted with `env -u GOOGLE_APPLICATION_CREDENTIALS firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa`. Predeploy lint/build passed, then Cloud Resource Manager returned `HTTP Error: 403, The caller does not have permission`. IAM/project access remains owner-controlled and the deploy is pending.
- Approved app release; no Vercel deploy is authorized by this audit.
- Signed-in new/existing/partial-session browser matrix.
- Real iOS/Android browser and installed-PWA camera/saved-photo/link/poll/retry/claim/session handoff.
- Gemini extraction provider smoke and Razorpay sandbox evidence only where conversion is being certified.
- Hosted cache, menu, OBP, screen, and production-host observation.

Historical evidence before July 16 remains archived and must not be read as current certification.
