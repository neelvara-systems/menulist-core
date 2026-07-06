# Answerlattice Help Widget — Firebase Operations & Cost

> **Version:** 2.5.4
> **Last Updated:** 2026-06-30
> **Audience:** Developers / Ops

---

## Collections Used (Per Search Query)

| Collection                     | Operation          | When                                           | Cost Per Query |
| ------------------------------ | ------------------ | ---------------------------------------------- | -------------- |
| `stores`                       | 0-1 READ           | API key validation + origin allowlist check; warm widget requests reuse a short server auth cache | Existing read pricing |
| `answerlattice_entities`            | 1-3 READS          | Canonical entity lookup                        | $0.000108 max  |
| `answerlattice_canonical_answers`   | 0-3 READS          | Canonical answer fetch                         | $0.000108 max  |
| `answerlattice_releases`            | 0-1 READ           | Version window check                           | $0.000036 max  |
| `answerlattice_entity_search_index` | 1-5 READS          | Token-based entity search                      | $0.000180 max  |
| `kb_articles`                  | 12 READS           | Vector search (if RAG fallback)                | $0.000432      |
| `queryEmbeddings`              | 1 READ + 0-1 WRITE | Embedding cache                                | $0.000054      |
| `aiSearchHistory`              | 1 WRITE            | Search history logging (every query)           | $0.000054      |
| `ops_config`                   | 0-1 READ           | SAFE_MODE check (if ENABLE_COST_PROTECTION ON) | $0.000036 max  |

## Additional Operations (v2 Features)

| Collection               | Operation | When                                                                     | Cost Per Event |
| ------------------------ | --------- | ------------------------------------------------------------------------ | -------------- |
| `aiSearchHistory`        | 1 READ + 0-1 WRITE | Feedback submission (thumbs up/down); repeated identical feedback skips the write | Existing read/write pricing |
| `answerlattice_signal_events` | 0-1 WRITE | Negative feedback → signal event (if ENABLE_ANSWERLATTICE_SIGNAL_MUTATION ON) | $0.000054      |
| `stores`                 | 0-1 READ  | Runtime config lookup through `/api/widget/config`; browser/server caches use the public 60-second TTL | Existing read pricing |
| `stores`                 | 0-1 WRITE | Explicit dashboard save in `/answerlattice/widget`; unchanged saves skip the write | Existing write pricing |
| `stores`                 | 1 READ + 1 WRITE | Widget key create/rename/delete updates `answerlatticeWidgetApi` only; create returns the raw key once | Existing read/write pricing |
| `stores`                 | 0 READ / 0 WRITE | Widget key copy after creation is intentionally unavailable; operators create a replacement key if the raw value is lost | $0.00 |
| `aiSearchHistory`        | 0-12 READS | `/api/answerlattice/widget-activity` recent widget questions panel in `/answerlattice/widget`; protected tenant/store read after the shared `DATA_READ` gate | Rate-limited refreshes perform no search-history reads |
| Browser request/response validation | 0 READ / 0 WRITE | Widget Management uses no-store, same-origin, manual-redirect request policy and validates widget-config, widget-activity, widget-key, and hosted-help settings response bodies before local UI state changes | $0.00 |
| Widget activity timestamp normalization | 0 READ / 0 WRITE | `/api/answerlattice/widget-activity` accepts Firestore Timestamp-like values and canonical ISO `...Z` strings only when sorting fallback rows or serializing `createdAt`; malformed stored values become `null`/oldest instead of permissive parsed dates | $0.00 |
| Public iframe response validation | 0 READ / 0 WRITE | WidgetClient validates widget search responses in the browser before rendering assistant messages; feedback request policy changes stay browser-local | $0.00 |

## No New Collections

Widget v2 reuses ALL existing Answerlattice collections. Zero new Firestore collections created. The feedback route writes to `aiSearchHistory` (existing) and `answerlattice_signal_events` (existing).

The `widgetConfig`, `widgetAllowedOrigins`, `widgetConfigVersion`, and `answerlatticeWidgetApi` fields are stored on the existing `stores` document — no new document or collection. Widget keys use `answerlatticeWidgetApi.keyHashes` for one-query runtime lookup and `answerlatticeWidgetApi.keysByHash` for key names, prefixes/suffixes, scopes, and status. Raw keys are not stored for dashboard recovery after creation. Stored origin values are normalized to origin format (`scheme://host[:port]`), and configured allowlists reject missing or unlisted request origins. Route blocklists are stored inside `widgetConfig.blockedRoutes` and evaluated locally by the loader script.

