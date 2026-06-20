# MenuList System Data Flow Audit - 2026-06-20

## Scope

System-level MenuList audit focused on live data flow, cache consistency, owner/mobile parity, public customer output, API guardrails, AI accounting presentation, and background Firebase writers.

Excluded from MenuList findings:

- Answerlattice, CampaignCue, GrowthOS, and Canonica product surfaces unless shared MenuList infrastructure was affected.
- Vercel deployment. App-side route fixes were validated locally but not deployed.

Firebase Functions logic changed in this pass, so MenuList Functions deployment is required after validation. Deployment status is tracked at the end of this document.

## Fix Ledger

### 1. Scheduled special-menu switching bypassed public cache invalidation

Status: Fixed.

The scheduler now imports the Functions cache helper at `functions/src/decisionBlocksScoring.ts:21` and revalidates public output after scheduled activation and deactivation at `functions/src/decisionBlocksScoring.ts:1693` and `functions/src/decisionBlocksScoring.ts:1728`.

Impact: scheduled special-menu changes now invalidate menu/OBP/screen cache like owner/manual special-menu paths.

### 2. Subscription reconciliation wrote public entitlement fields without cache invalidation

Status: Fixed.

The Functions reconciliation path now imports public cache and Owner Business Assistant packet invalidation at `functions/src/billing/reconcileSubscriptions.ts:22` and `functions/src/billing/reconcileSubscriptions.ts:23`, then invalidates both after entitlement writes at `functions/src/billing/reconcileSubscriptions.ts:88`.

Impact: reconciliation-only plan corrections no longer leave starter/attribution/OBP behavior stale until cache expiry.

### 3. Messaging onboarding claim-token expiry was inconsistent

Status: Fixed.

The claim route now enforces `claimTokenExpiresAt` before account claim at `src/app/api/auth/claim-account/route.ts:161`. The validation route enforces the same expiry before showing login welcome data at `src/app/api/auth/validate-claim/route.ts:63`.

Impact: the 7-day expiry written by the messaging onboarding publisher is now enforced end to end.

### 4. Public screen seen endpoint used process-local rate limiting

Status: Fixed.

The endpoint now uses shared rate limiting before Firestore lookup at `src/app/api/screen/seen/route.ts:73`, with the shared `SCREEN_SEEN_SIGNAL` config at `src/lib/rateLimit/configs.ts:232`. It also applies a stricter token/store key limit before the daily Firestore write.

Impact: distributed serverless instances no longer bypass the only server-side limiter for screen liveness signals.

### 5. Public PWA image endpoints accepted arbitrary store IDs before Firestore reads

Status: Fixed, including the adjacent issue found during the restart audit.

The public icon, screenshot, and splash image routes now validate store ID shape and apply the shared `PUBLIC_DYNAMIC_ASSET` limiter before reading `stores/{storeId}`:

- Icons: `src/app/api/app-icons/[storeId]/[size]/route.tsx:37`
- Screenshots: `src/app/api/app-screenshots/[storeId]/[formFactor]/route.tsx:154`
- Splash images: `src/app/api/app-splash/[storeId]/[size]/route.tsx:31`
- Shared config: `src/lib/rateLimit/configs.ts:247`

Impact: random unique public asset URLs fall back without forcing Firestore reads or expensive image rendering.

### 6. Custom domain provider calls were not route-level rate-limited

Status: Fixed.

`/api/domain` now applies the `DOMAIN_MANAGEMENT` limiter before add, verify, and delete provider calls through `src/app/api/domain/route.ts:43`; the shared config is at `src/lib/rateLimit/configs.ts:275`.

Impact: authenticated owner retries against Vercel domain APIs are bounded.

### 7. Weekly narrative local generation had brittle AI parsing and internal error leakage

Status: Fixed.

The local generation route now uses a guarded parser with deterministic fallback at `src/app/api/analytics/weekly-narrative/generate-local/route.ts:45` and consumes it at `src/app/api/analytics/weekly-narrative/generate-local/route.ts:244`. Owner-facing 500 responses no longer include raw `error.message`; the regenerate wrapper delegates to the authenticated generator at `src/app/api/analytics/weekly-narrative/regenerate/route.ts:15`.

Impact: malformed AI output does not fail the owner workflow, and internal errors are not returned to owners.

### 8. Raw logging remained in high-risk MenuList paths

Status: High-risk patterns fixed.

