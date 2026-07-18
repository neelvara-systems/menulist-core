# FAQ Management Firebase Notes

## Collections

`answerlattice_faqs`

Tenant-scoped fields:

- `pId`
- `tId`
- `sId`

## Reads

Owner FAQ screen:

- Bounded FAQ query, ordered by `sortOrder asc, modifiedOn desc`, limit 150.
- Bounded product surfaces query.
- One KB categories doc read for article options.
- Entity list read only when tenant/store scope is available.
- FAQ save/archive updates local UI state instead of refetching all owner-screen dependencies, but only after the FAQ DAL returns an explicit acknowledgement envelope.

Article FAQ refresh:

- Article modal linked-FAQ display uses the article-specific capped query instead of loading the full FAQ directory.
- One authenticated article doc read.
- One bounded linked-FAQ query by `tId + sId + articleId + active`, limit 25.
- No realtime listener.

Public FAQ tab:

- Browser calls `/api/answerlattice/public-content?type=faqs`.
- Server route reads published FAQs through `unstable_cache` with tenant/store cache tags.
- Cache miss performs the published FAQ query, ordered by `sortOrder asc, modifiedOn desc`, limit 80.
- Every Admin result rechecks tenant/store/publication and projects the exact seven-field public FAQ DTO; the browser independently validates required/unknown fields and the 80-row cap before state changes.
- FAQ save/archive and article-driven FAQ status changes invalidate `answerlattice-public-faqs-{tId}-{sId}` and shared Answerlattice public tags.
- No realtime listener.

Product Surface summary rebuild:

- Published FAQ query, ordered by `sortOrder asc, modifiedOn desc`, limit 500.
- Runs on explicit rebuild/save/publish flows, not every widget search.

Widget/search runtime:

- Uses compact `platformSummary/contextContent_{tId}_{sId}`.
- Related compact FAQ candidates and any capped FAQ collection fallback are normalized through the same exact product/workspace/published DTO before scoring.
- Runtime scope and source version are admitted before cache-key/query construction; numeric strings, fractions, unsafe values and malformed stored rows do not enter the cache.
- A fallback FAQ collection miss can read at most 80 ordered published/active rows; the 60-second in-memory cache is partitioned by exact tenant, store and admitted source version.

## Writes

FAQ save:

- One FAQ doc set.
- Optional article mirror update using `arrayUnion` or `arrayRemove`.
- Three compact freshness writes in the same transaction: KB cache version, compiled `kb` source version, and bundle-stale manifest.
- One Answerlattice public cache tag revalidation for FAQ/KB/context output.
- Product surface summary rebuild only when the FAQ was or becomes published.
- Returns `{ success: true, operation: "create" | "update", id }` after the atomic content/freshness transaction and public cache revalidation. The UI must reject fallback/malformed results before local state or success copy advances.

FAQ archive:

- One FAQ doc update.
- Optional article mirror removal.
- Three compact freshness writes in the same transaction: KB cache version, compiled `kb` source version, and bundle-stale manifest.
- One Answerlattice public cache tag revalidation for FAQ/KB/context output.
- Product surface summary rebuild only when the archived FAQ was published.
- Returns `{ success: true, operation: "archive", id, status: "archived", active: false }` after the atomic content/freshness transaction and public cache revalidation. The UI must reject fallback/malformed results before local archive state or success copy advances.

Import publish:

- Creates/updates generated FAQ docs in the same publish transaction.
- Clears transient `generatedFaqs` from article docs.

Article FAQ refresh:

- Owner-triggered only from the article modal.
- Safe mode and the workspace FAQ-generation rate limit run before permission, request-body parsing, linked-FAQ reads, or provider work.
- One bounded AI generation call, capped at 5 FAQ suggestions.
- One batch write for new `needs_review` FAQ docs plus one article `faqIds` mirror update.
- Duplicate questions already linked to the article are skipped before writes.
- No product-surface summary rebuild and no public cache invalidation until the owner reviews/publishes the FAQ.
- Browser response validation is cost-neutral: the article modal only rejects malformed, oversized, rejected, or wrong-shape FAQ refresh responses before local FAQ options, linked IDs, or success/info copy advance.

