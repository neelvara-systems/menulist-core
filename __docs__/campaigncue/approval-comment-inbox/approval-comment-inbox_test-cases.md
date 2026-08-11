# Approval and Comment Inbox - Test Cases

1. First request starts revision one with an empty thread.
2. Re-request after rejection increments revision and clears the current thread.
3. Empty or whitespace comment is rejected.
4. Comment text is preserved when resolved.
5. Open comment blocks approval.
6. Rejection still requires a decision note.
7. Comment after resolution/decision is rejected.
8. Twenty-first comment is rejected.
9. Unknown comment id cannot be resolved.
10. Unknown output id and mismatched location id fail in the server transaction.
11. Billing-only role cannot comment; unauthorized role cannot resolve.
12. Retry with same idempotency key cannot duplicate a comment.
13. Event contains digest/length but no raw comment.
14. Overview loader adds no approval query.
15. Legacy campaign without inbox remains readable.

Focused command: `npm run test:campaigncue-approval-comment-inbox`.
