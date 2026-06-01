# GrowthOS Add-on - Firebase And Cost Plan

**Status:** Implemented behind disabled feature flag
**Runtime cost today:** No owner runtime cost while `ENABLE_GROWTHOS_ADDON=false`
**Cost principle:** Paid add-on value must cover Firestore, Storage, and provider usage.

---

## 1. Current Cost Impact

The implementation adds Firestore rules and gated code paths, but the master feature flag defaults off.

No Storage rules, Cloud Functions, provider calls, scheduled jobs, or indexes were added.

## 2. Cost Design Principles

GrowthOS must follow existing MenuList cost discipline:

- one-read summary pattern for owner screens
- no realtime listener by default
- no unbounded collection scan
- no standalone scheduler
- AI capacity check before provider call
- write only on owner action or explicit generation
- export events are execution signals only
- no ROI or revenue inference from export rows

## 3. Planned Firestore Reads

| Flow | Expected reads | Notes |
| --- | ---: | --- |
| Open Growth Kits home | 1 read | `platformSummary/growthos_{sId}`. |
| Open from Today with existing Today data | 0-1 additional reads | Today may already have `platformSummary/campaigns_{sId}` through `useTodayCampaigns`. |
| Refresh action queue | 2-4 reads | Store entitlement context, current project/menu data, and current summary. |
| Generate kit | 2-4 reads | Store entitlement context, current project/menu data, and current summary before generation. |
| Copy/share/download kit | 3-5 reads | Server revalidates entitlement, kit, summary, and current source hash before recording use. |
| Review reply draft | 0-1 reads | Owner-pasted text can avoid review collection reads. |
| Staff Brief generation | 0 additional reads when source facts are already loaded | Deterministic V1 output from same source facts. |
| Latest kit mobile fallback | 0 additional server reads after failed refresh | Uses last successfully loaded kit payload on device. |
| Existing Image Adaptation pilot | 1-2 reads when owner requests asset | Verify item image, item facts, public link, and current source hash. |
| Customer FAQ snippets pilot | 0-1 reads | Prefer current summary/source facts; most snippets deterministic. |
| Multi-outlet pilot | 1 summary/source read per selected store | Never fan out across all stores automatically. |

## 4. Planned Firestore Writes

| Flow | Expected writes | Notes |
| --- | ---: | --- |
| Refresh action queue | 0-1 write | Update `platformSummary/growthos_{sId}` only when hash, date, ranked actions, readiness, or latest-kit stale state changes. |
| Generate text kit | 2-4 writes | Kit document, summary update, AI operation log, subscription credit update when paid AI is used. |
| Generate image | Existing image pipeline costs | Reuse current image generation accounting and Storage path. |
| Copy/share/download/print | 1-3 writes | Export row plus optional kit status update and summary latest-kit status/stale update only when changed. |
| Mark stale | 1 write | Only when a stale check is run and critical facts changed. |
| Staff Brief copied/shared | 1 export write | Execution signal only. |
| Mark used | 1 export write or kit status update | No ROI or customer attribution. |
| Existing Image Adaptation pilot | 0-2 writes | Export row plus Storage metadata only when owner downloads/persists. |
| Owner-Confirmed Offer Builder later | 1 offer write plus audit/status updates | Deferred; creates new business truth and needs separate approval. |

## 5. Planned Collections

### `platformSummary/growthos_{sId}`

Purpose:

- one-read add-on dashboard
- latest ranked action
- latest kit summary
- owner-safe empty state

Retention:

- one document per store
- overwritten by hash/date changes

### `growthosKits/{tId}/{sId}/{kitId}`

Purpose:

- generated kit artifacts
- bounded owner history
- source fact hash and expiry

Retention:

- keep recent kits for support and owner history
- archive or TTL old kits after the approved retention window
- do not store raw provider response unless existing AI operation policy requires it

### `growthosExports/{tId}/{sId}/{exportId}`

Purpose:

- execution signal: copied, shared, downloaded, or printed

Retention:

- keep as bounded operational history
- do not join to orders, revenue, or customer activity for ROI claims

Allowed methods:

```txt
copy
share
download
print
mark_used
regenerate
stale
```

Forbidden fields:

```txt
revenue
orders
footfall
customerId
estimatedLift
roi
conversion
attribution
```

### Deferred/Pilot Collections

Do not create these in V1:

| Collection | Gate |
| --- | --- |
| `growthosOffers` | Owner-Confirmed Offer Builder approved after pilot and governance review. |
| `growthosAssets` | Existing Image Adaptation pilot needs persisted asset history. |
| `growthosQuickReplies` | Usually unnecessary because snippets should be deterministic. |
| `growthosOutletGroups` | Avoid campaign-center behavior; multi-outlet kits stay per selected store. |

## 6. Index Plan

