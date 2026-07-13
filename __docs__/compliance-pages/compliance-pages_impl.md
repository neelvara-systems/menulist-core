# Compliance Pages — Implementation Plan

**Status:** Runtime implemented source evidence; not current launch or legal certification
**Version:** 1.3
**Date:** July 10, 2026
**Audience:** Developers
**Local Source Gate:** `npm run verify:compliance-pages-boundary`

> **Launch boundary:** Not current launch certification or deploy approval. This implementation plan is source-gated route, sanitizer, API, renderer, owner-editor, and persistence evidence only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:compliance-pages-boundary`, browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`, authenticated desktop/mobile owner save/reset QA, owner/legal review of final generated or custom policy text, DNS/custom-domain verification, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

---

## 1. Architecture Overview

## July 6, 2026 - Public Override Document-ID Boundary

Public compliance override document-ID boundary: public compliance pages still generate system policy text first, then optionally read owner overrides from `compliancePages/{sId}`. `src/app/client/compliance/CompliancePageContent.tsx` now normalizes that public override document ID with `normalizePublicComplianceStoreDocumentId()` before the Admin SDK read. The renderer uses the store record's `storeId` first and the returned Firestore doc id only when `storeId` is absent, then requires exact positive numeric Firestore document-ID scope. Malformed, reserved, empty, whitespace-mutated, path-shaped, zero, negative, unsafe, or nonnumeric store scope skips the override read, logs bounded `public_compliance_override_read_failed` diagnostics with the fixed `public_compliance_invalid_store_scope` source error, and keeps the generated policy fallback.

Cost impact: `$0.00` for valid requests. This changes public compliance override-read admission only. It adds no Firestore reads/writes/deletes for valid public compliance pages, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, public route shape changes, or deploy requirement.

## July 5, 2026 - Public Override-Read Diagnostics

Public compliance pages still generate system policy text first, then read `compliancePages/{sId}` for optional owner overrides. If that override read fails, `src/app/client/compliance/CompliancePageContent.tsx` now keeps the generated policy fallback: public compliance override read failures log `public_compliance_override_read_failed` with bounded diagnostics. The diagnostic includes only store/page/tenant-type presence-length metadata, subdomain/custom-domain presence booleans, and normalized source error metadata. It must not log raw store IDs, custom domains, subdomains, policy text, override text, or browser/provider exception payloads.

Cost impact: `$0.00`. This changes public compliance page observability only. It adds no Firestore reads/writes/deletes beyond the existing direct compliance override doc read, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public page route shape.

## July 5, 2026 - Owner Store-Lookup Diagnostics

`GET /api/compliance` still loads the authenticated owner store once, generates Privacy, Terms, and Refund previews from the same pure template functions, and returns the existing `missingData` response when the store exists but lacks contact inputs. The owner compliance store lookup failures log `compliance_store_lookup_failed` with bounded tenant/store presence-length metadata and normalized source error metadata, then return a fixed 500 response instead of presenting a Firestore read failure as missing owner inputs.

Cost impact: `$0.00` beyond the existing owner compliance load read. This changes owner compliance load failure handling and observability only. It adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, public page rendering, or public compliance output changes.

## July 6, 2026 - Session Document-ID Boundary

`/api/compliance` validates session tenant/store IDs with the shared Firestore document-ID guard before owner store lookup, override reads, permission checks, DATA_WRITE limiter keys, override writes, reset writes, or bounded diagnostics. The server compliance DAL also validates the `compliancePages/{sId}` document ID before building the Firestore ref, so malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail closed before compliance override refs.

Cost impact: `$0.00` for valid requests. This changes app-side owner compliance session document-ID admission only. It adds no Firestore reads/writes/deletes for valid requests, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, public page rendering, or public compliance output changes.

## June 30, 2026 - Browser Request Boundary Hardening

Desktop Official Page compliance, embedded Custom Domain compliance, and mobile compliance editor load/save/reset requests must call `/api/compliance` through the shared `AUTH_BROWSER_REQUEST_POLICY` from `src/lib/auth/browserRequestPolicy.ts`. That policy pins `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'` before bounded response parsing.

This request policy sits alongside the existing response acknowledgement boundary: desktop mutation responses use `readDesktopComplianceMutationResponseJson()` with an 8KB cap, desktop refresh responses use `readDesktopComplianceLoadResponseJson()` with a 32KB cap, mobile mutation responses use `readMobileComplianceMutationResponseJson()` with an 8KB cap, and mobile load responses use `readMobileComplianceLoadResponseJson()` with a 32KB cap. Successful save/reset HTTP responses must include `success: true`, the requested compliance page `type`, and the expected API `action` (`override` for save, `reset` for reset) before local success copy or refreshed page state.

