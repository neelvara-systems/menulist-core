# FAQ Management Implementation

## Import Pipeline

`functions/src/prompt.ts` allows each generated article to include up to 5 source-backed FAQs.

`functions/src/utils/index.ts` normalizes those into `generatedFaqs`.

`functions/src/logic/startGeneration.ts` stores `generatedFaqs` on the article review document.

During review, `ArticleModal` exposes a small FAQ editor only in the import review flow.

`ReviewModal` now persists article review edits before publishing so FAQ changes are not lost.

## Publish Pipeline

`functions-answerlattice/src/logic/publishApprovedJob.ts` reads article docs before writes, then:

- publishes approved articles,
- creates or updates `answerlattice_faqs` docs for reviewed `generatedFaqs`,
- sets `faqIds` on linked articles,
- removes transient `generatedFaqs` from published article docs,
- bumps the KB cache version.

When an existing KB article title/content changes, `src/database/knowledgeBase/articles.ts` reads the bounded active linked-FAQ set and the article's `faqIds` mirror, then rechecks product/workspace/article ownership and writes `needs_review` FAQ state in the same transaction as the article update. Article deletion performs the equivalent bounded recheck and archives linked FAQs in the same transaction as the article delete. A partial article/FAQ truth transition cannot be acknowledged.

FAQ save/archive and KB article create/update/delete/bulk-status also append the KB cache-version, compiled source-version, and bundle-stale writes to that same transaction. No cache entry can be stamped with a new source version before old content changes, and no acknowledged content mutation can omit its durable invalidation markers.

Answerlattice FAQ article reference ID boundary: `src/lib/answerlattice/faqRetrieval.ts` normalizes linked `faq.articleId` values through the KB article ID boundary before reading the article document. A reference is returned only when the article still exists, belongs to the exact Answerlattice workspace, and is active/published. Malformed, missing, draft, inactive, or cross-scope article links produce no citation.

Answerlattice App FAQ ID Boundary: `src/lib/answerlattice/faqContent.ts` validates optional saved/generated FAQ IDs and linked article IDs before durable authoring payloads are composed. The strict authoring schema does not admit source, counters, canonical linkage, generation jobs, or intake lineage. `src/database/answerlattice/faqs.ts` rechecks FAQ and article IDs before FAQ refs, mirror refs, article-scoped queries, archive actions, and cache-version source IDs. The content-feedback DAL independently normalizes FAQ IDs before the authenticated server route.

The shared `functions/src/logic/publishApprovedJob.ts` mirrors the FAQ publishing behavior for shared/local function use.

## Owner UI

`/answerlattice/faqs` uses `AnswerlatticeFaqManagement`.

Tabs:

- Answer: question, answer, status, display order.
- Connections: article, product surfaces, entities, tags.
- Review: likes, dislikes, last reviewed, review requested, read-only origin, and the newest bounded reaction details.

Saving a FAQ validates the stored FAQ scope and every previous/next linked article, then updates the FAQ and existing article `faqIds` mirrors in one transaction. Missing or cross-workspace article links fail; linked publication also requires an active published article. `source` is preserved for existing records or assigned `manual` on create, `articleTitle` is derived from current article truth, and `active` is derived from status. The DAL never creates a skeletal article from a FAQ mirror update. The owner screen updates locally only after the acknowledged transaction.

Dedicated and shared Firestore rules mirror that boundary. Browser creates must be manual, zero-counter records without system lineage. Browser updates may change only authoring/review metadata, must preserve source and lineage, cannot mutate feedback counters/idempotency state, and must keep any linked article title/workspace/publication state consistent.

FAQ save/archive now return explicit acknowledgement envelopes from `src/database/answerlattice/faqs.ts`. `AnswerlatticeFaqManagement` must call `assertAnswerlatticeFaqWriteSucceeded()` or `assertAnswerlatticeFaqArchiveSucceeded()` before updating local FAQ state, rebuilding product-surface summaries, or showing success copy. This prevents `apiCallComposer` fallback results from being treated as completed owner-reviewed answer changes.

Publishing or republishing a FAQ updates `lastReviewedOn` and clears `reviewRequestedOn`. If a linked article changes, the FAQ moves to `needs_review` and records `reviewRequestedOn` without rewriting `lastReviewedOn`; the review timestamp remains the last actual owner validation.

Article edit modal now has an explicit `Refresh FAQ suggestions` action. It reads the saved article and current linked-FAQ cap before the provider call. After up to 5 source-backed suggestions return, a Firestore transaction re-reads the article, verifies a fingerprint of every field used by the prompt, re-queries current active links, recomputes duplicate/capacity admission, creates new `needs_review` FAQ documents, and updates the existing article mirror. A changed/deleted/moved article returns conflict; merge semantics cannot recreate a deleted article. It does not publish or replace owner-reviewed FAQs automatically.

The article modal validates the FAQ refresh response through a 64 KB bounded response reader before adding generated FAQ options, linking generated FAQ IDs, or showing FAQ refresh success/info copy. Malformed, oversized, rejected, or wrong-shape responses log fixed `answerlattice_article_modal_response_*` diagnostics and keep `Failed to refresh FAQ suggestions.` as the owner-facing failure copy.

The FAQ refresh API resolves Answerlattice scope, checks safe mode, and applies the route-specific generation limit before permission, body parsing, article/FAQ reads, or provider calls. Provider text above the 32 KiB character boundary is rejected before parsing; a truncated prefix is never accepted as complete output. The failure-contained AI-operation log write is awaited before success returns. Completion breadcrumbs, unexpected route failures, and operation-log failures use fixed-code bounded diagnostics.

Article save continues to do only low-cost automatic maintenance: content edits mark linked FAQs as `needs_review` and refresh the search embedding. FAQ generation stays owner-triggered so routine edits do not create surprise AI calls or overwrite reviewed answers.

The article modal uses a status strip plus separate `Article Details`, `Connections`, and `Article Content` sections. The layout keeps metadata and governance controls on the left, writing on the right, and stacks cleanly on mobile with a scrollable body and stable footer actions.

The article embedding refresh now uses the full saved article payload after edits. Content-only edits still pass title/category/section metadata to the embedding API, so article search data remains complete.

## Public UI

`Help Center > Read FAQ` loads published FAQs through `getPublishedFaqsForSession()` with a hard cap.

Public FAQ projection and the server-side search fallback both require exact `pId='AL'`, numeric tenant/store ownership, published/active state, a valid Firestore FAQ ID, bounded question/answer/article fields, exact enum values, and bounded deduplicated context/tag/entity lists before a row can reach cache or scoring. `attemptFaqAnswerRetrieval()` also rejects nonnumeric, fractional, unsafe, or otherwise malformed runtime scope/source-version values before cache-key construction or Firestore queries. Firestore result rows and product-surface related FAQ summaries pass the same retrieval normalizer; TypeScript types do not substitute for runtime admission.

Each FAQ can show:

- answer,
- tags,
- link to full article,
- helpful/not-helpful feedback.

FAQ reactions use the authenticated content-feedback route. One server transaction updates the published FAQ counter and bounded idempotency state, appends the `faq_feedback` audit row with 365-day retention, and emits one deterministic signal for a newly added dislike. Direct browser counter/audit writes are denied. The owner Review tab reads the scoped audit document and shows at most 20 recent normalized events.

## Contextual UI

Product Surface summary rebuild includes matched FAQs. Widget and Help Chat can start from that compact candidate set, but `attemptFaqAnswerRetrieval()` re-reads and rescores the exact current FAQ before answering. Stale archived/edited summary rows fall through to the normal published FAQ collection path.
