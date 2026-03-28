# Compliance Pages — Firebase Cost Tracking

**Version:** 1.0  
**Date:** March 18, 2026

---

## Collections

| Collection | Type | Purpose |
|-----------|------|---------|
| `compliancePages` | Flat | 1 doc per store — compliance page content |

---

## Operations

### Page View (Public — most frequent)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Resolve store (subdomain/custom domain) | 0 | 0 | Cached — reuses existing OBP/menu cache |
| Read compliancePages doc | 1 | 0 | Every page view (cached 60s by unstable_cache) |
| Generate from template (if system) | 0 | 0 | Pure function — no Firestore |
| **Total per view** | **1** | **0** | |

**With cache:** 1 read per 60 seconds per store (not per visitor).

### Custom Override (Rare — owner action)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Read existing doc | 1 | 0 | Verify current state |
| Write override content | 0 | 1 | Save custom text |
| **Total per override** | **1** | **1** | |

### Reset to System (Very rare)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Read store data for generation | 1 | 0 | Get business info |
| Write regenerated content | 0 | 1 | Save system content |
| **Total per reset** | **1** | **1** | |

---

## Cost Estimates

### Per Store Per Month

| Scenario | Reads | Writes | Cost |
|----------|-------|--------|------|
| Page views (avg 100/month, cached) | ~50 | 0 | ~₹0.003 |
| Owner edits (1-2/month) | 2 | 2 | ~₹0.0002 |
| **Total** | **~52** | **~2** | **~₹0.003** |

### At Scale

| Scale | Monthly Reads | Monthly Writes | Monthly Cost |
|-------|--------------|----------------|--------------|
| 100 stores | 5,200 | 200 | ₹0.30 |
| 1,000 stores | 52,000 | 2,000 | ₹3.00 |
| 10,000 stores | 520,000 | 20,000 | ₹30.00 |

**Verdict:** Negligible cost. Template generation is pure function (zero reads). Caching keeps page views extremely cheap.

---

## Document Size Estimate

| Field | Size |
|-------|------|
| Privacy content | ~3-5 KB (system), up to 15 KB (custom) |
| Terms content | ~3-5 KB (system), up to 15 KB (custom) |
| Metadata | ~200 bytes |
| **Max total** | **~30 KB** |

Well under Firestore's 1MB limit.

---

## Indexes Required

None — all queries use document ID (`{sId}`), which is a direct lookup.

---

## Storage

No Storage operations. All content is text stored in Firestore documents.
