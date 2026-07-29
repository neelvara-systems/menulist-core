# Compliance Pages — Firebase Cost Tracking

**Version:** 1.4
**Date:** July 16, 2026
**Local Source Gate:** `npm run verify:compliance-pages-boundary`

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Compliance Pages Firestore-rule, read/write, and cost evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:compliance-pages-boundary`, browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`, authenticated desktop/mobile owner save/reset QA, owner/legal review of final generated or custom policy text, DNS/custom-domain verification, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

---

## Collections

| Collection | Type | Purpose |
|-----------|------|---------|
| `compliancePages` | Flat | 1 doc per store — compliance page content |

---

## Operations

### Page View (Public — most frequent)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Resolve store (subdomain/custom domain) | 0 | 0 | Uses shared cached public store lookup |
| direct compliancePages doc read | 0 or 1 | 0 | server/Admin read only on tenant/store-keyed tagged cache fill |
| Generate from template (if system) | 0 | 0 | Pure function — no Firestore |
| **Total per view** | **0 or 1** | **0** | depends on the tenant/store-keyed tagged-cache state |

**Current cache contract:** the server/Admin `compliancePages` read is behind a tagged 60-second cache keyed by tenant and store. A successful override/reset invalidates `compliance-store-{sId}`; an invalidation failure returns `refreshPending: true` and remains bounded by the 60-second TTL. Direct browser Firestore reads and writes are denied.

July 16 end-to-end hardening adds no new valid owner read/write and reduces repeated public reads. The owner preview store read now fails closed when canonical tenant/store identity aliases do not match the authenticated scope. Template dates are deterministic and the refund baseline removes unsupported customer refund timelines. These changes add no Firebase rule, index, Storage operation, Cloud Function, collection, or schema field.

### Custom Override (Rare — owner action)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Store permission check | 1 | 0 | Verify `MANAGE_PUBLIC_PRESENCE` or `MANAGE_STORE` |
| Rate/body admission | 0 | 0 | `DATA_WRITE` limiter + 32KB body cap |
| Transaction-current override read | 1 | 0 | Validate persisted tenant/store/shape before mutation |
| Write override content | 0 | 1 | Save custom text |
| **Total per override** | **2** | **1** | |

### Reset to System (Very rare)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Store permission check | 1 | 0 | Verify `MANAGE_PUBLIC_PRESENCE` or `MANAGE_STORE` |
| Rate/body admission | 0 | 0 | `DATA_WRITE` limiter + 32KB body cap |
| Transaction-current override read | 1 | 0 | Missing row is a no-op; exact scope required for an existing row |
| Delete override field | 0 | 1 | System template takes over |
| **Total per reset** | **2** | **0 or 1** | |

July 28 audit hardening denies all direct client reads as well as writes because the public SSR renderer and authenticated owner API already use Admin SDK reads. This prevents anonymous collection scans from exposing internal `tId`/`sId` fields without changing public `/privacy`, `/terms`, or `/refund` availability. Admin reads now strictly project the persisted tenant/store identity, timestamp and override bounds. Save/reset transactions revalidate existing truth; reset on a missing document is a no-op instead of creating an orphan metadata row. Valid save/reset adds one transaction read. The rule and Admin emulators cover denial, conflicting-scope preservation and missing-reset behavior; QA rules deployment remains required.

June 29 limiter-key hardening is Firebase-cost neutral. `/api/compliance` still uses the `DATA_WRITE` limiter before the 32KB bounded JSON body and override writes, but owner and store key segments are HMAC-hashed before storage in Upstash. This resets existing override/reset rate-limit buckets once and changes no Firestore reads/writes/deletes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

July 6 session document-ID boundary is Firebase-cost neutral for valid requests. `/api/compliance` keeps the same owner preview read, override read, permission check, save/reset write, and limiter behavior, but validates authenticated session tenant/store IDs with the shared Firestore document-ID guard before store lookup, permission checks, limiter keys, override writes, reset writes, or bounded diagnostics. The server compliance DAL also rejects malformed `compliancePages/{sId}` refs before building the Firestore document reference. This adds no Firestore reads/writes/deletes for valid requests, no Storage operation, no Cloud Function, no cache invalidation, no rule, no index, no schema field, no provider call, no owner setting, no public compliance rendering change, and no deploy requirement.

July 13 server-owned compliance mutation boundary originally denied Firebase client create/update/delete while retaining public direct reads. The July 28 audit supersedes that compatibility posture: every browser read/write is now denied and valid public/owner access stays server-owned.

The required QA command `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive` read `firestore.indexes.json`, checked `firestore.rules` for compilation errors, and stopped at the Firestore Rules API test request with HTTP 403 `The caller does not have permission`. No rules were uploaded. QA therefore retains its prior direct-client compliance mutation policy until authorized project access is restored and the same scoped deployment succeeds.

June 29 preview-link hardening is Firebase-cost neutral. Desktop and mobile owner preview buttons now open compliance page URLs with `noopener,noreferrer` and log blocked/thrown preview opens through bounded diagnostics with page URL presence/length metadata only. This changes no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 29 mobile mutation response-parse hardening is Firebase-cost neutral. `MobileCompliancePagesEditor` caps save/reset response parsing at 8KB, logs `mobile_compliance_page_response_parse_failed` or `mobile_compliance_page_response_invalid` with bounded compliance type/action/status metadata only, and requires `success: true` before showing mobile success copy. This changes no Firestore reads/writes/deletes beyond existing valid override/reset requests, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 29 mobile load response-parse hardening is Firebase-cost neutral. `MobileCompliancePagesEditor` caps `/api/compliance` load response parsing at 32KB, logs `mobile_compliance_pages_load_response_parse_failed` or `mobile_compliance_pages_load_response_invalid` with bounded mobile compliance metadata only, and leaves valid load reads, override/reset writes, public compliance rendering, cache behavior, rules, indexes, Cloud Functions, Firebase deployment, and Vercel deployment unchanged.

