# Multi-Chain Permissions — Verification

**Feature:** #4B — Multi-Chain Permissions  
**Last Reviewed:** May 19, 2026  
**Status:** ✅ Production Ready after final review + production audit

## May 19, 2026 Audit Result

| Area | Result |
| ---- | ------ |
| Server-owned policy writes | ✅ `updateOutletPolicy()` now calls `POST /api/outlets/policy`; browser code no longer writes policy directly to Firestore. |
| Authorization | ✅ Policy writes require authenticated tenant access, `MANAGE_OUTLETS`, and master or safe legacy single-store eligibility. |
| Legacy repair | ✅ A one-store tenant with no master can be promoted only by the server after proving there is exactly one store and no existing master. |
| Outlet enforcement | ✅ `applyOutletPolicy()` strips chain/billing permissions for non-master stores and falls back to `DEFAULT_OUTLET_POLICY` when a master policy is not hydrated. |
| Mobile parity | ✅ Mobile Locations uses the same policy categories and server path as desktop, with sticky Save/Reset controls. |
| Firebase cost | ✅ Permission resolution stays in-memory. Outlet sessions may add one master-store read only when the master policy is missing from session context. |
| Verification commands | ✅ `npx tsc --noEmit --incremental false`; ✅ `npm run lint -- --max-warnings=0`; ✅ `git diff --check` on touched files. |

**Live Firebase test (May 19, 2026):** Disposable tenant `910884561`, master store `37`, outlet store `38`, user, and subscription verified `POST /api/outlets/policy` promoted a safe legacy master candidate and persisted `descriptionOverride: true`; cleanup verified all disposable tenant/store/user/subscription docs were removed.

## Scope For Improvement

- Add a small automated integration test for the policy endpoint that asserts outlet sessions without hydrated master `storeDetails` still receive default-safe outlet restrictions.
- Add a UI regression test for the mobile Locations sheet in a non-English locale so missing translation keys are caught before release.
