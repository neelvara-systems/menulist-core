# Compliance Pages — Firebase Cost Tracking

**Version:** 1.2
**Date:** July 2, 2026
**Local Source Gate:** `npm run verify:compliance-pages-boundary`

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
| Read compliancePages doc | 1 | 0 | direct compliancePages doc read in renderer |
| Generate from template (if system) | 0 | 0 | Pure function — no Firestore |
| **Total per view** | **1** | **0** | |

**With cache:** 1 read per 60 seconds per store (not per visitor).

### Custom Override (Rare — owner action)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Store permission check | 1 | 0 | Verify `MANAGE_PUBLIC_PRESENCE` or `MANAGE_STORE` |
| Rate/body admission | 0 | 0 | `DATA_WRITE` limiter + 32KB body cap |
| Write override content | 0 | 1 | Save custom text |
| **Total per override** | **1** | **1** | |

### Reset to System (Very rare)

| Operation | Reads | Writes | Trigger |
|-----------|-------|--------|---------|
| Store permission check | 1 | 0 | Verify `MANAGE_PUBLIC_PRESENCE` or `MANAGE_STORE` |
| Rate/body admission | 0 | 0 | `DATA_WRITE` limiter + 32KB body cap |
| Delete override field | 0 | 1 | System template takes over |
| **Total per reset** | **1** | **1** | |

June 29 limiter-key hardening is Firebase-cost neutral. `/api/compliance` still uses the `DATA_WRITE` limiter before the 32KB bounded JSON body and override writes, but owner and store key segments are HMAC-hashed before storage in Upstash. This resets existing override/reset rate-limit buckets once and changes no Firestore reads/writes/deletes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 29 preview-link hardening is Firebase-cost neutral. Desktop and mobile owner preview buttons now open compliance page URLs with `noopener,noreferrer` and log blocked/thrown preview opens through bounded diagnostics with page URL presence/length metadata only. This changes no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 29 mobile mutation response-parse hardening is Firebase-cost neutral. `MobileCompliancePagesEditor` caps save/reset response parsing at 8KB, logs `mobile_compliance_page_response_parse_failed` or `mobile_compliance_page_response_invalid` with bounded compliance type/action/status metadata only, and requires `success: true` before showing mobile success copy. This changes no Firestore reads/writes/deletes beyond existing valid override/reset requests, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 29 mobile load response-parse hardening is Firebase-cost neutral. `MobileCompliancePagesEditor` caps `/api/compliance` load response parsing at 32KB, logs `mobile_compliance_pages_load_response_parse_failed` or `mobile_compliance_pages_load_response_invalid` with bounded mobile compliance metadata only, and leaves valid load reads, override/reset writes, public compliance rendering, cache behavior, rules, indexes, Cloud Functions, Firebase deployment, and Vercel deployment unchanged.

June 30 desktop response acknowledgement hardening is Firebase-cost neutral. Desktop Official Page and custom-domain compliance editors cap save/reset response parsing at 8KB, require `success: true` before showing success copy, and cap compliance refresh parsing at 32KB before local page state is refreshed. This changes no Firestore reads/writes/deletes beyond existing valid override/reset requests and existing refresh reads, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

June 30 browser request-boundary hardening is Firebase-cost neutral. Desktop Official Page compliance, embedded Custom Domain compliance, and mobile compliance editor load/save/reset requests now use the shared `AUTH_BROWSER_REQUEST_POLICY`, which keeps existing compliance calls uncached, same-origin, and manual-redirect before bounded response parsing. This changes no Firestore reads/writes/deletes beyond existing valid compliance loads or override/reset requests, no Storage operations, no Cloud Functions, no API routes, no cache invalidations, no rules, no indexes, no schema fields, no public page rendering, and no owner-facing settings.

June 30 shared request-policy consolidation is Firebase-cost neutral. Replacing nine inline `/api/compliance` request option blocks with the shared authenticated browser request policy changes only client-side fetch construction and static verifier coverage; it adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

July 1 mutation acknowledgement shape hardening is Firebase-cost neutral. `POST /api/compliance` returns the requested page type and API action with `success: true`, and desktop/mobile clients require those fields before showing save/reset success. This changes no Firestore reads/writes/deletes beyond existing valid override/reset requests, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, public page rendering, or owner-facing settings.

July 2 sanitizer/source-gate hardening is Firebase-cost neutral. The compliance sanitizer now removes script/style blocks before generic tag stripping, and `npm run verify:compliance-pages-boundary` checks sanitizer behavior, API admission, public route intercepts, owner editor acknowledgement guards, Firestore rule shape, and docs parity locally. This changes no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public route shape.

---

## Cost Estimates

### Per Store Per Month

| Scenario | Reads | Writes | Cost |
|----------|-------|--------|------|
| Page views (avg 100/month, cached) | ~50 | 0 | ~₹0.003 |
| Owner edits (1-2/month) | 2 | 2 | ~₹0.0002 |
| **Total** | **~52** | **~2** | **~₹0.003** |

### At Scale

| Scale | Monthly Reads | Monthly Writes | Monthly Cost |
|-------|--------------|----------------|--------------|
| 100 stores | 5,200 | 200 | ₹0.30 |
| 1,000 stores | 52,000 | 2,000 | ₹3.00 |
| 10,000 stores | 520,000 | 20,000 | ₹30.00 |

**Verdict:** Negligible cost. Template generation is pure function (zero reads). Caching keeps page views extremely cheap. Rejected oversized or rate-limited owner mutations do not reach compliance writes.

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
