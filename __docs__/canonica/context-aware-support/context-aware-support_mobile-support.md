# Context-Aware Support — Mobile Support Assessment

> **Status:** READY FOR IMPLEMENTATION
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Feature Flag:** `ENABLE_CANONICA_CONTEXT_AWARE`
> **Audience:** Engineering

---

## §1 — Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily/multiple times per day? | No — context-aware support is an infrastructure enhancement to the retrieval pipeline. End-users interact via the widget (which is embedded in the CLIENT's product, not in Canonica's dashboard). SaaS founders configure context via SDK code, not via mobile UI. | ❌ |
| **Speed** | Completes in <5 seconds? | N/A — this is a backend retrieval enhancement, not a user-facing action. | ❌ |
| **Touch** | Works with thumb-only? | N/A — no mobile interaction surface. Context is configured in code. | ❌ |
| **Value** | Needed away from desk? | No — SDK integration and context configuration are developer tasks done at a desk. | ❌ |

**Result: 0/4 gates pass. NO mobile UI required.**

---

## §2 — Rationale

Context-Aware Support is a **backend retrieval enhancement**. It modifies how `canonicalRetrieval.ts` processes queries — there is no UI component in Canonica's dashboard for this feature.

The surfaces affected are:
1. **Widget search API** (`/api/widget/search`) — backend route, no mobile UI
2. **Search-KB API** (`/api/helpCenter/search-kb`) — backend route, no mobile UI
3. **Retrieval logic** (`canonicalRetrieval.ts`) — server-side processing

The only "UI" for this feature is the **SDK integration code** that Canonica clients write in their own products — which is a developer activity, not a mobile task.

---

## §3 — Mobile Impact on Canonica Widget

While Canonica's dashboard doesn't need a mobile UI for this feature, the **Canonica widget** (embedded in client products) will benefit from context-aware support on mobile:

- Client mobile apps can pass context via the widget SDK (same API)
- Context payload is lightweight (<1KB) — suitable for mobile network constraints
- No additional mobile-specific implementation needed — same API for web and mobile

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial mobile assessment — NO mobile UI needed |
