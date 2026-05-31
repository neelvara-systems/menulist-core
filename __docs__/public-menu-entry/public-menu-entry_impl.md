# Public Menu Entry — Technical Implementation Plan

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Production-audited
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** May 20, 2026

---

## 1. Analysis: Existing Infrastructure Reuse

This feature is **80% existing code, 20% new glue.** The table below maps what exists vs what's new.

| Component                             | Exists? | Location                                                   | Reuse Strategy                                  |
| ------------------------------------- | ------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Image optimization (client-side)      | ✅      | `compressor.js` (package.json)                             | Direct reuse — same compression before upload   |
| Firebase Storage upload               | ✅      | `src/database/projects/index.ts`                           | New path: `publicMenuDrafts/{draftId}/`         |
| AI menu extraction (Gemini 2.0 Flash in public route; shared pipeline uses configured AI model) | ✅      | `src/app/api/public/create-menu/route.ts`, `functions/src/logic/processMenuImagesJob.ts` | Reuse core extraction logic and keep model/cost visible |
| Menu preview rendering                | ✅      | `src/components/templates/website/clientWebsite/`          | Reuse `MainContentRenderer` with extracted data |
| QR code generation                    | ✅      | `src/components/.../shareModal/qrCodeView.tsx`             | Reuse QR component on success page              |
| Menu Kit (share assets)               | ✅      | `src/components/.../shareModal/MenuKitSection.tsx`         | Available post-publish                          |
| Auth flow (Google + email)            | ✅      | `src/app/(global-pages)/signin/page.tsx`                   | Redirect with `callbackUrl` param               |
| Store + project creation              | ✅      | `src/database/stores/`, `src/database/projects/`           | Used in claim/publish flow                      |
| Public page (`/create-menu`)          | ❌ NEW  | `src/app/(website)/create-menu/page.tsx`                   | New page in website route group                 |
| Draft API route                       | ❌ NEW  | `src/app/api/public/create-menu/route.ts`                  | New API — POST public + rate-limited for photo or menu link; GET token-based preview |
| Preview page                          | ❌ NEW  | `src/app/(website)/create-menu/preview/[draftId]/page.tsx` | New page — reads draft, renders preview         |
| Draft Firestore collection            | ❌ NEW  | `publicMenuDrafts`                                         | New collection — 24h TTL                        |
| Claim/convert flow                    | ❌ NEW  | `src/app/api/public/create-menu/claim/route.ts`            | New API — withAuth, converts draft → project    |
| Nightly cleanup                       | ❌ NEW  | `functions/src/schedulers/menulistMaintenanceScheduler.ts` | Add task to consolidated MenuList scheduler     |

---

## 2. Database Schema

### 2.1 New Collection: `publicMenuDrafts`

```typescript
interface PublicMenuDraft {
  // Identity
  id: string; // Auto-generated Firestore doc ID
  token: string; // Crypto-random URL token (not doc ID — prevents enumeration)

  // Upload / source
  imageUrl: string; // Firebase Storage URL
  imagePath: string; // Storage path for cleanup
  originalFileName: string;
  fileType: string; // Original MIME type for permanent project file record
  fileSize: number;
  sourceType?: "image_upload" | "menu_link_import";
  sourceMetadata?: {
    sourceUrl?: string;
    finalUrl?: string;
    sourceKind?: string;
    permissionConfirmed?: boolean;
  };

  // Extraction Result
  extractedData: {
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
    languages: string[];
  } | null;
  extractionStatus: "pending" | "processing" | "completed" | "failed";
  extractionError?: string;

  // AI-detected business info
  detectedBusinessName?: string;
  detectedBusinessType?: string; // From BUSINESS_TYPES constant

  // Metadata
  ipHash: string; // SHA-256 hash of IP (for rate limiting, not PII)
  userAgent?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // createdAt + 24 hours

  // Claim state
  claimed: boolean;
  claimedByUId?: string;
  claimedAt?: Timestamp;
  convertedProjectId?: string;
  convertedStoreId?: string;
}
```

