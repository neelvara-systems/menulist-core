# Answerlattice — Firebase Cost Optimization Audit

> **Status:** Cross-checked July 29, 2026 after the owner-decision feature audit
> **Scope:** Answerlattice help center, KB, tickets, chat, changelog, feedback, governance, public API, widget, scheduler functions, Knowledge Map, Daily Brief, Product Friction Evidence, release impact, Answer Tests, and Answer Trace
> **Rule:** Correctness stays higher priority than lower Firebase spend.

---

## Executive Verdict

Answerlattice is Firebase-cost-conscious after this pass. The live user-facing paths avoid duplicate KB category reads, route public KB/FAQ/changelog reads through tenant/store-tagged Next cache, bound customer chat/ticket history reads, use aggregated chat analytics for ROI, avoid an extra feedback refetch after submit, and validate cached search answers through tiny source-version manifests. The July 20 follow-up also removes unused ontology reads from governance tabs, replaces the predictive-trigger create guard's document fetch with a count aggregate, and instruments the existing scheduler run log with bounded logical source-operation windows. Governance and scheduler paths remain feature-flagged and bounded.

Remaining cost risks are non-blocking and documented below.

---

## July 29 Owner-Decision Feature Audit

| Feature | Existing cost shape | Audit decision |
| --- | --- | --- |
| Daily Brief / external Owner Action Center proposal | Six exact `platformSummary` point reads, one `getAll()`, 60-second 300-workspace process cache | Added same-workspace single-flight loading. Concurrent cold requests now share one six-document load; no summary, cache service, listener, or write was added. |
| Knowledge Map / Product Truth Map | Graph summary plus source-version point read; interactions remain in memory | Kept the two-read freshness contract. Exempted the point-read-only `graph` and `interactionRules` payloads from automatic indexing. |
| Product Friction Evidence / Customer Friction Map | One snapshot and one optional advisory owner read; bounded nightly aggregates | Kept the two-read owner surface and existing daily rows. Exempted `topFrictionEntities` and `emergingTopics` from automatic indexing. |
| Release impact | Explicit release point read, capped affected-answer query, optional Answer Tests summary | Kept uncached and owner-triggered. Current release/answer authority is more important than avoiding these bounded reads. No release summary or background monitor was added. |
| Answer Tests / Critical Answer Test Suite | One bounded summary document with a 480 KiB guard and request-local evaluation reuse | Kept one source of truth. Exempted `cases`, `runs`, and `reservations` from automatic indexing. No cross-request result cache, scheduled run, or artifact store was added. |
| Answer Trace | One exact read from a ticket or at most 30 recent projected records after an explicit owner action | Kept uncached and rate limited. A trace summary would add reconciliation cost and could hide current routing evidence. |
| Activation proof used by Daily Brief | Existing compact `activation_*` summary with signature-skip writes | Exempted bounded `steps`, `launchProof`, and `content.surfaceReadiness` payloads from automatic indexing; scalar readiness fields remain unchanged. |

The dedicated and shared Firestore manifests carry the same Answerlattice
point-read exemptions. These exemptions reduce index-entry storage and write
amplification only; they do not reduce billed document reads and do not change
query results because none of the exempt payloads is a query predicate.

### Cache Pattern Decision

The MenuList public-menu and Answerlattice public-content pattern uses tagged
Next cache plus explicit write invalidation because the payload is published,
anonymous, and safe to serve briefly from a shared cache. That pattern does not
transfer directly to owner-decision proof:

- Daily Brief already reads six compact summary documents and now coalesces
  same-workspace cold requests inside each server process.
- Knowledge Map freshness depends on its graph/source-version pair.
- release impact, Answer Tests execution, and Answer Trace must reflect current
  authority when the owner explicitly opens or runs them.
- adding Redis/Upstash value caching would require invalidation across answer,
  article, entity, release, test, ticket, signal, and activation writes. A
  partial contract could lower reads while showing stale governance evidence.

