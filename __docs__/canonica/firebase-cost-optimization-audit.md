# Canonica — Firebase Cost Optimization Audit

> **Status:** Updated after May 16, 2026 code audit
> **Scope:** Canonica help center, KB, tickets, chat, changelog, feedback, governance, public API, widget, and scheduler functions
> **Rule:** Correctness stays higher priority than lower Firebase spend.

---

## Executive Verdict

Canonica is Firebase-cost-conscious after this pass. The live user-facing paths now avoid duplicate KB category reads, bound customer chat/ticket history reads, use aggregated chat analytics for ROI, avoid an extra feedback refetch after submit, and validate cached search answers through tiny source-version manifests instead of repeatedly reading every source document on fresh cache hits. Governance and scheduler paths remain feature-flagged and bounded.

Remaining cost risks are non-blocking and documented below.

---

## Canonica Firebase Cost Map

| Area | File / Flow | Operation | Path | Trigger | Freshness Need | Realtime Needed | Risk Before | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Help Center KB categories | `useKBCategoriesCache`, `BrowseCategories`, `TrendingTopics`, `KnowledgeBaseExplorer`, `KbTreeSelect`, `useChatData` | `getDoc` with legacy fallback | `kb_categories/categories_{tId}_{sId}` then `kb_categories/categories` | Help center home, KB tab, chat modal, changelog source picker | Session fresh | No | Medium | Shared in-flight/context cache prevents same-mount duplicate reads and keeps one data shape. |
| Help Center changelog | `useChangelogCache` | `getDocs(limit 1)` | `changelog/{tId}/{sId}` | Home and changelog tab | Session fresh | No | Low/Medium | Added in-flight dedupe for concurrent latest-page reads. |
| Store tickets | `subscribeStoreTickets`, `getStoresTickets` | `onSnapshot`, `getDocs` | `supportTickets` filtered by `tId+sId+deleted` | Help Center home/ticket tab | Live for support thread updates | Yes | High | Realtime remains, but owner listener/query is capped to latest 100 tickets. |
| Platform tickets | `subscribeSupportTickets`, `getSupportTickets` | `onSnapshot`, `getDocs` | `supportTickets` | Platform queue/dashboard | Live platform queue | Yes | Medium | Existing 500 cap retained via shared constant. |
| Feedback | `ShareFeedbackView`, `addFeedback`, `getLatestFeedbackForUser` | `addDoc`, `getDocs(limit 1)` | `feedback` | Feedback tab mount and submit | Submitted item must show immediately | No | Low/Medium | Submit now uses returned `addDoc` payload; removed post-submit read. |
| User chat history | `getUserChatSessions` | `getDocs` | `chatSessions` | AI assistant open, rename/delete refresh | Recent history | No | Medium | Added `sId` scope guard and latest-50 cap. |
| Chat session writes | `saveChatSession`, `updateChatSession`, `updateMessageFeedback` | `addDoc`, `setDoc`, one feedback read+write | `chatSessions` | User sends messages/feedback | Exact | No | Medium | Kept current behavior; writes are explicit user actions, not keystroke writes. |
| Chat analytics dashboard | `chatAnalytics` DAL | `getDocs` daily aggregates + today live sessions | `chatAnalytics`, `chatSessions` | Monitoring dashboards | Fresh enough for dashboard | No | Medium | Existing aggregate model retained; analytics windows clamp to 1-90 days and today live stats are capped at 500 sessions. |
| ROI calculator | `/api/analytics/roi-metrics` | `getDocs` | `chatAnalytics` + bounded today live sessions | ROI tab load | Dashboard-level | No | High | Switched from raw `chatSessions` scan to existing aggregate DAL and clamped range to 90 days. |
| KB article delete helpers | `getArticlesByCategoryId`, `getArticlesBySectionId` | `getDocs` | `kb_articles` | Admin deletes category/section | Exact within current workspace | No | Medium | Added `tId+sId` filter when session exists and capped to 500. |
| Canonica entities | `addEntity` | Count aggregate | `canonica_entities` | Entity create | Exact count limit | No | Medium | Replaced full limited read with `getCountFromServer`. |
| Entity candidates | `getPendingCandidates` | `getDocs` | `canonica_entityCandidates` | Candidate review | Queue latest/high confidence | No | Medium | Added pending queue cap of 200. |
| Canonical answers | `getCanonicalAnswers`, `getActiveAnswersForEntity`, `getDriftedAnswers` | `getDocs`, `getDoc`, writes | `canonica_canonicalAnswers` | Governance/retrieval | Fresh on request | No | Low | Existing limits retained. |
| Search cache | `searchCore`, `cacheFreshness`, `aiSearchHistory/server`, `cacheVersionManifest` | cache query, manifest freshness read, search history write | `aiSearchHistory`, `canonica_cacheVersions` | Help search/widget search | Must not serve stale content | No | Medium | New cache rows capture KB/canonical source versions; fresh hits validate against one tiny manifest doc and old rows fall back to direct source validation. |
| Instant Redis cache | `instantCache`, `searchCore`, `canonicalRetrieval`, `cacheVersionManifest` | Redis read/write + manifest freshness read | Upstash + `canonica_cacheVersions` | Canonical answer hot path when enabled | Must be source-fresh | No | Low | Feature remains off by default; canonical cache entries capture source version and bypass full answer-doc validation when manifest is current. |
| Public API key auth | `publicApi`, `widget/search` | Store key lookup after format/rate guard | Canonica `stores` in separate mode, default `stores` only in explicit shared local/test mode | Public API/widget calls | Exact auth | No | Low | Existing malformed-key short-circuit retained; widget keys no longer fall back to client-product store documents in separate mode. |
| Changelog writes | `addChangelogEntry`, `updateChangelogEntry`, feedback | transactions | `changelog/{tId}/{sId}` | Platform CRUD/user feedback | Exact | No | Low | Page model and 900 KB guard retained. |
| Scheduler functions | `functions-canonica/src/canonica/*` | bounded Admin queries/writes | Canonica collections | Nightly/manual scheduler | Fresh batch | No | Low | Existing caps/run logs retained; no scheduler schema change in this pass. |

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
   - Help Center landing no longer mounts mutation/entity review widgets unless the matching Canonica feature flag is enabled.