**Document ID:** Auto-generated
**URL token:** `crypto.randomUUID()` — used in preview URL, NOT the doc ID
**TTL:** 24 hours from creation
**Index needed:** `token` (equality) — for preview lookup
**Index needed:** `expiresAt` (range) + `claimed` (equality) — for nightly cleanup

### 2.1A Claimed Starter Activation

The 24-hour TTL above applies only to **unclaimed upload drafts**. Once a verified owner claims/publishes the draft, MenuList creates the real tenant/store/project and moves the business into a 7-day starter activation.

Claimed store/tenant fields:

```typescript
{
  onboardingSource: "PUBLIC_MENU_ENTRY",
  starterActivationStatus: "starter_active",
  starterActivatedAt: Timestamp,
  activationDeadline: Timestamp, // starterActivatedAt + 7 days
  subdomain: "business-locality" // permanent public URL namespace
}
```

Rules:

- The public URL and QR are real from starter activation and must not change after payment.
- The owner sees a focused starter workspace, not the full paid dashboard.
- Payment keeps the same public URL live and unlocks operational control.
- Claim/publish writes must revalidate `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`.
- Unpaid starter expiration should preserve a recovery path on the same public identity instead of creating a hard broken link.
- Starter distribution actions are recorded on `stores/{storeId}.starterActivationSignals` from the success page, Use MenuList, mobile Share, and Presence Monitor. The activation target is 2 unique actions in 7 days.

### 2.2 Constants Addition

```typescript
// src/constants/database.ts
PUBLIC_MENU_DRAFTS: 'publicMenuDrafts',

// functions/src/constants/database.ts (mirror)
PUBLIC_MENU_DRAFTS: 'publicMenuDrafts',
```

### 2.3 Feature Flag

```typescript
// src/config/features.ts
ENABLE_PUBLIC_MENU_ENTRY: true, // Public menu creation without auth

// functions/src/constants/features.ts (mirror)
ENABLE_PUBLIC_MENU_ENTRY: true,
```

---

## 3. File Structure

### New Files (8 files)

```
src/app/(website)/create-menu/
├── page.tsx                          // Upload page (public page, no account before upload)
├── CreateMenuClient.tsx              // Client component — upload + progress UI
├── preview/
│   └── [draftId]/
│       └── page.tsx                  // Preview page (server component, reads draft)
├── PreviewClient.tsx                 // Client component — menu preview + CTA
└── success/
    └── page.tsx                      // Post-publish success page (auth required)

src/app/api/public/create-menu/
├── route.ts                          // POST: upload image or import link + trigger extraction (public/rate-limited); GET: token preview status
└── claim/
    └── route.ts                      // POST: claim draft → create store + project (withAuth)

functions/src/schedulers/menulistMaintenanceScheduler.ts // public_menu_draft_cleanup task
```

### Modified Files (4 files)

```
src/constants/database.ts             // +1 collection constant
functions/src/constants/database.ts   // +1 collection constant (mirror)
src/config/features.ts                // +1 feature flag
functions/src/constants/features.ts   // +1 feature flag (mirror)
functions/src/schedulers/menulistMaintenanceScheduler.ts // +1 cleanup task
firestore.indexes.json                // +2 composite indexes
```

---

## 4. API Contracts

### 4.1 POST `/api/public/create-menu`

**Auth:** None (public)
**Rate Limit:** 3 per IP per 24 hours (using `PUBLIC_MENU_ENTRY` rate limit config)
**Feature Gate:** `ENABLE_PUBLIC_MENU_ENTRY` must be true (returns 404 if false)

**Request — photo upload:**

```typescript
// multipart/form-data
{
  image: File; // JPEG, PNG, WebP — max 10MB
}
```

**Request — menu link import:**

```typescript
// application/json
{
  sourceType: "menu_link";
  url: string; // public http/https menu page, PDF, image, or readable offering source
  permissionConfirmed: true; // required
}
```

**Validation (Zod):**

```typescript
const linkSchema = z.object({
  sourceType: z.literal("menu_link"),
  url: z.string().min(8).max(4000),
  permissionConfirmed: z.literal(true),
});
```