## Widget Activity Index

The dashboard recent-questions panel uses this composite index in Answerlattice Firebase:

| Collection | Fields | Purpose |
| ---------- | ------ | ------- |
| `aiSearchHistory` | `tId ASC, sId ASC, mountContext ASC, createdOn DESC` | Recent widget questions for `/answerlattice/widget` |
| `aiSearchHistory` | `cacheKey ASC, tId ASC, sId ASC, createdOn DESC` | Deterministic newest-first cached owner search lookup |

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

Note on image queries: Image queries add one bounded visual-context model call before normal retrieval/answering. Expected volume: <10% of widget queries will include images (error screenshots). Widget images are validated and passed inline to `coreSearch()`; they are not written to Firebase Storage. Authenticated Help Center image URLs are tenant/store path-checked, fetched with manual redirect handling, and read through the bounded image response reader before visual-context generation.

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
3. **Owner FAQ/custom-answer retrieval** — Published FAQ hits skip embedding/vector/answer generation; the bounded FAQ list is short-cached per tenant/store/source-version
4. **Widget-prefixed cache keys** — `widget:` prefix prevents cache collision with dashboard queries
5. **Shared pipeline** — Same coreSearch() function, no duplicated logic or reads
6. **Context-aware entity boosting** — Narrows entity match scope, reduces RAG fallback rate
7. **No session persistence** — Widget session memory is in-memory only, zero Firestore writes for conversation state
8. **Inline widget images** — Screenshot questions are validated and passed to the shared search pipeline without temporary Storage writes
9. **Bounded context payloads** — Widget context is normalized before postMessage/API use, keeping prompt payloads small
10. **Origin allowlist reuses store document** — No additional read (checked during API key validation which already reads store)
11. **No temp image storage for widget** — Image queries avoid Firebase Storage writes and cleanup work by passing validated inline payloads into the shared pipeline

11. **Store-doc widget key lookup** — Widget routes validate active `al_*` keys with `array-contains` on `answerlatticeWidgetApi.keyHashes`, falling back to the legacy single `apiKeyHash` field for old workspaces.
12. **Short positive auth cache** — Widget search and feedback reuse a positive API-key validation result for up to 15 seconds per warm server instance. Revocation can take up to that short TTL to reflect on that instance.
13. **Runtime config cache** — `/api/widget/config` uses short server caching and browser `sessionStorage`, so installed scripts do not re-read Firestore on every route render.
14. **Explicit-save dashboard writes** — `/answerlattice/widget` keeps edits local until Save; no Firestore writes happen while typing, moving controls, or previewing.
15. **Scoped widget credential field** — `answerlatticeWidgetApi` separates widget keys from `publicApi`, so widget runtime routes can opt into widget scopes without broader public API reads.
16. **Negative API-key validation cache** — repeated invalid widget keys are cached briefly per warm server instance, reducing repeated Firestore misses during abuse or broken installs.
17. **No-op config save guard** — dashboard saves compare normalized config/origin values before writing, so repeated Save clicks do not increment `widgetConfigVersion` or write the store document.
18. **Duplicate feedback guard** — repeated identical thumbs feedback returns success without another `aiSearchHistory` write or duplicate negative signal event.
19. **Route blocklist is local** — blocked routes ride the existing runtime config response and use `window.location.pathname`; route changes do not create Firebase reads, writes, or listeners.
20. **Branding rides runtime config** — header title, accent color, greeting, and powered-by visibility use the existing `/api/widget/config` response; no separate white-label collection or listener is needed for the launch-grade widget controls.
21. **Interval-only runtime status writes** — widget config writes runtime status at most once per warm 15-minute interval instead of writing on page-path/context changes.
22. **One-time key display** — widget keys are never decrypted or recovered later, so copy attempts after creation do not add Firestore reads.
23. **Bounded public widget diagnostics** — widget search/config/feedback/predictive-help failure logs use fixed runtime codes and tenant/store presence-length metadata, not raw tenant/store IDs or route-specific exception payloads.
24. **Observable config capability degradation** — predictive-summary read failures log `answerlattice_widget_config_predictive_summary_load_failed` and public bundle-manifest read failures log `answerlattice_widget_config_bundle_manifest_load_failed`; the response keeps the existing degraded capability shape without adding Firestore reads, writes, or Storage operations.
25. **Bounded widget-management requests and responses** — dashboard widget-config, widget-activity, widget-key, and hosted-help calls use no-store, same-origin, manual-redirect request policy, then parse responses with a browser-side 256 KB cap and shape guards before state mutation. This adds no Firestore reads, writes, collections, listeners, or provider calls.
26. **Bounded public widget responses** — iframe search responses are parsed with a browser-side 256 KB cap and shape guard before rendering. This adds no Firestore reads, writes, collections, listeners, Storage operations, provider calls, rules, indexes, or deployment work.

