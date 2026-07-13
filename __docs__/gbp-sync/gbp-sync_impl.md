# 🔧 GBP SYNC — Implementation Plan

**Feature:** #3 — Google Business Profile Minimal Sync  
**Version:** 1.1
**Status:** Source scaffold present; provider integration blocked by GBP API/OAuth/provider gates
**Last Updated:** July 10, 2026
**Author:** Lead Architect (Cascade)

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

---

## Current Runtime Boundary

Current source truth:

- `ENABLE_GBP_SYNC` is `false` in `src/config/features.ts`.
- `src/database/integrations/gbp.ts` defines the server-only token document shape and path helper, but all token operations throw `GBP_TOKEN_STORE_DISABLED`.
- `src/components/templates/main-app/businessSettings/tabs/IntegrationsTab.tsx` gates the Google Business Profile card behind `gbpEnabled`; the shared Integrations tab may still show Platform Pull API controls.
- No active Google OAuth route, callback route, connect-location route, disconnect route, apply-hours route, nightly GBP sync worker, or scheduler task is current runtime.
- Current owner behavior is manual Google handoff using the Official Business Page/menu link.

This file is a reserved implementation blueprint until API access, OAuth setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke exist.

## 📊 CHATGPT vs CODEBASE ANALYSIS

### ChatGPT Suggestions vs Reality

| ChatGPT Suggestion                        | Codebase Reality                             | Verdict    | Action                         |
| ----------------------------------------- | -------------------------------------------- | ---------- | ------------------------------ |
| OAuth flow for GBP                        | Existing Google OAuth is for user login only | ⚠️ PARTIAL | Create SEPARATE OAuth client   |
| Token storage at `integrations/gbpTokens` | No integrations collection exists            | ⚠️ PARTIAL | Create DAL + DB constant first |
| Store schema with `gbp`, `gbpState`       | `StoreDataType` has NO gbp fields            | ⚠️ PARTIAL | Extend types first             |
| Nightly job pattern                       | `masterScheduler.ts` exists                  | ✅ VALID   | Add to existing scheduler      |
| MOL logging                               | `mol.types.ts` pattern exists                | ✅ VALID   | Add new event types            |
| Feature flag                              | `features.ts` pattern exists                 | ✅ VALID   | Add `ENABLE_GBP_SYNC`          |
| Settings UI "Public Presence"             | No such section exists                       | ⚠️ PARTIAL | Add to Business Settings       |

### Explicit Disagreements with ChatGPT

**Disagreement 1: OAuth Client Reuse**

> ChatGPT implied existing Google OAuth could be extended. **WRONG.** The `GoogleProvider` in `src/lib/auth/index.ts` is for USER authentication. GBP API requires Business Profile API scopes which CANNOT be added to user login flow.
>
> **Resolution:** Separate OAuth client with dedicated env vars.

**Disagreement 2: Firestore Path Assumption**

> ChatGPT assumed `tenants/{tId}/integrations/gbpTokens` exists. **WRONG.** No integrations collection in codebase.
>
> **Resolution:** Add `INTEGRATIONS` to `DB_COLLECTIONS`, create DAL following existing patterns.

---

## 📁 FILE STRUCTURE

### Files to Modify

| File                          | Change                        | Priority |
| ----------------------------- | ----------------------------- | -------- |
| `src/types/platform/store.ts` | Add `gbp`, `gbpState` types   | P0       |
| `src/constants/database.ts`   | Add `INTEGRATIONS` collection | P0       |
| `src/types/mol.types.ts`      | Add GBP event types           | P0       |
| `src/config/features.ts`      | Add `ENABLE_GBP_SYNC` flag    | P0       |
| `firestore.rules`             | Deny client access to tokens  | P1       |

### Files to Create

| File                                                     | Purpose                     | Priority |
| -------------------------------------------------------- | --------------------------- | -------- |
| `src/database/integrations/gbp.ts`                       | GBP token DAL (server-only) | P0       |
| `src/app/api/integrations/gbp/auth-url/route.ts`         | OAuth initiation            | P1       |
| `src/app/api/integrations/gbp/callback/route.ts`         | OAuth callback              | P1       |
| `src/app/api/integrations/gbp/connect-location/route.ts` | Location mapping            | P1       |
| `src/app/api/integrations/gbp/disconnect/route.ts`       | Disconnect GBP              | P1       |
| `src/app/api/integrations/gbp/apply-hours/route.ts`      | Manual hours sync           | P1       |
| `functions/src/integrations/gbpSync.ts`                  | Nightly sync job            | P1       |

### UI Integration Point

**Location:** `src/components/templates/main-app/businessSettings/index.tsx`

