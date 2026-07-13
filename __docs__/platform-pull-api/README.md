# Platform Pull API

> **External systems read business and menu data FROM MenuList — the pull counterpart to POS Webhook push.**

**Status:** ✅ IMPLEMENTED (v1.12 — authentication, rate, and response identity hardened Jul 13, 2026)
**Feature Flag:** `ENABLE_PUBLIC_API: true`
**Date:** February 22, 2026

---

## Quick Navigation

| Audience   | Document                                        | Purpose               |
| ---------- | ----------------------------------------------- | --------------------- |
| CEO/PM     | [Spec](./platform-pull-api_spec.md)             | Business requirements |
| Developers | [Impl](./platform-pull-api_impl.md)             | Technical blueprint   |
| Firebase   | [Firebase](./platform-pull-api_firebase.md)     | Cost tracking         |
| Mobile     | [Mobile](./platform-pull-api_mobile-support.md) | Admission test        |

---

## Source Gate

Current source/docs parity is guarded by:

```bash
npm run verify:platform-pull-api-boundary
```

Source gate: `npm run verify:platform-pull-api-boundary`.

The gate checks API-key generation/revocation, the Business Settings Integrations tab key UI, hashed key storage, duplicate-key rejection, strict key-management session document-ID admission, 1KB strict key-action body cap, `MANAGE_INTEGRATIONS` permission, fail-closed pre-auth and per-key limits, business/menu live key/target revalidation, target document-ID and MenuList numeric-ID admission, stable ETag identity, private success/error cache headers, API-key `Vary`, bounded diagnostics, menu summary selection, active temporary-status output, and this doc set.

---

## One-Liner

Two read-only APIs that let external systems pull business details and menu data from MenuList using an API key.

---

## Strategic Context

MenuList is the **upstream menu authority** (Doc 15 Rule 1). POS Webhook Sync pushes data outward. Platform Pull API lets external systems read data on demand. Both enforce the same principle: data flows FROM MenuList, never TO it.

---

## Key Files

| File                                        | Purpose                                                             |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src/app/api/public/v1/business/route.ts`   | GET business details                                                |
| `src/app/api/public/v1/menu/route.ts`       | GET menu data (POS sync payload format)                             |
| `src/lib/publicApi/auth.ts`                 | API key hashing, validation, ETag, structured errors, abuse logging |
| `src/lib/publicApi/responseIdentity.ts`     | Stable response projection for conditional ETags                    |
| `src/app/api/store/public-api-key/route.ts` | POST generate/revoke API key                                        |
| `src/types/platform/store.ts`               | `publicApi` field on StoreDataType                                  |
| `src/config/features.ts`                    | `ENABLE_PUBLIC_API` flag                                            |

---

## v1.1 Improvements (Mar 14, 2026 — ChatGPT Review)

- **API key hashing** — SHA-256 hash stored, raw key never persisted (Stripe/GitHub model)
- **ETag + conditional requests** — 304 Not Modified for unchanged data
- **Stable ETag identity** — request-time `generatedAt` and menu `timestamp` remain in 200 responses but do not make unchanged business/menu truth miss conditional requests.
- **Structured error responses** — `{error: {code, message}}` format
- **`Retry-After` header** — on 429 rate limit responses
- **`schemaVersion` field** — in all response payloads (`"1.0"`)
- **Abuse logging** — IP + user-agent per request for leak detection
- **Menu source alignment** — menu pull resolves the default project from `platformSummary/projects_{storeId}`, matching the customer renderer.
- **Key-management permission** — generating or revoking a pull API key requires the authenticated store user to have `MANAGE_INTEGRATIONS`.
- **Private response cache** — API-key-gated business/menu responses keep ETag/304 behavior but use `private` cache control plus `Vary: X-API-Key` so shared caches do not store one key's response for another key.
- **Live key and target validation** — MenuList pull endpoints recheck the API key and store/tenant eligibility on every request instead of using a process-local validation cache.
- **Desktop key management** — Business Settings Integrations tab exposes generate/regenerate/revoke controls and shows the raw key only once after generation.
- **Target document-ID admission** — validated MenuList pull keys now normalize credential store document IDs, require exact positive numeric MenuList tenant/store IDs before response construction, and normalize menu project IDs before project document refs.
- **Two-level request limiting** — syntactically valid `ml_` credentials first pass a fail-closed hashed-IP ceiling, then the existing fail-closed 60-per-minute hashed-key ceiling. Rotating fake keys cannot create unbounded key lookups.
- **Duplicate credentials fail closed** — current hashes and legacy raw-key representations are both checked while compatibility is enabled. The same store may carry both during migration, but matches resolving to multiple store document paths are rejected instead of letting lookup order select a tenant.
- **Private failure and secret responses** — pull errors use `private, no-store` plus `Vary: X-API-Key`, and one-time key-generation responses use `private, no-store`.
- **Fail-closed outage semantics** — an exhausted limiter returns `429 RATE_LIMIT_EXCEEDED`; an unavailable limiter provider returns retryable `503 SERVICE_UNAVAILABLE`. Both include `Retry-After` instead of misreporting provider outages as caller abuse.
- **Linked outlet truth resolution** — pull menu responses resolve the same master menu plus outlet overrides/local items used by customer rendering; malformed, cross-tenant, missing, deleted, chained, or empty master references fail closed instead of returning an empty outlet menu.
- **MenuList product and identity coherence** — legacy records with missing product/ID aliases remain supported, but any explicit `pId`/`productId` must be `ML`; explicit tenant/store aliases must be exact numeric document IDs and agree with each other and the authoritative document path.
- **Credential purpose/scope isolation** — new keys persist `productId: ML`, `purpose: menulist_public_api`, and `public:read`; legacy metadata-free keys remain supported, but explicit non-MenuList purpose/product or a scopes list without `public:read` fails closed.
- **Runtime-safe business projection** — business attributes are allowlisted to known boolean public fields, and temporary status output validates type/expiry/message while omitting private creator metadata.

---

**Document Signature:** Cascade (Lead Architect)  
**Created:** February 22, 2026  
**Last Updated:** July 13, 2026
