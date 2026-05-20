# Public Menu Entry — Technical Implementation Plan

**Version:** 1.0
**Status:** 📝 DRAFT — Pending review
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** March 10, 2026

---

## 1. Analysis: Existing Infrastructure Reuse

This feature is **80% existing code, 20% new glue.** The table below maps what exists vs what's new.

| Component                             | Exists? | Location                                                   | Reuse Strategy                                  |
| ------------------------------------- | ------- | ---------------------------------------------------------- | ----------------------------------------------- |
| Image optimization (client-side)      | ✅      | `compressor.js` (package.json)                             | Direct reuse — same compression before upload   |
| Firebase Storage upload               | ✅      | `src/database/projects/index.ts`                           | New path: `publicMenuDrafts/{draftId}/`         |
| AI menu extraction (Gemini 2.5 Flash) | ✅      | `functions/src/logic/processMenuImagesJob.ts`              | Reuse core extraction logic via callable CF     |
| Menu preview rendering                | ✅      | `src/components/templates/website/clientWebsite/`          | Reuse `MainContentRenderer` with extracted data |
| QR code generation                    | ✅      | `src/components/.../shareModal/qrCodeView.tsx`             | Reuse QR component on success page              |
| Menu Kit (share assets)               | ✅      | `src/components/.../shareModal/MenuKitSection.tsx`         | Available post-publish                          |
| Auth flow (Google + email)            | ✅      | `src/app/(global-pages)/signin/page.tsx`                   | Redirect with `callbackUrl` param               |
| Store + project creation              | ✅      | `src/database/stores/`, `src/database/projects/`           | Used in claim/publish flow                      |
| Public page (`/create-menu`)          | ❌ NEW  | `src/app/(website)/create-menu/page.tsx`                   | New page in website route group                 |
| Draft API route                       | ❌ NEW  | `src/app/api/public/create-menu/route.ts`                  | New API — POST withAuth, rate-limited; GET token-based preview |
| Preview page                          | ❌ NEW  | `src/app/(website)/create-menu/preview/[draftId]/page.tsx` | New page — reads draft, renders preview         |
| Draft Firestore collection            | ❌ NEW  | `publicMenuDrafts`                                         | New collection — 24h TTL                        |
| Claim/convert flow                    | ❌ NEW  | `src/app/api/public/create-menu/claim/route.ts`            | New API — withAuth, converts draft → project    |
| Nightly cleanup                       | ❌ NEW  | Addition to `functions/src/decisionBlocksScoring.ts`       | Add step to existing nightly scheduler          |

---

## 2. Database Schema

### 2.1 New Collection: `publicMenuDrafts`

```typescript
interface PublicMenuDraft {
  // Identity
  id: string; // Auto-generated Firestore doc ID
  token: string; // Crypto-random URL token (not doc ID — prevents enumeration)

  // Upload
  imageUrl: string; // Firebase Storage URL
  imagePath: string; // Storage path for cleanup
  originalFileName: string;

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
ENABLE_PUBLIC_MENU_ENTRY: false, // Public menu creation without auth

// functions/src/constants/features.ts (mirror)
ENABLE_PUBLIC_MENU_ENTRY: false,
```

---

## 3. File Structure

### New Files (8 files)

```
src/app/(website)/create-menu/
├── page.tsx                          // Upload page (public page, account required before upload)
├── CreateMenuClient.tsx              // Client component — upload + progress UI
├── preview/
│   └── [draftId]/
│       └── page.tsx                  // Preview page (server component, reads draft)
├── PreviewClient.tsx                 // Client component — menu preview + CTA
└── success/
    └── page.tsx                      // Post-publish success page (auth required)

src/app/api/public/create-menu/
├── route.ts                          // POST: upload image + trigger extraction (withAuth); GET: token preview status
└── claim/
    └── route.ts                      // POST: claim draft → create store + project (withAuth)

functions/src/publicMenu/
└── extractPublicMenu.ts              // Callable CF: runs extraction on draft image
```

### Modified Files (4 files)

```
src/constants/database.ts             // +1 collection constant
functions/src/constants/database.ts   // +1 collection constant (mirror)
src/config/features.ts                // +1 feature flag
functions/src/constants/features.ts   // +1 feature flag (mirror)
functions/src/decisionBlocksScoring.ts // +1 nightly cleanup step
firestore.indexes.json                // +2 composite indexes
```

---

## 4. API Contracts

### 4.1 POST `/api/public/create-menu`

