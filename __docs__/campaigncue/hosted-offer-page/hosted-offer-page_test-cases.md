# Hosted Offer Page And QR - Test Cases

- Valid current pack builds a bounded public record.
- Blocked trust, missing inputs, non-ready commercial gate, stale hash, expired pack, and pending/rejected approval fail closed.
- Agency workspace requires approved state.
- Unknown, external-script, credential-bearing, non-HTTPS, and oversized destinations are rejected.
- Public parser rejects wrong schema, slug mismatch, internal-state mismatch, unknown fields, oversized text, invalid dates, and expired records.
- Publish replay reuses the same slug and does not create a second public record.
- Public page is `noindex` and renders no private IDs or raw source facts.
- Public route uses bounded cache and creates no visitor write.
- QR generation remains browser-local.
- Firestore rules deny direct client reads and writes.
