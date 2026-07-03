# Platform Pull API

> **External systems read business and menu data FROM MenuList — the pull counterpart to POS Webhook push.**

**Status:** ✅ IMPLEMENTED (v1.9 — desktop key-management source gate aligned Jul 2, 2026)
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

The gate checks API-key generation/revocation, the Business Settings Integrations tab key UI, hashed key storage, 1KB key-action body cap, `MANAGE_INTEGRATIONS` permission, business/menu pull route live key/target revalidation, private response cache headers, API-key `Vary`, bounded diagnostics, menu summary selection, active temporary-status output, and this doc set.

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
| `src/app/api/store/public-api-key/route.ts` | POST generate/revoke API key                                        |
| `src/types/platform/store.ts`               | `publicApi` field on StoreDataType                                  |
| `src/config/features.ts`                    | `ENABLE_PUBLIC_API` flag                                            |

---

## v1.1 Improvements (Mar 14, 2026 — ChatGPT Review)

- **API key hashing** — SHA-256 hash stored, raw key never persisted (Stripe/GitHub model)
- **ETag + conditional requests** — 304 Not Modified for unchanged data
- **Structured error responses** — `{error: {code, message}}` format
- **`Retry-After` header** — on 429 rate limit responses
- **`schemaVersion` field** — in all response payloads (`"1.0"`)
- **Abuse logging** — IP + user-agent per request for leak detection
- **Menu source alignment** — menu pull resolves the default project from `platformSummary/projects_{storeId}`, matching the customer renderer.
- **Key-management permission** — generating or revoking a pull API key requires the authenticated store user to have `MANAGE_INTEGRATIONS`.
- **Private response cache** — API-key-gated business/menu responses keep ETag/304 behavior but use `private` cache control plus `Vary: X-API-Key` so shared caches do not store one key's response for another key.
- **Live key and target validation** — MenuList pull endpoints recheck the API key and store/tenant eligibility on every request instead of using a process-local validation cache.
- **Desktop key management** — Business Settings Integrations tab exposes generate/regenerate/revoke controls and shows the raw key only once after generation.

---

**Document Signature:** Cascade (Lead Architect)  
**Created:** February 22, 2026  
**Last Updated:** July 2, 2026