**Auth:** None (public)
**Rate Limit:** 3 per IP per 24 hours (using `PUBLIC_ENTRY` rate limit config)
**Feature Gate:** `ENABLE_PUBLIC_MENU_ENTRY` must be true (returns 404 if false)

**Request:**

```typescript
// multipart/form-data
{
  image: File; // JPEG, PNG, WebP — max 10MB
}
```

**Validation (Zod):**

```typescript
const schema = z.object({
  image: z.any().refine(/* file type + size validation */),
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
- `400` — Invalid file type/size
- `404` — Feature disabled
- `500` — Upload/extraction failure

**Flow:**

1. Validate feature flag
2. Check IP rate limit
3. Validate file (type, size)
4. Optimize image server-side (sharp — already in dependencies)
5. Upload to Storage: `publicMenuDrafts/{draftId}/{filename}`
6. Create Firestore draft doc with `extractionStatus: 'pending'`
7. Call `extractPublicMenu` Cloud Function (fire-and-forget)
8. Return draftId immediately

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
    error?: string;
}
```

### 4.3 POST `/api/public/create-menu/claim`

**Auth:** `withAuth()` — user must be authenticated
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
});
```

**Response (200):**

```typescript
{
  storeId: number;
  projectId: string;
  subdomain: string;
  menuUrl: string; // https://{subdomain}.menulist.site
  success: true;
}
```

**Flow:**

1. Verify user is authenticated (`withAuth`)
2. Look up draft by token
3. Verify draft exists, not expired, not already claimed
4. Create tenant (if new user) or use existing
5. Create store with provided business info
6. Create project with extracted data
7. Publish project (set `isDefault: true`)
8. Mark draft as claimed
9. Delete Storage image (now lives in project)
10. Return store/project details

---

## 5. Cloud Function: `extractPublicMenu`

**Location:** `functions/src/publicMenu/extractPublicMenu.ts`
**Type:** `onCall` (callable from API route)
**Purpose:** Run AI extraction on the uploaded image

**Reuses:**

- `parallelProcessingPrompt` from `functions/src/logic/parallelProcessingPrompt.ts`
- `aiResponseUtils` from `functions/src/logic/aiResponseUtils.ts`
- Gemini 2.5 Flash model configuration

**Does NOT reuse:**

- Full `processMenuImagesJobLogic` (too coupled to project/session/job queue)
- Instead: extracts the **core Gemini call + response normalization** into a simpler standalone function

**Flow:**

1. Read draft doc
2. Download image from Storage
3. Call Gemini 2.5 Flash with menu extraction prompt
4. Normalize response (categories, items, languages)
5. Attempt business name/type detection from content
6. Update draft doc: `extractionStatus: 'completed'`, `extractedData: {...}`

**Error handling:**

- On failure: set `extractionStatus: 'failed'`, `extractionError: message`
- Retries: 1 retry with 3s delay (Gemini transient failures)

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
│  ┌───────────────────────┐  │
│  │                       │  │
│  │   📷 Upload menu      │  │
│  │      photo            │  │
│  │                       │  │
│  │   Tap to take photo   │  │
│  │   or choose file      │  │
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
- Client-side image optimization (Compressor.js — max 1920px, 80% quality)
- Upload progress indicator
- Processing state with animation
- Error states (file too large, wrong format, rate limited)

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
- Live URL: `{subdomain}.menulist.site`
- QR code (reuse `QRCodeView` component)
- Share buttons (WhatsApp, copy link)
- "Add to Google Maps" guidance
- "Go to dashboard" CTA

---

## 7. Security

| Concern               | Mitigation                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| Bot abuse             | IP-based rate limiting (3/day), file type validation, min image dimensions (200×200px) |
| Storage abuse         | 24h TTL auto-cleanup, max 10MB per upload                                              |
| Draft enumeration     | URL uses crypto-random token, NOT sequential IDs                                       |
| Cost spikes           | Rate limit caps max daily Gemini calls. Feature flag kill switch.                      |
| XSS in extracted data | All extracted text rendered through React (auto-escaped)                               |
| Unclaimed data (GDPR) | 24h auto-delete. No PII stored (IP is hashed).                                         |

---

## 8. Nightly Cleanup (Addition to Existing Scheduler)

**Location:** `functions/src/decisionBlocksScoring.ts` — add new step after existing steps

```typescript
// Step: Clean up expired public menu drafts
if (FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
  const expiredDrafts = await db
    .collection("publicMenuDrafts")
    .where("expiresAt", "<", Timestamp.now())
    .where("claimed", "==", false)
    .limit(100)
    .get();

  for (const doc of expiredDrafts.docs) {
    // Delete Storage image
    // Delete Firestore doc
  }
}
```

**Cost:** Negligible — one query per nightly run, batch deletes.

---

## 9. Implementation Phases

### Phase 1: Foundation (Core Flow)

- [ ] Add feature flag + DB constant (both frontend + CF)
- [ ] Create `publicMenuDrafts` collection schema
- [ ] Create upload API route (`/api/public/create-menu`)
- [ ] Create Cloud Function (`extractPublicMenu`)
- [ ] Create upload page UI (`/create-menu`)
- [ ] Create preview page UI (`/create-menu/preview/[draftId]`)
- [ ] Add Firestore indexes

### Phase 2: Claim & Publish

- [ ] Create claim API route (`/api/public/create-menu/claim`)
- [ ] Create success page (`/create-menu/success`)
- [ ] Implement draft → project conversion
- [ ] Wire auth redirect flow (signin → return to preview)
- [ ] QR code + share link on success page

### Phase 3: Polish & Safety

- [ ] Rate limiting configuration
- [ ] Nightly cleanup step
- [ ] Error states (all edge cases)
- [ ] Loading/progress animations
- [ ] Mobile optimization
- [ ] Image validation (dimensions, format)
- [ ] Terms acceptance checkbox

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

**Decision:** API route uploads image, Cloud Function runs extraction.

**Reason:** Gemini API key must stay server-side. Client-side extraction would expose the key. The CF also allows rate limiting enforcement at the server level.

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
| 3     | Nightly cleanup            | ⬜     | Deferred — low risk (feature flag OFF) |
| 3     | Error states               | ✅     | All edge cases covered                 |
| 4     | Type check                 | ✅     | Zero errors                            |
| 4     | Firestore indexes          | ✅     | 1 composite index                      |

---

## 12. Post-Implementation Audit (March 11, 2026)

### Bugs Found & Fixed

| #     | Severity    | Issue                                                                                                                                    | Fix                                                                                                                                                                                       |
| ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1    | 🔴 CRITICAL | Wrong Gemini SDK — used `@google/generative-ai` (old) instead of `@google/genai` via `genAIClient`                                       | Rewrote extraction to use `genAIClient.models.generateContent()` matching all other AI routes                                                                                             |
| F2/F3 | 🔴 CRITICAL | `file.makePublic()` — Storage may block public access; signed URLs are safer and standard                                                | Replaced with `file.getSignedUrl()` with 25h expiry (outlives 24h draft TTL)                                                                                                              |
| F4    | 🟡 MEDIUM   | Memory leak — `URL.createObjectURL` never revoked in CreateMenuClient                                                                    | Added `useEffect` cleanup that revokes URL on unmount/change                                                                                                                              |
| F6    | 🟢 LOW      | `MIN_DIMENSION` constant declared but never used                                                                                         | Removed                                                                                                                                                                                   |
| F10   | 🟡 MEDIUM   | No SAFE_MODE check before Gemini call — AI operations should be blockable during maintenance                                             | Added `checkSafeMode()` before rate limiting                                                                                                                                              |
| G1    | 🔴 CRITICAL | Claim flow completely disconnected — after auth, preview page had no way to trigger claim API. No business name form, no publish button. | Added `isClaimMode` detection via `?claim=true` URL param, business name input (pre-filled from AI detection), publish button calling claim API, redirect to success page with URL params |
| U1    | 🟡 MEDIUM   | `capture="environment"` forces camera on mobile — prevents gallery selection                                                             | Removed attribute — mobile now shows both camera and gallery options                                                                                                                      |

### Architectural Deviation from Spec

| Spec Said                                   | Actual                           | Reason                                                                                                        |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Separate Cloud Function `extractPublicMenu` | Extraction inline in API route   | Simpler for v1 — avoids separate CF deployment. Same Gemini call, just runs in Next.js API route server-side. |
| `file.makePublic()` for image URL           | `getSignedUrl()` with 25h expiry | More secure, works with any Storage security rules, standard pattern in codebase                              |

### Remaining Deferred Items (Low Risk)

1. **Nightly cleanup step** — Not yet in scheduler. Drafts accumulate but feature is OFF. Add before enabling flag.
2. **Firestore security rules** — Default deny covers it. No client-side access needed.

---

**Document Signature:** MenuList Technical Implementation
**Audience:** Developers
**Last Updated:** March 11, 2026
