# Canonica Hosted Help Center — Firebase Cost Notes

> Status: Implemented  
> Cost priority: high  
> Scope: anonymous hosted help pages only

## Collections

| Collection | Operation | Trigger | Cost control |
| --- | --- | --- | --- |
| `stores/{sId}` | 1 read | Settings screen load | Authenticated owner/admin only |
| `stores/{sId}` | 1 write | Hosted Help settings save | Explicit save only |
| `canonica_publicHelpSites/{domain}` | Up to 5 reads | Settings screen load | Only configured domains, capped by schema |
| `canonica_publicHelpSites/{domain}` | 1 write per domain | Settings save | Registry avoids public query scans |
| `canonica_publicHelpSites/{domain}` | 1 write per domain | Manual DNS status refresh | Explicit owner action only; stores compact Vercel status |
| `canonica_publicHelpSites/{domain}` | 1 cached doc read | Public hosted page request | `unstable_cache`, 60 second TTL |
| `kb_categories/categories_{tId}_{sId}` | Cached read | Hosted home/docs/sitemap | Reuses Canonica public content cache |
| `kb_articles/{articleId}` | Cached read | Article detail | Published/scope validated server-side |
| `canonica_faqs` | Cached limited query | FAQ/home | Published + active only, capped |
| `changelog/{tId}/{sId}` | Cached limited query | Changelog/home | Published entries only |

## Public Payload Shape

The public route resolves tenant/store scope server-side, but does not send that
scope to the browser. Hydrated payloads are compact DTOs:

- KB index: category/section/article title, URL, active flag, and order only.
- Article detail: title, category labels, URL, and sanitized HTML only.
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
- Canonica hosted-help domains use `/api/canonica/hosted-help-settings`.

New Canonica help domains are added to the Vercel project during save. DNS status is not polled in the background; owners refresh status manually from the Hosted Help tab. This keeps Firestore writes and Vercel API calls explicit and avoids background cost.

Registry docs store only compact status fields:

- `domainStatus`
- `domainVerified`
- `domainVerifiedAt`
- `domainLastCheckedAt`
- `domainVerification`
- `domainProvisioningError`
- `domainVercelAddedAt`

## Bot and Abuse Controls

- Hosted page requests use `CANONICA_HOSTED_HELP` rate limiting.
- Search is client-side over already-loaded published content; it does not call AI.
- Public pages do not expose tickets, chat history, feedback writes, or user/session data.
- `robots.txt` returns `Disallow: /` when the site is disabled or `noIndex` is enabled.

## Cache Invalidation

Content invalidation stays on existing tenant/store public cache tags:

- KB writes invalidate KB/context tags.
- FAQ writes invalidate FAQ/KB/context tags.
- Changelog writes invalidate changelog/context tags.

Hosted-help settings additionally revalidate:

- `canonica-hosted-help-domain-{domain}`
- `canonica-hosted-help-scope-{tId}-{sId}`

## Cost Verdict

The hosted public help surface is acceptable for launch. It adds one cached
domain registry read per help domain while reusing existing public-content cache
paths for the heavier KB, FAQ, and changelog data.