7. **Instant-cache miss read reuse**
   - `searchCore` passes preloaded entity search index and latest release data into canonical retrieval.
   - Optional Redis cache misses no longer trigger a second identical entity-index/latest-release read before canonical answer lookup.

8. **Source-version cache freshness manifest**
   - Added `canonica_cacheVersions/{source}_{tId}_{sId}` with `source = kb | canonical` and monotonic `version`.
   - KB/category/article writes, article embedding/translation writes, publish jobs, and canonical answer governance/write paths bump the matching source version.
   - Firestore `aiSearchHistory` cache rows and Redis canonical cache payloads capture `sourceVersions`.
   - Cache hits now validate freshness with one tiny manifest read when source versions exist; when the manifest has not been initialized yet, KB cache rows use the already-required latest-article modified timestamp as the source version. Older rows without any source version safely fall back to direct source document validation.

---

## Before / After Cost Impact

| Flow | Before | After |
| --- | --- | --- |
| Help Center home KB categories | `BrowseCategories` and `TrendingTopics` could both read the same categories doc on first mount | One shared in-flight fetch, then context cache |
| AI chat opening after Help Center | Could refetch categories and store the wrong cache shape | Reuses same `{ categories }` cache payload |
| Store ticket listener | Unbounded live snapshot for all non-deleted store tickets | Latest 100 non-deleted tickets |
| User chat history | Unbounded tenant/user query and no `sId` filter | Store-scoped latest 50 sessions |
| Feedback submit | 1 write + 1 follow-up read | 1 write only |
| ROI/analytics metrics | Up to 500 raw `chatSessions` reads per request, with caller-dependent windows | Daily aggregate reads + 1-90 day DAL clamp + bounded today live stats |
| Entity create guard | Reads up to max entity docs just to count | Firestore aggregate count |
| Pending entity candidates | Unbounded pending review query | Latest/highest-confidence 200 |
| Instant-cache miss | Entity index/latest release could be read for cache lookup, then read again for canonical fallback | Cache lookup data is reused by canonical retrieval |
| Fresh Firestore search cache hit | 1 cache query + up to N article reads, or 1 canonical answer read | 1 cache query + 1 tiny source-version check (manifest when present, latest-article version fallback for KB) |
| Fresh Redis canonical cache hit | 1 Redis read + 1 canonical answer read | 1 Redis read + 1 tiny canonical source-version manifest read |

---

## Remaining Non-Blocking Cost Risks

| Risk | Why It Remains | Mitigation |
| --- | --- | --- |
| Ticket documents keep messages inline | Existing support-ticket contract uses one document per ticket. Splitting messages would be a schema change. | Existing message hard cap remains. Revisit only with a migration plan. |
| Old cache rows without `sourceVersions` still validate source docs | Pre-change cache rows cannot prove freshness from the manifest or latest-article source version. | Safe fallback remains; rows naturally age out or are replaced by new source-version-backed cache entries. |
| Public API key validation reads `stores` on each request | Security-sensitive auth path. In-memory caching could delay revocation. | Keep current fail-closed behavior unless revocation-aware cache is designed. |
| Governance tabs can still refetch on tab navigation when enabled | Feature is off by default; active governance users need fresh review state. | Future improvement: governance-level data provider with explicit refresh. |
| Today live analytics capped at 500 sessions | Prevents runaway dashboard reads but can undercount extreme same-day volume until nightly aggregate catches up. | Use nightly/manual aggregation for exact high-volume reporting. |

---

## Verification

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false` | PASS |
| `npm --prefix functions-canonica run build` | PASS |
| `git diff --check` | PASS |
| `npm run build` | PASS; existing non-fatal i18n dynamic `cookies` warnings still appear during static generation |
| Local route smoke | PASS: `/help-center`, `/canonica`, `/canonica/docs`, `/canonica/support`, `/canonica/release-notes`, `/canonica/dashboard`, `/api/version` returned 200 |
| Local authenticated Chrome smoke | PASS: Help Center rendered with live tickets/changelog/KB cards; QnA search POST returned 200 and produced a grounded no-answer response |
| Redis fallback smoke | PASS: local Upstash DNS failure degraded safely; `/api/helpCenter/search-kb` continued and returned 200 |
| Safe unauthenticated API guard smoke | PASS: `/api/helpCenter/search-kb` returned 401, `/api/canonica/public/v1/answers` rejected unsupported GET with 405, `/api/widget/search` returned widget-disabled 404 |
| Scope review | No schema-breaking changes |
| Realtime review | Realtime kept only for ticket flows that need live updates |
| Tenant scope review | Added `sId` guard to user chat history and KB delete helper queries |

---

## Final Cost Verdict

**Firebase Cost Optimized with Minor Remaining Risks**