`npm run verify:compliance-pages-boundary`, `npm run verify:public-business-truth`, and `npm run verify:menulist-api-tenant-safety` guard the shared browser request policy boundary for the standalone desktop compliance section, embedded custom-domain compliance section, and mobile compliance editor.

Cost impact: `$0.00`. This changes only browser-side request handling for existing compliance editor calls; it adds no Firestore reads/writes beyond valid existing load/override/reset requests, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public page rendering changes.

## July 1, 2026 - Mutation Acknowledgement Shape Hardening

`POST /api/compliance` now returns the requested `type` and API `action` alongside `success: true`. Desktop Official Page compliance, embedded Custom Domain compliance, and mobile compliance editor mutation guards require those fields to match the request before showing save/reset success or refreshing local page state. Invalid successful envelopes log `desktop_compliance_page_response_invalid` or `mobile_compliance_page_response_invalid` with bounded action/type match booleans only.

Cost impact: `$0.00`. This changes only the mutation acknowledgement envelope and browser-side validation. It adds no Firestore reads/writes/deletes beyond existing valid override/reset requests, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public page rendering changes.

## July 2, 2026 - Sanitizer and Source-Gate Hardening

`src/lib/compliance/sanitizer.ts` now follows this order: sanitize executable/style blocks before tag stripping. This keeps script/style body text from surviving as plain policy copy. `npm run verify:compliance-pages-boundary` runtime-checks the sanitizer, template composition, API admission path, public route intercept, desktop/mobile acknowledgement guards, Firestore rule shape, and active docs parity.

Cost impact: `$0.00`. This changes only string sanitization order and static/source verification. It adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public page rendering routes.

## June 29, 2026 - Preview Link Handoff Hardening

Owner preview opens for Privacy, Terms, and Refund pages must use safe browser handoff flags and bounded diagnostics:

- desktop standalone compliance section: `desktop_compliance_page_open_failed`
- desktop custom-domain embedded compliance section: `desktop_compliance_page_open_failed`
- mobile compliance editor: `mobile_compliance_page_open_failed`

The diagnostic context may include page type, domain presence/length, and page URL presence/length only. The code must not log raw public compliance URLs, raw owner content, API response text, or browser exception payloads. Preview opens use `noopener,noreferrer` and show fixed owner-facing failure copy when blocked.

Cost impact: `$0.00`. This changes only browser-local preview-open behavior and diagnostics; it adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, provider calls, or owner settings.

## June 29, 2026 - Mobile Mutation Response Parse Hardening

Mobile override and reset actions must parse `/api/compliance` mutation responses through `readMobileComplianceMutationResponseJson()`, backed by `readJsonResponseWithLimit()` with an 8KB cap. Malformed or oversized mutation responses log `mobile_compliance_page_response_parse_failed` with bounded compliance type/action/status metadata only. Successful HTTP responses must include `success: true`; missing success logs `mobile_compliance_page_response_invalid` with `mobile_compliance_page_save_response_invalid` or `mobile_compliance_page_reset_response_invalid` and keeps the existing fixed owner-facing failure toast.

Cost impact: `$0.00`. This changes only browser-side mobile response parsing and diagnostics; it adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public page rendering changes.

## June 30, 2026 - Desktop Response Acknowledgement Hardening

Desktop Official Page and custom-domain compliance editors must parse `/api/compliance` mutation responses through `readDesktopComplianceMutationResponseJson()`, backed by `readJsonResponseWithLimit()` with an 8KB cap. Successful save/reset HTTP responses must include `success: true`; missing success logs `desktop_compliance_page_response_invalid` with `desktop_compliance_page_save_response_invalid` or `desktop_compliance_page_reset_response_invalid` and keeps fixed owner-facing failure copy.

Desktop compliance refreshes must parse `/api/compliance` GET responses through `readDesktopComplianceLoadResponseJson()` with a 32KB cap. Malformed, oversized, or non-object load responses log `desktop_compliance_pages_load_response_parse_failed` or `desktop_compliance_pages_load_response_invalid`; rejected load responses log `desktop_compliance_pages_load_failed` with `desktop_compliance_pages_load_rejected`.

Cost impact: `$0.00`. This changes only browser-side desktop response parsing and diagnostics; it adds no Firestore reads/writes beyond existing valid override/reset requests and existing refresh reads, Storage operations, Cloud Functions, API routes, cache invalidations, rules, indexes, schema fields, provider calls, owner settings, or public page rendering changes.

