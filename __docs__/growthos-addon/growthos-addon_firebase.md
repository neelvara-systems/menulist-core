# GrowthOS Add-on - Firebase And Cost Plan

**Status:** Planning only
**Runtime cost today:** No change
**Cost principle:** Paid add-on value must cover Firestore, Storage, and provider usage.

---

## 1. Current Cost Impact

This documentation adds no runtime cost.

No Firestore rules, indexes, Storage rules, Cloud Functions, provider calls, scheduled jobs, or app routes were changed.

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
| Refresh action queue | 1-3 reads | Current project/menu data and bounded existing summary/context reads. Exact count must be verified during implementation. |
| Generate kit | 1-3 reads | Read source facts immediately before generation to prevent stale output. |
| Copy/share/download kit | 0 reads | UI should already have kit data. |
| Review reply draft | 0-1 reads | Owner-pasted text can avoid review collection reads. |

## 4. Planned Firestore Writes

| Flow | Expected writes | Notes |
| --- | ---: | --- |
| Refresh action queue | 1 write | Update `platformSummary/growthos_{sId}` only when hash or ranked actions change. |
| Generate text kit | 2-4 writes | Kit document, summary update, AI operation log, subscription credit update when paid AI is used. |
| Generate image | Existing image pipeline costs | Reuse current image generation accounting and Storage path. |
| Copy/share/download/print | 1-2 writes | Export row plus optional kit status update. |
| Mark stale | 1 write | Only when a stale check is run and critical facts changed. |

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

### `growthosKits`

Purpose:

- generated kit artifacts
- bounded owner history
- source fact hash and expiry

Retention:

- keep recent kits for support and owner history
- archive or TTL old kits after the approved retention window
- do not store raw provider response unless existing AI operation policy requires it

### `growthosExports`

Purpose:

- execution signal: copied, shared, downloaded, or printed

Retention:

- keep as bounded operational history
- do not join to orders, revenue, or customer activity for ROI claims

## 6. Index Plan

Likely composite indexes:

| Collection | Index | Reason |
| --- | --- | --- |
| `growthosKits` | `tId ASC, sId ASC, createdAt DESC` | Store-scoped recent kit history. |
| `growthosKits` | `tId ASC, sId ASC, status ASC, createdAt DESC` | Active/recent owner view if needed. |
| `growthosExports` | `tId ASC, sId ASC, exportedAt DESC` | Store-scoped export history. |
| `growthosExports` | `kitId ASC, exportedAt DESC` | Kit detail execution audit. |

Do not add indexes until queries are final.

## 7. Firebase Rules

Rules must enforce:

- default deny
- authenticated tenant/store access only
- owner/support roles can read/write scoped GrowthOS data
- users cannot read other stores' kits or exports
- clients cannot set `tId`/`sId` outside their session scope
- export writes are append-only where practical
- generated kit writes should normally be server-owned if AI output is involved

If Firestore rules are changed during implementation, deploy the matching Firebase target after validation per repo policy.

## 8. AI Provider Cost

Planned cost model:

| Operation | Provider call | Unit plan |
| --- | --- | --- |
| Action ranking | No | 0 units |
| Deterministic copy from existing templates | No | 0 units |
| Text Growth Kit | Yes, when needed | 1-2 units, final cost after token measurement |
| Review reply draft | Yes | Reuse `REVIEW_REPLY_SUGGESTION` unit cost if payload fits |
| Missing image generation | Yes | Reuse existing image generation unit cost |

Current cost evidence:

- Campaign caption real provider estimate and unit cost exist in `src/constants/AI/unitCosts.ts:19-92`.
- One unit is internally calibrated near INR 12 in `src/constants/AI/unitCosts.ts:49-56`.
- Capacity is checked before provider calls in `src/lib/ai/capacityCheck.ts:71-144`.

## 9. Scheduler Cost

No scheduler in approved initial scope.

If background refresh is later approved:

- do not create a standalone scheduled function
- use the existing MenuList maintenance scheduler pattern
- add per-task lease/state tracking
- document Firestore reads/writes in INR before enabling

## 10. Cost Guardrails

Do not ship until:

- all paid provider calls use `checkAICapacity` before execution
- all successful paid calls use `consumeAICapacity`
- action refresh has bounded reads
- kit history is paginated
- export history is paginated
- no realtime listener is required for normal use
- no direct posting API introduces hidden external costs
- Firebase rules and indexes are documented if changed
