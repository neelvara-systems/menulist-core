# Menu Presence Monitor — Firebase Cost Tracking

> **Version:** 1.0
> **Last Updated:** March 15, 2026

---

## Collections Affected

| Collection | Operation | When | Cost |
|-----------|-----------|------|------|
| `stores` | READ (1) | Page load — read store doc for `menuPresence` field | Already fetched by Use MenuList data loader — **$0.00 additional** |
| `stores` | WRITE (1) | Owner confirms/removes a surface | 1 write per confirmation action |

## New Fields

| Field | Document | Type | Size |
|-------|----------|------|------|
| `menuPresence` | `stores/{tId}_{sId}` | Map with 3 optional sub-maps | ~200 bytes max |

## Cost Estimate

| Scenario | Reads | Writes | Monthly Cost |
|----------|-------|--------|-------------|
| 1 owner, confirms 3 surfaces once | 0 additional | 3 | ~$0.000003 |
| 1,000 owners, each confirms 3 surfaces | 0 additional | 3,000 | ~$0.003 |
| 10,000 owners, each confirms 3 surfaces | 0 additional | 30,000 | ~$0.03 |

**Total incremental cost: $0.00–$0.03/month** at any realistic scale.

## Why Zero Additional Reads

The store document is already fetched by the Use MenuList data loader (`PlatformGlobalDataContext` provides store details). The `menuPresence` field piggybacks on this existing read. No new queries needed.

## Firestore Indexes

None needed. No queries on `menuPresence` field — it's read as part of the store document.

---

**Document Signature:** Firebase Cost Analysis
**Created:** March 15, 2026
