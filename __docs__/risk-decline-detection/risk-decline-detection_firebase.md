# Risk / Decline Detection — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 6 of 6

---

## Cost Summary

**Monthly Additional Cost (100 stores): ~₹1**

This is a meta-signal — it reads states already computed by Pillars 4 and 5. No additional Firestore reads needed. Only adds one field to the existing `healthSignals` write.

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

**Last Updated:** February 19, 2026