```
Client Request: abc.com/privacy
     │
     ▼
Middleware (src/middleware.ts)
     │ isClient + pathname matches /privacy or /terms
     ▼
Rewrite: /client/privacy
     │
     ▼
Server Component: src/app/client/compliance/CompliancePageContent.tsx
     │
     ├── Resolve store from headers (same pattern as OBP)
     ├── Generate system content from template (pure function, always)
     ├── Check compliancePages/{sId} for custom override
     │     ├── If override exists → use override content
     │     └── If no override → use system content
     ├── Render static HTML page (SSR)
     └── Return minimal, text-first page
```

---

## 2. Database Schema (Overrides-Only Model)

### Design Principle

System content is ALWAYS generated at render time from store data (pure template substitution).
Only custom overrides are stored in Firestore. This eliminates:

- Dual source of truth
- Content drift when templates change
- Staleness detection / regeneration logic
- Migration complexity

### Collection: `compliancePages`

**Document ID:** `{sId}` (storeId — one doc per store)
**Doc only exists if owner has pasted custom content.**

```typescript
interface ComplianceOverrideDoc {
  sId: string | number;
  tId: string | number;
  privacyOverride?: string; // Custom privacy text (only if overridden)
  termsOverride?: string; // Custom terms text (only if overridden)
  modifiedOn: Timestamp;
}
```

### Firestore Rules

```
match /compliancePages/{docId} {
  // Public read — required for verification bots
  allow read: if true;
  // Writes are server-owned. Owner mutations must use /api/compliance.
  allow write: if false;
}
```

The browser mutation DAL is intentionally absent. Authenticated Firebase clients cannot bypass `/api/compliance` granular permission checks, `DATA_WRITE` limiting, the 32KB body cap, Zod action/type validation, plain-text sanitization, or exact session/store admission. The route writes through `src/database/compliance/server.ts` with Firebase Admin after those controls pass.

---

## 3. File Structure

### Core Files

| File                                                   | Purpose                                                | LOC  |
| ------------------------------------------------------ | ------------------------------------------------------ | ---- |
| `src/app/client/compliance/CompliancePageContent.tsx`  | SSR page renderer (async server component)             | ~280 |
| `src/lib/compliance/templates.ts`                      | Privacy, Terms, and Refund template generation + input extraction | ~200 |
| `src/lib/compliance/sanitizer.ts`                      | Content sanitization for custom overrides              | ~55  |
| `src/app/api/compliance/route.ts`                      | GET (read) + POST (override/reset) with withAuth + Zod | ~165 |
| `src/database/compliance/server.ts`                    | Admin-only override read/save/reset DAL                | ~80  |
| `scripts/verification/test-compliance-pages-rules.ts`  | Public-read and client-write-denial emulator regression | ~80  |

### Modified Files (5)

| File                                   | Change                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| `src/app/client/[[...slug]]/page.tsx`  | Route intercept: `/privacy`, `/terms`, and `/refund` → CompliancePageContent |
| `src/app/client/obp/OBPResolvedSurface.tsx` | OBP policy links behind feature flag                         |
| `src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx` | Public menu policy links behind visibility settings |
| `src/constants/database.ts`            | Add `COMPLIANCE_PAGES` to DB_COLLECTIONS                         |
| `functions/src/constants/database.ts`  | Mirror `COMPLIANCE_PAGES` constant                               |
| `firestore.rules`                      | Public read plus server-only write rule for compliancePages      |

---

## 4. Template Generation Function

### Signature

```typescript
function generateComplianceContent(
  type: "privacy" | "terms" | "refund",
  inputs: {
    businessName: string;
    address: string;
    country: string;
    contactEmail: string | null;
    contactPhone: string | null;
  },
): string;
```

### Key Rules

- Pure function — no AI, no external calls, zero cost
- Fixed templates with placeholder injection
- Country-level governing law clause (India vs generic)
- Contact: email preferred, phone as fallback
- Soft legal language only ("may", "generally", "reasonable steps")
- Dual-entity clause: business = content owner, MenuList = technology provider
- "Last Updated" and "Effective Date" derived from generation time

### Template Variables

```
{BUSINESS_NAME}    — store.name
{ADDRESS}          — store.addressLine + city + state
{COUNTRY}          — store.country || 'India'
{CONTACT}          — store.email || store.phoneNumber
{CONTACT_TYPE}     — 'email' | 'phone'
{LAST_UPDATED}     — formatted date string
{EFFECTIVE_DATE}   — same as LAST_UPDATED
```

---

## 5. API Contracts

### GET /api/compliance

**Auth:** `withAuth()` — owner/manager only  
**Purpose:** Get compliance pages data for dashboard editing