Upstash remains useful for bounded route admission/rate limiting where already
wired. It is not added as a second owner-data store in this pass. Reconsider a
shared value cache only after production telemetry shows material cross-instance
repeat reads and the invalidation contract can be proven end to end.

---

## Answerlattice Firebase Cost Map

| Area | File / Flow | Operation | Path | Trigger | Freshness Need | Realtime Needed | Risk Before | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Help Center KB categories | `useKBCategoriesCache`, `BrowseCategories`, `TrendingTopics`, `KnowledgeBaseExplorer`, `KbTreeSelect`, `useChatData`, `/api/answerlattice/public-content` | Cached server `getDoc` | `kb_categories/categories_{tId}_{sId}` | Help center home, KB tab, chat modal, changelog source picker | 60s cache or owner-write invalidation | No | Medium | Moved from browser Firestore reads to tenant/store-tagged `unstable_cache`; shared in-flight/context cache remains for same-mount reuse. |
| Help Center articles | `useArticleCache`, `ArticleViewModal`, `KnowledgeBaseExplorer/Articles`, `/api/answerlattice/public-content` | Cached server `getDoc` | `kb_articles/{articleId}` with `tId+sId` validation | Article modal/full article render | 60s cache or owner-write invalidation | No | Medium | Moved article fetches off browser Firestore, strips embeddings/generated internals from public payload, and validates tenant/store scope server-side. |
| Help Center FAQ tab | `FaqView`, `/api/answerlattice/public-content` | Cached server query | `answerlattice_faqs` filtered by `tId+sId+published+active` | FAQ tab mount | 60s cache or owner-write invalidation | No | Medium | Public FAQ list now uses the same public cache/revalidation strategy as MenuList menu data. |
| Help Center changelog | `ChangelogView`, `WhatsNew`, `DisplayChangelog`, `/api/answerlattice/public-content` | Cached server `getDocs(limit 1)` and older-page query | `changelog/{tId}/{sId}` | Home and changelog tab | 60s cache or owner-write invalidation | No | Low/Medium | Public latest/older changelog page reads moved behind cache; Help Center disables the old browser-Firestore fallback; owner CRUD invalidates changelog/context tags. |
| Hosted public Help Center | `src/app/answerlattice-hosted-help`, `hostedHelpServer`, Hosted Help settings | Cached registry doc + cached content reads | `answerlattice_publicHelpSites/{domain}`, cached KB/FAQ/changelog | Anonymous help domain visit | 60s registry/content cache or owner-write invalidation | No | Medium | Uses one domain registry doc instead of querying stores; search is client-side over loaded public content; tickets/chat/feedback stay authenticated. |

