# Multi-Chain Permissions — Verification

**Feature:** #4B — Multi-Chain Permissions  
**Last Reviewed:** May 19, 2026  
**Status:** Source-verified evidence; not current launch certification

> **Launch Boundary:** This verification file records source and historical QA evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, permission-policy browser QA, linked outlet save QA, Firebase deploy evidence where rules/functions change, and target-environment smoke.

## May 19, 2026 Audit Result

| Area | Result |
| ---- | ------ |
| Server-owned policy writes | ✅ `updateOutletPolicy()` now calls `POST /api/outlets/policy`; browser code no longer writes policy directly to Firestore. |
| Authorization | ✅ Policy writes require authenticated tenant access, `MANAGE_OUTLETS`, and master or safe legacy single-store eligibility. |
| Legacy repair | ✅ A one-store tenant with no master can be promoted only by the server after proving there is exactly one store and no existing master. |
| Outlet enforcement | ✅ `applyOutletPolicy()` strips chain/billing permissions for non-master stores and falls back to `DEFAULT_OUTLET_POLICY` when a master policy is not hydrated. |
| Linked outlet save enforcement | ✅ `/api/projects/outlet-save` rejects disabled price, availability, description, image, language-addition, local item/category, project-deactivation, theme, brand, and layout changes before the outlet project write. |
| Linked outlet AI enforcement | ✅ Description/image API routes call `getLinkedOutletPolicyBlockReason()` before AI capacity/provider calls, blocking direct API bypasses of disabled outlet policies. |
| Extraction job store guard | ✅ `POST /api/menu-extraction/jobs` verifies tenant/store/project ownership before server-created extraction jobs. |
| Mobile parity | ✅ Mobile Locations uses the same policy categories and server path as desktop, with sticky Save/Reset controls. |
| Firebase cost | ✅ Permission resolution stays in-memory. Outlet sessions may add one master-store read only when the master policy is missing from session context. |
| Verification commands | ✅ `npx tsc --noEmit --incremental false`; ✅ `npm run lint -- --max-warnings=0`; ✅ `git diff --check` on touched files. |

**Live Firebase test (May 19, 2026):** Disposable tenant `910884561`, master store `37`, outlet store `38`, user, and subscription verified `POST /api/outlets/policy` promoted a safe legacy master candidate and persisted `descriptionOverride: true`; cleanup verified all disposable tenant/store/user/subscription docs were removed.

## Scope For Improvement

- Add a small automated integration test for the policy endpoint that asserts outlet sessions without hydrated master `storeDetails` still receive default-safe outlet restrictions.
- Add a UI regression test for the mobile Locations sheet in a non-English locale so missing translation keys are caught before release.
