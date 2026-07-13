# FAQ Management Test Cases

## Owner Happy Path

1. Open `/answerlattice/faqs`.
2. Create a FAQ.
3. Link it to an article.
4. Add a product surface key.
5. Publish.
6. Confirm the FAQ appears in Help Center `Read FAQ`.

## Import Review

1. Upload source content through KB Generation.
2. Confirm generated articles include optional FAQ suggestions.
3. Edit generated FAQs during review.
4. Approve and publish.
5. Confirm `answerlattice_faqs` docs are created and linked article has `faqIds`.

## Article Change

1. Edit a published article that has linked FAQs.
2. Confirm linked FAQs move to `needs_review`.
3. Republish or update the FAQ after checking the answer.

## Failure Acknowledgement

1. Simulate `saveFaq()` or `archiveFaq()` returning a malformed/fallback result.
2. Confirm `/answerlattice/faqs` shows fixed save/archive failure copy.
3. Confirm local FAQ state, selected FAQ state, product-surface summary rebuild, and success copy do not advance.

## Article FAQ Refresh

1. Open a saved article from Knowledge Base.
2. Change the title or content and click `Refresh FAQ suggestions` before saving.
3. Confirm the UI asks to save article changes first.
4. Save the article, then click `Refresh FAQ suggestions`.
5. Confirm new FAQs are created as `needs_review` and linked to the article.
6. Click refresh again and confirm duplicate questions are skipped.
7. Open `/answerlattice/faqs`, review one generated FAQ, publish it, and confirm it appears in Help Center `Read FAQ`.

## Cost Checks

- No realtime listener is used.
- Public FAQ tab is capped at 80 docs.
- Owner management is capped at 150 docs.
- Widget related FAQ output comes from product surface summary, not direct FAQ reads per search.
- Article FAQ refresh performs one article read, one bounded linked-FAQ query, one AI call only when clicked, and one batch write only for new suggestions.

## Public DTO Boundary

1. Project a published same-workspace FAQ containing actor, trace, source-context, and unknown persisted fields; confirm the browser DTO contains only the seven documented public fields.
2. Confirm a cross-store, draft, malformed-ID, string-counter, missing-field, unknown-field, or over-80 response fails the applicable server/browser boundary.
3. Run `npm run verify:answerlattice-faq-boundary`.
