# Answerlattice Hosted Help Center - Firebase Cost Notes

> Status: Implemented and locally hardened July 19, 2026
> Cost priority: high
> Scope: anonymous hosted help pages only

## Collections

| Collection | Operation | Trigger | Cost control |
| --- | --- | --- | --- |
| `stores/{sId}` | 1 read | Settings screen load | Authenticated owner/admin only |
| `stores/{sId}` | 1 write | Hosted Help settings save | Explicit save only |
| `answerlattice_publicHelpSites/{domain}` | Up to 5 reads | Settings screen load | Only configured domains, exact workspace projection, capped by schema |
| `answerlattice_publicHelpSites/{domain}` | 1 write per domain | Settings save | Registry avoids public query scans |
| `answerlattice_publicHelpSites/{domain}` | Up to 5 ownership reads plus 1 write per domain | Manual DNS status refresh | Explicit owner action; ownership preflight completes before provider checks |
| `answerlattice_publicHelpSites/{domain}` | 1 cached doc read | Public hosted page request | `unstable_cache`, 60 second TTL |
| `kb_categories/categories_{tId}_{sId}` | Cached read | Hosted home/docs/sitemap | Reuses Answerlattice public content cache |
| `kb_articles/{articleId}` | Cached read | Article detail | Published/scope validated server-side |
| `answerlattice_faqs` | Cached limited query | FAQ/home | Published + active only, capped |
| `changelog/{tId}/{sId}` | Cached limited query | Changelog/home | Published entries only |

## Public Payload Shape

The public route resolves tenant/store scope server-side, but does not send that
scope to the browser. Hydrated payloads are compact DTOs:

- KB index: category/section/article title, URL, active flag, and order only.
- Article detail: title, category labels, URL, and `renderPublicTiptapHtml()` output only. The server renderer escapes text/attributes, allowlists link and image schemes, and emits a fixed tag set before the client renders `safeHtml`.
- FAQ: question and answer only.
- Changelog: title, version, release date, and public description only.
- Site config: domain plus display config only.

This keeps embeddings, job IDs, tenant IDs, author IDs, and Firestore Timestamp
instances out of anonymous client payloads.

## Why Registry Docs

Middleware cannot query Firestore at the edge. The hosted page can, but querying
`stores` by array domain on every anonymous request would be more expensive and
harder to control. A direct registry doc gives:

- 1 direct doc lookup by hostname
- no collection scan
- no composite index requirement
- easy cache invalidation by domain

## Domain Provisioning

Hosted Help uses the shared Vercel domain provisioning helper:

- `src/lib/domains/vercelDomains.ts`
- MenuList store custom domains keep using `/api/domain`.
- Answerlattice hosted-help domains use `/api/answerlattice/hosted-help-settings`.

New Answerlattice help domains are added to the Vercel project during save. A domain is considered already provisioned only when its registry document belongs to the exact Answerlattice tenant and workspace. A Vercel `409` response is not ownership evidence and stops the save for manual review. DNS status is not polled in the background; owners refresh status manually from the Hosted Help tab. This keeps Firestore writes and Vercel API calls explicit and avoids background cost.

The save path performs:

- one workspace read;
- up to five configured-domain registry reads;
- up to five removed-domain registry reads;
- one Vercel add and one Vercel config call for each new registry-unproven domain;
- one batched workspace write, one registry write per configured domain, and owned-registry deletion per removed domain;
- best-effort provider removal for removed domains after the Firestore batch commits.

The manual DNS refresh path first reads every configured registry document and requires exact `pId`, `tId`, and `sId` ownership. It makes one Vercel config call and one registry status write per domain only after the complete ownership preflight passes. Missing or foreign registry ownership returns a no-store `409` and performs no provider checks or status writes.

The shared Vercel helper URL-encodes dynamic project/domain path segments before add, status, or removal calls, uses manual redirect handling, aborts stuck provider requests with a timeout, and clears the abort timer after each request. July 5, 2026 Vercel domain provider response parse diagnostics: if the 64KB bounded provider response parser rejects, the helper logs `vercel_domain_provider_response_parse_failed` with method, path presence/length, query presence, response status, response OK state, max-byte cap, and source error type only before preserving the existing empty-object compatibility fallback. This does not add provider calls or Firestore operations; it only prevents malformed domain/config values from changing the fixed Vercel API path, keeps hosted-help domain saves from waiting indefinitely on the provider, and makes malformed provider responses visible without logging provider response text, tokens, full URLs, domains, tenant IDs, or store IDs.

