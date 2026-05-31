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
- FAQ save/archive updates local UI state instead of refetching all owner-screen dependencies.

Article FAQ refresh:

- Article modal linked-FAQ display uses the article-specific capped query instead of loading the full FAQ directory.
- One authenticated article doc read.
- One bounded linked-FAQ query by `tId + sId + articleId + active`, limit 25.
- No realtime listener.

Public FAQ tab:

- Browser calls `/api/answerlattice/public-content?type=faqs`.
- Server route reads published FAQs through `unstable_cache` with tenant/store cache tags.
- Cache miss performs the published FAQ query, ordered by `sortOrder asc, modifiedOn desc`, limit 80.
- FAQ save/archive and article-driven FAQ status changes invalidate `answerlattice-public-faqs-{tId}-{sId}` and shared Answerlattice public tags.
- No realtime listener.

Product Surface summary rebuild:

- Published FAQ query, ordered by `sortOrder asc, modifiedOn desc`, limit 500.
- Runs on explicit rebuild/save/publish flows, not every widget search.

Widget/search runtime:

- Uses compact `platformSummary/contextContent_{tId}_{sId}`.
- No FAQ collection scan per search.

## Writes

FAQ save:

- One FAQ doc set.
- Optional article mirror update using `arrayUnion` or `arrayRemove`.
- One KB cache version bump.
- One Answerlattice public cache tag revalidation for FAQ/KB/context output.
- Product surface summary rebuild only when the FAQ was or becomes published.

FAQ archive:

- One FAQ doc update.
- Optional article mirror removal.
- One KB cache version bump.
- One Answerlattice public cache tag revalidation for FAQ/KB/context output.
- Product surface summary rebuild only when the archived FAQ was published.

Import publish:

- Creates/updates generated FAQ docs in the same publish transaction.
- Clears transient `generatedFaqs` from article docs.

Article FAQ refresh:

- Owner-triggered only from the article modal.
- One bounded AI generation call, capped at 5 FAQ suggestions.
- One batch write for new `needs_review` FAQ docs plus one article `faqIds` mirror update.
- Duplicate questions already linked to the article are skipped before writes.
- No product-surface summary rebuild and no public cache invalidation until the owner reviews/publishes the FAQ.

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
