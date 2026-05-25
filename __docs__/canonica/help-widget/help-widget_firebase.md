# Canonica Help Widget — Firebase Operations & Cost

> **Version:** 2.4.4
> **Last Updated:** 2026-05-22
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
| `aiSearchHistory`        | 1 READ + 0-1 WRITE | Feedback submission (thumbs up/down); repeated identical feedback skips the write | Existing read/write pricing |
| `canonica_signal_events` | 0-1 WRITE | Negative feedback → signal event (if ENABLE_CANONICA_SIGNAL_MUTATION ON) | $0.000054      |
| `stores`                 | 0-1 READ  | Runtime config lookup through `/api/widget/config`; browser/server caches use the public 60-second TTL | Existing read pricing |
| `stores`                 | 0-1 WRITE | Explicit dashboard save in `/canonica/widget`; unchanged saves skip the write | Existing write pricing |
| `stores`                 | 1 READ + 1 WRITE | Widget key create/rename/delete updates `canonicaWidgetApi` only | Existing read/write pricing |
| `stores`                 | 1 READ | Widget key copy decrypts existing encrypted widget key material; no write | Existing read pricing |
| `aiSearchHistory`        | up to 12 READS | `/api/canonica/widget-activity` recent widget questions panel in `/canonica/widget`; protected tenant/store read | Existing read pricing |

## No New Collections

Widget v2 reuses ALL existing Canonica collections. Zero new Firestore collections created. The feedback route writes to `aiSearchHistory` (existing) and `canonica_signal_events` (existing).

The `widgetConfig`, `widgetAllowedOrigins`, `widgetConfigVersion`, and `canonicaWidgetApi` fields are stored on the existing `stores` document — no new document or collection. Widget keys use `canonicaWidgetApi.keyHashes` for one-query runtime lookup and `canonicaWidgetApi.keysByHash` for key names, prefixes/suffixes, scopes, status, and optional encrypted copy recovery. Stored origin values are normalized to origin format (`scheme://host[:port]`), and configured allowlists reject missing or unlisted request origins. Route blocklists are stored inside `widgetConfig.blockedRoutes` and evaluated locally by the loader script.

## Widget Activity Index

The dashboard recent-questions panel uses this composite index in Canonica Firebase:

| Collection | Fields | Purpose |
| ---------- | ------ | ------- |
| `aiSearchHistory` | `tId ASC, sId ASC, mountContext ASC, createdOn DESC` | Recent widget questions for `/canonica/widget` |

---

## Cost Per Widget Query

| Scenario                  | Reads | Writes | Gemini API | Total Cost |
| ------------------------- | ----- | ------ | ---------- | ---------- |
| Canonical hit (best case) | ~8    | 1      | $0.00      | ~$0.0004   |
| RAG fallback (typical)    | ~18   | 2      | ~$0.001    | ~$0.0017   |
| Cached embedding hit      | ~12   | 1      | ~$0.001    | ~$0.0013   |
| With image (RAG + image)  | ~18   | 2      | ~$0.003    | ~$0.0036   |
| Feedback submission       | 1     | 0-2    | $0.00      | ~$0.0001   |
| Runtime config load       | 0-1   | 0      | $0.00      | <$0.0001   |
| Dashboard config save     | 0-1   | 0-1    | $0.00      | <$0.0001   |

Note on image queries: Image queries add one bounded visual-context model call before normal retrieval/answering. Expected volume: <10% of widget queries will include images (error screenshots). Widget images are validated and passed inline to `coreSearch()`; they are not written to Firebase Storage.

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
8. **Bounded context payloads** — Widget context is normalized before postMessage/API use, keeping prompt payloads small
9. **Origin allowlist reuses store document** — No additional read (checked during API key validation which already reads store)
10. **No temp image storage for widget** — Image queries avoid Firebase Storage writes and cleanup work by passing validated inline payloads into the shared pipeline