## Cache Strategy Decision

The widget intentionally uses a mixed cache strategy instead of forcing every cache through one system:

| Workload | Cache pattern | Decision |
| -------- | ------------- | -------- |
| Widget runtime config | Browser `sessionStorage` + short process-local server cache + HTTP `private, max-age=60` | Keep. Config is API-key/origin scoped, revocation-sensitive, cheap to read, and does not need realtime behavior. |
| Widget API-key validation | Short process-local positive/negative cache | Keep. Staleness is bounded to seconds, so key revoke/origin changes are not hidden behind a long shared cache. |
| Canonical answer instant responses | Upstash Redis instant cache | Keep. This is deterministic canonical-answer output with source-version freshness validation and high provider-cost avoidance. |
Do **not** move widget runtime config to Upstash now. A Redis `GET` on every widget config request can cost more than the Firestore read it replaces at low/medium traffic, and it adds a second invalidation path for key revoke and origin changes.

Future trigger to reconsider: if widget config/auth reads become a measurable production cost driver, add an Answerlattice-specific cache layer with explicit tags such as `answerlattice-widget-store-{sId}` and forced invalidation from widget key/config writes. Do this only after measuring real read volume, because the current 60-second cache envelope keeps config reads low without long stale-auth risk.

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
| 2026-06-30 | 2.5.6   | Added Widget Management browser request policy for widget-config, activity, key, and hosted-help calls with no Firebase cost-shape change. |
| 2026-06-30 | 2.5.5   | Documented public iframe WidgetClient response validation as browser-local with no Firebase cost-shape change. |
| 2026-06-30 | 2.5.4   | Added Widget Management browser response acknowledgement for widget-config, activity, key, and hosted-help settings responses with no Firebase cost-shape change. |
| 2026-06-29 | 2.5.3   | Made widget config predictive-summary and public bundle-manifest capability degradation observable with bounded runtime diagnostics and no cost-shape change. |
| 2026-06-28 | 2.5.2   | Bounded public widget search/config diagnostics without changing auth, rate limits, origin checks, cache behavior, reads, or writes. |
| 2026-06-11 | 2.5.1   | Hardened widget key and cache cost model: raw widget keys are one-time only, runtime status writes are interval-throttled, and owner search cache lookup uses newest-first indexed ordering. |
| 2026-05-25 | 2.4.9   | Added store-doc multi-key cost model: no new collections, runtime validation stays one indexed store lookup, and key create/rename/delete are bounded writes. The old copy/decrypt path is superseded by 2.5.1. |
| 2026-05-24 | 2.4.6   | Restored predictive support cost docs with summary-backed capability gating: one extra trigger-summary read only on widget config cache misses, and no predictive API calls when active triggers are absent. |
| 2026-05-24 | 2.4.5   | Temporary rollback note superseded by 2.4.6 after predictive support was restored and hardened. |
| 2026-05-22 | 2.4.4   | Added widget branding cost note: launch-grade branding rides existing runtime config and adds no Firestore reads/listeners. |
| 2026-05-21 | 2.4.3   | Removed temporary client-product connector cost notes after separating Answerlattice runtime from client product code. |
| 2026-05-20 | 2.4.2   | Added route blocklist cost note: no new collections, reads, writes, or Firestore listeners. |
| 2026-05-19 | 2.4.1   | Added widget cost pass: 60-second runtime config server cache, negative auth cache, no-op config save guard, and duplicate feedback guard. |
| 2026-05-19 | 2.4.0   | Added widget management cost model: runtime config endpoint, explicit dashboard saves, and scoped `answerlatticeWidgetApi` credential writes. |
| 2026-05-19 | 2.3.1   | Added widget Firebase cost pass: hash-only Answerlattice auth, short positive widget auth cache, and context-scoped search cache keys. |
| 2026-03-08 | 2.0.0   | Complete rewrite: added feedback operations, origin allowlist, SAFE_MODE read, updated cost projections for v2, long-term cost strategy |
| 2026-03-07 | 1.0.0   | Initial cost analysis                                                                                                                   |
