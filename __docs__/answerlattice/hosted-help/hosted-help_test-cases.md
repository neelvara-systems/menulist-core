# Hosted Help Center Test Cases

**Status:** Maintained verification matrix  
**Last verified:** July 18, 2026

| Area | Case | Expected result |
| --- | --- | --- |
| Domain admission | Supported `help`, `docs`, `support`, `kb`, `knowledge`, or `answers` hostname | Accepted after normalization |
| Domain admission | Unsupported first label, malformed host, product root, or product-service subdomain | Rejected before provider calls |
| Cross-product domain reservation | MenuList attempts to claim a support-style Answerlattice hostname | Availability is false and add is rejected |
| Ownership | Existing registry matches `AL`, tenant, workspace, and config domain | Status can be projected and domain can be reused |
| Ownership | Existing registry belongs to another tenant/workspace/product | Save and refresh fail closed |
| Provider conflict | Vercel add returns `409` without matching registry | Ownership-review conflict; no new registry assignment |
| DNS projection | Provider response contains extra or oversized fields | Only bounded allowlisted verification records persist/return |
| Host authority | Public request supplies query-domain override | Original validated Host remains authoritative |
| Development | Middleware-marked localhost route supplies domain override | Registered test domain can be resolved |
| Route admission | Unknown path or extra segments | 404 |
| Route admission | FAQ/changelog path while disabled | 404 |
| Article admission | Malformed percent input, traversal, query/hash/backslash, or oversized slug | 404 without public 500 |
| Article publication | Document exists but is not in active published navigation | 404 |
| Navigation projection | One inactive section article exists | It is omitted without dropping valid categories |
| Metadata | Published article opens | Article-specific title and explicit canonical URL |
| Sitemap | Duplicate/raw article paths exist | Shared encoded path helper and deduplication produce one URL |
| Rate-limit cache isolation | One domain/IP is denied or limiter is unavailable | Full HTML is not shared-CDN cached; other visitors do not inherit that response |
| Temporary dependency failure | Public rate-limit provider is unavailable | Visible unavailable state and no KB/FAQ/changelog reads |
| Public payload | Published page hydrates | No tenant/workspace IDs, provider objects, tickets, embeddings, or Firestore values |
| Robots | Site disabled or `noIndex` enabled | `Disallow: /` |
| Removal | Owned domain removed | Registry deletion commits; provider cleanup is best effort |

## Local gates

```text
npm run verify:answerlattice-hosted-help
node scripts/verification/verify-custom-domain-boundary.js
npx tsc --noEmit --pretty false
npm run verify:answerlattice-runtime-truth
npm run verify:dependency-freeze
git diff --check
```

## External evidence still required

- authenticated QA settings load/save/refresh;
- actual Vercel domain add, conflict, config, and removal behavior;
- DNS propagation and HTTPS certificate readiness;
- real custom-domain browser tests for home/docs/article/FAQ/changelog/robots/sitemap;
- iOS/Android and accessibility review;
- real customer search and resolution outcomes.