`/api/answerlattice/public-content` failures now log fixed runtime codes with bounded content-type and tenant/store metadata only; the route's cache keys, cache freshness, Firestore read pattern, and owner-write invalidation behavior are unchanged. Browser callers use `publicContentClient.ts`, which pins no-store cache, same-origin credentials, and manual redirect handling before validating the cached response through a 1 MB bounded reader and `{ data }` envelope; this adds no Firestore reads, writes, cache revalidations, indexes, or Cloud Functions.
| Store tickets | `subscribeStoreTickets`, `getStoresTickets` | `onSnapshot`, `getDocs` | `supportTickets` filtered by `tId+sId+deleted` | Help Center home/ticket tab | Live for support thread updates | Yes | High | Realtime remains, but owner listener/query is capped to latest 100 tickets. |
| Platform tickets | `subscribeSupportTickets`, `getSupportTickets` | `onSnapshot`, `getDocs` | `supportTickets` | Platform queue/dashboard | Live platform queue | Yes | Medium | Existing 500 cap retained via shared constant. |
| Feedback | `ShareFeedbackView`, `addFeedback`, `getLatestFeedbackForUser` | `addDoc`, `getDocs(limit 1)` | `feedback` | Feedback tab mount and submit | Submitted item must show immediately | No | Low/Medium | Submit now uses returned `addDoc` payload; removed post-submit read. |
| User chat history | `getUserChatSessions` | `getDocs` | `chatSessions` | AI assistant open, rename/delete refresh | Recent history | No | Medium | Added `sId` scope guard and latest-50 cap. |
| Chat session writes | `saveChatSession`, `updateChatSession`, `updateMessageFeedback` | `addDoc`, `setDoc`, one feedback read+write | `chatSessions` | User sends messages/feedback | Exact | No | Medium | Kept current behavior; writes are explicit user actions, not keystroke writes. |
| Chat analytics dashboard | `chatAnalytics` DAL | `getDocs` daily aggregates + today live sessions | `chatAnalytics`, `chatSessions` | Monitoring dashboards | Fresh enough for dashboard | No | Medium | Existing aggregate model retained; analytics windows clamp to 1-90 days and today live stats are capped at 500 sessions. |
| ROI calculator | `/api/analytics/roi-metrics` | `getDocs` | `chatAnalytics` + bounded today live sessions | ROI tab load | Dashboard-level | No | High | Switched from raw `chatSessions` scan to existing aggregate DAL and clamped range to 90 days. |
| KB article delete helpers | `getArticlesByCategoryId`, `getArticlesBySectionId` | `getDocs` | `kb_articles` | Admin deletes category/section | Exact within current workspace | No | Medium | Added `tId+sId` filter when session exists and capped to 500. |
| Answerlattice entities | `addEntity` | Count aggregate | `answerlattice_entities` | Entity create | Exact count limit | No | Medium | Replaced full limited read with `getCountFromServer`. |
| Entity candidates | `getPendingCandidates` | `getDocs` | `answerlattice_entityCandidates` | Candidate review | Queue latest/high confidence | No | Medium | Added pending queue cap of 200. |
| Governance entity labels | `useEntities` in canonical answers, analytics, drift, and health | Mode-gated `getDocs` | entities, relations, search index | Governance tab mount | Fresh on tab open | No | Medium | Label-only tabs now read entities only; health reads entities plus search index; full ontology management keeps all three queries. |
| Predictive trigger create cap | `addPredictiveTrigger` | `getCountFromServer` | `answerlattice_predictiveTriggers` | Explicit owner create | Exact cap guard | No | Low/Medium | Replaced fetching up to 200 trigger documents only to count them; summary rebuild remains cap-plus-one and fail-closed. |
| Canonical answers | `getCanonicalAnswers`, `getActiveAnswersForEntity`, `getDriftedAnswers` | `getDocs`, `getDoc`, writes | `answerlattice_canonicalAnswers` | Governance/retrieval | Fresh on request | No | Low | Existing limits retained. |
| Search cache | `searchCore`, `cacheFreshness`, `aiSearchHistory/server`, `cacheVersionManifest` | cache query, manifest freshness read, search history write | `aiSearchHistory`, `answerlattice_cacheVersions` | Help search/widget search | Must not serve stale content | No | Medium | New cache rows capture KB/canonical source versions; fresh hits validate against one tiny manifest doc and old rows fall back to direct source validation. |
| Instant Redis cache | `instantCache`, `searchCore`, `canonicalRetrieval`, `cacheVersionManifest` | Redis read/write + manifest freshness read | Upstash + `answerlattice_cacheVersions` | Canonical answer hot path when enabled | Must be source-fresh | No | Low | Feature remains off by default; canonical cache entries capture source version and bypass full answer-doc validation when manifest is current. |
| Public API key auth | `publicApi`, `widget/search` | Store key lookup after format/rate guard | Answerlattice `stores` in separate mode, default `stores` only in explicit shared local/test mode | Public API/widget calls | Exact auth | No | Low | Existing malformed-key short-circuit retained; widget keys no longer fall back to client-product store documents in separate mode. |
| Changelog writes | `addChangelogEntry`, `updateChangelogEntry`, feedback | transactions | `changelog/{tId}/{sId}` | Platform CRUD/user feedback | Exact | No | Low | Page model and 900 KB guard retained. |
| Scheduler functions | `functions-answerlattice/src/answerlattice/*` | bounded Admin queries/writes | Answerlattice collections | Nightly/manual scheduler | Fresh batch | No | Low | Existing source queries and one run-log write are retained. Each task now attaches at most eight compact logical source-window observations to that existing log; this adds no query, collection, index, or scheduler work. |

