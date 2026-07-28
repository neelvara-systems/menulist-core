# Multi-Language Articles Firebase Contract

## Storage

Drafts use the existing `kb_articles/{articleId}.translations.{locale}` map. No collection, index, Storage object, Cloud Function, listener, or scheduler is added.

## One Draft Attempt

| Operation | Reads | Writes | External |
|---|---:|---:|---|
| Safe-mode check | 0 when cost protection is off / 1 existing ops-config read when on | 0 | 0 |
| Initial exact `AL` article/workspace/source read | 1 | 0 | 0 |
| Fail-closed rate admission | 0 | 0 | Upstash when enabled |
| Gemini translation | 0 | 0 | 1 model call |
| Post-provider transaction re-read | 1 | 0 | 0 |
| Successful locale draft field update | 0 | 1 | 0 |
| Awaited, failure-contained AI operation accounting | 0 | up to 1 existing accounting row | 0 |
| Owner UI refresh after success | 1 | 0 | 0 |

No KB cache/context version write occurs for a private draft.

## Governance Tab Load

The tab reads the cached scoped category index, extracts at most 500 unique article IDs, and fetches article documents through the existing 30-ID chunk helper. It creates no realtime listener.

## Security

The route requires exact Answerlattice product identity, session workspace scope, and `MANAGE_KNOWLEDGE`, then repeats product/workspace checks in the post-provider transaction. Direct customer delivery is absent. Existing Firestore article rules remain unchanged; no Firebase deployment is required by the Feature 38 hardening.

## Retention

Drafts inherit article-document retention. No automatic draft expiry or deletion exists. That retention choice must be revisited before enabling the feature for customers.
