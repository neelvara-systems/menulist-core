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
