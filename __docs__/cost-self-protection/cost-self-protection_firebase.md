# Cost Self-Protection — Firebase Cost Analysis

**Created:** February 20, 2026

---

## Cost Model

### Per SAFE_MODE Check (API route)

| Operation | Count | Cost |
|-----------|-------|------|
| Read ops_config/system | 0 (cached 60s in CF) or 1 (cold) | ₹0 - ₹0.003 |

With 60-second in-memory caching in Cloud Functions, effective reads are ~1 per minute per warm instance, not 1 per request.

### For Next.js API Routes

Each API route that checks SAFE_MODE performs 1 Firestore read. However, these routes already perform multiple reads for their core operation, so the marginal cost is negligible.

### Monthly Estimates

| Scenario | SAFE_MODE checks/day | Monthly Cost |
|----------|---------------------|-------------|
| Normal (SAFE_MODE OFF, cache hit) | ~100 reads/day | ~₹9/month |
| SAFE_MODE activated (1 day) | +50 reads (checks) | ~₹0.15 additional |

**Verdict:** Negligible cost. The protection it provides far exceeds its cost.

---

## Collections Affected

| Collection | Operation | Frequency |
|------------|-----------|-----------|
| `ops_config/system` | Read (SAFE_MODE check) | Per request (cached 60s in CF) |
| `ops_config/system` | Write (activate/deactivate) | Very rare — emergency only |

**Single document, no new collection.** The `ops_config` collection is shared with deploy mute window (ops-alerting-delivery).

---

## Cost Safety

- Feature flag: `ENABLE_COST_PROTECTION` — disables all SAFE_MODE checks
- 60-second cache TTL in Cloud Functions — limits read frequency
- Fail-open design — check failure doesn't add retry reads
- Single document — not a collection that could grow unbounded
