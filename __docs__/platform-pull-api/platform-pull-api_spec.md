# Platform Pull API — Specification

**Status:** ✅ IMPLEMENTED (v1.4 — target document-ID boundary hardened Jul 6, 2026)
**Date:** February 22, 2026  
**Audience:** CEO, PM, Clients
**Last Source Gate Update:** July 6, 2026

---

## Source Gate

Current source/docs parity is guarded by `npm run verify:platform-pull-api-boundary`.

The gate checks the Business Settings Integrations tab key controls, the authenticated key-management route, pull-route key validation, private response headers, target eligibility, target document-ID and MenuList numeric-ID admission, menu summary selection, active temporary-status behavior in the business response, bounded diagnostics, and this spec.

---

## Executive Summary

### What

Two read-only APIs that let external systems (POS vendors, delivery platforms, AI agents, directories) pull business details and menu data from MenuList on demand.

### Why

POS Webhook Sync pushes menu data when changes happen. But external systems also need to **pull** data on their own schedule — for initial setup, periodic verification, or on-demand queries. Platform Pull API completes the upstream authority model.

### For Whom

- **POS vendors** pulling menu structure on demand
- **Delivery platforms** reading canonical menu
- **AI agents** consuming structured business data
- **Directory services** verifying business information
- **Any system** that needs MenuList as canonical source

### Strategic Position

This is the **pull** counterpart to POS Webhook Sync's **push**. Together they make MenuList the canonical upstream authority that external systems depend on — regardless of whether they prefer push or pull integration.

---

## APIs

### API 1: Business Details

`GET /api/public/v1/business`

Returns store business information: name, address, hours, phone, status, social links.

### API 2: Menu Data

`GET /api/public/v1/menu`

Returns full menu data in the same format as POS Webhook Sync payload: categories, items, prices, availability, attributes. The endpoint selects the menu through `platformSummary/projects_{storeId}` because that summary document owns the public `isDefault` project state used by the customer renderer.

---

## Authentication

- Store owner generates a read-only API key in Business Settings
- External systems include key via `X-API-Key` header
- Each store has one API key (regeneratable)
- API key is read-only — cannot modify any data

---

## Requirements

| ID    | Requirement                                           | Priority | Status |
| ----- | ----------------------------------------------------- | -------- | ------ |
| FR-01 | Business details endpoint                             | P0       | ✅     |
| FR-02 | Menu data endpoint                                    | P0       | ✅     |
| FR-03 | API key authentication (SHA-256 hashed)               | P0       | ✅     |
| FR-04 | Rate limiting (60 req/min per key)                    | P0       | ✅     |
| FR-05 | Feature flag `ENABLE_PUBLIC_API`                      | P0       | ✅     |
| FR-06 | Key generation UI in settings                         | P0       | ✅     |
| FR-07 | Key regeneration (invalidates old key)                | P1       | ✅     |
| FR-08 | Structured error responses `{error: {code, message}}` | P0       | ✅     |
| FR-09 | ETag + conditional requests (304 Not Modified)        | P0       | ✅     |
| FR-10 | `Retry-After` header on 429 responses                 | P1       | ✅     |
| FR-11 | `schemaVersion` field in all responses                | P0       | ✅     |
| FR-12 | Abuse logging (IP, user-agent per request)            | P1       | ✅     |
| FR-13 | Key generate/revoke requires `MANAGE_INTEGRATIONS`    | P0       | ✅     |
| FR-14 | API-key responses use private cache + `Vary: X-API-Key` | P0       | ✅     |
| FR-15 | Valid keys only return data for active, non-deleted, non-blocked stores and non-blocked tenants | P0       | ✅     |
| FR-16 | Pull endpoints revalidate key and store/tenant eligibility on every request; no process-local validation cache | P0       | ✅     |
| FR-17 | Business Settings Integrations tab can generate, regenerate, copy, and revoke the store's public API key | P0       | ✅     |
| FR-18 | Pull endpoints normalize credential store IDs, require exact positive numeric MenuList tenant/store IDs before response construction, and normalize menu project IDs before project document refs | P0       | ✅     |

---

## Industry Validation (Web Research, Feb 22 2026)

Two APIs (business + menu) is the industry standard pattern:

- **Google Business Profile FoodMenus API** — Exposes menu sections → items → attributes (price, dietary, allergens, nutrition). Separate from business profile data. Two domains.
- **OpenMenu standard** — Restaurant endpoint (identity, address, hours, social) + Menu endpoint (groups → items → options). Same two-domain split.
- **Common restaurant API pattern** — Business identity and menu data are the two canonical data domains every external consumer needs.

**Why NOT a separate status/hours endpoint:** Our `/business` endpoint already returns `tempStatus` and `workingHours`. A standalone status API would duplicate data and add maintenance surface for zero additional value.

**Why NOT more granular endpoints (e.g. /items, /categories):** MenuList's architecture decision (shared with POS Webhook Sync) is full snapshot delivery. Granular endpoints create versioning complexity, partial state bugs, and higher Firestore reads. Full snapshot is simpler, more reliable, and aligns with doctrine.

---

## Out-of-Scope

| Feature                            | Reason                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Write APIs                         | MenuList is upstream. External systems read, not write.                                                           |
| Webhooks from pull API             | POS Webhook Sync handles push.                                                                                    |
| Per-field filtering                | Full snapshot only. Same as POS sync architecture.                                                                |
| Separate status/hours endpoint     | Already included in `/business` response.                                                                         |
| OAuth / JWT                        | Overkill for read-only data. API key is sufficient.                                                               |
| Usage analytics dashboard          | Anti-doctrine (Doc 08).                                                                                           |
| Granular item/category endpoints   | Full snapshot architecture. No partials.                                                                          |
| Identity resolution endpoint       | Deferred. No demand yet. Reserve for future.                                                                      |
| Multiple API keys per store        | Deferred. Current 1-key model is sufficient.                                                                      |
| In-memory key cache for MenuList pull endpoints | Rejected for v1. Revocation and store/tenant blocking must take effect on the next request from each server process. |
| Precomputed snapshots              | Deferred. `menuSnapshots` collection exists but not wired to pull API. On-demand reads are fine at current scale. |
| Prefixed item IDs (`cat_`, `itm_`) | Deferred. Current AI-generated IDs are stable across edits. Prefix migration would require data migration.        |
| Single-language-per-request        | Rejected. Multi-lang names `{en: "...", hi: "..."}` are the correct design for infrastructure consumers.          |

---

## Error Codes

| HTTP | Code                  | When                                                |
| ---- | --------------------- | --------------------------------------------------- |
| 401  | `MISSING_API_KEY`     | No `X-API-Key` header                               |
| 401  | `INVALID_API_KEY`     | Key not found, revoked, or no longer tied to an eligible public store/tenant |
| 403  | `FEATURE_DISABLED`    | `ENABLE_PUBLIC_API` is OFF                          |
| 404  | `NO_MENU`             | Store has no published menu                         |
| 429  | `RATE_LIMIT_EXCEEDED` | >60 req/min per key. Includes `Retry-After` header. |
| 500  | `INTERNAL_ERROR`      | Unexpected server error                             |

---

## Integration Example

```bash
# Fetch business details
curl -H "X-API-Key: ml_abc123def456..." \
  https://menulist.ai/api/public/v1/business

# Fetch menu data
curl -H "X-API-Key: ml_abc123def456..." \
  https://menulist.ai/api/public/v1/menu

# Conditional request (saves bandwidth when nothing changed)
curl -H "X-API-Key: ml_abc123def456..." \
     -H 'If-None-Match: "a1b2c3d4..."' \
  https://menulist.ai/api/public/v1/menu
# Returns 304 Not Modified if menu unchanged
```

---

## ID Stability Guarantee

All item, category, and attribute IDs in the menu response are **stable across edits** within a project. External systems can safely store these IDs as references (e.g., POS mapping `menulistItemId → posItemId`). IDs survive:

- Item rename
- Price change
- Category move
- Availability toggle
- AI re-extraction (similarity matching preserves existing IDs)

IDs are only retired when an item is permanently deleted.

---

**Last Updated:** July 2, 2026
**ChatGPT Review:** Session Mar 14, 2026 — 45% accuracy (11/25 already done, 6 valid, 5 deferred, 1 rejected)
