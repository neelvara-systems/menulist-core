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

The shared `functions/src/logic/publishApprovedJob.ts` mirrors the FAQ publishing behavior for shared/local function use.

## Owner UI

`/answerlattice/faqs` uses `AnswerlatticeFaqManagement`.

Tabs:

- Answer: question, answer, status, source, display order.
- Connections: article, product surfaces, entities, tags.
- Review: likes, dislikes, last reviewed.

Saving a FAQ updates the FAQ doc, keeps the linked article `faqIds` mirror in sync, and updates the owner screen locally instead of refetching every screen dependency.

Publishing or republishing a FAQ updates `lastReviewedOn` and clears `reviewRequestedOn`. If a linked article changes, the FAQ moves to `needs_review` and records `reviewRequestedOn` without rewriting `lastReviewedOn`; the review timestamp remains the last actual owner validation.

Article edit modal now has an explicit `Refresh FAQ suggestions` action. It reads the saved article, generates up to 5 source-backed FAQ suggestions, skips duplicate questions already linked to that article, writes new FAQs as `needs_review`, and mirrors their IDs onto the article. It does not publish or replace owner-reviewed FAQs automatically.

Article save continues to do only low-cost automatic maintenance: content edits mark linked FAQs as `needs_review` and refresh the search embedding. FAQ generation stays owner-triggered so routine edits do not create surprise AI calls or overwrite reviewed answers.

The article modal uses a status strip plus separate `Article Details`, `Connections`, and `Article Content` sections. The layout keeps metadata and governance controls on the left, writing on the right, and stacks cleanly on mobile with a scrollable body and stable footer actions.

The article embedding refresh now uses the full saved article payload after edits. Content-only edits still pass title/category/section metadata to the embedding API, so article search data remains complete.

## Public UI

`Help Center > Read FAQ` loads published FAQs through `getPublishedFaqsForSession()` with a hard cap.

Each FAQ can show:

- answer,
- tags,
- link to full article,
- helpful/not-helpful feedback.

## Contextual UI

Product Surface summary rebuild now includes matched FAQs. Widget and Help Chat can display FAQ suggestions without doing per-request FAQ collection reads.