Answerlattice cache freshness ID boundary: cache freshness checks now validate cached canonical answer IDs and KB article reference IDs before either manifest freshness or fallback source-document reads can accept a cached row. This changes malformed-cache admission only; valid cache hits keep the same manifest-read and fallback source-read shape.

---

## Changes Implemented

1. **Shared KB category cache**
   - Added `src/hooks/useKBCategoriesCache.ts`.
   - Replaced duplicate direct `getCategories()` calls in Help Center, chat, KB explorer, and changelog source picker.
   - Fixed the previous shape drift where chat cached `categoriesResult.categories` instead of the full `{ categories }` payload.

2. **Bounded realtime ticket reads**
   - `subscribeStoreTickets()` and `getStoresTickets()` now limit owner/customer support history to the latest 100 non-deleted tickets.
   - Platform support tickets keep the existing latest-500 cap.

3. **Feedback submit read reduction**
   - `ShareFeedbackView` now renders the returned `addFeedback()` payload instead of issuing a second `getLatestFeedbackForUser()` query after submit.

4. **Chat monitoring and ROI cost guard**
   - `/api/analytics/roi-metrics` now uses `getChatStatisticsOptimized()` instead of raw session statistics.
   - ROI and optimized analytics DAL ranges are clamped to 1-90 days, matching the UI.
   - Today live analytics are capped at 500 sessions.

5. **Governance and KB admin query caps**
   - Entity create limit enforcement uses Firestore aggregate count instead of reading entity docs.
   - Pending entity candidate review is capped to 200.
   - Category/section article helper queries are tenant/store-scoped when session context exists and capped to 500.

6. **Flag-gated landing governance widgets**
   - Help Center landing no longer mounts mutation/entity review widgets unless the matching Answerlattice feature flag is enabled.

7. **Instant-cache miss read reuse**
   - `searchCore` passes preloaded entity search index and latest release data into canonical retrieval.
   - Optional Redis cache misses no longer trigger a second identical entity-index/latest-release read before canonical answer lookup.

8. **Source-version cache freshness manifest**
   - Added `answerlattice_cacheVersions/{source}_{tId}_{sId}` with `source = kb | canonical` and monotonic `version`.
   - KB/category/article writes, article embedding/translation writes, publish jobs, and canonical answer governance/write paths bump the matching source version.
   - Firestore `aiSearchHistory` cache rows and Redis canonical cache payloads capture `sourceVersions`.
   - Cache hits now validate freshness with one tiny manifest read when source versions exist; when the manifest has not been initialized yet, KB cache rows use the already-required latest-article modified timestamp as the source version. Older rows without any source version safely fall back to direct source document validation.

9. **Public Help Center content cache**
   - Added `src/app/api/answerlattice/public-content/route.ts` and `src/lib/answerlattice/publicContentCache.ts`.
   - KB categories, full article reads, FAQ lists, latest changelog, and older changelog pages now use server-side `unstable_cache` with tenant/store tags.
   - Help Center changelog passes `useInternalFallback={false}` so the shared changelog renderer cannot issue its older direct browser Firestore read while the cached API response is loading.
   - Changelog management preview also disables the shared renderer fallback because the parent management screen already owns the changelog page fetch.
   - Changelog related-article breadcrumbs lazy-load the shared cached KB category payload only when an entry has `kbSources`.
   - Added `/api/revalidate/answerlattice` plus `revalidateAnswerlatticePublicClientCache()` so owner FAQ, KB category, article, and changelog writes clear the affected public cache tags. Same-workspace callers share an active request, but a mutation that joins it guarantees one trailing invalidation so a later committed write cannot disappear behind the older request.
   - Browser-side revalidation failures use dev-only bounded diagnostics with tenant/store presence, segment count, response status, and error name only. This adds no cache calls or Firestore reads/writes.
   - Public article payloads remove embedding/generated/internal fields before returning to the browser.