**Response:**

```json
{
  "privacy": {
    "content": "...",
    "source": "system",
    "version": 1,
    "lastUpdated": "..."
  },
  "terms": {
    "content": "...",
    "source": "system",
    "version": 1,
    "lastUpdated": "..."
  }
}
```

### POST /api/compliance

**Auth:** `withAuth()` plus `MANAGE_PUBLIC_PRESENCE` or `MANAGE_STORE`
**Purpose:** Save custom override or reset to system

**Request Body:**

```json
{
  "type": "privacy" | "terms" | "refund",
  "action": "override" | "reset",
  "content": "..." // Required for override, ignored for reset
}
```

**Validation (Zod):**

- 32KB bounded JSON body before validation
- `DATA_WRITE` limiter before parsing or writes; limiter keys hash owner and store segments before storage in Upstash
- `type`: enum `['privacy', 'terms', 'refund']`
- `action`: enum `['override', 'reset']`
- `content`: string, max 15000 chars (for override)

---

## 6. SSR Page Renderer

### Route: `src/app/client/[[...slug]]/page.tsx` intercept + `src/app/client/compliance/CompliancePageContent.tsx`

**Server component** — same pattern as OBP.

1. Get tenant info from headers (same as `OBPContent.tsx`)
2. Resolve store (subdomain or custom domain lookup)
3. Check `compliancePages/{sId}` doc
4. If custom → render custom content
5. If system or missing → generate from template using store data
6. If missing store data (no contact) → show "Page not available" message
7. Render minimal HTML page

### Page Layout

```
┌─────────────────────────────────────┐
│  {Business Name}                    │
│  Privacy Policy                     │
│  Last Updated: March 18, 2026       │
│  Effective Date: March 18, 2026     │
├─────────────────────────────────────┤
│                                     │
│  [Content — plain text sections]    │
│                                     │
├─────────────────────────────────────┤
│  Contact:                           │
│  {email or phone}                   │
│  {address}                          │
├─────────────────────────────────────┤
│  Powered by MenuList (subtle)       │
└─────────────────────────────────────┘
```

---

## 7. Sanitization Rules

For custom content overrides:

1. Strip ALL HTML tags
2. Strip `<script>` and event handlers
3. Strip URLs/links (convert to plain text)
4. Normalize whitespace (collapse multiple spaces/newlines)
5. Enforce max length: 15,000 characters
6. Trim leading/trailing whitespace
7. Block empty content (min 100 characters)

---

## 8. OBP Footer Integration

Add to `OBPContent.tsx` footer:

```tsx
<footer className={styles.footer}>
  <span className={styles.footerText}>Official Page · Powered by MenuList</span>
  {FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES && (
    <div className={styles.footerLinks}>
      <a href="/privacy">Privacy</a>
      <span>·</span>
      <a href="/terms">Terms</a>
    </div>
  )}
</footer>
```

---

## 9. Middleware Routing

The existing middleware rewrites client domain requests to `/client/*`. The compliance pages are intercepted in `src/app/client/[[...slug]]/page.tsx` when the first slug is `privacy`, `terms`, or `refund`.

No middleware changes are needed for this feature — the current `[[...slug]]` page handles `/client/privacy`, `/client/terms`, and `/client/refund`.

The middleware rewrites `abc.com/privacy` to `/client/privacy`. The `[[...slug]]` page receives `slug = "privacy"` and renders `CompliancePageContent`.

**Best approach:** Handle inside the existing `[[...slug]]/page.tsx` — detect if slug is "privacy" or "terms", and render the compliance page instead of menu resolution.

---

## 10. Change Detection for Regeneration

When store data changes that affects compliance templates:

- Business name
- Contact email
- Phone number
- Address
- Country

If `source === 'system'` → regenerate content on next page access.  
If `source === 'custom'` → do NOT regenerate (user owns content).

Detection: Compare `generationInputs` snapshot in doc with current store data. If different, regenerate.

---

## 11. Security Checklist

- [x] Public read access (required for bots)
- [x] Write access via `withAuth()` only
- [x] Zod validation on API inputs
- [x] Content sanitization (XSS prevention)
- [x] Max length enforcement
- [x] Tenant isolation (sId scoping)
- [x] No PII exposure beyond what store already shows publicly
- [x] Feature flag gated

---

## 12. Implementation Order

1. Add constants + feature flag
2. Create template generation function
3. Create sanitizer
4. Create DAL
5. Create API route
6. Create SSR page
7. Add OBP footer links
8. Update Firestore rules
9. Type check: `npx tsc --noEmit`
