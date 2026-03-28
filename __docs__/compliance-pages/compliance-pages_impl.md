# Compliance Pages — Implementation Plan

**Status:** 🟡 Implementation Ready  
**Version:** 1.0  
**Date:** March 18, 2026  
**Audience:** Developers

---

## 1. Architecture Overview

```
Client Request: abc.com/privacy
     │
     ▼
Middleware (src/middleware.ts)
     │ isClient + pathname matches /privacy or /terms
     ▼
Rewrite: /_client/compliance/privacy
     │
     ▼
Server Component: src/app/_client/compliance/CompliancePageContent.tsx
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
  sId: number;
  tId: number;
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
  // Write — authenticated users only (API route has withAuth + Zod)
  allow write: if isAuthenticated();
}
```

---

## 3. File Structure

### New Files (5)

| File                                                   | Purpose                                                | LOC  |
| ------------------------------------------------------ | ------------------------------------------------------ | ---- |
| `src/app/_client/compliance/CompliancePageContent.tsx` | SSR page renderer (async server component)             | ~280 |
| `src/lib/compliance/templates.ts`                      | Privacy + Terms template generation + input extraction | ~200 |
| `src/lib/compliance/sanitizer.ts`                      | Content sanitization for custom overrides              | ~55  |
| `src/app/api/compliance/route.ts`                      | GET (read) + POST (override/reset) with withAuth + Zod | ~165 |
| `src/database/compliance/index.ts`                     | DAL functions (get, save, override, reset, create)     | ~140 |

### Modified Files (5)

| File                                   | Change                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| `src/app/_client/[[...slug]]/page.tsx` | Route intercept: `/privacy` and `/terms` → CompliancePageContent |
| `src/app/_client/obp/OBPContent.tsx`   | Footer links (Privacy · Terms) behind feature flag               |
| `src/constants/database.ts`            | Add `COMPLIANCE_PAGES` to DB_COLLECTIONS                         |
| `functions/src/constants/database.ts`  | Mirror `COMPLIANCE_PAGES` constant                               |
| `firestore.rules`                      | Add public read rule for compliancePages                         |

---

## 4. Template Generation Function

### Signature

```typescript
function generateComplianceContent(
  type: "privacy" | "terms",
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

**Auth:** `withAuth()` — owner/manager only  
**Purpose:** Save custom override or reset to system

**Request Body:**

```json
{
  "type": "privacy" | "terms",
  "action": "override" | "reset",
  "content": "..." // Required for override, ignored for reset
}
```

**Validation (Zod):**

- `type`: enum `['privacy', 'terms']`
- `action`: enum `['override', 'reset']`
- `content`: string, max 15000 chars (for override)

---

## 6. SSR Page Renderer

### Route: `src/app/_client/compliance/[type]/page.tsx`

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

The existing middleware already rewrites client domain requests to `/_client/*`. The compliance pages at `/_client/compliance/[type]` will be caught naturally.

No middleware changes needed — the `[[...slug]]` catch-all already handles all paths under `/_client/`.

**Wait — correction:** The current `[[...slug]]` page handles menu/project resolution. We need a separate route for compliance pages. The middleware rewrites `abc.com/privacy` → `/_client/privacy`. The `[[...slug]]` page will receive `slug = "privacy"`.

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