## Indexes

Answerlattice FAQ indexes exist in both shared and Answerlattice-specific index files for:

- `tId + sId + status + active + sortOrder + modifiedOn`
- `tId + sId + sortOrder + modifiedOn`
- `tId + sId + status + sortOrder + modifiedOn`
- `tId + sId + articleId + active`

## Cost Position

FAQs reduce repeated support friction without adding realtime listeners. Contextual widget output stays summary-backed to avoid one FAQ read per customer search.

The public FAQ route now follows the MenuList public menu cache pattern: Vercel/Next data cache with tenant/store tags and explicit revalidation after owner writes. A repeat FAQ tab visit within the cache window does not repeat the Firestore FAQ query; stale content is cleared immediately on FAQ, KB, and context-affecting owner edits.

The public FAQ and product-surface summary reads sort in Firestore before applying the cap. This keeps the returned set correct when a workspace has more FAQs than the page/query limit, without increasing the number of documents read.

FAQ regeneration is not automatic on every article save. Article saves mark linked FAQs as `needs_review`; owners run `Refresh FAQ suggestions` only when they want new draft suggestions. This avoids repeated AI calls during normal editing and protects owner-reviewed FAQ content from automatic replacement.

FAQ generation completion breadcrumbs, route failures, and best-effort AI-operation log failures use fixed-code bounded diagnostics with tenant/store/article presence and length metadata only. This adds no Firestore reads/writes and does not change the owner-triggered generation cost shape.

FAQ generation uses the app-side Answerlattice Gemini gateway and the `ANSWERLATTICE_GEMINI_AI_KEY*` pool only. It does not import the default MenuList Gemini client or fall back to `GEMINI_AI_KEY*`; missing Answerlattice provider configuration fails before provider work and FAQ writes.

FAQ/article consistency hardening intentionally adds transaction reads. FAQ save/archive reads the stored FAQ and linked article documents, proves exact `AL` tenant/store ownership, and changes the FAQ plus existing `faqIds` mirrors atomically. Article title/content update or delete reads the bounded linked FAQ set (maximum 25), rechecks those rows and the article in one transaction, and moves active FAQs to `needs_review` or `archived` with the article mutation. This prevents acknowledged stale public FAQs and prevents missing article links from creating skeletal `kb_articles` documents.

Cache/source invalidation is part of those same transactions. The three existing compact invalidation writes are not additional writes; they previously ran in a separate request before or after content persistence. Atomic grouping removes both the old-content/new-version race and the committed-content/missing-invalidation failure window without adding collections, indexes, listeners, or reads.

FAQ-from-article route scope hardening is cost-neutral. The protected FAQ generation route now compares persisted article scope to the authenticated Answerlattice route scope only after both pass the shared exact positive numeric Firestore document-ID scope helper. Valid FAQ suggestion generation keeps the same one article read, existing linked-FAQ cap query, provider call, batch write shape, AI accounting, and cache behavior; malformed article scope returns the existing not-found response before provider work.

FAQ public projection hardening is also cost-neutral. It adds no reads or writes: `src/lib/answerlattice/faqContent.ts` validates and allowlists the already-read row, and `publicContentClient.ts` validates the already-returned JSON. Rejected-row diagnostics contain bounded scope metadata and a count, not FAQ content or actor identifiers.

FAQ retrieval admission is cost-neutral for valid traffic. It rechecks the already-returned documents before the existing cache/scoring work and fails malformed runtime scope before Firestore. It does not add queries, writes, listeners, indexes, or provider calls; rejected stored rows reduce the candidate set and require authorized data reconciliation.