Add new tab to `TAB_ITEMS_LIST`:

```typescript
{
    key: 'integrations',
    label: 'Integrations',
    icon: <LuLink />,
    tab: <IntegrationsTab scrollRef={scrollRefs.current[9]} />
}
```

---

## 🗄️ DATABASE SCHEMA

### 1. StoreDataType Extension

**File:** `src/types/platform/store.ts`

```typescript
// Add after chatAnalytics field (~line 109)

// Google Business Profile Integration
gbp?: {
    isConnected: boolean;
    accountId?: string;           // GBP account resource id
    locationId?: string;          // GBP location resource id
    locationName?: string;        // Cached display name
    locationAddress?: string;     // Cached short address
    connectedOn?: Timestamp;
    connectedBy?: string;
    modifiedOn?: Timestamp;
    modifiedBy?: string;
    menuLinkMode: 'MANAGED' | 'OFF';  // Default: MANAGED
};

// GBP sync state (internal, not shown to user)
gbpState?: {
    lastCheckedOn?: Timestamp;
    expectedUrl?: string;
    currentUrl?: string | null;
    linkStatus: 'OK' | 'MISSING' | 'WRONG' | 'UNKNOWN' | 'NOT_WRITABLE';
    hoursStatus: 'OK' | 'MISMATCH' | 'UNKNOWN' | 'NOT_WRITABLE';
    lastHoursSnapshotHash?: string;  // Detect changes without storing full data
    lastFixAttemptOn?: Timestamp;
    lastFixResult?: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    failureReason?: string;
};
```

### 2. Token Storage Schema

**Path:** `tenants/{tId}/integrations/gbp/{sId}`

```typescript
interface GBPTokenDoc {
  accessToken: string;
  refreshToken: string;
  expiryDate: number; // epoch ms
  scope: string;
  tokenType: string;

  // Audit fields
  createdOn: Timestamp;
  createdBy: string;
  modifiedOn: Timestamp;
  modifiedBy: string;
}
```

### 3. DB_COLLECTIONS Addition

**File:** `src/constants/database.ts`

```typescript
// Add to DB_COLLECTIONS object
INTEGRATIONS: "integrations",
```

---

## 🔐 MOL EVENT TYPES

**File:** `src/types/mol.types.ts`

```typescript
// Add to MOLEventType union
| "GBP_CONNECTED"
| "GBP_DISCONNECTED"
| "GBP_SYNC_CHECKED"
| "GBP_MENU_LINK_AUTO_FIXED"
| "GBP_HOURS_MISMATCH_DETECTED"
| "GBP_HOURS_APPLIED_MANUAL"
| "GBP_AUTH_REVOKED"

// Add to MOLEntityType union
| "GBP_INTEGRATION"
```

---

## 🚩 FEATURE FLAG

**File:** `src/config/features.ts`

```typescript
/**
 * Google Business Profile Sync (Feature #3)
 *
 * true: GBP integration enabled (OAuth, nightly sync, hours apply)
 * false: GBP features hidden, no sync jobs run
 *
 * Prerequisites:
 * - GBP API access approved by Google
 * - OAuth client configured
 * - GOOGLE_GBP_CLIENT_ID and GOOGLE_GBP_CLIENT_SECRET set
 *
 * What It Does:
 * - Auto-syncs menu link to GBP nightly
 * - Detects hours drift (read-only)
 * - Manual hours apply button
 *
 * What It Does NOT Do (reserved provider scope):
 * - Reviews, posts, photos, Q&A
 * - Auto-hours write without approval
 * - Performance analytics
 */
ENABLE_GBP_SYNC: false,  // Default OFF until prerequisites met
```

---

## 🔗 API ROUTES

### 1. Generate Auth URL

**Endpoint:** `GET /api/integrations/gbp/auth-url`

**Query:** `?tId=...&sId=...`

