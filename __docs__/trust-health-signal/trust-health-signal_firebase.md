# Trust Health Signal — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 4 of 6

---

## Cost Summary

**Current runtime cost: zero.**

The computation helper has no Cloud Functions export or scheduler caller and its flag is `false`, so it currently performs no Firestore reads or writes. The historical estimates below are planning notes, not measured or deployed cost evidence. Current project-scoped daily analytics can produce multiple documents per local date; activation must use the bounded query/pagination contract and measure real document counts rather than assuming exactly 56 reads per store.

## Activation Cost Gate

Before activation, record emulator/QA evidence for:

- at most 1,000 daily analytics documents admitted per store window
- paginated, bounded store discovery with an explicit scheduler lease
- one merged `healthSignals` store write per successfully evaluated store/run
- zero writes when the signal task is not scheduled or its Functions flag is off
- measured read/write/runtime cost at representative project counts

## Historical Planning Estimate (Not Current Evidence)

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

**Last Updated:** July 13, 2026