June 30 desktop response acknowledgement hardening is Firebase-cost neutral. Desktop Official Page and custom-domain compliance editors cap save/reset response parsing at 8KB, require `success: true` before showing success copy, and cap compliance refresh parsing at 32KB before local page state is refreshed. This changes no Firestore reads/writes/deletes beyond existing valid override/reset requests and existing refresh reads, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 30 browser request-boundary hardening is Firebase-cost neutral. Desktop Official Page compliance, embedded Custom Domain compliance, and mobile compliance editor load/save/reset requests now use the shared `AUTH_BROWSER_REQUEST_POLICY`, which keeps existing compliance calls uncached, same-origin, and manual-redirect before bounded response parsing. This changes no Firestore reads/writes/deletes beyond existing valid compliance loads or override/reset requests, no Storage operations, no Cloud Functions, no API routes, no cache invalidations, no rules, no indexes, no schema fields, no public page rendering, and no owner-facing settings.

June 30 shared request-policy consolidation is Firebase-cost neutral. Replacing nine inline `/api/compliance` request option blocks with the shared authenticated browser request policy changes only client-side fetch construction and static verifier coverage; it adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

July 1 mutation acknowledgement shape hardening is Firebase-cost neutral. `POST /api/compliance` returns the requested page type and API action with `success: true`, and desktop/mobile clients require those fields before showing save/reset success. This changes no Firestore reads/writes/deletes beyond existing valid override/reset requests, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

July 2 sanitizer/source-gate hardening is Firebase-cost neutral. The compliance sanitizer now removes script/style blocks before generic tag stripping, and `npm run verify:compliance-pages-boundary` checks sanitizer behavior, API admission, public route intercepts, owner editor acknowledgement guards, Firestore rule shape, and docs parity locally. This changes no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public route shape.

July 5 public override-read diagnostics remain active. Public `/privacy`, `/terms`, and `/refund` pages fall back to generated policy text if the current tagged cache fill fails, and log bounded `public_compliance_override_read_failed` diagnostics only.

July 6 public override document-ID boundary is Firebase-cost neutral for valid requests. Public `/privacy`, `/terms`, and `/refund` pages normalize the store-scoped `compliancePages/{sId}` override document ID before the Admin SDK read. Malformed, reserved, empty, whitespace-mutated, path-shaped, zero, negative, unsafe, or nonnumeric store scope skips the override read, logs bounded `public_compliance_override_read_failed` diagnostics with fixed invalid-scope source metadata, and keeps generated policy text. This adds no Firestore reads/writes/deletes for valid public compliance pages, no analytics write, no Storage operation, no Cloud Function, no API route, no cache invalidation, no rule, no index, no schema field, no provider call, no owner setting, and no deploy requirement.

July 5 owner store-lookup diagnostics are Firebase-cost neutral beyond the existing owner compliance load read. `GET /api/compliance` still performs one authenticated store doc read before generating owner previews, and missing contact inputs still return the existing `missingData` response. If that store read itself fails, the route now logs bounded `compliance_store_lookup_failed` diagnostics and returns a fixed 500 response instead of collapsing the infrastructure failure into missing inputs. This adds no Firestore reads/writes/deletes beyond the existing read, no Storage operation, no Cloud Function, no cache invalidation, no rule, no index, no schema field, no provider call, no owner setting, no public compliance rendering change, and no deploy requirement.

---

## Cost Estimates

### Per Store Per Month

| Scenario | Reads | Writes | Cost |
|----------|-------|--------|------|
| Page views (avg 100/month) | 1–100 cache fills | 0 | Traffic spacing determines fills; never more than one override read per request |
| Owner edits (1-2/month) | 4 | 2 | Measure current Firestore pricing |
| **Total** | **cache-pattern dependent + 4 owner reads** | **~2** | Use measured traffic/cache-hit data for billing forecasts |

### At Scale

| Scale | Monthly Reads | Monthly Writes | Monthly Cost |
|-------|--------------|----------------|--------------|
| 100 stores | 100–10,000 public override reads for the example traffic | 200 | Measure actual cache-hit distribution |
| 1,000 stores | 1,000–100,000 public override reads for the example traffic | 2,000 | Measure actual cache-hit distribution |
| 10,000 stores | 10,000–1,000,000 public override reads for the example traffic | 20,000 | Measure actual cache-hit distribution |

**Verdict:** Template generation is free and tagged caching bounds repeat reads, but exact cost depends on traffic spacing and cache hits. Do not present a single rupee estimate as guaranteed. Rejected oversized or rate-limited owner mutations do not reach compliance writes.

---

## Document Size Estimate

| Field | Size |
|-------|------|
| Privacy content | ~3-5 KB (system), up to 15 KB (custom) |
| Terms content | ~3-5 KB (system), up to 15 KB (custom) |
| Metadata | ~200 bytes |
| **Max total** | **~30 KB** |

Well under Firestore's 1MB limit.

---

## Indexes Required

None — all queries use document ID (`{sId}`), which is a direct lookup.

---

## Storage

No Storage operations. All content is text stored in Firestore documents.
