# Answerlattice Hosted Help Center — Firebase Cost Notes

> Status: Implemented  
> Cost priority: high  
> Scope: anonymous hosted help pages only

## Collections

| Collection | Operation | Trigger | Cost control |
| --- | --- | --- | --- |
| `stores/{sId}` | 1 read | Settings screen load | Authenticated owner/admin only |
| `stores/{sId}` | 1 write | Hosted Help settings save | Explicit save only |
| `answerlattice_publicHelpSites/{domain}` | Up to 5 reads | Settings screen load | Only configured domains, capped by schema |
| `answerlattice_publicHelpSites/{domain}` | 1 write per domain | Settings save | Registry avoids public query scans |
| `answerlattice_publicHelpSites/{domain}` | 1 write per domain | Manual DNS status refresh | Explicit owner action only; stores compact Vercel status |
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

New Answerlattice help domains are added to the Vercel project during save. DNS status is not polled in the background; owners refresh status manually from the Hosted Help tab. This keeps Firestore writes and Vercel API calls explicit and avoids background cost.

The shared Vercel helper URL-encodes dynamic project/domain path segments before add, status, or removal calls, uses manual redirect handling, aborts stuck provider requests with a timeout, and clears the abort timer after each request. July 5, 2026 Vercel domain provider response parse diagnostics: if the 64KB bounded provider response parser rejects, the helper logs `vercel_domain_provider_response_parse_failed` with method, path presence/length, query presence, response status, response OK state, max-byte cap, and source error type only before preserving the existing empty-object compatibility fallback. This does not add provider calls or Firestore operations; it only prevents malformed domain/config values from changing the fixed Vercel API path, keeps hosted-help domain saves from waiting indefinitely on the provider, and makes malformed provider responses visible without logging provider response text, tokens, full URLs, domains, tenant IDs, or store IDs.

Provider failure details are logged through fixed runtime diagnostic codes with bounded context only: tenant/store presence-length metadata, domain presence/length metadata, provider code/status, and provider-message presence and length. Browser responses and `domainProvisioningError` status fields use generic hosted-help messages, so failed Vercel add/config checks do not store, log, or return raw provider exception text.

The Widget Management browser caller also validates hosted-help settings load, save, and manual DNS-refresh responses through a 256 KB bounded JSON reader and route-shape guards before updating local hosted-help state. This is a browser-only acknowledgement layer; it adds no Firestore reads, writes, collections, listeners, background jobs, or Vercel provider calls.

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
- When rate limiting is enabled but the limiter provider returns the shared unavailable sentinel, hosted pages render the public shell without KB/FAQ/changelog content reads. Hosted Help settings saves and manual DNS refreshes return `503` with `Cache-Control: no-store`.
- Search is client-side over already-loaded published content; it does not call AI.
- Public pages do not expose tickets, chat history, feedback writes, or user/session data.
- `robots.txt` returns `Disallow: /` when the site is disabled or `noIndex` is enabled.

## Cache Invalidation

Content invalidation stays on existing tenant/store public cache tags:

- KB writes invalidate KB/context tags.
- FAQ writes invalidate FAQ/KB/context tags.
- Changelog writes invalidate changelog/context tags.

Hosted-help settings additionally revalidate:

- `answerlattice-hosted-help-domain-{domain}`
- `answerlattice-hosted-help-scope-{tId}-{sId}`

## Cost Verdict

The hosted public help surface is acceptable for launch. It adds one cached
domain registry read per help domain while reusing existing public-content cache
paths for the heavier KB, FAQ, and changelog data.

The June 27 provider-error boundary adds no Firestore reads, writes, collections, background jobs, or Vercel calls. It only changes failure text and secure logging on existing save/status paths. The June 28 follow-up keeps hosted-help Vercel add failures to provider code/status plus message presence and length in secure logs. The June 30 hosted-help HTML verifier adds no runtime operations; it only pins the existing server sanitizer and client `safeHtml` render boundary in `npm run verify:answerlattice-runtime-truth`.
