# Platform Founder Monitor

## Purpose

The Founder Monitor is a platform-only operating dashboard for MenuList founders and core operators. It answers the daily question:

> Are more stores becoming trusted, live, paid, and operationally reliable?

It is intentionally separate from the normal restaurant owner dashboard. The owner dashboard is store-facing and tenant-scoped. The Founder Monitor is platform-wide and requires `platformRole === PLATFORM`.

## Runtime Surface

| Surface | Path |
| --- | --- |
| Desktop route | `/platform/founder-monitor` |
| API route | `/api/platform/founder-monitor` |
| Browser DAL | `src/database/ops/founderMonitor.ts` |
| UI component | `src/components/templates/main-app/platform/founderMonitor/index.tsx` |
| Mobile wrapper | `MobilePlatformInternalScreen` key `founderMonitor` |

## What It Shows

- Trusted Live Stores
- Active stores and total stores
- New tenants today
- New stores today
- Stores activated today
- Current MRR
- Net New MRR
- Cash collected today
- Failed payments today
- Onboarding stuck stores
- Store Truth Score rollup
- Distribution stores
- Support risk
- Tenant/store operations table
- Revenue movement table
- Source coverage and known data gaps

## Boundaries

- Platform-only.
- Read-only.
- Manual refresh only.
- Dashboard API reads precomputed platform summaries and the capped founder revenue movement ledger only.
- Revenue summaries are updated at Razorpay transaction time.
- Payment-to-live onboarding transitions are stored in `founderOnboardingTransitions`.
- Store, onboarding, truth, support, and reconciliation snapshots are refreshed by the shared MenuList maintenance scheduler every 30 minutes.
- The scheduler uses `platformSummary/storesSummary` for platform-wide store coverage and does not scan the full `stores` collection.
- Founder risk alerts are emitted through the existing `systemAlerts` / platform notification pipeline with cooldowns.
- The dashboard API does not write to Firestore.
- No public route.
- No restaurant owner-facing surface.
- No Vercel deploy implied.

## Verification

Run:

```bash
npm run verify:platform-founder-monitor-boundary
npm --prefix functions run build
```

Then run the normal TypeScript gate for implementation work:

```bash
npx tsc --noEmit --incremental false
```

Historical revenue can be reconstructed without Razorpay API calls by dry-running the guarded backfill:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-founder-revenue-read-model.ts --project-id menulist-qa
```

Write mode requires `--write --confirm-project <projectId> --all-founder-revenue` after reviewing dry-run output and backup state.
