# Temporary Status Layer - Validation

**Result:** Local source complete
**Date:** July 16, 2026
**Feature flag:** default `true`

## Current Source Boundary

Primary gate:

```bash
npm run verify:temporary-status-boundary
```

The verifier covers `src/app/client/obp/OBPResolvedSurface.tsx`, menu and feedback rendering, owner clients, active-status normalization, exact expiry, Special Menu ownership, structured data, public API/browser projections, store/cache/screen/assistant effects, `screen-data`, and docs parity.

## Correctness Cases

| Case | Expected result |
| --- | --- |
| Known type + future ISO expiry | Active normalized status. |
| Expiry exactly equal to now | Inactive. |
| Malformed expiry/type/value | Hidden from public and browser projections. |
| Custom message with controls/extra whitespace | Controls removed, whitespace collapsed, maximum 100 characters. |
| Missing/empty message | Safe type default. |
| Mounted banner reaches expiry | Hides without reload. |
| `closed_today` in Asia/Kolkata | Store-local current day closure schema. |
| `kitchen_closed` | Banner allowed; whole-business closure schema omitted. |
| Invalid timezone | Status schema omitted; rendering does not crash. |
| Legacy `{ success: true }` response | Accepted as committed success with `effectsPending: false`. |
| Committed write + failed refresh effect | Success retained, owner warned, bounded diagnostic emitted. |
| Special Menu deactivate/cancel | Only owned Special Menu status is cleared. |

Deterministic coverage lives in `scripts/verification/test-temporary-status-boundary.ts`. Public browser projection tests also assert that expired state is omitted.

## Security and Cost Evidence

- Strict session document-ID normalization before route-local material.
- Hashed limiter key and fail-closed limiter-provider behavior.
- 4KB request cap and Zod validation before permission-backed mutation.
- Current persisted store permission before write.
- 8KB owner response cap and fixed failure copy.
- One existing store-document write per valid manual set/clear; no status-only read, history collection, listener, queue, or cleanup worker.
- Existing public cache, Digital Screens, and Owner Business Assistant effects remain post-commit.

## Local Gate Set

- `npm run verify:temporary-status-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:public-customer-delivery`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:mobile-shell-route-map`
- `npm run verify:dependency-freeze`
- exact `npx tsc --noEmit --pretty false`
- scoped ESLint
- `npm run docs:check-links`
- `git diff --check`

## Not Certified Locally

No live status was written, no provider or public API credential was used, and no hosted browser/device/cache/screen smoke, Vercel deploy, production build, or production-host test was run. Those remain pending owner/release evidence.
