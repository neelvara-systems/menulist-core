# Platform Founder Monitor Validation

## July 6, 2026

### Passed

```bash
npm run verify:platform-founder-monitor-boundary
```

### Verified Scope

- Founder revenue movement IDs pass through `src/lib/firebase/firestoreDocumentId.ts` before `founderRevenueMovements/{movementId}` refs.
- Payment-to-live transition store IDs pass through the same document-ID guard before `founderOnboardingTransitions/{storeId}` refs.
- Completion re-reads selected transition rows in one transaction, rejects conflicting current scope, preserves current timestamps, and treats capped/unavailable query absence as unknown rather than safe-to-overwrite state.
- Valid Razorpay-driven cash, failed-payment, new-MRR, churn, refund, expansion, and downgrade movements keep the same deterministic summary-write behavior.

### Not Run

- Firebase deploy, Vercel deploy, production build, browser/device QA, provider smoke, live Firestore writes, Storage writes, or production-host smoke.

## July 3, 2026

### Passed

```bash
npm run verify:platform-founder-monitor-boundary
npm --prefix functions run build
npx tsc --noEmit --incremental false --pretty false
git diff --check -- functions/src/schedulers/founderMonitorSnapshot.ts src/database/platformSummary/index.ts src/database/stores/index.tsx scripts/verification/verify-platform-founder-monitor-boundary.js __docs__/platform-founder-monitor/README.md __docs__/platform-founder-monitor/platform-founder-monitor_impl.md __docs__/platform-founder-monitor/platform-founder-monitor_firebase.md __docs__/platform-founder-monitor/platform-founder-monitor_validation.md __docs__/patterns/summary-document-pattern.md
```

### Verified Scope

- Founder Monitor snapshot uses `platformSummary/storesSummary` for store coverage and no longer reads `DB_COLLECTIONS.STORES`.
- `storesSummary` supports bounded `menuPresence` / `presence` distribution hints.
- Manual presence confirmations mirror into `storesSummary`, so Active Distribution Stores can be counted without per-store reads.
- Boundary verifier rejects raw store scans in the Founder Monitor snapshot job.
- Founder revenue movement IDs pass through `src/lib/firebase/firestoreDocumentId.ts`.
- Payment-to-live transition store IDs must be exact positive numeric MenuList store document IDs before the same document-ID guard.
- Valid Razorpay-driven cash, failed-payment, new-MRR, churn, refund, expansion, and downgrade movements keep the same deterministic summary-write behavior.

### Deploy Attempt

Not run:

- Vercel build or deploy.
- Firebase production deploy.

The scoped MenuList QA deploy was attempted:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive
```

The Firebase predeploy lint/build steps passed, then deploy stopped before upload:

```text
Error: Request to https://cloudresourcemanager.googleapis.com/v1/projects/menulist-qa had HTTP Error: 403, The caller does not have permission
```

Live scheduler deployment remains blocked until `menulist-qa` Cloud Resource Manager access is available.

## July 2, 2026

### Passed

```bash
npm run verify:platform-founder-monitor-boundary
npm --prefix functions run build
npx tsc --noEmit --incremental false
```

### Verified Scope

- Platform-only route and API boundary.
- Feature flag and navigation gate.
- Precomputed API read limits.
- Revenue movement ledger and idempotent summary-write boundary.
- Razorpay webhook, subscription verification, top-up verification, cancellation, refund, quantity-change, and replacement-subscription runtime write points.
- Payment-to-live onboarding transition ledger.
- Guarded historical backfill script.
- Founder Monitor exception alerts through the existing platform alert pipeline.
- 30-minute `menulistMaintenanceScheduler` Founder Monitor snapshot task.
- Summary-only store coverage from `platformSummary/storesSummary`; no raw `stores` collection scan in the Founder Monitor snapshot job.
- Browser DAL response-size limit and response validation.
- Desktop surface loads through the DAL, not direct fetch calls.
- Mobile platform wrapper route mapping.
- Documentation coverage.

### Deploy Attempt

Not run:

- Vercel build or deploy.
- Firebase production deploy.

This change modifies Firebase Cloud Function logic. The July 2 deploy attempt reached Firebase predeploy before upload; current retry evidence must use the scoped command shape below:

```bash
firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive
```

The deploy completed the Firebase predeploy lint/build steps, then stopped before upload:

```text
Error: Request to https://cloudresourcemanager.googleapis.com/v1/projects/menulist-qa had HTTP Error: 403, The caller does not have permission
```

Live scheduler behavior remains blocked until `menulist-qa` Cloud Resource Manager access is available.

The July 27 persisted-reconciliation repair used the same scoped target after all local gates. It exited before upload:

```text
Error: Failed to authenticate, have you run firebase login?
```

No QA revision changed; current Firebase authentication is the deployment blocker.
- `npm run test:founder-monitor-persisted-boundary` covers valid movement projection, coercible amount rejection, conflicting product/day/scope rejection, arbitrary timestamp-string rejection and fail-visible summary-counter admission.
- `npm run test:growth-intelligence:emulator` seeds a malformed persisted movement, runs the real snapshot reconciler and proves it cannot alter daily cash truth while the operational data gap remains visible.
