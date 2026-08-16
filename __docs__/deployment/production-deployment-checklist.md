# Production Deployment Checklist

**Status:** Active handoff checklist
**Last updated:** August 15, 2026
**Primary runbook:** [External Certification Runbook](../production-readiness/external-certification-runbook.md)
**Provider setup ledger:** [MenuList Production Provider Setup](./menulist-production-provider-setup.md)

**Launch boundary:** Not current launch certification or deploy approval. This checklist is a handoff map for the External Certification Runbook; production deployment approval still requires current production-readiness audit evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, required provider/browser/device QA, and production-host smoke.

---

## Deployment Guard

Do not run Vercel deploys, preview deploys, production deploys, Vercel remote builds, or production-host smoke from this checklist unless the user explicitly asks for a Vercel deploy in the active session.

Firebase infrastructure auto-deploy applies only to Firebase rules, indexes, Storage rules, and Firebase Cloud Function logic. It does not authorize Vercel deployment, Next.js production builds, hosting deploys, or unrelated app deployment.

This checklist is a handoff map. The authoritative remaining gate order and evidence format live in the [External Certification Runbook](../production-readiness/external-certification-runbook.md). Every external gate result must be recorded in [MenuList Production Readiness Audit](../audits/menulist-production-readiness-audit.md).

---

## 1. Local Source Gate

Run this immediately before any external gate or explicitly approved deploy:

```bash
npm run verify:production-readiness-local
```

This aggregate includes child root `verify:*` scripts, documentation link checks, TypeScript, lint, and `git diff --check`. Passing it does not prove a Vercel build, deployed artifact, Firebase project access, provider credentials, production environment variables, custom-domain routing, CDN behavior, production-host runtime behavior, or physical-device behavior.

Stop and fix code/docs first if the local source gate fails.

---

## 1.5. Durable Ownership And Configuration Gate

Before production setup or deploy approval, confirm:

- `admin@neelvara.com` is the recoverable break-glass Super Admin; a named
  company operator performs daily work with least-required access.
- Another trusted Super Admin is added when a second owner is available;
  offline recovery codes and provider recovery ownership are recorded.
- MenuList remains on the single current `us-central1` Firebase/Google Cloud
  contract. No regional copies or third deployed environment are introduced.
- Production secrets exist only in Vercel Production. QA values live in the
  custom Vercel `qa` environment attached only to exact Git branch `staging`.
- Every `menulist.digital` QA host remains noindex, serves `Disallow: /`, and
  returns `404` for `/sitemap.xml` after the production deployment.
- Domain auto-renew, backup payment, current DNS export, and account ownership
  have been checked.
- MenuList and Answerlattice QA/production use validated, project-local Vercel
  OIDC/Workload Identity and managed Vercel contains no static Admin key.
- The approved Firestore backup/PITR policy exists and a restore procedure has
  been documented before accepting customer data.
- App Check has valid QA monitoring evidence before enforcement.
- Production email uses an approved transactional sender or controlled
  Workspace relay, not a personal inbox password.
- Monthly spend/alert review, quarterly IAM/secret review, and annual
  domain/recovery/restore review have an owner and next due date.

Stop if any item is unknown. Record the unresolved owner-side item instead of
inventing a value or weakening a runtime guard.

---

## 2. Firebase Functions Gate

