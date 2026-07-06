# Multi-Outlet Consistency — Firebase Cost Tracking

**Feature:** Multi-Store Menu Consistency (Master/Outlet Pattern) + Store Onboarding (Feature #4C)  
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 6, 2026

**Priority:** HIGH — Real-time listeners + signal docs + outlet creation transactions.

> **Scope:** This doc covers menu consistency ops (signal docs, merge resolution, MOL events) and outlet creation/deactivation transactions. For OutletPolicy editor ops (`updateOutletPolicy`), see [Multi-Chain Permissions Firebase](../multi-chain-permissions/multi-chain-permissions_firebase.md). For base store CRUD ops (`addStore`, `updateStore`, summary syncs), see [Stores Management Firebase](../stores-management/stores-management_firebase.md).
>
> **Launch Boundary:** This file records Firebase cost and operation evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, desktop/mobile Locations browser QA, linked outlet save QA, Razorpay sandbox evidence where billing is involved, Firebase deploy evidence where rules/functions change, and target-environment smoke.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}`, `masterOperationalState/{projectId}`, `menuImageProcessingJobs`, `stores`, `tenants`, `users`, `subscriptions`, `platformSummary`, `multiOutletEvents/{tId}/{sId}`
- **Storage Buckets:** None (shared via project data)
- **Cloud Functions:** `processMenuImagesJob` enforces linked-outlet extraction policy before AI processing
- **External APIs:** Razorpay Subscriptions API (quantity updates)
- **Estimated Monthly Cost:** **Medium** — Real-time listeners + outlet creation transactions

---

## Firestore Operations

### Reads

| Operation                  | Collection                                 | Trigger                    | Frequency                  | Docs Read    | Indexed?   | Notes                                                                                                |
| -------------------------- | ------------------------------------------ | -------------------------- | -------------------------- | ------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| Load master project        | `projects/{tId}/{sId}/{masterProjectId}`   | Outlet editor opens        | Per editor session         | 1            | Direct doc | Reads master project for merge resolution. File: `src/lib/multiOutlet/index.ts`                      |
| Resolve project for render | `projects/{tId}/{sId}/{masterProjectId}`   | Customer views outlet menu | Per menu view (cached 60s) | 1            | Direct doc | `resolveProjectForRender()` merges master + outlet. File: `src/app/_client/[[...slug]]/page.tsx:216` |
| Listen to signal doc       | `masterOperationalState/{masterProjectId}` | Outlet editor open         | Real-time (onSnapshot)     | 1 per change | Direct doc | `onSnapshot` listener for `operationalVersion` changes. Fires when master saves operational changes. |
| Read master job status     | `menuImageProcessingJobs` + linked outlet project guard | Desktop outlet project editor | Every 15s while outlet editor is open | 0-2 | Query capped at 1 | `/api/projects/master-job-status` applies the shared `DATA_READ` cheap-fail gate with HMAC-hashed owner/tenant/store limiter key material, then validates `masterProjectId` and optional `outletProjectId` with the shared Firestore document-ID guard before session, tenant, store permission, and linked outlet project validation or querying active master extraction jobs. Master job status store-link boundary: Only the store encoded in the master project id can query that master job directly; other stores must present a linked outlet project whose `masterProjectId` matches. Rate-limited requests perform no Firestore reads. Browser polling uses same-origin credentials, no-store cache policy, and manual redirect handling before parsing the response through an 8KB bounded JSON guard and updating outlet blocking state. |
| Enforce linked-outlet AI policy | `projects/{tId}/{sId}/{projectId}` + `stores/{masterStoreId}` | Description/image/translation API request from linked outlet | Per linked outlet AI request | 0-2 | Direct docs | `getLinkedOutletPolicyBlockReason()` checks the project linkage and master `outletPolicy` before AI capacity/provider calls. Single-store and master-store requests add no extra read. Translation requests tied to linked outlet projects reject inherited item/category keys before Gemini work. |
| Enforce linked-outlet extraction policy | `projects/{tId}/{sId}/{projectId}` + `stores/{masterStoreId}` | `processMenuImagesJob` starts for a linked outlet project | Per linked outlet extraction job | 1-2 | Direct docs | The function loads the project before provider processing, detects `masterProjectId`, reads the master store policy, and fails the job with `OUTLET_POLICY_BLOCKED` when `canUseMenuExtraction=false`. The project read is reused later in the same job. |
| Load store config          | `stores/{storeId}`                         | Multi-outlet setup         | Per setup                  | 1            | Direct doc | Check `isMaster` flag, linked outlets.                                                               |

### Writes

| Operation                     | Collection                                 | Trigger                                       | Frequency                   | Docs Written | Fields                                               | Notes                                                                                                                                             |
| ----------------------------- | ------------------------------------------ | --------------------------------------------- | --------------------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Increment operational version | `masterOperationalState/{masterProjectId}` | Master saves with item/price/category changes | Per master operational save | 1            | operationalVersion (atomic increment), lastUpdatedAt | Only fires for operational changes (items, prices, categories), NOT UI config. File: `src/database/projects/index.ts:451-468`                     |
| Log MOL event                 | `multiOutletEvents/{tId}/{sId}`            | Any menu edit (master, outlet, standalone)    | Per save                    | 1            | Event type, metadata, actor                          | `logMultiOutletEvent()`. Tracks MASTER_MENU_UPDATED, OUTLET_MENU_UPDATED, STANDALONE_MENU_UPDATED. File: `src/database/projects/index.ts:489-529` |
| Save outlet local data/overrides | `projects/{tId}/{sId}/{outletProjectId}` | Outlet saves local changes | Per outlet save | 1 | Local `L_I_` / `L_C_` records, policy-allowed overrides, `outletLocalState` | Linked outlet saves route through `/api/projects/outlet-save`; server rejects copied master records, invalid override payloads/prices, and disabled OutletPolicy changes before writing. The route uses a user/project-scoped limiter with HMAC-hashed key material. `outletLocalState` is stamped in the same write, so there is no extra Firebase write. |
| Publish linked outlet design/local state | `projects/{tId}/{sId}/{outletProjectId}` | Desktop B2C or mobile design publish on linked outlet | Per linked outlet publish | 1 | Policy-allowed local fields, `lastPublishedAt`, `menuVersion` | `publishProject()` routes linked outlets through `/api/projects/outlet-save` with `publish: true`, so theme/brand/layout policy is enforced before publish metadata and public cache invalidation. The save route uses HMAC-hashed limiter key material. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                                    |
| --------- | ---------- | ------- | --------- | ------------ | --------- | -------------------------------------------------------- |
| None      | —          | —       | —         | —            | —         | Outlets never delete master data. Local overrides merge. |

---

## Cost Optimization Notes

### Current Optimizations

- **Signal doc pattern**: Single lightweight doc (`operationalVersion` + `lastUpdatedAt`) instead of full project listener. Only 2 fields = minimal bandwidth.
- **Atomic increment**: `increment(1)` is a server-side transform — no read needed before write.
- **Operational change detection**: `detectOperationalChange()` compares old vs new project. Only triggers signal write for actual item/price/category changes, not UI config saves.
- **Client-side merge cache**: `invalidateMasterCache()` clears in-memory cache on master save.
- **Vercel cache**: Customer-facing resolution cached 60s via `unstable_cache`.
- **Server-backed master job status**: desktop outlet editor no longer opens a cross-store client Firestore listener against master jobs. It first applies the shared `DATA_READ` cheap-fail gate, then calls one authenticated, capped Admin read and fails open, preventing outlet Firebase claims from needing broader rules. The browser hook uses same-origin credentials, no-store cache policy, manual redirect handling, an 8KB response cap, and the inactive/active master-job status envelope before updating blocking state. This request-policy hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, fields, rules, indexes, Firebase deploy requirement, or Vercel deploy action.
- **Master job status project ID boundary is cost-neutral**: `/api/projects/master-job-status` validates `masterProjectId` and optional `outletProjectId` with the existing multi-outlet project-ID character rule plus the shared Firestore document-ID guard before project-scope parsing, linked outlet project reads, or active master-job queries. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Master job status session store ID boundary is cost-neutral**: `/api/projects/master-job-status` now enforces that session store scope must be an exact positive numeric Firestore document ID before the caller `stores/{sId}` read, tenant access check, store-link comparison, or linked outlet project validation. Only the store encoded in the master project id can query that master job directly; other stores must present a linked outlet project whose `masterProjectId` matches. Whitespace-mutated, zero, negative, unsafe, leading-zero, nonnumeric, reserved, empty, or path-shaped session store IDs fail before Firestore document access. This changes malformed session-scope admission only and adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Outlet lifecycle session ID admission is cost-neutral**: `/api/outlets/create`, `/api/outlets/rename`, `/api/outlets/deactivate`, and `/api/outlets/policy` validate session tenant/store IDs with `src/lib/multiOutlet/outletSessionScope.ts` before tenant access, limiter keys, route diagnostics, Firestore document paths, public/screen cache invalidation, or Owner Business Assistant packet-cache invalidation. Rename and deactivate validate the body-provided outlet store ID before target outlet refs/cache work. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations beyond already-valid outlet mutations, rules, indexes, schema changes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Outlet action limiter privacy**: `/api/outlets/create`, `/api/outlets/policy`, `/api/outlets/rename`, and `/api/outlets/deactivate` keep their existing tenant-scoped limits, but store only HMAC-hashed tenant key material in Upstash. `/api/projects/outlet-save` keeps its existing user/project-scoped limiter and stores only HMAC-hashed user/project key material. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, or Firebase deploy requirement.
- **Outlet action response parsing is cost-neutral**: desktop Locations, desktop outlet create/rename modals, and mobile Locations cap `/api/outlets/create`, `/api/outlets/rename`, and `/api/outlets/deactivate` response JSON at 16KB before updating local tenant/store state. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Outlet action request policy is cost-neutral**: desktop Locations, desktop outlet create/rename modals, mobile Locations, and `updateOutletPolicy()` now share `MULTI_OUTLET_ACTION_REQUEST_POLICY` before calling `/api/outlets/create`, `/api/outlets/rename`, `/api/outlets/deactivate`, or `/api/outlets/policy`. The policy pins no-store cache, same-origin credentials, and manual redirects before existing bounded response parsing and local state updates. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Desktop outlet rename failure-path parsing is cost-neutral**: `OutletRenameModal` now parses the bounded `/api/outlets/rename` response before the non-OK branch and records the safe `currentSlug` field in bounded diagnostics for same-slug rejections. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Outlet deactivation security logging is cost-neutral**: `POST /api/outlets/deactivate` keeps the same store/tenant transaction, billing reduction attempt, cache invalidation, and response shape, but the success security event records only bounded tenant/master/outlet metadata instead of raw IDs. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Active-only max-outlet cap is cost-neutral**: `POST /api/outlets/create` enforces `MAX_OUTLETS_PER_TENANT` against active non-master outlets only, so deactivated outlets preserve history without blocking replacement locations. This uses the already-loaded tenant `storesList` and adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, Firebase deploy requirement, or Vercel deploy action.
- **Linked outlet save server route**: outlet editor persists only local records and overrides, so inherited master records are not copied into every outlet project. This keeps outlet documents smaller and prevents future master updates from becoming write amplification.
- **Linked outlet save response parsing is cost-neutral**: `updateProject()`, linked outlet `publishProject()`, and linked-outlet extraction review applies use `src/lib/multiOutlet/linkedOutletSaveResponse.ts` to cap `/api/projects/outlet-save` response JSON at 2MB and require a matching save acknowledgement before using the returned project. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Linked outlet save request policy is cost-neutral**: editor save, linked outlet publish, and extraction review apply share `LINKED_OUTLET_SAVE_REQUEST_POLICY` before calling `/api/projects/outlet-save`. The policy pins no-store cache, same-origin credentials, and manual redirects before the existing bounded acknowledgement parser. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, route logic changes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, Firebase deploy requirement, or Vercel deploy action.
- **Linked outlet save ID admission is cost-neutral**: `/api/projects/outlet-save` validates `projectId`, `masterProjectId`, and override map IDs with the existing linked-outlet character rule plus the shared Firestore document-ID guard before project-scope parsing, outlet project reads, outlet-local override writes, public/screen cache invalidation, owner-assistant packet invalidation, or save acknowledgement. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations beyond the already-valid save path, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Shared multi-outlet project ID boundary is cost-neutral**: `src/lib/multiOutlet/projectIdBoundary.ts` normalizes `projectId` / `masterProjectId` for the shared resolver and `/api/projects/outlet-save`, requiring exact Firestore document IDs and exact positive numeric tenant/store path segments before master-project reads, linked outlet project reads/writes, public/screen cache invalidation, or save acknowledgement. Malformed, whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, reserved, path-shaped, or oversized scope fails before Firestore document access. This changes malformed project-scope admission only and adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations beyond already-valid linked outlet saves, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Linked outlet save session store ID boundary is cost-neutral**: `/api/projects/outlet-save` validates authenticated session store scope with `normalizeMultiOutletNumericDocumentId()` before tenant access, caller-store reads, store permission checks, outlet/master store reads, OutletPolicy enforcement, linked outlet writes, public/screen cache invalidation, Owner Business Assistant packet invalidation, or save acknowledgement. Whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, reserved, empty, or path-shaped session store IDs fail before Firestore document access. This changes malformed session-scope admission only and adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations beyond already-valid linked outlet saves, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Linked outlet AI policy scope boundary is cost-neutral**: `getLinkedOutletPolicyBlockReason()` now uses `normalizeMultiOutletProjectId()` plus the shared exact numeric document-ID guard for session tenant/store scope, requested project scope, stored master project scope, and master-store tenant scope before AI description/image/translation routes can continue to capacity checks or provider calls. Malformed, whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, cross-tenant, reserved, path-shaped, or oversized project scope fails before provider work. This changes malformed AI policy admission only and adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.
- **Master update awareness snapshot hardening is cost-neutral**: `createMasterSnapshot()` and `computeMasterUpdateDiff()` normalize optional diff fields before `useMasterUpdateAwareness` writes `masterSnapshot.lastDiff`, so "Got it" acknowledgements do not persist nested `undefined` values that Firestore rejects. The acknowledgement still performs the same single outlet project update and local desktop/mobile cache update. It adds no Firestore reads, extra writes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, Firebase deploy requirement, Vercel deploy action, or customer-facing menu change.
- **Active store-context fallback diagnostics are cost-neutral**: `src/providers/sessionProvider.tsx` now logs bounded `session_provider_active_store_context_load_failed` diagnostics and falls back to the login store if a validated target store context cannot finish store/subscription loading. This adds no Firestore reads/writes/deletes beyond existing valid target store and subscription reads, no Storage operations, provider calls, route logic changes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Multi-location boundary source gate is cost-neutral:** Multi-location boundary source gate: `npm run verify:multi-location-boundary` performs no Firestore reads/writes/deletes, Storage operations, provider calls, Razorpay calls, route logic changes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, Firebase deploy, or Vercel deploy action. It only checks source/docs parity for outlet lifecycle routes, linked outlet project-save enforcement, desktop/mobile acknowledgement guards, and MobileShell routing. It does not call Razorpay or live Firestore.
- **Extraction review apply acknowledgement is cost-neutral**: desktop and mobile extraction review applies now pass the owner-approved selected-change count into `applyExtractionChanges()`. The helper refuses no-op or partial apply counts before project/job writes and returns project id, job id, mode, completion flag, and applied count for the UI acknowledgement guard. This adds no Firestore reads/writes/deletes beyond existing valid review applies, no Storage operations, provider calls, route logic changes, cache invalidations beyond existing valid applies, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Outlet-local state piggybacks on existing writes**: `outletLocalState.localVersion`, `lastLocalChangeAt`, `lastLocalChangeBy`, and `lastLocalChangeReason` are written only when the outlet project already saves local data/overrides. No master fan-out and no additional write operation.
- **Stable extraction ID aliases**: `extractionIdAliases` are stored on the existing item/category during approved extraction saves. This avoids copying or remapping outlet overrides and keeps future matching client-side.
- **Server-side OutletPolicy enforcement**: `/api/projects/outlet-save` rejects disabled price, availability, description, image, language-addition, local item/category, project-deactivation, theme, brand, and layout changes before the project write. Existing disabled overrides can remain unchanged or be removed back toward master values.
- **AI spend guard before provider calls**: Linked outlet description/image/translation APIs read the linked project and master store policy first. Disabled or inherited-content actions return `403` before Gemini/Imagen calls or AI-capacity consumption.
- **Linked outlet publish guard**: desktop B2C and mobile design publish use the same `/api/projects/outlet-save` policy checks as editor saves, so outlets cannot bypass disabled theme, brand, or layout overrides by publishing from the design surface.
- **Extraction spend guard before provider calls**: `processMenuImagesJob` reuses the existing project read before extraction, reads the master policy for linked outlet projects, and fails disabled outlet extraction jobs before calling the extractor.
- **Extraction job tenant/store guard**: Firestore rules require `menuImageProcessingJobs.sId` to match the authenticated Firebase token `storeId`, so an outlet cannot queue extraction jobs under another store's ID.
- **Bounded diagnostics are cost-neutral**: `src/lib/multiOutlet/diagnostics.ts` and the multi-outlet DAL response guards change only browser/server diagnostic payloads for awareness, resolution, propagation, linked outlet save, outlet policy response parsing, and outlet rename failures. `updateOutletPolicy()` caps `/api/outlets/policy` response JSON at 16KB and requires a valid policy acknowledgement before updating local state. This adds no Firestore reads/writes, listeners, Storage operations, Cloud Function calls, provider calls, cache invalidations, fields, rules, indexes, Firebase deploy requirement, or Vercel deploy action.

### Warnings: Expensive Patterns

- **Real-time listener on signal doc**: Each outlet editor open = 1 active listener. 10 outlets open = 10 listeners. Reads accumulate on every master save.
- **Master project reads**: Each outlet resolution reads the full master project (~50KB). At scale, this is the dominant cost.
- **MOL event logging**: Every save creates an event doc. High-frequency editors = many event docs.

---

## Cost Estimate (per 100 multi-outlet stores, 5 outlets each, 10 saves/day)

Assumption for INR estimate: ₹83/USD.

| Resource                            | Operations/month          | Unit Cost  | Monthly Cost     |
| ----------------------------------- | ------------------------- | ---------- | ---------------- |
| Firestore Reads (signal listener)   | 500 outlets × 30 = 15,000 | ~₹5/100K   | ~₹1              |
| Firestore Reads (master resolution) | 50,000                    | ~₹5/100K   | ~₹2              |
| Firestore Reads (customer render)   | 100,000 ÷ cache = 10,000  | ~₹5/100K   | ~₹1              |
| Firestore Writes (signal increment) | 30,000                    | ~₹15/100K  | ~₹5              |
| Firestore Writes (MOL events)       | 150,000                   | ~₹15/100K  | ~₹22             |
| **Total**                           |                           |            | **~₹31/month**   |

---

## DAL Functions Used

| Function                  | File                                      | Operation Type                   |
| ------------------------- | ----------------------------------------- | -------------------------------- |
| `resolveProjectForRender` | `src/lib/multiOutlet/index.ts`            | Read (master project)            |
| `invalidateMasterCache`   | `src/lib/multiOutlet/index.ts`            | Cache invalidation               |
| `detectOperationalChange` | `src/lib/multiOutlet/masterUpdateDiff.ts` | Comparison (no Firebase)         |
| `logMultiOutletEvent`     | `src/lib/multiOutlet/molEvents.ts`        | Write (addDoc)                   |
| Signal doc increment      | `src/database/projects/index.ts:451-468`  | Write (setDoc merge + increment) |

---

## Store Onboarding (Feature #4C) — Firebase Operations

> Added February 12, 2026. Covers outlet creation, deactivation, store switching, subscription fallback, and project propagation.

### Reads (Feature #4C)

| Operation                    | Collection                     | Trigger                      | Docs Read | File                                         |
| ---------------------------- | ------------------------------ | ---------------------------- | --------- | -------------------------------------------- |
| Check isMaster (create)      | `stores/{sId}`                 | POST /api/outlets/create     | 1         | `src/app/api/outlets/create/route.ts:53`     |
| Check role + legacy master state | `stores/{sId}` + `tenants/{tId}` | POST /api/outlets/create / policy | 2 | `src/lib/permissions/server.ts`, `src/app/api/outlets/policy/route.ts` |
| Get active subscription      | `subscriptions` (query)        | POST /api/outlets/create     | 1-2       | `src/database/subscriptions/index.ts`        |
| Lock check (in tx)           | `tenants/{tId}`                | POST /api/outlets/create     | 1         | `src/app/api/outlets/create/route.ts:69`     |
| Fetch master projects        | `projects/{tId}/{sId}` (query) | POST /api/outlets/create     | N         | `src/app/api/outlets/create/route.ts:94`     |
| Get storesList (create)      | `tenants/{tId}`                | POST /api/outlets/create     | 1         | `src/app/api/outlets/create/route.ts:100`    |
| Get store count (in tx)      | `platformSummary/summary`      | POST /api/outlets/create     | 1         | `src/app/api/outlets/create/route.ts:105`    |
| Check isMaster (deactivate)  | `stores/{sId}`                 | POST /api/outlets/deactivate | 1         | `src/app/api/outlets/deactivate/route.ts` |
| Get storesList (deactivate)  | `tenants/{tId}`                | POST /api/outlets/deactivate | 1         | `src/app/api/outlets/deactivate/route.ts` |
| Validate target outlet doc (deactivate) | `stores/{outletSId}` | POST /api/outlets/deactivate | 1 | Canonical tenant/master check before Admin writes. |
| Recheck target and storesList (deactivate tx) | `stores/{outletSId}` + `tenants/{tId}` | POST /api/outlets/deactivate | 2 | Transaction recheck prevents stale-list cross-store writes. |
| Check caller store permission (switch) | `stores/{sId}`        | POST /api/auth/switch-store  | 1         | Runs after session tenant check, 60/min rate limit, and 1KB bounded body validation. |
| Get storesList (switch)      | `tenants/{tId}`                | POST /api/auth/switch-store  | 1         | Rejects missing or platform-blocked tenant before target selection. |
| Validate target store doc (switch) | `stores/{targetStoreId}` | POST /api/auth/switch-store | 1 | Canonical tenant/active/deleted/platform-block check before returning switch success. |
| Read outlet for rename       | `stores/{outletSId}`           | POST /api/outlets/rename     | 1         | `src/app/api/outlets/rename/route.ts`        |
| Read tenant list for rename  | `tenants/{tId}`                | POST /api/outlets/rename tx  | 1         | `src/app/api/outlets/rename/route.ts`        |
| Outlet sub fallback          | `tenants/{tId}`                | Outlet loads billing         | 1         | `src/database/subscriptions/index.ts:127`    |
| Master sub fetch (fallback)  | `subscriptions` (query)        | Outlet loads billing         | 1-2       | `src/database/subscriptions/index.ts:137`    |
| Get storesList (propagation) | `tenants/{tId}`                | Master creates project       | 1         | `src/database/multiOutlet/propagation.ts`; filters active non-master outlets only. |
| Master delete linked-outlet guard | `tenants/{tId}` + active outlet project collections | Master project delete | 1 + active outlet count | `src/database/multiOutlet/index.ts`; inactive outlets are skipped to avoid stale cleanup blockers and extra reads. |

June 30 switch-store browser request-policy hardening is Firebase-cost neutral. Desktop header, desktop Billing, desktop Locations, mobile More, mobile Billing, and mobile Locations now call the existing `/api/auth/switch-store` route with no-store cache policy, same-origin credentials, and manual redirect handling before existing rejected-response handling and Firebase claim refresh. This changes no route reads/writes, Firebase Auth operations beyond existing claim refresh attempts, Firestore rules/indexes, Cloud Functions, owner settings, Firebase deploy requirement, or Vercel deploy action.

July 1 switch-store target eligibility hardening adds one canonical `stores/{targetStoreId}` read to successful switch attempts after the existing caller-store permission read and tenant storesList read. The route now rejects missing, cross-tenant, inactive, soft-deleted, or platform-blocked target store documents and platform-blocked tenant documents before returning the switch acknowledgement. It adds no writes, Firebase Auth operations, Cloud Functions, rules, indexes, cache invalidations, Firebase deploy requirement, or Vercel deploy action.

July 6 Switch-store scope document ID boundary is Firebase-cost neutral. `/api/auth/switch-store` now normalizes the session tenant ID, session current-store ID, and requested target-store ID with the shared store-permission document ID guard before the existing tenant access check, caller-store permission read, tenant storesList read, canonical target-store read, mapped-access check, or success acknowledgement. This changes only malformed scope admission and Firestore path composition; valid switch attempts keep the same three reads and no writes, Firebase Auth operations, Cloud Functions, rules, indexes, cache invalidations, Firebase deploy requirement, or Vercel deploy action.

### Writes (Feature #4C)

| Operation                      | Collection                             | Trigger                      | Docs Written         | File                                      |
| ------------------------------ | -------------------------------------- | ---------------------------- | -------------------- | ----------------------------------------- |
| Acquire lock (in tx)           | `tenants/{tId}`                        | POST /api/outlets/create     | 1                    | `route.ts:76`                             |
| Update sub quantity            | `subscriptions/{subId}`                | POST /api/outlets/create     | 0-1                  | Runs only when `ENABLE_OUTLET_BILLING` is enabled and Razorpay-backed quantity must increase after provider update succeeds. Manual/offline subscriptions consume already-paid capacity and do not write quantity during outlet creation. UPI-backed provider-update failures route to Billing replacement checkout before store creation. |
| Create outlet store (in tx)    | `stores/{newSId}`                      | POST /api/outlets/create     | 1                    | `route.ts:114`                            |
| Sync storesSummary (in tx)     | `platformSummary/storesSummary`        | POST /api/outlets/create     | 1                    | `route.ts:132`                            |
| Legacy master repair (in tx)   | `stores/{sId}` + `tenants/{tId}` + `platformSummary/storesSummary` | First outlet or policy save on legacy single-store tenant | 3 | `src/app/api/outlets/create/route.ts`, `src/app/api/outlets/policy/route.ts` |
| Update storesList (in tx)      | `tenants/{tId}`                        | POST /api/outlets/create     | 1                    | `route.ts:145`                            |
| Update store count (in tx)     | `platformSummary/summary`              | POST /api/outlets/create     | 1                    | `route.ts:155`                            |
| Create outlet projects (in tx) | `projects/{tId}/{newSId}/{id}`         | POST /api/outlets/create     | N per master project | `route.ts:164`                            |
| Sync project summaries (in tx) | `platformSummary/projects_{newSId}`    | POST /api/outlets/create     | N per master project | `route.ts:179`                            |
| Grant creator outlet access    | `users/{uId}`                          | POST /api/outlets/create     | 1                    | Creator user doc receives outlet `stores[]` mapping and `storeIds[]` entry inside the creation transaction. |
| Revert sub quantity (error)    | `subscriptions/{subId}`                | Creation failure after quantity update | 1          | `src/app/api/outlets/create/route.ts`     |
| Release acquired lock (error)  | `tenants/{tId}`                        | Creation failure after lock acquired | 1              | `src/app/api/outlets/create/route.ts`     |
| Deactivate outlet (in tx)      | `stores/{outletSId}`                   | POST /api/outlets/deactivate | 1                    | `src/app/api/outlets/deactivate/route.ts` |
| Sync deactivation (in tx)      | `platformSummary/storesSummary`        | POST /api/outlets/deactivate | 1                    | `src/app/api/outlets/deactivate/route.ts` |
| Update deactivated storesList (in tx) | `tenants/{tId}`                 | POST /api/outlets/deactivate | 1                    | `src/app/api/outlets/deactivate/route.ts` |
| Reduce sub quantity (deactivate) | `subscriptions/{subId}`              | POST /api/outlets/deactivate | 1 for Razorpay-backed only | Manual/offline prepaid capacity is retained until expiry, so deactivation frees a replacement slot without a refund/write. |
| Rename outlet (in tx)          | `stores/{outletSId}`                   | POST /api/outlets/rename     | 1                    | `src/app/api/outlets/rename/route.ts`     |
| Sync renamed outlet (in tx)    | `platformSummary/storesSummary`        | POST /api/outlets/rename     | 1                    | `src/app/api/outlets/rename/route.ts`     |
| Update renamed storesList (in tx) | `tenants/{tId}`                     | POST /api/outlets/rename     | 1                    | `src/app/api/outlets/rename/route.ts`     |
| Propagate project              | `projects/{tId}/{outletSId}/{id}`      | Master creates project       | 1 per active outlet  | `propagation.ts`; inactive outlets are skipped. |
| Sync propagated summary        | `platformSummary/projects_{outletSId}` | Master creates project       | 1 per active outlet  | `propagation.ts`; inactive outlets are skipped. |
| Set isMaster (onboarding)      | `stores/{sId}` + `tenants/{tId}`       | Onboarding                   | 2                    | `onboarding/create-subscription/route.ts` |
| Set sub quantity               | `subscriptions/{subId}`                | Subscription creation        | 1                    | Onboarding creates `quantity=1`; `/api/razorpay/create-subscription` accepts `quantity` for plan changes and paid-location replacement checkouts. |

### External API Calls (Feature #4C)

| Operation                    | Service      | Trigger                  | File           |
| ---------------------------- | ------------ | ------------------------ | -------------- |
| Update subscription quantity | Razorpay API | POST /api/outlets/create/deactivate only when `billingMode !== "manual"` and provider subscription ID is a real Razorpay `sub_...` ID | `src/lib/billing/subscriptionProviderSync.ts`, `src/app/api/outlets/create/route.ts`, `src/app/api/outlets/deactivate/route.ts` |
| Revert subscription quantity | Razorpay API | Creation failure after provider quantity update | `src/app/api/outlets/create/route.ts` |
| Create replacement subscription | Razorpay API | Desktop/mobile Billing "Add paid location" when UPI-backed quantity update is unsupported or when the owner wants prepaid self-serve capacity | `src/app/api/razorpay/create-subscription/route.ts`, `src/hooks/usePaymentHandler.ts` |

Manual/offline premium subscriptions avoid the Razorpay API call entirely. This prevents failed provider calls for `manual_...` records, removes unnecessary provider traffic from outlet creation/deactivation, and reduces reconciliation noise because manual records are skipped by the subscription reconciler. Manual location capacity is added through `/api/reseller/add-location-capacity`, which writes the subscription `quantity`/`amount`, appends a reseller transaction, and updates reseller revenue stats after offline payment collection.

UPI-backed Razorpay subscriptions can be active but still reject provider quantity updates. In that case, `/api/outlets/create` does not write stores/projects. Billing creates one pending replacement subscription with the target `quantity`; after payment verification, `/api/razorpay/upgrade-subscription` expires/cancels the old subscription and the owner retries outlet creation against already-paid capacity.

Outlet create/deactivate route diagnostics use `src/lib/multiOutlet/diagnostics.ts`. Billing-provider quantity update failures, UPI quantity-update rejection classification, provider/subscription revert failures, non-blocking deactivation billing reduction failures, top-level route failures, and the outlet-deactivated success security event log stable codes or fixed action labels with tenant/store/outlet/provider/subscription ID presence and length metadata, counts/quantities, and source error name/code/status only. Raw Razorpay provider messages, provider subscription IDs, tenant/store IDs, and route exception messages must not be passed into `secureError()` or `logger.security()`.

### DAL Functions (Feature #4C)

| Function                                               | File                                      | Operation                    |
| ------------------------------------------------------ | ----------------------------------------- | ---------------------------- |
| `getActiveSubscriptionForStore` (with outlet fallback) | `src/database/subscriptions/index.ts`     | Read (query + fallback)      |
| `getMasterStoreIdFromList`                             | `src/database/subscriptions/index.ts:102` | In-memory (no Firebase)      |
| `updateSubscription`                                   | `src/database/subscriptions/index.ts:168` | Write (setDoc merge)         |
| `propagateNewProjectToOutlets`                         | `src/database/multiOutlet/propagation.ts` | Read tenant + Write projects |
| `calculateProration`                                   | `src/utils/razorpay.ts:52`                | In-memory (no Firebase)      |

### June 11, 2026 Audit Notes

- Deactivation now verifies the canonical outlet store document before Admin writes and rechecks target/tenant state inside the transaction. This adds up to three reads but prevents stale `storesList` from becoming the only cross-store authority.
- Project and master brand propagation skip inactive outlets. This reduces writes, summary writes, and cache revalidation after deactivation.
- Master delete protection scans active non-master outlet project collections only. Inactive outlet archives no longer block master cleanup or create unnecessary N+1 reads.
- Desktop and mobile Locations count active outlets, not historical inactive outlets, in billing/location summaries.
- Inactive outlet rename is rejected by the server route.
