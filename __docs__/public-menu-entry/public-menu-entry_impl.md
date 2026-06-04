# Public Menu Entry — Technical Implementation Plan

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Production-audited
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** June 3, 2026

---

## 1. Analysis: Existing Infrastructure Reuse

This feature is **80% existing code, 20% new glue.** The table below maps what exists vs what's new.

| Component                             | Exists? | Location                                                   | Reuse Strategy                                  |
| ------------------------------------- | ------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Image optimization (client-side)      | ✅      | `compressor.js` (package.json)                             | Direct reuse — same compression before upload   |
| Firebase Storage upload               | ✅      | `src/database/projects/index.ts`                           | New path: `publicMenuDrafts/{draftId}/`         |
| AI menu extraction                     | ✅      | `functions/src/logic/processMenuImagesJob.ts`              | Queue durable `menuImageProcessingJobs` from the public route and reuse the shared worker |
| Menu preview rendering                | ✅      | `src/components/templates/website/clientWebsite/`          | Reuse `MainContentRenderer` with extracted data |
| QR code generation                    | ✅      | `src/components/.../shareModal/qrCodeView.tsx`             | Reuse QR component on success page              |
| Menu Kit (share assets)               | ✅      | `src/components/.../shareModal/MenuKitSection.tsx`         | Available post-publish                          |
| Auth flow (phone OTP + direct Google fallback) | ✅ | `src/components/auth/PhoneOtpAuthPanel.tsx`, `src/app/(website)/create-menu/CreateMenuClient.tsx`, `src/app/(global-pages)/signin/page.tsx` | Inline WhatsApp OTP before upload; Google is available directly on `/create-menu`; password/passcode fallback stays on the full sign-in route |
| Store + project creation              | ✅      | `src/database/stores/`, `src/database/projects/`           | Used in claim/publish flow                      |
| Public page (`/create-menu`)          | ❌ NEW  | `src/app/(website)/create-menu/page.tsx`                   | New website entry page; source upload/import is gated by auth |
| Draft API route                       | ❌ NEW  | `src/app/api/public/create-menu/route.ts`                  | API — POST/GET authenticated with owner-bound drafts, user rate limit, active draft reuse, and source dedupe |
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
  extractionJobId?: string;

  // AI-detected business info
  detectedBusinessName?: string;
  detectedBusinessType?: string; // From BUSINESS_TYPES constant, or Other fallback
  detectedBusinessCategory?: string; // From BUSINESS_CATEGORIES when known

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

## Durable Extraction

Public create-menu no longer runs extraction inside `src/app/api/public/create-menu/route.ts` after returning the draft response. The route creates a draft, then queues `menuImageProcessingJobs/{jobId}` with `destination.type = "public_menu_draft"` and `skipProjectSave: true`.

`functions/src/logic/processMenuImagesJob.ts` marks the draft `processing`, then updates `publicMenuDrafts/{draftId}` to `completed` with extracted categories/items/languages or `failed` with an owner-safe error.

This keeps the owner preview polling contract simple while reusing the same extraction, validation, hardening, and link-text parser path used by authenticated owner extraction.

For sources supported by the shared menu-intake identity helper, the public route adds `sourceMetadata.identityCheck` to the queued job. The shared worker uses that metadata to keep `detectedBusinessName`, `detectedBusinessType`, and `detectedBusinessCategory` populated for the claim form without restoring the old inline public extraction model. Low-confidence specific types claim as canonical `Other`, preserving the broad category when visible.

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

### 2.1B Claimed OBP Defaults

When a draft is claimed, the conversion path creates a real store/project and also fills the first Official Business Page from facts already supplied by the owner or extracted from the menu.

Applied defaults:

- `store.publicPresence.descriptor` from resolved business type, except canonical `Other`.
- `store.publicPresence.accentColor` from extracted brand accent color when available.
- `store.publicPresence.whatsappNumber` from the owner-confirmed public phone/WhatsApp number.
- `store.publicPresence.showCall`, `showWhatsApp`, `showDirections`, and `showFeedback` default to enabled when backed by real phone/address/menu data.
- `store.businessAttributes` from explicit high-confidence extraction suggestions and deterministic menu dietary tags.

Rules:

- Existing owner values win. Existing stores receive only missing defaults.
- Unpaid, unexpired starter OBPs show inactive placeholders for missing public profile/action slots such as Call, WhatsApp, Directions, Reserve, Order, Reviews, Instagram, Facebook, YouTube, and Website.
- Sparse unpaid starter OBPs use a compact centered desktop layout instead of the full two-column desktop grid, preventing empty left/right whitespace when the business has not added cover photos, gallery photos, map embed, or menu project images yet.
- Sparse unpaid starter OBPs may also show inactive Service Options and Payment Options preview tiles. These tiles are visual setup placeholders, not stored `businessAttributes`.
- Menu CTAs render a deterministic placeholder thumbnail when a project image is missing, so the menu card/CTA stays visually balanced without a Storage upload or generated image.
- Placeholder controls are presentation-only buttons. They do not write fake store data, do not use MenuList-owned WhatsApp/Instagram/website/social links, and do not navigate outbound.
- Paid/live stores show only real owner-configured data. Placeholders are removed once `activePlanType` exists or `starterActivationStatus` is `active_paid`.

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
ENABLE_PUBLIC_MENU_ENTRY: true, // Public page active; source processing requires auth