Use [External Certification Runbook Gate 1](../production-readiness/external-certification-runbook.md#gate-1-firebase-functions-deployment).

Required local preflight:

```bash
npm run verify:functions-deploy-preflight
```

Current MenuList QA retry target:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:menulistMaintenanceScheduler,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding,functions:backfillStoresSummary,functions:mapsPlaceCheck,functions:verifyMenuPublish --non-interactive
```

If certification is retrying only the July 2 source-file path hardening slice, use the exact changed subset from the External Certification Runbook instead of broadening the deploy:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:processMenuImages,functions:processMenuImagesJob,functions:startGeneration,functions:embedArticleWorker,functions:regenerateEmbedding --non-interactive
```

Stop and record the blocker if Firebase fails on Cloud Resource Manager, IAM, billing, Secret Manager, missing secrets, or project access after local checks pass. Production Function deployment requires QA evidence and explicit production deploy approval.

Before any production Firebase Function deploy or paid production provider
traffic, confirm Google Cloud Billing budget alerts exist for the production
project. Alert-only budgets are notifications; configure the separate Preview
Gemini API spend-cap budget and the app-local rolling ceiling too. Neither
replaces rate limits, provider quotas, SAFE_MODE, or recovery drills.

---

## 3. Data And Storage Gates

Use the External Certification Runbook before any live Firestore or Storage mutation.

- Tenant-block backfill: run `npm run verify:tenant-block-backfill-safety`, `npm run verify:public-business-truth`, and `npm run verify:menulist-api-tenant-safety` before any target dry-run or write-mode backfill.
- Storage lifecycle config: run `npm run verify:storage-lifecycle` before applying the bucket lifecycle config to `menulist-qa`, then repeat for `menulist-prod` only when production apply is approved.
- Storage rules cutover: run `npm run verify:storage-paths`, then retry `firebase deploy --project menulist-qa --config firebase.json --only storage --non-interactive`; production Storage rules deploy requires QA evidence and explicit production approval.
- Firestore rules or indexes: use the scoped `menulist-qa` target first and record exact command output in the production readiness audit.

Do not use legacy project IDs, sample Firebase projects, or broad deploy shortcuts.

---

## 4. Provider Gates

Provider gates remain external proof, not local source proof.

- Razorpay: run `npm run verify:billing-entitlement-boundary` before sandbox payment/webhook smoke.
- WhatsApp and messaging onboarding: confirm staging secrets, webhook registration, and fail-closed feature flags before sending any message.
- Cloud Tasks and batch image worker: run `npm run verify:agent-readiness` before queue/worker smoke.
- AI providers: confirm staging keys, billing, alert-only budgets, Gemini API spend cap, app-local rolling ceiling, quota, and SAFE_MODE behavior before live provider calls.

Stop if credentials are missing, dummy, expired, production-scoped by mistake, or tied to the wrong environment.

---

## 5. Browser And Device Gates

Before physical-device or authenticated owner-shell QA, run:

```bash
node --check scripts/verification/verify-mobile-owner-menu.mjs
npm run verify:mobile-shell-route-map
npm run verify:staff-roles-route-parity
npm run verify:customer-app-pwa
npm run verify:public-business-truth
npm run verify:menu-extraction-pipeline
npm run verify:public-truth-tools
```

Manual QA must cover the minimum flow set in the External Certification Runbook: public website, sign-in, public menu, Official Business Page, compliance page, feedback route, authenticated owner shell, mobile owner shell, and customer/mobile rendering.

---

## 6. Vercel And Production Host Gate

Use [External Certification Runbook Gate 8](../production-readiness/external-certification-runbook.md#gate-8-vercelproduction-host-smoke).

Prerequisites:

- The user explicitly approved a Vercel deploy in the active session.
- `npm run verify:production-readiness-local` passed immediately before deploy.
- Production env vars and Firebase targets are confirmed.
- Release scope is clear.
- Previous external gates have audit evidence or explicit blockers.

If approval is missing, do not deploy. Record the deploy command as pending instead.

---

## 7. Evidence Checklist

For each gate, append evidence to [MenuList Production Readiness Audit](../audits/menulist-production-readiness-audit.md):

```text
Gate:
Date:
Environment:
Command or manual path:
Expected:
Actual:
Result: passed | blocked | failed
Evidence:
Follow-up:
```

Do not record secrets, tokens, phone numbers, payment identifiers, or full customer payloads.

---

## Launch Verdict

MenuList is not fully production ready until every required external gate has passed evidence or an accepted owner-side blocker is recorded. Local green checks are necessary but not enough for a launch verdict.
