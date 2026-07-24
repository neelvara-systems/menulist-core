# Instant Response Infrastructure Implementation

## Runtime flow

`searchCore` resolves product context and entity candidates, loads the current canonical cache-version summary, and attempts `instantCacheLookup`. A valid hit returns the same governed public answer fields used by canonical retrieval. A miss or failure continues through live canonical retrieval and then the existing fallback layers.

`instantCacheWrite` accepts only an active `AnswerlatticeCanonicalAnswer` with no drift flag and no required review. It requires a valid canonical ID, resolved top entity, positive `lastValidatedInVersion`, exact matched-entity normalization, evaluated confidence, public-safe citations, and a valid procedure when the answer type is `procedure`.

## Key and payload boundary

The `canon:v5` key keeps numeric tenant/workspace scope visible for operations but hashes normalized query, complete retrieval context, entity, plan, role, and state segments with SHA-256-derived base64url values. This prevents raw request/applicability values from appearing in Redis keys, avoids delimiter collisions, and prevents distinct questions or product surfaces from sharing an answer entry. `searchCore.ts` bypasses the fast path while Knowledge Graph exploitation is enabled because graph state does not yet provide an authoritative cache-version dimension.

`normalizeCachedCanonicalAnswer` treats Redis as untrusted input. It revalidates:

- canonical and entity IDs;
- expected top entity and answer version;
- timestamp bounds;
- answer text, type, and confidence;
- matched entity uniqueness and membership;
- guided procedure schema;
- known source-version keys and positive versions;
- public citation projection;
- final normalized UTF-8 byte size.

Invalid payload cleanup and stale payload cleanup are best effort and emit fixed bounded diagnostics if deletion fails.

## Freshness

Answerlattice cache freshness ID boundary: cached canonical IDs use the governance ID normalizer and KB references use the KB article ID normalizer before any Firestore document ref is built.

Canonical hits verify compact source versions when available. The fallback read checks exact `AL` scope, active status, drift/review state, modification time, and validation version. Non-canonical `rag-v4` history entries also yield when canonical source truth changes, require at least one valid KB reference, and reject expired persisted rows.

## Failure behavior

- Missing Upstash env: cache module remains a no-op.
- Redis timeout or error: bounded diagnostic, then normal retrieval.
- Invalid Redis payload: reject, attempt deletion, then normal retrieval.
- Stale answer: reject, attempt deletion, then normal retrieval.
- Oversized write: skip cache write.

Cache availability does not change answer authority, analytics persistence, clarification, abstention, escalation, or public citation rules.