10. **Hosted public Help Center**
   - Added `answerlattice_publicHelpSites/{domain}` registry docs so anonymous help domains resolve with one cached direct doc read.
   - Added hosted docs/FAQ/changelog pages, robots, sitemap, owner settings, and domain registry invalidation.
   - Hosted search is client-side over already-loaded published content and does not call AI or write search history.
   - Anonymous hosted pages do not expose tickets, chat sessions, feedback writes, or user/session data.

11. **Governance ontology read modes**
   - Added `entities_only` and `entities_and_search_index` modes to the existing entity hook.
   - Canonical-answer, usage-analytics, and drift tabs skip both relation and search-index queries.
   - Entity health skips the unused relation query.
   - Full ontology management preserves the existing entities, relations, and search-index refresh.

12. **Predictive trigger count guard**
   - Trigger creation now uses one scoped count aggregate for the 200-trigger limit.
   - The bounded 201-row query remains after mutations because it is required to rebuild and validate the compact runtime summary.

13. **Scheduler source-window telemetry**
   - Added one failure-safe observer shared through each tenant task execution.
   - The observer records compact tuples for source, semantic window, operation count, documents returned, configured limit, and saturation.
   - Duplicate source/window observations aggregate, malformed observations are ignored, and each task keeps at most eight unique windows.
   - Telemetry is stored inside the existing scheduler run-log write and exposed only in the platform intake monitor, capped to 80 returned windows.
   - These values describe logical source operations and results, not billed Firestore reads. They exclude index-entry billing, transaction retries, uninstrumented direct document reads, provider calls, and cached or server-side billing adjustments.

---

## Before / After Cost Impact

| Flow | Before | After |
| --- | --- | --- |
| Help Center home KB categories | `BrowseCategories` and `TrendingTopics` could both read the same categories doc on first mount | One shared in-flight fetch, then context cache |
| Help Center repeat KB/FAQ/changelog visits | Each browser session/tab could hit Answerlattice Firestore again | Cached API response; Firestore only on cache miss or after owner-write invalidation |
| Help Center changelog first render | Shared renderer could call the older direct browser changelog cache while the public-content response was loading | Help Center disables internal fallback and waits for the cached API result |
| Changelog related article links | Related-article breadcrumbs depended on category data already being present in global context | Lazy shared category cache fetch only when a changelog entry has KB sources |
| Full article render | Browser read returned the whole article document including embedding/internal fields | Cached server read validates tenant/store and returns compact public article payload |
| Hosted help domain resolution | Would require store-domain query or authenticated session reuse | Direct cached registry doc per help domain |
| Hosted help search | Could have used anonymous AI search and provider cost | Client-side filtering over already-loaded published content |
| AI chat opening after Help Center | Could refetch categories and store the wrong cache shape | Reuses same `{ categories }` cache payload |
| Store ticket listener | Unbounded live snapshot for all non-deleted store tickets | Latest 100 non-deleted tickets |
| User chat history | Unbounded tenant/user query and no `sId` filter | Store-scoped latest 50 sessions |
| Feedback submit | 1 write + 1 follow-up read | 1 write only |
| ROI/analytics metrics | Up to 500 raw `chatSessions` reads per request, with caller-dependent windows | Daily aggregate reads + 1-90 day DAL clamp + bounded today live stats |
| Entity create guard | Reads up to max entity docs just to count | Firestore aggregate count |
| Pending entity candidates | Unbounded pending review query | Latest/highest-confidence 200 |
| Canonical-answer, analytics, and drift entity labels | Entity hook also read relations and search index | One bounded entity query |
| Entity health | Entity hook also read relations | Bounded entities plus search index only |
| Predictive trigger create guard | Fetch up to 200 trigger documents, then fetch up to 201 again for summary rebuild | One scoped count aggregate, then the required bounded summary rebuild |
| Instant-cache miss | Entity index/latest release could be read for cache lookup, then read again for canonical fallback | Cache lookup data is reused by canonical retrieval |
| Fresh Firestore search cache hit | 1 cache query + up to N article reads, or 1 canonical answer read | 1 cache query + 1 tiny source-version check (manifest when present, latest-article version fallback for KB) |
| Fresh Redis canonical cache hit | 1 Redis read + 1 canonical answer read | 1 Redis read + 1 tiny canonical source-version manifest read |
| Nightly source-read diagnosis | Query overlap could be inferred only by reading code and logs | Existing run log now records bounded per-task/per-tenant logical source windows with operation/result/limit saturation evidence and no additional source read |
| Concurrent Daily Brief cold requests | Each request reaching an empty process cache could start the same six-document packet load | Same-workspace requests share one in-flight promise; only the load owner incurs the six reads |
| Large owner summary writes | Point-read-only arrays/maps received automatic single-field index entries | Dedicated/shared manifests exempt the graph, friction rankings, Answer Tests payloads, and Activation proof arrays |