**Response (200):**

```typescript
{
  draftId: string; // The URL token (NOT Firestore doc ID)
  previewUrl: string; // /create-menu/preview/{draftId}
  status: "processing"; // Extraction is async
}
```

**Error Responses:**

- `429` — Rate limit exceeded
- `400` — Invalid file type/size or missing link permission confirmation
- `404` — Feature disabled
- `404` — Link input disabled by `ENABLE_MENU_LINK_IMPORT`
- `500` — Upload/extraction failure

**Flow:**

1. Validate feature flag
2. Check IP rate limit
3. Validate source: image file type/size or permission-confirmed public menu link
4. For links, acquire the source through the same SSRF-safe helper used by authenticated Menu Link Import
5. Upload client-optimized image or acquired link artifact to Storage: `publicMenuDrafts/{draftId}/{filename}`
6. Store a stable Firebase download-token URL for preview and source-file continuity after claim
7. Create Firestore draft doc with `extractionStatus: 'pending'`
8. Trigger inline extraction helper (fire-and-forget inside the API route)
9. Return draftId immediately

### 4.2 GET `/api/public/create-menu?draftId={token}`

**Auth:** None (public)
**Purpose:** Poll extraction status

**Response (200):**

```typescript
{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    extractedData?: {
        categories: ExtractedDataCategory[];
        items: ExtractedDataItem[];
        languages: string[];
    };
    detectedBusinessName?: string;
    detectedBusinessType?: string;
    sourceType?: "image_upload" | "menu_link_import";
    error?: string;
}
```

### 4.3 POST `/api/public/create-menu/claim`

**Auth:** `withAuth()` — user must be authenticated before claim/publish
**Purpose:** Convert draft to real store + project

**Request:**

```typescript
{
    draftId: string;          // The URL token
    businessName: string;     // Required — confirmed by owner
    businessType?: string;    // Optional — from BUSINESS_TYPES
    phone?: string;           // Optional
    city?: string;            // Optional
}
```

**Validation (Zod):**

```typescript
const schema = z.object({
  draftId: z.string().min(1),
  businessName: z.string().min(2).max(100),
  businessType: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  addressLine: z.string().optional(),
});
```

**Response (200):**

```typescript
{
  storeId: number;
  projectId: string;
  subdomain: string;
  menuUrl: string; // getMenuUrl(subdomain)
  success: true;
}
```

**Flow:**

1. Verify user is authenticated (`withAuth`)
2. Look up draft by token
3. Verify draft exists, not expired, not already claimed
4. Create tenant (if new user) or use existing
5. Create store with provided business info and starter activation fields
6. Create project with extracted data
7. Publish project (set `isDefault: true`)
8. Mark draft as claimed
9. Revalidate public cache tags: `menu-store-{storeId}`, `store-{storeId}`, `client-stores`
10. Return store/project details and canonical menu URL
11. Client success handler calls `useSession().update()` so the newly claimed tenant/store is available before opening the workspace

---

## 5. Inline Extraction Helper

**Location:** `src/app/api/public/create-menu/route.ts` (`triggerExtraction`)
**Type:** Fire-and-forget server helper inside the Next.js API route
**Purpose:** Run AI extraction on the uploaded image or acquired public menu-link artifact without exposing the Gemini key to the client

**Reuses:**

- Shared Gemini client (`genAIClient`)
- Shared category/business-type helpers
- Shared AI operation logging (`recordAiOperation`)

**Does NOT reuse:**

- Full `processMenuImagesJobLogic` (too coupled to project/session/job queue)
- Separate callable Cloud Function (not needed for v1)

**Flow:**

1. Mark draft as `processing`
2. Download source artifact from Storage
3. Call configured Gemini model with menu extraction prompt; image/PDF sources are sent as inline data, text/HTML-derived artifacts are sent as bounded source text
4. Parse and validate JSON response shape
5. Attempt business name/type detection from content
6. Update draft doc: `extractionStatus: 'completed'`, `extractedData: {...}`