Removed full platform summary doc logging from `src/database/platformSummary/index.ts`, raw chat sample logging from `functions/src/aggregateDailyChatStats.ts`, and raw Gemini response/body logging from the MenuList Gemini service files. The generic database operation logger is development-only and logs keys/operation stats rather than full payloads at `src/database/loggers/databaseOperation.ts:8` and `src/database/loggers/databaseOperation.ts:21`.

Restart audit status: focused search for raw response/body samples, full platform summary doc logging, and leaked route error details returned clean after the fixes.

Residual: broad low-risk `console.*` cleanup remains a separate hygiene task, but the sensitive payload/model-output examples from this audit were removed.

### 9. AI accounting verifier had stale literal-label checks

Status: Fixed.

The verifier now checks localized keys instead of stale English literals at `scripts/verification/verify-ai-accounting-hardening.js:157`, `scripts/verification/verify-ai-accounting-hardening.js:169`, `scripts/verification/verify-ai-accounting-hardening.js:170`, `scripts/verification/verify-ai-accounting-hardening.js:176`, and `scripts/verification/verify-ai-accounting-hardening.js:179`.

Impact: `npm run verify:ai-accounting` now validates the current localized transaction UI instead of failing on false negatives.

### 10. CSP report endpoint could create unbounded anonymous security logs

Status: Fixed during restart audit.

`/api/csp-report` now applies `CSP_REPORT` rate limiting at `src/app/api/csp-report/route.ts:46`, caps request body size at `src/app/api/csp-report/route.ts:56`, caps parsed body length at `src/app/api/csp-report/route.ts:61`, and truncates report fields at `src/app/api/csp-report/route.ts:41`. The shared config is at `src/lib/rateLimit/configs.ts:261`.

Impact: anonymous browser telemetry can no longer generate unbounded production security-log volume or oversized payload parsing.

### 11. Public test rate-limit route was available outside development

Status: Fixed during restart audit.

`/api/test/rate-limit` now returns 404 outside development at `src/app/api/test/rate-limit/route.ts:24`.

Impact: a diagnostic route is no longer publicly usable in staging/production runtime.

## Restart Audit Evidence

- Route inventory found 181 `src/app/api/**/route.ts(x)` handlers.
- Re-scanning public dynamic image routes found the adjacent splash route gap, which was patched.
- Re-scanning unclassified API handlers after accounting for `withPlatformAuth`, worker secrets, CRON secrets, webhooks, and public API auth left only expected cases: public `/api/version`, the authenticated weekly narrative wrapper delegation, the worker-secret batch image endpoint, and the now development-only rate-limit test route.
- `/api/public/analytics/track` was manually checked: it rate-limits before body parsing, validates tenant/store/project shape, checks active/unblocked store state, uses cached target validation, filters analytics fields, and writes through `writePublicAnalyticsEventAdmin`.
- Focused risk-pattern search returned clean for raw AI response/body logs, full platform summary document logging, process-local screen limiter names, stale claim-token non-expiry wording, and leaked `details: error.message` responses.

## Verification Run

Passed:

- `npm run build:verify`
- `npm --prefix functions run build`
- `npm --prefix functions run lint` (exit 0; existing Next ESLint pages-directory warning only)
- `npm run verify:ai-accounting`
- `npm run verify:ai-menu-manager`
- `npm run verify:customer-app-pwa`
- `npm run verify:menu-extraction-pipeline`
- `npm run verify:menu-export`
- `npm run verify:owner-business-assistant`
- `npm run verify:recycle-bin`
- `npm run verify:menu-card-export`
- `npm run verify:printable-asset-templates`
- `npm run verify:creative-editor-smoke`
- `git diff --check`

## Cost Impact

- Screen seen, PWA dynamic assets, CSP reports, and domain provider routes now have stronger rate/cost bounds.
- Scheduled special-menu and reconciliation cache invalidation add small bounded cache invalidation calls after existing writes.
- No new Firestore collections, durable event streams, or owner-facing settings were added.

## Deployment Status

- Vercel: not deployed, per deployment guard.
- Firebase Functions: attempted and blocked by project billing/Secret Manager access.

Attempted command:

```bash
firebase deploy --project ecomsai --only functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:menulistMaintenanceScheduler,functions:backfillAggregates,functions:triggerSchedulerManually,functions:triggerWeeklyNarrativeManually,functions:triggerCustomerAnalyticsManually --non-interactive
```

Result: predeploy lint and build passed, package analysis started, then Firebase failed to validate latest versions for required secrets including `GEMINI_AI_KEY`, `WHATSAPP_ACCESS_TOKEN`, `RAZORPAY_KEY_ID`, and `SENTRY_DSN` because Google returned HTTP 403: billing must be enabled on project `ecomsai`.