---

## Remaining Non-Blocking Cost Risks

| Risk | Why It Remains | Mitigation |
| --- | --- | --- |
| Ticket documents keep messages inline | Existing support-ticket contract uses one document per ticket. Splitting messages would be a schema change. | Existing message hard cap remains. Revisit only with a migration plan. |
| Old cache rows without `sourceVersions` still validate source docs | Pre-change cache rows cannot prove freshness from the manifest or latest-article source version. | Safe fallback remains; rows naturally age out or are replaced by new source-version-backed cache entries. |
| Public API key validation reads `stores` on each request | Security-sensitive auth path. In-memory caching could delay revocation. | Keep current fail-closed behavior unless revocation-aware cache is designed. |
| Governance tabs can still refetch on tab navigation when enabled | Active governance users need current review state, and source-version freshness differs by surface. | Keep current bounded reads until production telemetry proves repeated navigation is material; do not add a broad stale owner cache speculatively. |
| Nightly tasks query overlapping source collections | Drift, mutation, trust, graph, support-board, and friction work use different windows, filters, ordering, flags, and failure-isolation rules. Blind snapshot sharing could make one saturated task suppress otherwise valid summaries. | Logical source-window instrumentation is now implemented. Observe at least 14 complete daily runs across representative active tenants. Reuse a snapshot only when source, filters, ordering, limits, freshness, completeness, and failure-isolation contracts are identical; reject consolidation when any candidate window saturates, task failures occur, or the measured reduction is negligible. |
| Today live analytics capped at 500 sessions | Prevents runaway dashboard reads but can undercount extreme same-day volume until nightly aggregate catches up. | Use nightly/manual aggregation for exact high-volume reporting. |
| Hosted help domain prefixes are intentionally narrow | Middleware cannot query Firestore at the edge, so only common help/docs/support/kb host prefixes route to the hosted resolver. | Add explicit prefixes only when needed; do not reroute all custom domains because MenuList custom domains share this Vercel project. |

---

## Verification

The July 29 owner-decision feature pass, cross-checked again on July 30, produced the following current-worktree evidence:

