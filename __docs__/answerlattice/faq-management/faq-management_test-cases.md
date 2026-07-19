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
8. Change or delete the article while a generation response is pending; confirm the transaction returns conflict and creates no FAQ or article shell.
9. Fill the remaining FAQ capacity from another request; confirm the final transaction rechecks capacity and duplicates.

## Provenance And Article Authority

1. Create a manual FAQ and confirm `source: manual` is assigned automatically.
2. Confirm the editor cannot change source, generation job IDs, intake lineage, canonical linkage, counters, or feedback operation state.
3. Link a draft or inactive article and attempt to publish; confirm the save fails.
4. Publish the article, save again, and confirm `articleTitle` is derived from the current article.
5. Attempt a direct browser create with forged source/lineage/counters and confirm both dedicated and shared Firestore rules deny it.

## Feedback And Review

1. React to a published FAQ and confirm the FAQ counter and `faq_feedback` audit row change in one server transaction.
2. Replay the same request and confirm counters/signals do not duplicate.
3. React to a draft FAQ and confirm the server returns not found.
4. Open the owner Review tab and confirm the newest bounded reaction details load for the selected FAQ.
5. Confirm direct browser writes to FAQ counters and `faq_feedback` fail.
6. Expire article, changelog, and FAQ feedback rows; confirm the existing nightly retention path removes all three.

## Retrieval Freshness

1. Put a published FAQ in a product-surface summary, then archive or materially edit the FAQ without rebuilding the summary.
2. Confirm the related-summary candidate is re-read and rescored before answering.
3. Remove or unpublish the linked article and confirm the FAQ answer exposes no phantom article citation.

## Cost Checks

- No realtime listener is used.
- Public FAQ tab is capped at 80 docs.
- Owner management is capped at 150 docs.
- Widget related FAQ output starts from product-surface summary; only a matching candidate adds one exact FAQ verification read.
- Article FAQ refresh performs an initial article read and cap query, one AI call only when clicked, then one transactional article re-read and linked-FAQ re-query before candidate creates and the article mirror update.
- FAQ feedback uses one published-FAQ read plus one audit-doc read inside the server transaction; no realtime listener is added.

## Public DTO Boundary

1. Project a published same-workspace FAQ containing actor, trace, source-context, and unknown persisted fields; confirm the browser DTO contains only the seven documented public fields.
2. Confirm a cross-store, draft, malformed-ID, string-counter, missing-field, unknown-field, or over-80 response fails the applicable server/browser boundary.
3. Run `npm run verify:answerlattice-faq-boundary`.
