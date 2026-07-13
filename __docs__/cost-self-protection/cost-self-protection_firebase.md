# Cost Self-Protection — Firebase Cost Analysis

**Created:** February 20, 2026
**Last Updated:** July 13, 2026

---

## Cost Model

### Manual SAFE_MODE Toggle

| Operation | Changed state | Repeated current state |
| --- | ---: | ---: |
| Current `users/{uId}` authorization read | 1 | 1 |
| Transactional `ops_config/system` read | 1 | 1 |
| `ops_config/system` write | 1 | 0 |
| `systemAlerts` write | 1 when alert creation succeeds | 0 |
| Existing alert-mute read | 0-1 when alert delivery is enabled | 0 |

The per-operator limiter fails closed before these reads when its provider is unavailable. A committed config transition remains the authoritative success even if the secondary alert write fails; bounded diagnostics make that failure visible without encouraging a duplicate toggle retry.

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

- App feature flag: `ENABLE_COST_PROTECTION` gates Next.js route checks; the MenuList Functions AI gateway always consults the cached Functions SAFE_MODE helper before provider access
- 60-second cache TTL in Cloud Functions — limits read frequency
- Fail-open design — check failure doesn't add retry reads
- Single document — not a collection that could grow unbounded
- Shared Functions gateway coverage adds no provider-side call and reuses the existing 60-second per-instance SAFE_MODE cache
