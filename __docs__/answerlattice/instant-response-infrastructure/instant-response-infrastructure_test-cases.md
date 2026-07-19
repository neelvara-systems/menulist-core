# Instant Response Infrastructure Test Cases

| Case | Expected result |
| --- | --- |
| Missing Upstash configuration | Cache returns miss; live retrieval continues. |
| Raw plan/role/state values contain delimiters or sensitive labels | Redis key contains only hashes for those segments. |
| Wrong entity or answer version in Redis payload | Payload is rejected and deleted best effort. |
| Invalid procedure or private citation URL | Payload is rejected or projected to the public-safe citation contract. |
| UTF-8 payload exceeds 10 KiB | Write/read normalization refuses the cache row. |
| Canonical answer becomes inactive, drifted, or review-required | Cache hit is rejected. |
| Canonical source version changes | Old cache entry is rejected before delivery. |
| Non-canonical history row has zero references | Cache row is not reused. |
| Firestore history `expiresAt` is missing, malformed, or past | Cache row is not reused. |
| Redis timeout or provider error | User request continues through live retrieval with bounded diagnostics. |

Focused proof is included in `npm run test:answerlattice-context-bundle-version-boundary` and the Answerlattice runtime truth verifier. Configured Redis read/write and real latency/cost evidence remain external.
