# Multi-Outlet Consistency — Firebase Cost Tracking

**Feature:** Multi-Store Menu Consistency (Master/Outlet Pattern) + Store Onboarding (Feature #4C)  
**Status:** ✅ Production Ready  
**Last Updated:** May 27, 2026

**Priority:** HIGH — Real-time listeners + signal docs + outlet creation transactions.

> **Scope:** This doc covers menu consistency ops (signal docs, merge resolution, MOL events) and outlet creation/deactivation transactions. For OutletPolicy editor ops (`updateOutletPolicy`), see [Multi-Chain Permissions Firebase](../multi-chain-permissions/multi-chain-permissions_firebase.md). For base store CRUD ops (`addStore`, `updateStore`, summary syncs), see [Stores Management Firebase](../stores-management/stores-management_firebase.md).

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
| Read master job status     | `menuImageProcessingJobs` + linked outlet project guard | Desktop outlet project editor | Every 15s while outlet editor is open | 0-2 | Query capped at 1 | `/api/projects/master-job-status` validates session, tenant, store permission, and linked outlet project before querying active master extraction jobs. No Upstash rate-limit call because this is a read-only polling endpoint; avoids an external network dependency per poll. |
| Enforce linked-outlet AI policy | `projects/{tId}/{sId}/{projectId}` + `stores/{masterStoreId}` | Description/image API request from linked outlet | Per linked outlet AI request | 0-2 | Direct docs | `getLinkedOutletPolicyBlockReason()` checks the project linkage and master `outletPolicy` before AI capacity/provider calls. Single-store and master-store requests add no extra read. |
| Enforce linked-outlet extraction policy | `projects/{tId}/{sId}/{projectId}` + `stores/{masterStoreId}` | `processMenuImagesJob` starts for a linked outlet project | Per linked outlet extraction job | 1-2 | Direct docs | The function loads the project before provider processing, detects `masterProjectId`, reads the master store policy, and fails the job with `OUTLET_POLICY_BLOCKED` when `canUseMenuExtraction=false`. The project read is reused later in the same job. |
| Load store config          | `stores/{storeId}`                         | Multi-outlet setup         | Per setup                  | 1            | Direct doc | Check `isMaster` flag, linked outlets.                                                               |

### Writes

| Operation                     | Collection                                 | Trigger                                       | Frequency                   | Docs Written | Fields                                               | Notes                                                                                                                                             |
| ----------------------------- | ------------------------------------------ | --------------------------------------------- | --------------------------- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Increment operational version | `masterOperationalState/{masterProjectId}` | Master saves with item/price/category changes | Per master operational save | 1            | operationalVersion (atomic increment), lastUpdatedAt | Only fires for operational changes (items, prices, categories), NOT UI config. File: `src/database/projects/index.ts:451-468`                     |
| Log MOL event                 | `multiOutletEvents/{tId}/{sId}`            | Any menu edit (master, outlet, standalone)    | Per save                    | 1            | Event type, metadata, actor                          | `logMultiOutletEvent()`. Tracks MASTER_MENU_UPDATED, OUTLET_MENU_UPDATED, STANDALONE_MENU_UPDATED. File: `src/database/projects/index.ts:489-529` |
| Save outlet local data/overrides | `projects/{tId}/{sId}/{outletProjectId}` | Outlet saves local changes | Per outlet save | 1 | Local `L_I_` / `L_C_` records, policy-allowed overrides, `outletLocalState` | Linked outlet saves route through `/api/projects/outlet-save`; server rejects copied master records, invalid override payloads/prices, and disabled OutletPolicy changes before writing. `outletLocalState` is stamped in the same write, so there is no extra Firebase write. |

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
- **Server-backed master job status**: desktop outlet editor no longer opens a cross-store client Firestore listener against master jobs. It calls one authenticated, capped Admin read and fails open, preventing outlet Firebase claims from needing broader rules.
- **Linked outlet save server route**: outlet editor persists only local records and overrides, so inherited master records are not copied into every outlet project. This keeps outlet documents smaller and prevents future master updates from becoming write amplification.
- **Outlet-local state piggybacks on existing writes**: `outletLocalState.localVersion`, `lastLocalChangeAt`, `lastLocalChangeBy`, and `lastLocalChangeReason` are written only when the outlet project already saves local data/overrides. No master fan-out and no additional write operation.
- **Stable extraction ID aliases**: `extractionIdAliases` are stored on the existing item/category during approved extraction saves. This avoids copying or remapping outlet overrides and keeps future matching client-side.
- **Server-side OutletPolicy enforcement**: `/api/projects/outlet-save` rejects disabled price, availability, description, image, language-addition, local item/category, project-deactivation, theme, brand, and layout changes before the project write. Existing disabled overrides can remain unchanged or be removed back toward master values.
- **AI spend guard before provider calls**: Linked outlet description/image APIs read the linked project and master store policy first. Disabled actions return `403` before Gemini/Imagen calls or AI-capacity consumption.
- **Extraction spend guard before provider calls**: `processMenuImagesJob` reuses the existing project read before extraction, reads the master policy for linked outlet projects, and fails disabled outlet extraction jobs before calling the extractor.
- **Extraction job tenant/store guard**: Firestore rules require `menuImageProcessingJobs.sId` to match the authenticated Firebase token `storeId`, so an outlet cannot queue extraction jobs under another store's ID.

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
| Check isMaster (deactivate)  | `stores/{sId}`                 | POST /api/outlets/deactivate | 1         | `src/app/api/outlets/deactivate/route.ts:39` |
| Get storesList (deactivate)  | `tenants/{tId}`                | POST /api/outlets/deactivate | 1         | `src/app/api/outlets/deactivate/route.ts:45` |
| Check caller store permission (switch) | `stores/{sId}`        | POST /api/auth/switch-store  | 1         | `src/app/api/auth/switch-store/route.ts`     |
| Get storesList (switch)      | `tenants/{tId}`                | POST /api/auth/switch-store  | 1         | `src/app/api/auth/switch-store/route.ts`     |
| Read outlet for rename       | `stores/{outletSId}`           | POST /api/outlets/rename     | 1         | `src/app/api/outlets/rename/route.ts`        |
| Read tenant list for rename  | `tenants/{tId}`                | POST /api/outlets/rename tx  | 1         | `src/app/api/outlets/rename/route.ts`        |
| Outlet sub fallback          | `tenants/{tId}`                | Outlet loads billing         | 1         | `src/database/subscriptions/index.ts:127`    |
| Master sub fetch (fallback)  | `subscriptions` (query)        | Outlet loads billing         | 1-2       | `src/database/subscriptions/index.ts:137`    |
| Get storesList (propagation) | `tenants/{tId}`                | Master creates project       | 1         | `src/database/multiOutlet/propagation.ts:34` |

### Writes (Feature #4C)

| Operation                      | Collection                             | Trigger                      | Docs Written         | File                                      |
| ------------------------------ | -------------------------------------- | ---------------------------- | -------------------- | ----------------------------------------- |
| Acquire lock (in tx)           | `tenants/{tId}`                        | POST /api/outlets/create     | 1                    | `route.ts:76`                             |
| Update sub quantity            | `subscriptions/{subId}`                | POST /api/outlets/create     | 0-1                  | Runs only when Razorpay-backed quantity must increase and provider update succeeds. Manual/offline subscriptions consume already-paid capacity and do not write quantity during outlet creation. UPI-backed provider-update failures route to Billing replacement checkout before store creation. |
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
| Propagate project              | `projects/{tId}/{outletSId}/{id}`      | Master creates project       | 1 per outlet         | `propagation.ts:60`                       |
| Sync propagated summary        | `platformSummary/projects_{outletSId}` | Master creates project       | 1 per outlet         | `propagation.ts:77`                       |
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

### DAL Functions (Feature #4C)

| Function                                               | File                                      | Operation                    |
| ------------------------------------------------------ | ----------------------------------------- | ---------------------------- |
| `getActiveSubscriptionForStore` (with outlet fallback) | `src/database/subscriptions/index.ts`     | Read (query + fallback)      |
| `getMasterStoreIdFromList`                             | `src/database/subscriptions/index.ts:102` | In-memory (no Firebase)      |
| `updateSubscription`                                   | `src/database/subscriptions/index.ts:168` | Write (setDoc merge)         |
| `propagateNewProjectToOutlets`                         | `src/database/multiOutlet/propagation.ts` | Read tenant + Write projects |
| `calculateProration`                                   | `src/utils/razorpay.ts:52`                | In-memory (no Firebase)      |
