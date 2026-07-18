# Risk / Decline Detection — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 6 of 6

---

## Cost Summary

**Current runtime cost: zero.**

The shared computation is not exported or scheduled, all prerequisite flags are `false`, and no risk state is written. If later activated, risk must remain a pure derivation inside the same bounded trust/loyalty run and the same store update.

Risk adds no independent scheduler, listener, collection, or write. It must remain hidden until both prerequisite inputs are validated; a derived score cannot repair unreliable source counters.

## Historical Planning Estimate (Not Current Evidence)

| Component | Cost |
|-----------|------|
| Additional reads | ₹0 (uses already-computed trust + loyalty states) |
| Store doc write (risk field) | ~₹0.20 |
| Computation time | ~₹1 (marginal) |
| **Total** | **~₹1/month** |

## Combined Health Signals Cost (All 3 Pillars)

| Pillar | Monthly Cost (100 stores) |
|--------|--------------------------|
| Trust Health Signal (P4) | ~₹15 |
| Loyalty Health Signal (P5) | ~₹2 |
| Risk/Decline Detection (P6) | ~₹1 |
| **Total Health Signals** | **~₹18/month** |

This is negligible — less than the cost of a single cup of chai per month.

---

**Last Updated:** July 17, 2026