| Check | Result |
| --- | --- |
| `npm run verify:answerlattice-founder-daily-brief` | PASS, including the Firestore emulator scheduler |
| `npm run verify:answerlattice-knowledge-map` | PASS |
| `npm run verify:answerlattice-founder-support-controls` | PASS |
| `node scripts/verification/verify-answerlattice-runtime-truth.js` | PASS |
| `node scripts/verification/verify-firebase-scale-cost-closeout.js` | PASS, 108 checks |
| `npx tsc --noEmit --incremental false` | PASS |
| Scoped ESLint for the changed runtime and verifier files | PASS with no warnings or errors |
| `npm run verify:dependency-freeze` | PASS |
| `git diff --check` | PASS |

The dedicated Answerlattice QA index deployment was attempted with:

```bash
firebase deploy --project answerlattice-qa \
  --config firebase-answerlattice.json \
  --only firestore:indexes \
  --non-interactive
```

Firebase CLI stopped before any remote change with `Error: Failed to authenticate, have you run firebase login?`. The same scoped command was retried on July 30 after the complete cross-check and failed at the same authentication boundary. The source manifests and verifier gates are complete; the remote index exemptions remain pending an authenticated operator retry.

The July 20 cross-check ran the source, contract, rules-emulator, type, lint, dependency-freeze, and Functions build gates below. The older production-build and browser-smoke evidence is retained for audit history; those checks were not rerun because this follow-up changed only client read selection, a count guard, tests, and documentation.

| Check | Result |
| --- | --- |
| `npm run verify:answerlattice-runtime-truth` | PASS on July 20, including dedicated/shared Firestore rules-emulator suites |
| `npm run verify:answerlattice-final-readiness` | PASS on July 20 |
| `npm run test:answerlattice-scheduler-read-telemetry` | PASS on July 20 |
| `npm run test:answerlattice-predictive-support` | PASS on July 20 |
| `npx tsc --noEmit --incremental false` | PASS on July 20 |
| `npm run lint` | PASS on July 20 with no warnings or errors |
| `npm run verify:dependency-freeze` | PASS on July 20 |
| `npm --prefix functions-answerlattice run build` | PASS on July 20 |
| `git diff --check` | PASS on July 20 |
| `npm run test:answerlattice-chat-analytics:scheduler` | PASS on July 20 |
| `npm run test:answerlattice-knowledge-intake-summary:emulator` | PASS on July 20 after making the harness ignore inherited host credentials |
| Earlier `npm run build` evidence | PASS; existing non-fatal i18n dynamic `cookies` warnings appeared during static generation |
| Earlier local route smoke evidence | PASS: `/help-center`, `/answerlattice`, `/answerlattice/docs`, `/answerlattice/support`, `/answerlattice/release-notes`, `/answerlattice/dashboard`, `/api/version` returned 200 |
| Earlier authenticated Chrome smoke evidence | PASS: Help Center rendered with live tickets/changelog/KB cards; QnA search POST returned 200 and produced a grounded no-answer response |
| Earlier Redis fallback smoke evidence | PASS: local Upstash DNS failure degraded safely; `/api/helpCenter/search-kb` continued and returned 200 |
| Earlier unauthenticated API guard smoke evidence | PASS: `/api/helpCenter/search-kb` returned 401, `/api/answerlattice/public/v1/answers` rejected unsupported GET with 405, `/api/widget/search` returned widget-disabled 404 |
| Scope review | No schema-breaking changes |
| Realtime review | Realtime kept only for ticket flows that need live updates |
| Tenant scope review | Added `sId` guard to user chat history and KB delete helper queries |
| Public cache route review | New route derives tenant/store from session only; client-supplied tenant/store IDs are not trusted |

The narrow QA Functions deployment was attempted with:

```bash
firebase deploy --only functions:answerlattice:answerlatticeNightly,functions:answerlattice:triggerAnswerlatticeNightly \
  --project answerlattice-qa \
  --config firebase-answerlattice.json \
  --non-interactive
```

Firebase CLI stopped before upload with `Error: Failed to authenticate, have you run firebase login?`. No remote Function revision changed.

---

## Final Cost Verdict

**Firebase Cost Optimized with Minor Remaining Risks**
