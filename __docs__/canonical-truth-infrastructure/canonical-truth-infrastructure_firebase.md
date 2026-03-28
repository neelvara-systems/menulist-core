# Canonical Truth Infrastructure — Firebase Cost Tracking

**Last Updated:** 2025-02-24
**Feature Flag:** `ENABLE_MCE`, `ENABLE_MENU_OBSERVATION`, `ENABLE_MENU_SNAPSHOTS`

---

## Collections Used

| Collection | Path | Purpose | New? |
|-----------|------|---------|------|
| `menuChangeLog` | `menuChangeLog/{tId}/{sId}/{entryId}` | Append-only change log (MOL) | No (existing) |
| `menuSnapshots` | `menuSnapshots/{tId}/{sId}/{snapshotId}` | Immutable publish snapshots | **Yes** |
| `projects` | `projects/{tId}/{sId}/{projectId}` | `menuVersion` + `lastPublishedAt` fields | No (existing, new fields) |

---

## Read Operations

| Operation | Trigger | Reads | Notes |
|-----------|---------|-------|-------|
| MCE validation | Every save (updateProject) | 0 | Client-side only, zero Firebase |
| MOL old state fetch | Every save (if MOL enabled) | 1 | Existing — reads current project for diff |

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

**Document size estimate:** 200 items × ~300 bytes = ~60KB per snapshot. Well within 1MB Firestore limit.

**Estimate:** 1000 stores × 5 publishes/month = 5,000 writes/month = **$0.009/month**

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
| menuSnapshots | ~300MB/year | 5000 snapshots/month × 60KB avg |
| menuChangeLog | ~50MB/year | 30K events/month × ~0.5KB avg |

**Cold archive strategy:** After 18-24 months, move old snapshots/events to Firebase Storage (JSON gzip). See backlog item 8.1.

---

## Kill Switches

All features can be instantly disabled via feature flags in `src/config/features.ts`:

| Flag | Disables | Impact |
|------|----------|--------|
| `ENABLE_MCE: false` | MCE validation + _mce stamps | Save flow reverts to pre-MCE |
| `ENABLE_MENU_OBSERVATION: false` | All MOL change tracking | Zero writes to menuChangeLog |
| `ENABLE_MENU_SNAPSHOTS: false` | Publish snapshots | Zero writes to menuSnapshots |

**Note:** `menuVersion` increment has no separate kill switch — it's part of the publish pipeline. Disabling would require code change, not flag flip. This is intentional — version tracking is core infrastructure.
