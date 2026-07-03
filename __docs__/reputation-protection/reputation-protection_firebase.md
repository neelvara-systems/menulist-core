# Reputation Protection — Firebase Cost Tracking

**Date:** July 1, 2026
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

### Current Dormant Route Note

`/api/reviews/suggest` exists behind disabled feature flags and does not auto-post review replies. Accepted requests perform the existing SAFE_MODE check, rate limit, bounded body parse, Zod validation, prompt sanitization, feedback permission guard, AI capacity check, Gemini call, and AI operation accounting path. June 28, 2026 hardening changed only the accounting-failure diagnostic payload to a bounded `review_reply_accounting_failed` runtime code; it added no Firestore reads/writes, provider calls, rules, indexes, Cloud Function logic, or owner-facing settings.

July 1, 2026 review-reply RBAC hardening adds the existing store permission read before AI capacity/provider work and requires `canManageFeedback`. Because this route is feature-flag disabled and unmounted in the current runtime, normal production cost stays unchanged; if enabled, rejected users can incur the one standard permission store read but no AI capacity transaction, Gemini call, or accounting write.

June 30, 2026 review-state request/response hardening is also cost-neutral. `ReputationGuard` calls `/api/reviews/states` with no-store cache policy, same-origin credentials, and manual redirect handling, caps response JSON at 16KB, and requires the boolean-only state acknowledgement before updating passive warning UI. This adds no Firestore reads/writes/deletes beyond existing valid state checks, Storage operations, provider calls, rules, indexes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

---

**Last Updated:** July 1, 2026