11. **Store-doc widget key lookup** — Widget routes validate active `cn_*` keys with `array-contains` on `canonicaWidgetApi.keyHashes`, falling back to the legacy single `apiKeyHash` field for old workspaces.
12. **Short positive auth cache** — Widget search and feedback reuse a positive API-key validation result for up to 15 seconds per warm server instance. Revocation can take up to that short TTL to reflect on that instance.
13. **Runtime config cache** — `/api/widget/config` uses short server caching and browser `sessionStorage`, so installed scripts do not re-read Firestore on every route render.
14. **Explicit-save dashboard writes** — `/canonica/widget` keeps edits local until Save; no Firestore writes happen while typing, moving controls, or previewing.
15. **Scoped widget credential field** — `canonicaWidgetApi` separates widget keys from `publicApi`, so widget runtime routes can opt into widget scopes without broader public API reads.
16. **Negative API-key validation cache** — repeated invalid widget keys are cached briefly per warm server instance, reducing repeated Firestore misses during abuse or broken installs.
17. **No-op config save guard** — dashboard saves compare normalized config/origin values before writing, so repeated Save clicks do not increment `widgetConfigVersion` or write the store document.
18. **Duplicate feedback guard** — repeated identical thumbs feedback returns success without another `aiSearchHistory` write or duplicate negative signal event.
19. **Route blocklist is local** — blocked routes ride the existing runtime config response and use `window.location.pathname`; route changes do not create Firebase reads, writes, or listeners.
20. **Branding rides runtime config** — header title, accent color, greeting, and powered-by visibility use the existing `/api/widget/config` response; no separate white-label collection or listener is needed for the launch-grade widget controls.

## Cache Strategy Decision

The widget intentionally uses a mixed cache strategy instead of forcing every cache through one system:

| Workload | Cache pattern | Decision |
| -------- | ------------- | -------- |
| Widget runtime config | Browser `sessionStorage` + short process-local server cache + HTTP `private, max-age=60` | Keep. Config is API-key/origin scoped, revocation-sensitive, cheap to read, and does not need realtime behavior. |
| Widget API-key validation | Short process-local positive/negative cache | Keep. Staleness is bounded to seconds, so key revoke/origin changes are not hidden behind a long shared cache. |
| Canonical answer instant responses | Upstash Redis instant cache | Keep. This is deterministic canonical-answer output with source-version freshness validation and high provider-cost avoidance. |
Do **not** move widget runtime config to Upstash now. A Redis `GET` on every widget config request can cost more than the Firestore read it replaces at low/medium traffic, and it adds a second invalidation path for key revoke and origin changes.

Future trigger to reconsider: if widget config/auth reads become a measurable production cost driver, add a Canonica-specific cache layer with explicit tags such as `canonica-widget-store-{sId}` and forced invalidation from widget key/config writes. Do this only after measuring real read volume, because the current 60-second cache envelope keeps config reads low without long stale-auth risk.

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
| 2026-05-25 | 2.4.9   | Added store-doc multi-key cost model: no new collections, runtime validation stays one indexed store lookup, key create/rename/delete are bounded writes, and copy is a protected read/decrypt path. |
| 2026-05-24 | 2.4.6   | Restored predictive support cost docs with summary-backed capability gating: one extra trigger-summary read only on widget config cache misses, and no predictive API calls when active triggers are absent. |
| 2026-05-24 | 2.4.5   | Temporary rollback note superseded by 2.4.6 after predictive support was restored and hardened. |
| 2026-05-22 | 2.4.4   | Added widget branding cost note: launch-grade branding rides existing runtime config and adds no Firestore reads/listeners. |
| 2026-05-21 | 2.4.3   | Removed temporary client-product connector cost notes after separating Canonica runtime from client product code. |
| 2026-05-20 | 2.4.2   | Added route blocklist cost note: no new collections, reads, writes, or Firestore listeners. |
| 2026-05-19 | 2.4.1   | Added widget cost pass: 60-second runtime config server cache, negative auth cache, no-op config save guard, and duplicate feedback guard. |
| 2026-05-19 | 2.4.0   | Added widget management cost model: runtime config endpoint, explicit dashboard saves, and scoped `canonicaWidgetApi` credential writes. |
| 2026-05-19 | 2.3.1   | Added widget Firebase cost pass: hash-only Canonica auth, short positive widget auth cache, and context-scoped search cache keys. |
| 2026-03-08 | 2.0.0   | Complete rewrite: added feedback operations, origin allowlist, SAFE_MODE read, updated cost projections for v2, long-term cost strategy |
| 2026-03-07 | 1.0.0   | Initial cost analysis                                                                                                                   |
