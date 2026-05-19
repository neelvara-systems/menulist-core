# Canonica Help Widget — Firebase Operations & Cost

> **Version:** 2.4.0
> **Last Updated:** 2026-05-19
> **Audience:** Developers / Ops

---

## Collections Used (Per Search Query)

| Collection                     | Operation          | When                                           | Cost Per Query |
| ------------------------------ | ------------------ | ---------------------------------------------- | -------------- |
| `stores`                       | 0-1 READ           | API key validation + origin allowlist check; warm widget requests reuse a short server auth cache | Existing read pricing |
| `canonica_entities`            | 1-3 READS          | Canonical entity lookup                        | $0.000108 max  |
| `canonica_canonical_answers`   | 0-3 READS          | Canonical answer fetch                         | $0.000108 max  |
| `canonica_releases`            | 0-1 READ           | Version window check                           | $0.000036 max  |
| `canonica_entity_search_index` | 1-5 READS          | Token-based entity search                      | $0.000180 max  |
| `kb_articles`                  | 12 READS           | Vector search (if RAG fallback)                | $0.000432      |
| `queryEmbeddings`              | 1 READ + 0-1 WRITE | Embedding cache                                | $0.000054      |
| `aiSearchHistory`              | 1 WRITE            | Search history logging (every query)           | $0.000054      |
| `ops_config`                   | 0-1 READ           | SAFE_MODE check (if ENABLE_COST_PROTECTION ON) | $0.000036 max  |

## Additional Operations (v2 Features)

| Collection               | Operation | When                                                                     | Cost Per Event |
| ------------------------ | --------- | ------------------------------------------------------------------------ | -------------- |
| `aiSearchHistory`        | 1 WRITE   | Feedback submission (thumbs up/down)                                     | $0.000054      |
| `canonica_signal_events` | 0-1 WRITE | Negative feedback → signal event (if ENABLE_CANONICA_SIGNAL_MUTATION ON) | $0.000054      |
| `platformSummary`        | 0-1 READ  | Predictive trigger index; cached per warm server instance for 60 seconds | Existing read pricing |
| `stores`                 | 0-1 READ  | Runtime config lookup through `/api/widget/config`; browser/server caches reduce repeated reads | Existing read pricing |
| `stores`                 | 1 WRITE   | Explicit dashboard save in `/canonica/widget`; no per-keystroke writes | Existing write pricing |
| `stores`                 | 1 WRITE   | Widget key generate/revoke updates `canonicaWidgetApi` only | Existing write pricing |

## No New Collections

Widget v2 reuses ALL existing Canonica collections. Zero new Firestore collections created. The feedback route writes to `aiSearchHistory` (existing) and `canonica_signal_events` (existing).

The `widgetConfig`, `widgetAllowedOrigins`, `widgetConfigVersion`, and `canonicaWidgetApi` fields are stored on the existing `stores` document — no new document or collection. Stored origin values are normalized to origin format (`scheme://host[:port]`), and configured allowlists reject missing or unlisted request origins.

---

## Cost Per Widget Query

| Scenario                  | Reads | Writes | Gemini API | Total Cost |
| ------------------------- | ----- | ------ | ---------- | ---------- |
| Canonical hit (best case) | ~8    | 1      | $0.00      | ~$0.0004   |
| RAG fallback (typical)    | ~18   | 2      | ~$0.001    | ~$0.0017   |
| Cached embedding hit      | ~12   | 1      | ~$0.001    | ~$0.0013   |
| With image (RAG + image)  | ~18   | 2      | ~$0.003    | ~$0.0036   |
| Feedback submission       | 0     | 1-2    | $0.00      | ~$0.0001   |
| Runtime config load       | 0-1   | 0      | $0.00      | <$0.0001   |
| Dashboard config save     | 0-1   | 1      | $0.00      | <$0.0001   |

Note on image queries: Image queries add the image-to-query Gemini call. Expected volume: <10% of widget queries will include images (error screenshots). Widget images are validated and passed inline to `coreSearch()`; they are not written to Firebase Storage.

## Monthly Cost Projections

