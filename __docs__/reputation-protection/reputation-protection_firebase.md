# Reputation Protection — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 3 of 6

---

## Cost Summary

Detailed cost analysis in `__docs__/reviews-reputation/reviews-reputation_firebase.md`.

### Additional Cost for AI Reply Assist

| Operation | Per Review | Per 100 Stores/Month |
|-----------|-----------|---------------------|
| Gemini reply suggestion | ~₹0.10 per review | ~₹100 (est. 1000 reviews needing replies) |
| Reply posting to GBP | 0 Firebase ops (external API) | ₹0 |
| Review storage | 1 write per review | Included in ingestion cost |

### Estimated Total Monthly Cost (100 stores)

| Component | Cost/Month |
|-----------|-----------|
| Review ingestion (nightly) | ~₹50 |
| Classification (per review) | ~₹10 |
| AI reply suggestions | ~₹100 |
| Review storage | ~₹20 |
| **Total** | **~₹180/month** |

**Note:** This is incremental cost on top of existing GBP sync infrastructure. Costs scale linearly with store count.

---

**Last Updated:** February 19, 2026
