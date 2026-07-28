# Hosted Help Center Implementation

**Status:** Current implementation truth  
**Last verified:** July 18, 2026

## Connected files

### Domain and configuration contracts

- `src/constants/answerlattice/hostedHelp.ts`
- `src/lib/answerlattice/hostedHelpConfig.ts`
- `src/lib/answerlattice/hostedHelpRequest.ts`
- `src/lib/routing/customDomainClaims.ts`

### Owner management

- `src/app/api/answerlattice/hosted-help-settings/route.ts`
- `src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx`
- `src/app/api/domain/route.ts`

### Public runtime

- `src/middleware.ts`
- `src/lib/answerlattice/hostedHelpServer.ts`
- `src/lib/answerlattice/publicContentCache.ts`
- `src/app/answerlattice-hosted-help/[[...segments]]/page.tsx`
- `src/app/answerlattice-hosted-help/sitemap.xml/route.ts`
- `src/app/answerlattice-hosted-help/robots.txt/route.ts`
- `src/components/templates/answerlattice/hostedHelp/HostedHelpClient.tsx`

### Verification

- `scripts/verification/test-answerlattice-hosted-help-contracts.ts`
- `scripts/verification/verify-answerlattice-hosted-help.js`
- `scripts/verification/verify-custom-domain-boundary.js`
- `scripts/verification/verify-answerlattice-runtime-truth.js`

## Settings load

Authenticated users require `MANAGE_WIDGET`. The route resolves session-owned Answerlattice scope, applies the shared dashboard read limiter, reads the exact workspace, normalizes `hostedHelpConfig`, and projects up to five domain registry statuses. A registry status is accepted only when `pId`, `tId`, and `sId` match the active scope.

Manual DNS refresh performs a complete ownership preflight before any provider call. Missing or foreign registry data returns a no-store ownership-review conflict. Accepted provider data passes through `normalizeHostedHelpDomainVerification()` before storage or browser response.

## Settings save

The save path validates a bounded request and normalized config, then:

1. verifies the exact workspace tenant;
2. rejects enabled state without a domain;
3. rejects domains middleware cannot route;
4. rejects reserved product-service domains;
5. reads existing configured registries and rejects foreign assignment;
6. provisions only domains without a matching registry;
7. writes workspace config and owned registry changes in one Firestore batch;
8. removes old provider domains best effort after the authoritative batch;
9. revalidates direct domain registry caches.

Vercel `409` is not ownership evidence. It returns a fixed ownership-review conflict instead of writing a new registry over an unproven provider assignment.

## Public request flow

```text
request Host
-> middleware support-label admission
-> middleware-owned rewrite metadata
-> Host-authoritative registry resolution
-> per-domain/IP rate limit
-> strict route resolution
-> cached published-content projection
-> compact public DTO
-> dynamic HTML response
```

Caller-supplied hosted-help routing headers are deleted before rewrite. The local query override is admitted only when middleware marks a localhost development rewrite.

## Public route behavior

Unknown, disabled, malformed, and unlisted article routes return 404. Article detail requires matching metadata in active published navigation before the article document is loaded. This prevents an unlisted article document from becoming public through a guessed URL.

The article path builder is shared by page links, metadata, and sitemap generation. It decodes safely, rejects traversal/control/query/hash input, caps length, and then URL-encodes the normalized slug.

## Cache behavior

- Domain registry and public-content data use existing 60-second scoped caches.
- Full HTML is `force-dynamic` and the hosted middleware branch does not set a shared CDN cache header.
- KB, FAQ, and changelog writes use their existing tenant/store invalidation tags.
- Hosted settings invalidate only direct domain registry tags; the removed scope tag never backed a cache.

## Public projection

The browser receives display configuration, navigation labels, article safe HTML, FAQ text, and bounded changelog text/date fields. Tenant IDs, workspace IDs, raw provider responses, Firestore objects, embeddings, author/job IDs, tickets, conversations, and internal notes remain server-side.

## Recovery behavior

- Rate-limit service unavailable: visible temporary-unavailability state, no content reads.
- Registry ownership mismatch: owner conflict requiring support review.
- Provider add/status failure: fixed owner message plus bounded diagnostics.
- Removed-domain provider cleanup failure: authoritative registry/config remain removed; retry is operational work.
- Direct production request to the internal route: redirect away from the implementation path.
### Concurrent provider compensation

Provider-side domain additions are compensated only when `answerlattice_publicHelpSites/{domain}` is proven absent. If another workspace wins the registry transaction, or registry existence cannot be read, compensation preserves the provider domain and emits a bounded diagnostic. This prevents the losing request from detaching the concurrent winner's committed domain.