| Widget Queries/Month | Firestore Reads | Firestore Writes | Gemini Calls | Monthly Cost |
| -------------------- | --------------- | ---------------- | ------------ | ------------ |
| 100                  | ~1,800          | ~100             | ~70          | ~$0.18       |
| 1,000                | ~18,000         | ~1,000           | ~700         | ~$1.80       |
| 10,000               | ~180,000        | ~10,000          | ~7,000       | ~$18.00      |
| 50,000               | ~900,000        | ~50,000          | ~35,000      | ~$85.00      |

Note: Canonical hit rate directly reduces Gemini API costs (canonical hits = $0 LLM cost). With context-aware support enabled, canonical hit rate is expected to increase 15-25%, further reducing costs.

---

## Cost Optimizations Applied

1. **Embedding cache** — Repeated queries skip Gemini embedding API call
2. **Canonical-first retrieval** — Zero LLM cost for canonical hits
3. **Widget-prefixed cache keys** — `widget:` prefix prevents cache collision with dashboard queries
4. **Shared pipeline** — Same coreSearch() function, no duplicated logic or reads
5. **Context-aware entity boosting** — Narrows entity match scope, reduces RAG fallback rate
6. **No session persistence** — Widget session memory is in-memory only, zero Firestore writes for conversation state
7. **Inline widget images** — Screenshot questions are validated and passed to the shared search pipeline without temporary Storage writes
8. **Bounded context payloads** — Widget context is normalized before postMessage/API use, keeping prompt and trigger matching payloads small
9. **Origin allowlist reuses store document** — No additional read (checked during API key validation which already reads store)
10. **No temp image storage for widget** — Image queries avoid Firebase Storage writes and cleanup work by passing validated inline payloads into the shared pipeline

11. **Hash-only Canonica auth path** — Widget and Canonica public routes disable the legacy raw-key fallback because Canonica `cn_*` keys are stored hash-only.
12. **Short positive auth cache** — Widget search, predictive help, and feedback reuse a positive API-key validation result for up to 15 seconds per warm server instance. Revocation can take up to that short TTL to reflect on that instance.
13. **Predictive trigger index cache** — Page-context suggestions reuse the `platformSummary/predictiveTriggers_{tId}_{sId}` document for 60 seconds per warm server instance.
14. **Same-tab test key cache** — The temporary MenuList test host keeps the deterministic widget key in `sessionStorage`, avoiding repeated key-resolution API calls during same-tab remounts.
15. **Runtime config cache** — `/api/widget/config` uses short server caching and browser `sessionStorage`, so installed scripts do not re-read Firestore on every route render.
16. **Explicit-save dashboard writes** — `/canonica/widget` keeps edits local until Save; no Firestore writes happen while typing, moving controls, or previewing.
17. **Scoped widget credential field** — `canonicaWidgetApi` separates widget keys from `publicApi`, so widget runtime routes can opt into widget scopes without broader public API reads.

## Long-Term Cost Strategy

As canonical coverage grows (driven by signal mutation pipeline), widget cost decreases:

- **Month 1-3**: ~30% canonical hit rate → higher Gemini usage
- **Month 4-6**: ~50% canonical hit rate → Gemini usage drops 40%
- **Month 7+**: ~70%+ canonical hit rate → Gemini usage drops 70%

The mutation engine (signal events from widget feedback → mutation proposals → canonical answers) creates a self-improving cost reduction loop.

---

## Version History

| Date       | Version | Change                                                                                                                                  |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-19 | 2.4.0   | Added widget management cost model: runtime config endpoint, explicit dashboard saves, and scoped `canonicaWidgetApi` credential writes. |
| 2026-05-19 | 2.3.1   | Added widget Firebase cost pass: hash-only Canonica auth, short positive widget auth cache, predictive trigger index cache, same-tab MenuList test-key cache, and context-scoped search cache keys. |
| 2026-03-08 | 2.0.0   | Complete rewrite: added feedback operations, origin allowlist, SAFE_MODE read, updated cost projections for v2, long-term cost strategy |
| 2026-03-07 | 1.0.0   | Initial cost analysis                                                                                                                   |