// functions/src/constants/features.ts (mirror)
ENABLE_PUBLIC_MENU_ENTRY: true,
```

---

## 3. File Structure

### New Files (8 files)

```
src/app/(website)/create-menu/
├── page.tsx                          // Public entry page with auth gate before source processing
├── CreateMenuClient.tsx              // Client component — upload + progress UI
├── preview/
│   └── [draftId]/
│       └── page.tsx                  // Preview page (server component, reads draft)
├── PreviewClient.tsx                 // Client component — menu preview + CTA
└── success/
    └── page.tsx                      // Post-publish success page (auth required)

src/app/api/public/create-menu/
├── route.ts                          // POST: authenticated upload/link import + trigger extraction; GET: owner-bound preview status
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

**Auth:** `withAuth()` — owner must be signed in before source upload/import
**Rate Limit:** 5 new extraction attempts per user per 24 hours (using `PUBLIC_MENU_ENTRY_AUTH` rate limit config). Active pending/processing drafts and same-source completed drafts are reused before creating new Storage or AI jobs.
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
  reusedDraft?: boolean; // true when active/completed owner draft is reused
  status: "processing"; // Extraction is async
}
```

**Error Responses:**

- `401` — Authentication required
- `403` — Authenticated owner does not own the draft (GET)
- `429` — User rate limit exceeded
- `400` — Invalid file type/size or missing link permission confirmation
- `404` — Feature disabled
- `404` — Link input disabled by `ENABLE_MENU_LINK_IMPORT`
- `500` — Upload/extraction failure

**Flow:**

1. Validate feature flag
2. Validate authenticated session
3. Validate source: image file type/size or permission-confirmed public menu link
4. Reuse any active pending/processing owner draft before creating new work
5. Reuse same-source owner drafts by `contentHash` or link `sourceInputHash` when available
6. Check `PUBLIC_MENU_ENTRY_AUTH` user rate limit before new Storage/AI work
7. For links, acquire the source through the same SSRF-safe helper used by authenticated Menu Link Import
8. Upload client-optimized image or acquired link artifact to Storage: `publicMenuDrafts/{draftId}/{filename}`
9. Store a stable Firebase download-token URL for preview and source-file continuity after claim
10. Create Firestore draft doc with `createdByUId`, `contentHash`, `extractionStatus: 'pending'`, and 24h TTL
11. Queue `menuImageProcessingJobs/{jobId}` with `destination.type = "public_menu_draft"`
12. Return draftId immediately

### 4.2 GET `/api/public/create-menu?draftId={token}`

**Auth:** `withAuth()` — only `draft.createdByUId` may poll the draft
**Purpose:** Poll extraction status for the signed-in owner

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
    detectedBusinessCategory?: string;
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
  businessCategory: z.string().optional(),
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
  officialPageUrl: string; // tenant root / OBP URL
  menuUrl: string; // canonical published menu URL
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

## 5. Durable Extraction Job

**Location:** `src/app/api/public/create-menu/route.ts` and `functions/src/logic/processMenuImagesJob.ts`
**Type:** Durable `menuImageProcessingJobs` entry with `destination.type = "public_menu_draft"`
**Purpose:** Run extraction through the shared worker and write completion/failure back to `publicMenuDrafts/{draftId}`.

**Reuses:**

- Shared extraction worker (`processMenuImagesJobLogic`)
- Shared source validation and extraction hardening
- Shared deterministic link-text parser for imported text artifacts
- Shared job status/error lifecycle

**Does not write:**

- `projects/{tId}/{sId}` before the owner claims the draft
- Any public menu output before authenticated claim/publish
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
- Live URL: canonical published menu URL, plus the tenant root official business page URL
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
- [x] Queue extraction through `menuImageProcessingJobs` instead of keeping AI work inline in the public API route
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

### ADR-1: Why keep a separate `publicMenuDrafts` collection?

**Decision:** Keep `publicMenuDrafts` for temporary owner-bound preview state, but queue extraction through `menuImageProcessingJobs`.

**Reason:** Drafts still have no real tenant/store/project until claim, so preview state and TTL cleanup belong in `publicMenuDrafts`. The draft is still attached to `createdByUId` so preview polling, reuse, dedupe, and claim stay owner-bound. Extraction work belongs in the central durable job queue with `destination.type = "public_menu_draft"`.

### ADR-2: Why durable server-side extraction (not client-side or request-lifecycle AI)?

**Decision:** The API route uploads the source, creates the draft, and queues a durable extraction job.

**Reason:** Gemini API keys must stay server-side, and extraction should not depend on the public API request staying alive after the response. The shared worker already handles model calls, validation, source hardening, and terminal job status.

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
| 3     | Rate limiting              | ✅     | PUBLIC_MENU_ENTRY_AUTH config (5/24h/user) |
| 3     | Auth-first cost guard      | ✅     | POST/GET require auth; active/same-source drafts reuse before new AI |
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