**Error handling:**

- On failure: set `extractionStatus: 'failed'` with a generic owner-safe `extractionError`
- Raw provider/parse errors are only written to secure server logs

---

## 6. UI Components

### 6.1 Upload Page (`/create-menu`)

**Design:** Mobile-first, minimal, single-purpose
**Layout:**

```
┌─────────────────────────────┐
│         MenuList Logo       │
│                             │
│  Turn your current menu     │
│  into a review preview      │
│                             │
│  [Upload photo] [Paste link]│
│  ┌───────────────────────┐  │
│  │   📷 Upload menu      │  │
│  │   or paste public     │  │
│  │   menu link           │  │
│  └───────────────────────┘  │
│                             │
│  ✓ Free preview first      │
│  ✓ Review before publishing│
│  ✓ Works for any business  │
│                             │
│  [How it works ↓]           │
└─────────────────────────────┘
```

**Components:**

- File input with drag-drop + camera capture (`accept="image/*"`)
- Menu link input with owner permission confirmation
- Client-side image optimization (Compressor.js — max 1920px, 80% quality)
- Upload progress indicator
- Processing state with animation
- Error states (file too large, wrong format, invalid/unsafe/unreadable link, rate limited)

### 6.2 Preview Page (`/create-menu/preview/{draftId}`)

**Design:** Full-width menu preview + sticky CTA footer
**Layout:**