**Response:**

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "signed-jwt-containing-tId-sId-userId"
}
```

**Security:**

- Validate session (withAuth)
- Verify user has access to store
- Sign state param with JWT secret

### 2. OAuth Callback

**Endpoint:** `GET /api/integrations/gbp/callback`

**Query:** `?code=...&state=...`

**Flow:**

1. Validate state JWT
2. Exchange code for tokens
3. Save tokens to Firestore (server-only)
4. Fetch GBP accounts
5. Fetch locations for account
6. Return locations list or redirect to selection UI

### 3. Connect Location

**Endpoint:** `POST /api/integrations/gbp/connect-location`

**Body:**

```json
{
  "tId": "...",
  "sId": "...",
  "accountId": "...",
  "locationId": "...",
  "confirmed": true
}
```

**Flow:**

1. Validate session + store access
2. Fetch location details from GBP API
3. Store mapping in `stores/{sId}.gbp`
4. Compute + store `expectedUrl`
5. Log `GBP_CONNECTED` event

### 4. Disconnect

**Endpoint:** `POST /api/integrations/gbp/disconnect`

**Body:**

```json
{
  "tId": "...",
  "sId": "..."
}
```

**Flow:**

1. Set `gbp.isConnected = false`
2. Optionally delete tokens
3. Log `GBP_DISCONNECTED` event

### 5. Apply Hours

**Endpoint:** `POST /api/integrations/gbp/apply-hours`

**Body:**

```json
{
  "tId": "...",
  "sId": "..."
}
```

**Flow:**

1. Verify store connected
2. Load + refresh tokens
3. Convert MenuList `workingHours` to GBP format
4. Patch GBP location `regularHours`
5. Update `gbpState.hoursStatus = 'OK'`
6. Log `GBP_HOURS_APPLIED_MANUAL` event

---

## ⏰ NIGHTLY SYNC JOB

### Trigger

Add to `masterScheduler.ts` or create separate Cloud Function:

```typescript
// Schedule: '0 2 * * *' (2 AM UTC)
// Function: gbpNightlySync
```

### Algorithm

```
For each store where gbp.isConnected == true:

Step A: Load tokens
  - Read tokens from Firestore
  - Refresh if expired
  - If refresh fails → disconnect + log GBP_AUTH_REVOKED

Step B: Read GBP Location
  - Fetch: websiteUri, regularHours
  - Note: Only read regularHours (ignore specialHours in the reserved provider scope)

