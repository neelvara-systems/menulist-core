# Loyalty Health Signal — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 5 of 6

---

## Cost Summary

**Current runtime cost: zero.**

The shared computation is not exported or scheduled and the loyalty flag is `false`. The historical table below is a planning estimate only. If activated, loyalty must share the one bounded analytics scan and store update with trust/risk rather than create its own reads or write.

## Historical Planning Estimate (Not Current Evidence)

| Component | Cost |
|-----------|------|
| Analytics reads | ₹0 (shared with trust signal) |
| Store doc write (loyalty field) | ~₹0.20 |
| Computation time | ~₹2 (marginal increase) |
| **Total** | **~₹2/month** |

---

**Last Updated:** July 13, 2026