No composite index was added in V1 because the implemented owner UI reads latest kit data from `platformSummary/growthos_{sId}` and writes exports by document ID.

Likely future composite indexes if used-history UI is later enabled:

| Collection | Index | Reason |
| --- | --- | --- |
| `growthosKits` | `tId ASC, sId ASC, createdAt DESC` | Store-scoped recent kit history. |
| `growthosKits` | `tId ASC, sId ASC, status ASC, createdAt DESC` | Active/recent owner view if needed. |
| `growthosExports` | `tId ASC, sId ASC, exportedAt DESC` | Store-scoped export history. |
| `growthosExports` | `kitId ASC, exportedAt DESC` | Kit detail execution audit. |

Do not add these indexes until queries are final and the used-history UI flag is approved.

## 7. Firebase Rules

Implemented rules enforce:

- default deny
- authenticated tenant/store access only
- owner/support roles can read/write scoped GrowthOS data
- users cannot read other stores' kits or exports
- clients cannot set `tId`/`sId` outside their session scope
- client writes to GrowthOS kit/export documents are blocked; authenticated APIs write through server Admin SDK after entitlement, output, and stale checks
- generated kit writes are routed through authenticated API routes in V1; admin SDK writes bypass rules but routes enforce tenant access and entitlement
- source project reads use scoped project paths first; legacy fallback requires matching tenant/store identity or MenuList tenant-store project ID shape

Firestore rules were changed and deployed during implementation, then hardened so GrowthOS summary writes stay server-owned and kit/export writes cannot bypass the API.

Deployment evidence:

```txt
firebase deploy --only firestore:rules --project ecomsai
```

Result: rules compiled successfully and were released to `cloud.firestore` for project `ecomsai`.

## 8. Implemented Cost Optimizations

Implemented V1 optimizations:

- disabled or ineligible desktop route does not fetch project lists
- summary refresh skips Firestore writes when the normalized summary did not change
- export route reuses store entitlement data and recomputes only the current source snapshot instead of reloading the full GrowthOS context
- summary latest-kit status is written after export only when status or stale state changed
- deterministic dry-run coverage is available through `npm run verify:growthos`

## 9. AI Provider Cost

Planned cost model:

| Operation | Provider call | Unit plan |
| --- | --- | --- |
| Action ranking | No | 0 units |
| Deterministic copy from existing templates | No | 0 units |
| Text Growth Kit | No in V1 | 0 units deterministic. |
| Review reply draft | No in V1 | 0 units deterministic guard. |
| Staff Brief | No in V1 | 0 units deterministic |
| Customer FAQ snippets | No for standard snippets | 0 units deterministic |
| Photo Capture Prompt | No | 0 units, metadata/readiness only |
| Existing Image Adaptation | No provider call | Render/Storage cost only if pilot enabled |
| Missing image generation | No in approved scope | Do not generate fake food in V1 |

Cost evidence:

- Campaign caption real provider estimate and unit cost exist in `src/constants/AI/unitCosts.ts:19-92`.
- One unit is internally calibrated near INR 12 in `src/constants/AI/unitCosts.ts:49-56`.
- Capacity is checked before provider calls in `src/lib/ai/capacityCheck.ts:71-144`.

## 10. Scheduler Cost

No scheduler in approved initial scope.

If background refresh is later approved:

- do not create a standalone scheduled function
- use the existing MenuList maintenance scheduler pattern
- add per-task lease/state tracking
- document Firestore reads/writes in INR before enabling

## 11. Cost Guardrails

Do not ship until:

- all paid provider calls use `checkAICapacity` before execution
- all successful paid calls use `consumeAICapacity`
- action refresh has bounded reads
- kit history is paginated
- export history is paginated
- no realtime listener is required for normal use
- no direct posting API introduces hidden external costs
- Firebase rules and indexes are documented if changed

## 12. Pilot Cost Gates

| Feature | Cost decision |
| --- | --- |
| Staff Brief Pack | V1 deterministic. No provider cost. One export write only when copied/shared/marked used. |
| Existing Image Adaptation | Pilot only. Generate on owner action; Storage write only if persisted; no AI provider call. |
| Owner-Confirmed Offer Builder | Deferred. Adds offer writes and expiry/stale logic; do not add before pilot. |
| Review Reply Guard | V1 manual paste only and deterministic. A future provider-backed version must remain bounded and must not log raw review text. |
| Customer FAQ Reply Snippets | Pilot. Deterministic snippets from current facts; export write only when copied. |
| Photo Capture Prompts | Pilot. Readiness/ranking only; photo upload uses existing MenuList image flow. |
| Multi-Outlet Localized Kits | Pilot. Per selected store only; no brand-wide background refresh. |
| Used History UI | Pilot. Paginated `growthosExports`; no aggregate dashboard unless proven necessary. |
| Low-Data Mobile Access | V1 latest-kit fallback uses local state. No extra Firestore writes. |