Step C: Menu Link Decision (websiteUri ONLY)
  Inputs: expectedUrl, currentUrl (from websiteUri), menuLinkMode, isWritable

  if menuLinkMode == 'OFF':
    linkStatus = 'OK' (don't check)
  else if currentUrl == expectedUrl:
    linkStatus = 'OK'
  else if currentUrl is null/empty:
    linkStatus = 'MISSING'
    shouldUpdate = true
  else:
    linkStatus = 'WRONG'
    shouldUpdate = true

Step D: Apply Link Update (if shouldUpdate)
  - Update websiteUri to expectedUrl
  - Log GBP_MENU_LINK_AUTO_FIXED
  - Note: Only websiteUri is managed. Separate "menu URL" field (if exists) is NOT touched.

Step E: Hours Drift Check (Weekly Hours ONLY)
  - Compute menuListHours from store.workingHours + timezone
  - Compare with GBP regularHours (ignore specialHours)
  - if store has overnight hours (close time < open time):
      hoursStatus = 'UNKNOWN'  // Skip comparison, avoid false mismatch
  - else if mismatch:
      hoursStatus = 'MISMATCH'
      log GBP_HOURS_MISMATCH_DETECTED
  - else:
      hoursStatus = 'OK'

Step F: Persist State
  - Update gbpState document
  - Log GBP_SYNC_CHECKED
```

---

## 🛡️ SECURITY

### Token Protection

1. **Firestore Rules:**

```javascript
match /tenants/{tId}/integrations/{doc=**} {
  allow read, write: if false;  // Server-only
}
```

2. **API Route Protection:**

- All routes use `withAuth` middleware
- Verify user has store access before operations
- Tokens never sent to client

### OAuth Security

1. **State Param:** Signed JWT containing tId, sId, userId
2. **PKCE:** Recommended for added security
3. **Scope Minimization:** Only request required Business Profile scopes

---

## Implementation Areas

### Source Scaffold

| #   | Task                                   | File                                        | Status |
| --- | -------------------------------------- | ------------------------------------------- | ------ |
| 1   | Add `gbp`, `gbpState` to StoreDataType | `src/types/platform/store.ts`               | ✅ source scaffold |
| 2   | Add `INTEGRATIONS` to DB_COLLECTIONS   | `src/constants/database.ts`                 | ✅ source scaffold |
| 3   | Add GBP event types to MOL             | `src/types/mol.types.ts`                    | ✅ source scaffold |
| 4   | Add `ENABLE_GBP_SYNC` feature flag     | `src/config/features.ts`                    | ✅ false by default |
| 5   | Create integrations DAL skeleton       | `src/database/integrations/gbp.ts`          | ✅ fail-closed token store |
| 6   | Add UI stub in Business Settings       | `businessSettings/tabs/IntegrationsTab.tsx` | ✅ GBP card hidden while flag off |

### Reserved Provider Connection

| #   | Task                             | File                                             | Status |
| --- | -------------------------------- | ------------------------------------------------ | ------ |
| 7   | Implement auth-url route         | `api/integrations/gbp/auth-url/route.ts`         | Not current runtime |
| 8   | Implement callback route         | `api/integrations/gbp/callback/route.ts`         | Not current runtime |
| 9   | Implement connect-location route | `api/integrations/gbp/connect-location/route.ts` | Not current runtime |
| 10  | Implement disconnect route       | `api/integrations/gbp/disconnect/route.ts`       | Not current runtime |
| 11  | Add Firestore security rules     | `firestore.rules`                                | Required before activation |

### Reserved Sync And Apply

| #   | Task                         | File                                          | Status |
| --- | ---------------------------- | --------------------------------------------- | ------ |
| 12  | Implement sync worker        | `functions/src/integrations/gbpSync.ts`       | Not current runtime |
| 13  | Add to scheduler             | `functions/src/schedulers/masterScheduler.ts` | Not current runtime |
| 14  | Implement apply-hours route  | `api/integrations/gbp/apply-hours/route.ts`   | Not current runtime |
| 15  | Complete Integrations UI tab | `businessSettings/tabs/IntegrationsTab.tsx`   | Hidden scaffold only |

### Required Hardening Before Activation

| #   | Task                         | Status |
| --- | ---------------------------- | ------ |
| 16  | Rate limiting implementation | Required before activation |
| 17  | Error handling + retry logic | Required before activation |
| 18  | Provider smoke and browser/device QA | Required before activation |
| 19  | Scoped deploy and production-host smoke | Required before activation |

---

## 🧪 TESTING GUIDE

### OAuth Flow Tests

| #   | Test                   | Expected Result                    |
| --- | ---------------------- | ---------------------------------- |
| 1   | Click "Connect Google" | Redirects to Google OAuth          |
| 2   | Approve consent        | Returns to app with locations list |
| 3   | Select location        | Mapping saved, status = Connected  |
| 4   | Click "Disconnect"     | Status = Not Connected             |

### Nightly Sync Tests

| #   | Test                      | Expected Result           |
| --- | ------------------------- | ------------------------- |
| 5   | Wrong websiteUrl on GBP   | Gets auto-fixed overnight |
| 6   | Missing websiteUrl on GBP | Gets filled overnight     |
| 7   | menuLinkMode = OFF        | No changes made           |
| 8   | Hours mismatch            | hoursStatus = MISMATCH    |

### Manual Hours Apply Tests

| #   | Test                         | Expected Result   |
| --- | ---------------------------- | ----------------- |
| 9   | Mismatch exists, click Apply | GBP hours updated |
| 10  | Already synced               | Button not shown  |

### Failure Tests

| #   | Test           | Expected Result         |
| --- | -------------- | ----------------------- |
| 11  | Token revoked  | Auto-disconnect + log   |
| 12  | Rate limit hit | Skip + retry next night |
| 13  | GBP API down   | Skip + log error        |

---

## 💰 COST ANALYSIS

| Operation        | Volume (100 stores) | Cost         |
| ---------------- | ------------------- | ------------ |
| Firestore reads  | 100/night           | ~$0.10/month |
| Firestore writes | 100/night           | ~$0.10/month |
| Cloud Function   | Part of scheduler   | ~$0.01/month |
| GBP API calls    | FREE                | $0           |

**Total:** <$1/month for 100 stores

---

## ✅ VALIDATION REPORT

| Requirement              | Status | Evidence                         |
| ------------------------ | ------ | -------------------------------- |
| Feature flag gating      | ⏳     | `ENABLE_GBP_SYNC` in features.ts |
| Separate OAuth client    | ⏳     | New env vars, separate routes    |
| Token security           | ⏳     | Server-only Firestore rules      |
| MOL logging              | ⏳     | 7 new event types                |
| Schema extension         | ⏳     | `gbp`, `gbpState` fields         |
| 3-Year Freeze compliance | ✅     | Extensible schema, feature flags |
| Doctrine alignment       | ✅     | "Correctness, not marketing"     |

---

## 🚫 WHAT NOT TO BUILD

Per ChatGPT + Cascade agreement, DO NOT implement in the reserved provider integration:

- ❌ Review response system
- ❌ Posting/announcements
- ❌ Photo sync
- ❌ Rank/SEO analytics
- ❌ "Growth suggestions"
- ❌ Auto-hours write in background
- ❌ Performance dashboard
- ❌ Push notifications/alerts

---

**DOCUMENT SIGNATURE:** Lead Architect (Cascade)  
**IMPLEMENTATION STATUS:** 🔶 BLOCKED (API Access Required)
