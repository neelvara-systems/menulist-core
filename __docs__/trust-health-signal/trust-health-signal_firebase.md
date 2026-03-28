# Trust Health Signal — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 4 of 6

---

## Cost Summary

**Monthly Cost (100 stores): ~₹15**

Extremely lightweight — reads existing analytics docs, writes one field weekly.

---

## Operations Breakdown

### Weekly Computation (per store)

| Operation | Count | Cost |
|-----------|-------|------|
| Read daily analytics docs (8 weeks) | 56 reads | ~₹0.003 |
| Write trust state to store doc | 1 write | ~₹0.001 |
| **Per store per week** | **57 ops** | **~₹0.004** |

### Monthly Total (100 stores)

| Component | Operations | Cost |
|-----------|-----------|------|
| Analytics reads | 56 × 100 × 4 = 22,400 reads | ~₹12 |
| State writes | 100 × 4 = 400 writes | ~₹0.20 |
| Cloud Function runtime | ~5 min/week (256MiB) | ~₹3 |
| **Total** | | **~₹15/month** |

### Cost at Scale (1,000 stores)

| Component | Cost |
|-----------|------|
| Analytics reads | ~₹120 |
| State writes | ~₹2 |
| Cloud Function runtime | ~₹15 |
| **Total** | **~₹137/month** |

---

## Optimization Notes

- Reads from existing daily analytics docs (no new data collection)
- Single field write on existing store doc (no new collection)
- Batched computation in nightly scheduler (shared infrastructure)
- Feature flag allows instant disable if costs spike

---

**Last Updated:** February 19, 2026
