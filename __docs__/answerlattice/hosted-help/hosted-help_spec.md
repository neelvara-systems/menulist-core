# Hosted Help Center Specification

**Status:** Current implemented contract  
**Last verified:** July 18, 2026

## Customer job

Publish reviewed Answerlattice knowledge on a client-owned support hostname without exposing private workspace data or requiring a separate documentation CMS.

## Supported public surface

- `/` for the help home;
- `/docs` for published navigation;
- `/articles/{slug}` for published articles present in active KB navigation;
- `/faq` only when FAQ publication is enabled;
- `/changelog` only when changelog publication is enabled;
- `/robots.txt` and `/sitemap.xml` for indexing controls.

Unknown, disabled, malformed, and unlisted routes are not converted into generic help pages.

## Domain contract

- Up to five normalized domains per workspace.
- The first effective label must be `help`, `docs`, `support`, `kb`, `knowledge`, or `answers`.
- Answerlattice service roots and cross-product-reserved hostnames cannot be claimed.
- The same support-style labels are rejected by MenuList custom-domain admission.
- The original validated `Host` is the public registry key.
- Query-domain overrides are local-development only.

## Ownership contract

The authoritative mapping is:

```text
answerlattice_publicHelpSites/{normalizedDomain}
-> pId = AL
-> tId = exact tenant
-> sId = exact workspace
-> normalized hostedHelpConfig containing that domain
```

A matching registry proves workspace assignment. New domains require successful Vercel project addition. Vercel conflict responses do not prove ownership.

## Publication contract

- KB categories, sections, and articles must be active and published.
- An article must be present in published navigation; direct document knowledge is insufficient.
- FAQ and changelog records must pass their existing public projections.
- Inactive articles are omitted without invalidating otherwise valid categories.
- Browser payloads contain display DTOs only.

## SEO contract

- Each accepted route has one canonical path.
- Article metadata uses the article title plus site title.
- Canonical links use the configured primary domain and shared encoded article path.
- Sitemap URLs are deduplicated and capped.
- `noIndex`, disabled sites, and unresolved sites produce restrictive robots behavior.

## Failure contract

- Missing or foreign registry ownership fails closed.
- Unsupported domains fail before provider calls.
- Rate-limit provider unavailability prevents content reads and shows a temporary-unavailability state.
- Provider details are reduced to bounded diagnostics and allowlisted DNS data.
- Public HTML is dynamic and not shared-CDN cached because admission is request-specific.

## Non-goals

- generic documentation authoring;
- arbitrary custom host routing;
- anonymous ticket, feedback, or chat-history exposure;
- automatic publication of source or ticket content;
- ownership inference from provider conflict responses;
- a MenuList custom-domain replacement.
