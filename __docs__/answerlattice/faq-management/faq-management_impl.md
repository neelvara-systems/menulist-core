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

Answerlattice FAQ article reference ID boundary: `src/lib/answerlattice/faqRetrieval.ts` normalizes linked `faq.articleId` values through the KB article ID boundary before returning a related article reference or reading the full article document. Malformed linked article IDs are skipped before Firestore refs are built.

Answerlattice App FAQ ID Boundary: `src/lib/answerlattice/faqContent.ts` validates optional saved/generated FAQ IDs, linked article IDs, generated-from article IDs, and canonical answer links before durable FAQ save payloads are composed. `src/database/answerlattice/faqs.ts` rechecks FAQ IDs and KB article IDs before FAQ document refs, linked article mirror refs, article-scoped FAQ queries, archive action refs, feedback transactions, and FAQ cache-version source IDs. Malformed FAQ or article IDs fail or return zero maintenance updates before Firestore document access.

The shared `functions/src/logic/publishApprovedJob.ts` mirrors the FAQ publishing behavior for shared/local function use.

## Owner UI

`/answerlattice/faqs` uses `AnswerlatticeFaqManagement`.

Tabs:

- Answer: question, answer, status, source, display order.
- Connections: article, product surfaces, entities, tags.
- Review: likes, dislikes, last reviewed.

Saving a FAQ validates the stored FAQ scope and every previous/next linked article, then updates the FAQ and existing article `faqIds` mirrors in one transaction. Missing or cross-workspace article links fail; the DAL never creates a skeletal article from a FAQ mirror update. The owner screen updates locally only after the acknowledged transaction.

FAQ save/archive now return explicit acknowledgement envelopes from `src/database/answerlattice/faqs.ts`. `AnswerlatticeFaqManagement` must call `assertAnswerlatticeFaqWriteSucceeded()` or `assertAnswerlatticeFaqArchiveSucceeded()` before updating local FAQ state, rebuilding product-surface summaries, or showing success copy. This prevents `apiCallComposer` fallback results from being treated as completed owner-reviewed answer changes.

Publishing or republishing a FAQ updates `lastReviewedOn` and clears `reviewRequestedOn`. If a linked article changes, the FAQ moves to `needs_review` and records `reviewRequestedOn` without rewriting `lastReviewedOn`; the review timestamp remains the last actual owner validation.

Article edit modal now has an explicit `Refresh FAQ suggestions` action. It reads the saved article, generates up to 5 source-backed FAQ suggestions, skips duplicate questions already linked to that article, writes new FAQs as `needs_review`, and mirrors their IDs onto the article. It does not publish or replace owner-reviewed FAQs automatically.

The article modal validates the FAQ refresh response through a 64 KB bounded response reader before adding generated FAQ options, linking generated FAQ IDs, or showing FAQ refresh success/info copy. Malformed, oversized, rejected, or wrong-shape responses log fixed `answerlattice_article_modal_response_*` diagnostics and keep `Failed to refresh FAQ suggestions.` as the owner-facing failure copy.

The FAQ refresh API resolves Answerlattice scope, checks safe mode, and applies the route-specific generation limit before permission, body parsing, article/FAQ reads, or provider calls. Completion breadcrumbs, unexpected route failures, and operation-log failures use fixed-code bounded diagnostics.

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

## Contextual UI

Product Surface summary rebuild now includes matched FAQs. Widget and Help Chat can display FAQ suggestions without doing per-request FAQ collection reads.