```
┌─────────────────────────────┐
│  Your menu is ready!        │
│                             │
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   [Full menu preview  │  │
│  │    using existing     │  │
│  │    MainContentRenderer│  │
│  │    components]        │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Detected: "Pizza Roma"     │
│  Type: Restaurant           │
│                             │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ Publish as your       │  │
│  │ official menu page    │  │
│  │                       │  │
│  │ [Create official      │  │
│  │  menu source]         │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**States:**

- `pending/processing` → Loading animation ("Extracting your menu...")
- `completed` → Full menu preview + CTA
- `failed` → Error message + "Try again" button
- `expired` → "Draft expired" + "Upload again" CTA

### 6.3 Success Page (`/create-menu/success`)

**Auth required:** Yes (redirected here after claim)
**Shows:**

- Confirmation: "Your menu page is live!"
- Live URL: canonical MenuList customer URL from `getMenuUrl(subdomain)`
- QR code (reuse `QRCodeView` component)
- Share buttons (WhatsApp, copy link)
- "Add to Google Maps" guidance
- "Open setup workspace" CTA

---

## 7. Security

| Concern               | Mitigation                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| Bot abuse             | IP-based rate limiting (3/day), file type validation, max file size, SAFE_MODE kill switch |
| Storage abuse         | 24h TTL auto-cleanup, max 10MB per upload                                              |
| Draft enumeration     | URL uses crypto-random token, NOT sequential IDs                                       |
| Cost spikes           | Rate limit caps max daily Gemini calls. Feature flag kill switch.                      |
| XSS in extracted data | All extracted text rendered through React (auto-escaped)                               |
| Unclaimed data (GDPR) | 24h auto-delete. No PII stored (IP is hashed).                                         |

---

## 8. Nightly Cleanup (Addition to Existing Scheduler)

**Location:** `functions/src/schedulers/menulistMaintenanceScheduler.ts` — `public_menu_draft_cleanup` task in the consolidated MenuList maintenance scheduler.

```typescript
// Task: public_menu_draft_cleanup
// Daily at 03:30 UTC, max 100 expired unclaimed drafts per run.
// Deletes the temporary Storage image and the publicMenuDrafts document.
```

**Cost:** Negligible — one query per daily due run, one Storage delete per expired draft, and batch document deletes.

---

## 9. Implementation Phases

### Phase 1: Foundation (Core Flow)

- [x] Add feature flag + DB constant (both frontend + CF)
- [x] Create `publicMenuDrafts` collection schema
- [x] Create upload API route (`/api/public/create-menu`)
- [x] Keep extraction inline in the public API route for v1
- [x] Create upload page UI (`/create-menu`)
- [x] Create preview page UI (`/create-menu/preview/[draftId]`)
- [x] Add Firestore indexes

### Phase 2: Claim & Publish

- [x] Create claim API route (`/api/public/create-menu/claim`)
- [x] Create success page (`/create-menu/success`)
- [x] Implement draft → project conversion
- [x] Wire auth redirect flow (signin → return to preview)
- [x] QR code + share link on success page

### Phase 3: Polish & Safety

- [x] Rate limiting configuration
- [x] Nightly cleanup step
- [x] Error states (all edge cases)
- [x] Loading/progress animations
- [x] Mobile optimization
- [x] Image validation (format + size)
- [x] Terms acceptance remains in authenticated account flow

### Phase 4: Type Check & Verification

- [ ] `npx tsc --noEmit` — zero errors
- [ ] Test happy path end-to-end
- [ ] Test rate limiting
- [ ] Test draft expiry
- [ ] Test claim flow with new + existing user

---

## 10. ADRs (Architecture Decision Records)

### ADR-1: Why a separate `publicMenuDrafts` collection?

**Decision:** New collection, not reusing `menuImageProcessingJobs` or `projects`.

**Reason:** The existing job queue is tightly coupled to authenticated sessions (requires `tId`, `sId`, `uId`). Public drafts have no tenant context until claim. A separate collection keeps concerns clean and allows easy TTL cleanup without affecting real jobs.

### ADR-2: Why server-side extraction (not client-side)?

**Decision:** API route uploads the image and runs the narrow extraction helper server-side.

**Reason:** Gemini API key must stay server-side. Client-side extraction would expose the key. Keeping the helper in the API route avoids a separate Cloud Function while still allowing SAFE_MODE, rate limiting, secure logging, and AI operation accounting before the model call.

### ADR-3: Why no editor on preview page?

**Decision:** Preview is read-only. Editing available only after publish in dashboard.

**Reason:** Building an editor in the intake preview adds massive complexity (state management, save logic, auth transitions). The value proposition is "see your menu digitized" — editing is a dashboard feature.

### ADR-4: Why 24-hour TTL?

**Decision:** Unclaimed drafts expire after 24 hours.

**Reason:** Balance between giving owners time to return and controlling storage/cost. 24h covers "I'll sign up tomorrow morning." Shorter (1h) is too aggressive. Longer (7d) accumulates too much unclaimed data.

### ADR-5: Why image-only (no PDF) in v1?

**Decision:** Single image upload only. No PDF support.

**Reason:** PDF extraction requires `pdfjs-dist` processing (already exists for authenticated flow) but adds complexity for the public pipeline. Image from phone camera is the most common SMB use case. PDF can be added in v2 if demand exists.

---

## 11. Progress Tracking

| Phase | Task                       | Status | Notes                                  |
| ----- | -------------------------- | ------ | -------------------------------------- |
| 1     | Feature flag + DB constant | ✅     | Both frontend + CF                     |
| 1     | Upload API route           | ✅     | POST + GET endpoints                   |
| 1     | Extraction logic           | ✅     | Inline in API route (not separate CF)  |
| 1     | Upload page UI             | ✅     | Mobile-first                           |
| 1     | Preview page UI            | ✅     | With polling + claim form              |
| 2     | Claim API route            | ✅     | withAuth, atomic transaction           |
| 2     | Success page               | ✅     | QR hint, WhatsApp share, GBP hint      |
| 2     | Auth redirect flow         | ✅     | ?claim=true param handling             |
| 3     | Rate limiting              | ✅     | PUBLIC_MENU_ENTRY config (3/24h/IP)    |
| 3     | SAFE_MODE check            | ✅     | Added during audit                     |
| 3     | Nightly cleanup            | ✅     | Consolidated scheduler task            |
| 3     | Error states               | ✅     | All edge cases covered                 |
| 4     | Type check                 | ✅     | Zero errors                            |
| 4     | Firestore indexes          | ✅     | 1 composite index                      |

---

## 12. Post-Implementation Audit (March 11, 2026)

### Bugs Found & Fixed

| #     | Severity    | Issue                                                                                                                                    | Fix                                                                                                                                                                                       |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1    | 🔴 CRITICAL | Wrong Gemini SDK — used `@google/generative-ai` (old) instead of `@google/genai` via `genAIClient`                                       | Rewrote extraction to use `genAIClient.models.generateContent()` matching all other AI routes                                                                                             |
| F2/F3 | 🔴 CRITICAL | `file.makePublic()` — Storage may block public access; short-lived signed URLs break claimed project source previews                    | Replaced with stable Firebase download-token URLs and unclaimed draft cleanup                                                                                                             |
| F4    | 🟡 MEDIUM   | Memory leak — `URL.createObjectURL` never revoked in CreateMenuClient                                                                    | Added `useEffect` cleanup that revokes URL on unmount/change                                                                                                                              |
| F6    | 🟢 LOW      | `MIN_DIMENSION` constant declared but never used                                                                                         | Removed                                                                                                                                                                                   |
| F10   | 🟡 MEDIUM   | No SAFE_MODE check before Gemini call — AI operations should be blockable during maintenance                                             | Added `checkSafeMode()` before rate limiting                                                                                                                                              |
| G1    | 🔴 CRITICAL | Claim flow completely disconnected — after auth, preview page had no way to trigger claim API. No business name form, no publish button. | Added `isClaimMode` detection via `?claim=true` URL param, business name input (pre-filled from AI detection), publish button calling claim API, redirect to success page with URL params |
| U1    | 🟡 MEDIUM   | `capture="environment"` forces camera on mobile — prevents gallery selection                                                             | Removed attribute — mobile now shows both camera and gallery options                                                                                                                      |

### Architectural Deviation from Spec

| Spec Said                                   | Actual                           | Reason                                                                                                        |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Separate Cloud Function `extractPublicMenu` | Extraction inline in API route   | Simpler for v1 — avoids separate CF deployment. Same Gemini call, just runs in Next.js API route server-side. |
| `file.makePublic()` for image URL           | Firebase download-token URL      | Stable after claim and consistent with WhatsApp onboarding source-file handling                              |

## 13. Production Audit Update (May 20, 2026)

### Additional Bugs Found & Fixed

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| P1 | 🔴 CRITICAL | Public upload was still effectively account-first in the website flow. | Removed the pre-upload session gate; upload + preview now happen before auth, and claim remains authenticated. |
| P2 | 🔴 CRITICAL | Claim creation could partially create project/store state if a later write failed. | Moved draft validation, tenant/store creation, project creation, summary sync, and draft conversion into one Firestore transaction. |
| P3 | 🟡 MEDIUM | Claimed project files used source image URLs that could expire or disappear. | Public uploads now store stable Firebase download-token URLs and keep `fileType`/`fileSize` on the draft for project file metadata. |
| P4 | 🟡 MEDIUM | New account sessions could stay stale after claim because the JWT/user context cache still had no tenant/store. | Preview claim now calls `useSession().update()` before redirecting to the success/workspace path. |
| P5 | 🔴 CRITICAL | Razorpay entitlement sync updated `stores/{storeId}` but did not mirror `activePlanType` into the scheduler-readable nested `storesSummary.stores[storeId]` shape. | Billing sync and subscription reconciliation now write the nested `stores.{storeId}` map, and the shared tenant/store creation helper writes new store summary rows in that same shape. |

### Remaining Deferred Items

1. **Firestore security rules hardening** — Default deny covers `publicMenuDrafts`; keep explicit rules and index deployment aligned during release.
2. **Hosted Razorpay checkout completion** — Signed webhook processing is verified locally, but hosted recurring checkout still depends on Razorpay merchant recurring/autopay capability.
3. **WhatsApp sandbox sweep** — Required before production traffic because inbound media/webhook delivery depends on real Meta test app credentials.

---

**Document Signature:** MenuList Technical Implementation
**Audience:** Developers
**Last Updated:** May 20, 2026
