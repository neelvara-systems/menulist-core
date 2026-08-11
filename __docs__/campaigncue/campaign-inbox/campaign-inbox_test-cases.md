# Campaign Inbox - Test Cases

## Parser

1. Parses explicit offer, price, end-date, and availability lines in order.
2. Supports ASCII and full-width colon separators.
3. Matches labels case-insensitively.
4. Preserves non-English/unrecognized prose as one note candidate.
5. Does not infer a price, date, phone number, or URL from free prose.
6. Deduplicates exact normalized candidate content.
7. Rejects empty and whitespace-only input.
8. Rejects input over 4,000 characters without silent truncation.
9. Bounds candidates at eight and returns an owner-visible warning.
10. Bounds candidate values at 1,200 characters.
11. Routes phone, WhatsApp, website, menu URL, booking URL, and location to Business Details.
12. Maps photo/asset notes to `upload_metadata` with review required.

## API And Validation

1. Existing single-source POST remains accepted.
2. `confirm_inbox` requires 1-8 strict candidates.
3. Unknown fields and source types are rejected.
4. Duplicate candidate IDs are rejected.
5. Invalid idempotency keys are rejected.
6. Pattern Cue input is rejected from Inbox batches.
7. Menu/booking link candidates require an HTTP(S) URL if admitted in the API contract.
8. Customer-contact-list payloads remain blocked.
9. Unauthenticated and cross-workspace requests remain blocked.

## Persistence And Idempotency

1. One batch creates exactly `N` source inputs, one snapshot update, one event, and one idempotency completion.
2. Retry with the same key and payload returns the same source IDs.
3. Same key with different payload conflicts.
4. Concurrent duplicate confirmation cannot create two logical batches.
5. A failed transaction leaves no partial source batch.
6. Newly confirmed active facts are present in the returned source snapshot.
7. Needs-review facts remain `risk=needs_review` and cannot become decision-ready.
8. Snapshot facts never exceed 200 and source refs never exceed 120.

## UI

1. Review does not call Firebase or a provider.
2. Save is disabled when no source candidate is selected.
3. Business-detail routing pre-fills the matching existing field without saving it.
4. Successful confirmation merges all returned inputs and the returned source hash/facts locally.
5. Failed confirmation preserves the review state.
6. A successful save clears the Inbox draft and review state.
7. The existing detailed single-source form still works.
8. Narrow viewport controls remain readable and at least 44px high.
