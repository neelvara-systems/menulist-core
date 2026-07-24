# Canonical Truth Infrastructure — Firebase Cost Tracking

**Last Updated:** 2026-07-19
**Feature Flag:** `ENABLE_MCE`, `ENABLE_MENU_OBSERVATION`, `ENABLE_MENU_SNAPSHOTS`

---

## Collections Used

| Collection | Path | Purpose | New? |
|-----------|------|---------|------|
| `menuChangeLog` | `menuChangeLog/{tId}/{sId}/{entryId}` | Append-only change log (MOL) | No (existing) |
| `menuSnapshots` | `menuSnapshots/{tId}/{sId}/{snapshotId}` | Immutable publish snapshots | **Yes** |
| `projects` | `projects/{tId}/{sId}/{projectId}` | `menuVersion` + `lastPublishedAt` fields | No (existing, new fields) |
| `stores` | `stores/{storeId}` | Optional embedded external location identity binding | No |

---

## Read Operations

| Operation | Trigger | Reads | Notes |
|-----------|---------|-------|-------|
| MCE validation | Every save (updateProject) | 0 | Client-side only, zero Firebase |
| Current project read | Every acknowledged update | 1 before + transaction retry reads as required | Shared mutation identity/concurrency authority; MOL and MCE reuse it |

**Total new reads per this feature: 0**

---

## Write Operations

### 1. menuVersion + lastPublishedAt (on Project doc)

| Operation | Trigger | Writes | Cost/1000 |
|-----------|---------|--------|-----------|
| Version increment | Every `publishProject()` call | 0 extra | Part of existing `setDoc` merge — zero additional write |

**Cost: $0.00** — piggybacks on existing write.

### 2. MOL PUBLISH Event

| Operation | Trigger | Writes | Cost/1000 |
|-----------|---------|--------|-----------|
| PUBLISH event log | Every `publishProject()` call | 1 | $0.18/100K writes |

**Estimate:** 1000 stores × 5 publishes/month = 5,000 writes/month = **$0.009/month**

### 3. Menu Snapshot

| Operation | Trigger | Writes | Cost/1000 |
|-----------|---------|--------|-----------|
| Snapshot document | Every `publishProject()` call | 1 | $0.18/100K writes |

**Document size boundary:** Typical 200-item snapshots are about 60KB. The writer estimates serialized size and skips payloads above 900 KiB, leaving safety below Firestore's 1 MiB document limit.

**Estimate:** 1000 stores × 5 publishes/month = 5,000 writes/month = **$0.009/month**

**Security and shape contract:** Client reads require both tenant membership and assigned-store access. Creates additionally require owner/manager write authority, exact numeric `tId`/`sId` payload values matching the document path, an existing project in that path, count-consistent bounded item/category arrays, Firestore-resolved `createdAt == request.time`, the exact 90-day retention marker, an expiry within five minutes of `request.time + 90 days`, and the canonical snapshot mode. Updates and deletes remain denied. Linked publishes resolve the already-read master with the committed outlet state before observation, so the snapshot represents public menu truth instead of raw outlet-local storage.

For `menuChangeLog`, canonical client events require an existing current-store project, server-resolved event time, owner/staff provenance, and any supplied `userId` to match the authenticated Firebase identity. The supported pricing-integrity legacy shape additionally binds `actorUserId`, event type/entity type, and project/store entity identity. Store-level hours/GBP/POS rows use the exact current store ID; project-level pricing/PDF/extraction rows require the referenced project in the current tenant/store path. Admin SDK system events remain server-authoritative and do not need a client-side `SYSTEM` claim.

### 4. MCE _mce Metadata

| Operation | Trigger | Writes | Cost/1000 |
|-----------|---------|--------|-----------|
| _mce field stamp | Every `updateProject()` call | 0 extra | Part of existing `setDoc` merge |

**Cost: $0.00** — piggybacks on existing write.

### 5. MOL Change Events (existing, now enabled)

| Operation | Trigger | Writes | Cost/1000 |
|-----------|---------|--------|-----------|
| Price/availability/active changes | Every `updateProject()` with changes | 1 per change type per item | Debounced 5s |

**Estimate:** 100 stores × 10 changes/day = 1,000 writes/day = 30,000/month = **$0.054/month**

### 6. External Location Identity

This boundary reuses the existing store document and is owned in detail by
[`maps-place-check_firebase.md`](../menulist-tools/maps-place-check/maps-place-check_firebase.md).

- Saving or removing the existing Official Page Google Maps link adds **0**
  reads and **0** writes beyond the store update already being performed.
- Explicit Place-ID confirmation or removal performs **1** transaction read and
  **1** store write so exact tenant/store identity and current availability can
  fail closed before mutation.
- No collection, index, summary, history document, listener, Storage object, or
  scheduled refresh job is added.
- Existing saved links are not bulk backfilled.

---

## Total Cost Impact

| Component | Monthly (1000 stores) | Monthly (10,000 stores) |
|-----------|----------------------|------------------------|
| menuVersion field | $0.00 | $0.00 |
| MCE _mce field | $0.00 | $0.00 |
| PUBLISH event | $0.009 | $0.09 |
| Menu snapshot | $0.009 | $0.09 |
| MOL change events | $0.054 | $0.54 |
| **Total** | **~$0.07/month** | **~$0.72/month** |

---

## Storage Growth

| Collection | Growth Rate (1000 stores) | Notes |
|-----------|--------------------------|-------|
| menuSnapshots | ~25MB steady-state per 1000 stores at the example rate | 5000 snapshots/month × 60KB × 90-day window, after bounded leased cleanup reaches steady state |
| menuChangeLog | ~50MB/year | 30K events/month × ~0.5KB avg |

**Retention:** `menuSnapshots` is short-term proof/debug state. Writers use a Firestore server timestamp for creation and set a 90-day `expiresAt`; rules prevent an authorized client from extending the marker beyond the governed window. The nested path ends in a dynamic store-named collection, so Firestore collection-group TTL cannot target these documents. The existing leased `menu_snapshot_cleanup` maintenance task reads `storesSummary` once, selects a deterministic daily page of at most 200 known stores including inactive rows, queries at most 25 snapshots per selected store by `createdAt <= now - 90 days - 5 minutes`, and batch-deletes only returned rows. Creation-time cleanup covers both current rows and pre-retention legacy rows that have no `expiresAt`; it also prevents an old client-authored future expiry from preserving an already-aged snapshot. The five-minute grace matches the create-rule tolerance so a valid current row is not removed before its declared expiry. Every summary-known store receives eventual coverage without a new cursor document or standalone scheduler. MOL change summaries remain retained operational memory by design and all readers are capped/paginated with an upper run timestamp. Derived `menuItemState/.../metrics` documents are exact-replaced from the current 30-day window; aged-out item rows are deleted and unknown legacy fields cannot survive a successful recomputation.

---

## Kill Switches

All features can be instantly disabled via feature flags in `src/config/features.ts`:

| Flag | Disables | Impact |
|------|----------|--------|
| `ENABLE_MCE: false` | MCE validation + _mce stamps | Save flow reverts to pre-MCE |
| `ENABLE_MENU_OBSERVATION: false` | All MOL change tracking | Zero writes to menuChangeLog |
| `ENABLE_MENU_SNAPSHOTS: false` | Publish snapshots | Zero writes to menuSnapshots |

**Note:** `menuVersion` increment has no separate kill switch — it's part of the publish pipeline. Disabling would require code change, not flag flip. This is intentional — version tracking is core infrastructure.