Provider failure details are logged through fixed runtime diagnostic codes with bounded context only: tenant/store presence-length metadata, domain presence/length metadata, provider code/status, and provider-message presence and length. Browser responses and `domainProvisioningError` status fields use generic hosted-help messages, so failed Vercel add/config checks do not store, log, or return raw provider exception text.

The July 10 request-identity hardening adds no Firestore reads, writes, deletes, collections, indexes, Functions, provider calls, or cache entries. Middleware now removes caller-supplied hosted-help routing headers before its internal rewrite, and the anonymous renderer resolves the registry key from the validated original Host. The local `?domain=` override remains available only through the middleware-marked localhost development route. Malformed Host or article-percent input fails closed before any registry/content read.

The same pass replaces the hosted-help changelog's broad recursive hydration serializer with a public DTO: at most 2,000 characters from at most 500 TipTap-like nodes, plus a validated ISO release date. This changes no Firestore query or cache key and prevents unknown persisted fields or Firestore timestamp objects from crossing the server/client boundary.

The Widget Management browser caller also validates hosted-help settings load, save, and manual DNS-refresh responses through a 256 KB bounded JSON reader and route-shape guards before updating local hosted-help state. This is a browser-only acknowledgement layer; it adds no Firestore reads, writes, collections, listeners, background jobs, or Vercel provider calls.

Provider verification is projected through a bounded DTO before it is stored or returned. At most 20 verification/configuration records are retained, record fields are allowlisted and length-limited, and unknown provider fields are discarded.

Registry docs store only compact status fields:

- `domainStatus`
- `domainVerified`
- `domainVerifiedAt`
- `domainLastCheckedAt`
- `domainVerification`
- `domainProvisioningError`
- `domainVercelAddedAt`

## Bot and Abuse Controls

- Hosted page requests use `ANSWERLATTICE_HOSTED_HELP` rate limiting.
- Authenticated Hosted Help settings reads use the shared Answerlattice dashboard `DATA_READ` limiter before permission and store/registry reads.
- When rate limiting is enabled but the limiter provider returns the shared unavailable sentinel, hosted pages render a visible temporary-unavailability state without KB/FAQ/changelog content reads. Hosted Help settings saves and manual DNS refreshes return `503` with `Cache-Control: no-store`.
- Search is client-side over already-loaded published content; it does not call AI.
- Public pages do not expose tickets, chat history, feedback writes, or user/session data.
- `robots.txt` returns `Disallow: /` when the site is disabled or `noIndex` is enabled.

## Cache Invalidation

Content invalidation stays on existing tenant/store public cache tags:

- KB writes invalidate KB/context tags.
- FAQ writes invalidate FAQ/KB/context tags.
- Changelog writes invalidate changelog/context tags.

Hosted-help settings revalidate the direct registry cache for each old or new domain:

- `answerlattice-hosted-help-domain-{domain}`

There is no hosted-help scope cache tag. Published KB, FAQ, and changelog writes continue to invalidate their existing tenant/store content tags. The dynamic hosted page internally reuses 60-second registry/content data caches, but middleware does not attach a shared-public CDN cache header to the full HTML response because the rendered admission outcome is per domain/IP.

## Cost Verdict

The hosted public help surface is acceptable for bounded founder-led SaaS usage. It adds one cached domain registry read per help domain while reusing existing public-content cache paths for the heavier KB, FAQ, and changelog data. Domain mutation remains an explicit low-frequency owner action, and public search remains client-side over already-loaded content.

The July 18 ownership, routing, SEO, and cache-isolation hardening adds no collection, index, listener, Storage path, scheduled Function, or background provider poll. It tightens existing reads, writes, projections, and route admission. No Firebase infrastructure deployment is required for this pass.

The June 27 provider-error boundary adds no Firestore reads, writes, collections, background jobs, or Vercel calls. It only changes failure text and secure logging on existing save/status paths. The June 28 follow-up keeps hosted-help Vercel add failures to provider code/status plus message presence and length in secure logs. The June 30 hosted-help HTML verifier adds no runtime operations; it only pins the existing server sanitizer and client `safeHtml` render boundary in `npm run verify:answerlattice-runtime-truth`.
