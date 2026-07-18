# Public Menu Entry — Technical Implementation Plan

**Version:** 1.0
**Status:** Source-implemented — not current target, launch, or deploy certification
**Feature Flag:** `ENABLE_PUBLIC_MENU_ENTRY`
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The `/create-menu` page is public, but source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Growth Attribution Boundary

`/create-menu` accepts only the fixed source/medium/campaign combinations defined in `src/lib/growth/acquisitionAttribution.ts`. Supported values survive sign-in and are stored on new drafts, claimed projects, and newly-created tenant/store records. Reused drafts keep their original first-touch attribution.

Attributed draft and claim events are recorded idempotently through `src/lib/ops/founderGrowthReadModel.ts`, using markers on the existing draft record rather than a separate event collection. The markers share the parent draft's existing lifecycle. Telemetry failure does not block source processing or claim. No tenant, store, menu, customer, referrer, or owner identifier is placed in acquisition URLs or aggregate source maps.

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
  id: string; // Same deterministic UUID as token
  token: string; // SHA-256-derived UUID from owner + source fingerprint

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
    sourceTextLength?: number;
    sourceTextPresent?: boolean;
    permissionConfirmed?: boolean;
  };

  // Extraction Result
  extractedData: {
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
    languages: Array<{ code: string; name: string; isPrimary: boolean }>;
  } | null;
  extractionStatus: "pending" | "processing" | "completed" | "failed";
  extractionError?: string; // Fixed owner-safe failure text only; no provider/parser/runtime detail
  extractionJobId?: string;

  // AI-detected business info
  detectedBusinessName?: string;
  detectedBusinessType?: string; // From BUSINESS_TYPES constant, or Other fallback
  detectedBusinessCategory?: string; // From BUSINESS_CATEGORIES when known

  // Metadata
  ipHash: string; // HMAC hash of IP via hashPublicRateLimitValue(); no raw IP storage
  userAgent?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp; // createdAt + 24 hours

  // Claim state
  claimed: boolean;
  claimedByUId?: string;
  claimedAt?: Timestamp;
  convertedProjectId?: string;
  convertedProjectSlug?: string;
  convertedStoreId?: number;
  convertedSubdomain?: string;
  convertedTenantId?: number;
  convertedWasNewAccount?: boolean;
}
```

**Document ID / URL token:** one UUID-shaped SHA-256 derivation of `ownerId + source fingerprint`. Image fingerprints use content hash; imported links use the acquired artifact content hash. The owner binding and source hash keep identity collision-safe without exposing sequential IDs.
**Extraction job ID:** `public_{draftToken}`
**TTL:** 24 hours from creation
**Index needed:** `expiresAt` (range) + `claimed` (equality) — for nightly cleanup

## Durable Extraction

Public create-menu no longer runs extraction inside `src/app/api/public/create-menu/route.ts` after returning the draft response. After the source is safely stored, the route creates `publicMenuDrafts/{draftId}` and `menuImageProcessingJobs/public_{draftId}` in one Firestore create-only batch with `destination.type = "public_menu_draft"` and `skipProjectSave: true`. The draft never exists in a transient `extractionJobId: null` state. Concurrent identical requests resolve to the same owner/content UUID; exactly one batch wins and the loser returns the committed draft. The Storage download token is the same deterministic UUID so the losing request cannot invalidate the winner's object URL metadata.

`functions/src/logic/processMenuImagesJob.ts` first verifies the job ID, destination, owner metadata, project identity, source URL/path/type/size, draft token, draft owner, expiry, status, and `extractionJobId` against the authoritative draft. Only a verified binding may update that draft. The worker then marks it `processing` and updates it to `completed` with allowlisted categories/items/languages or `failed` with an owner-safe error.

`src/data/shared/publicMenuDraftData.ts` and `functions/src/sharedData/publicMenuDraftData.ts` are byte-for-byte mirrors. Their runtime normalizer caps categories/items/languages and string/list sizes, deduplicates IDs, rejects orphan item/category relationships, and omits arbitrary provider, file, confidence, owner-boost, and review fields. Preview and claim normalize the persisted shape again so malformed legacy/Admin-written drafts fail closed instead of becoming project/public truth. Claim separately verifies the source envelope against the configured Firebase Storage bucket, exact `publicMenuDrafts/{draftId}/` prefix, download token, MIME allowlist, and shared file-size cap.

Failure text is intentionally fixed. Worker failures persist `Menu extraction failed` in the job record and an owner-safe draft failure message, while `GET /api/public/create-menu` normalizes failed polling responses to `We could not prepare this menu. Upload a clearer photo or try another public menu link.` The route and worker do not serialize raw provider, parser, Storage, or runtime exception text to the browser or stored job error message; source diagnostics stay bounded in server logs.

Draft IP metadata is hashed through the shared `hashPublicRateLimitValue()` HMAC helper before Firestore storage or diagnostic context. The route does not store raw client IPs or local unsalted IP hashes.

The `/create-menu` browser client reads upload and link POST responses through `readJsonResponseWithLimit()` with an 8KB cap before redirecting to preview. Malformed or oversized responses log `public_create_menu_response_parse_failed` with bounded source/status metadata only. Successful HTTP responses must include a non-empty `draftId`; invalid acknowledgement shapes log `public_create_menu_response_invalid` and show the same localized fixed upload/link failure copy. The client does not display route response text, owner-provided link values, or browser exception messages.

The `/create-menu/preview` browser client reads draft status/full responses through `readJsonResponseWithLimit()` with a 4MB cap because completed drafts can include extracted menu data. Malformed or oversized preview responses log `public_create_menu_preview_response_parse_failed`; empty/scalar/array or invalid-status responses log `public_create_menu_preview_response_invalid` and show the existing localized load failure copy. Both the lightweight status poll and the follow-up full-result fetch share the same HTTP status handling, so `401` routes back to sign-in, `410` shows the expired-draft state, `404` shows the missing-draft state, and other rejected responses use the fixed load-failure state. The claim submit response uses a 32KB cap, logs `public_create_menu_preview_claim_response_parse_failed` / `public_create_menu_preview_claim_response_invalid`, and redirects only when `success: true`, `menuUrl`, `officialPageUrl`, and `subdomain` are present.

The `/create-menu/success` browser client normalizes raw `menuUrl` and `officialPageUrl` query-string values before any link render, Copy Link handoff, or WhatsApp share text. Only absolute HTTPS URLs without credentials are accepted; invalid, oversized, whitespace-containing, non-HTTPS, credentialed, or malformed query values are treated as absent and log bounded `public_create_menu_success_url_invalid` diagnostics with URL kind, reason, presence/length, protocol/whitespace shape, and normalized parser error metadata only. Copy Link uses `copyCreateMenuSuccessLinkToClipboard()` so copied state and starter activation signals advance only after Clipboard API acknowledgement or an acknowledged textarea fallback. Rejected Clipboard API writes fall through to the same acknowledged textarea fallback before failure. Unavailable or failed copy handoffs log `public_create_menu_success_copy_failed` with bounded menu/official-page URL presence-length metadata plus clipboard/fallback support booleans before showing localized fixed copy. Starter activation signal telemetry remains non-blocking, but failed claim-context reads log `public_create_menu_success_starter_signal_claim_read_failed` and failed signal writes log `public_create_menu_success_starter_signal_write_failed` with bounded signal, raw-claim presence/length, store-presence, and normalized source error metadata only.

This keeps the owner preview polling contract simple while reusing the same extraction, validation, hardening, and link-text parser path used by authenticated owner extraction.

For sources supported by the shared menu-intake identity helper, the public route adds `sourceMetadata.identityCheck` to the queued job. The shared worker uses that metadata to keep `detectedBusinessName`, `detectedBusinessType`, and `detectedBusinessCategory` populated for the claim form without restoring the old inline public extraction model. Low-confidence specific types claim as canonical `Other`, preserving the broad category when visible.

If atomic draft/job creation fails after a source artifact exists, the route first checks the deterministic draft ID for a concurrently committed, owner/content-matching winner. A winner is returned and its shared Storage object is preserved. When Firestore proves there is no winner, the source artifact is deleted; when that proof read itself fails, cleanup is deliberately deferred and logged as `public_menu_entry_collision_lookup_failed` so a possible winner is never corrupted. Failed Storage cleanup logs `public_menu_entry_storage_cleanup_failed` with bounded context only.

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
**Rate Limit:** 5 new extraction attempts per user per 24 hours (using `PUBLIC_MENU_ENTRY_AUTH` rate limit config). Active pending/processing drafts and same-source completed drafts are reused before creating new Storage or AI jobs. The limiter key stores a `hashPublicRateLimitValue(userId)` segment, not the raw owner id.
**Feature Gate:** `ENABLE_PUBLIC_MENU_ENTRY` must be true (returns 404 if false)
**Body Limit:** requests over the 10MB image limit plus multipart overhead are rejected by `content-length`, and multipart uploads are read through a bounded form-data helper before file access so no-length/chunked oversized bodies cannot buffer unboundedly. The JSON link-import branch also uses an 8KB bounded body reader before link validation, draft dedupe, source acquisition, Storage writes, or extraction job creation.
**File Validation:** photo uploads must match the JPEG, PNG, or WebP allowlist by claimed MIME and server-side magic-byte validation before any draft, Storage artifact, or extraction job is created.

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
3. Validate source: image file type/size/magic bytes or permission-confirmed public menu link
4. Reuse any active pending/processing owner draft before creating new work
5. Reuse same-source owner drafts by `contentHash` or link `sourceInputHash` when available
6. Check `PUBLIC_MENU_ENTRY_AUTH` user rate limit with the hashed owner key segment before new Storage/AI work
7. For links, acquire the source through the same SSRF-safe helper used by authenticated Menu Link Import
8. Upload client-optimized image or acquired link artifact to Storage: `publicMenuDrafts/{draftId}/{filename}`
9. Store a stable Firebase download-token URL for preview and source-file continuity after claim
10. Derive the owner/content draft UUID and deterministic download token
11. Atomically create the draft and `menuImageProcessingJobs/public_{draftId}` with create-only Firestore batch operations
12. Return draftId immediately

### 4.2 GET `/api/public/create-menu?draftId={token}`

**Auth:** `withAuth()` — only `draft.createdByUId` may poll the draft
**Purpose:** Poll extraction status for the signed-in owner
**Cost guard:** backend rate limit `public-menu-entry-status:{userHash}:{draftHash}` caps refresh/poll loops before reading the draft. Both segments use `hashPublicRateLimitValue()` so raw owner IDs and draft URL tokens are not written into rate-limit provider keys.

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
    error?: string; // Fixed owner-safe message only when status is failed
}
```

### 4.3 POST `/api/public/create-menu/claim`

**Auth:** `withAuth()` — user must be authenticated before claim/publish
**Purpose:** Convert draft to real store + project
**Rate Limit:** uses the existing `PAYMENT_ONBOARDING` publish bucket with `public-menu-claim:{userHash}` so raw owner ids are not stored in rate-limit provider keys.
**Body Limit:** claim requests above 8KB are rejected before JSON parsing or draft reads.
**Existing-account guard:** when a signed-in owner already has tenant/store context, the transaction reads both `stores/{storeId}` and `tenants/{tenantId}` before any project or summary writes. The claim fails closed if the IDs are malformed, the store is missing, the tenant is missing, the store belongs to another tenant, the store is inactive/deleted/platform-blocked, or the tenant is platform-blocked.
**Target document-ID guard:** existing-account and newly-created tenant/store IDs pass through the shared Firestore document-ID guard and exact positive numeric MenuList ID guard before the route builds `stores/{storeId}`, `tenants/{tenantId}`, `platformSummary/projects_{storeId}`, or `projects/{tId}/{sId}/{projectId}` refs.
**Draft contract guard:** claim re-normalizes the extracted DTO, requires a parseable unexpired TTL for an unclaimed draft, and validates its source URL/path/type/size against the configured Storage bucket before project writes.
**Retry receipt:** the first successful transaction stores tenant, store, project, slug, subdomain, and new-account state on the claimed draft. An exact-owner retry returns that receipt idempotently instead of creating another project or returning a permanent 409. Claimed drafts without a complete valid receipt retain the safe 409 legacy behavior.
**Default-project guard:** for existing owners, the transaction reads the existing project summary before any store/project writes, then demotes existing non-deleted default project summaries before writing the claimed project as default, preserving one `/menu` authority without violating Firestore transaction read/write ordering.
**Diagnostics:** success, cache-revalidation failure, and unexpected claim failure paths use bounded security diagnostics (`public_menu_claim_succeeded`, `public_menu_claim_cache_revalidation_failed`, `public_menu_claim_failed`) with draft/user/tenant/store/project presence and length metadata only.

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
2. Apply the payment-onboarding publish rate limit with the hashed owner key segment.
3. Reject bodies above 8KB and validate claim JSON.
4. Look up draft by token.
5. Verify draft exists, belongs to the owner, has a valid unexpired TTL, coherent allowlisted extracted data, and a valid Storage source envelope. If the same owner retries a completed claim with a complete receipt, return it idempotently.
6. Create tenant/store with provided business info and starter activation fields for new users, or verify the existing tenant/store is still eligible before writing.
7. For existing owners, fill only missing public presence and business-attribute defaults.
8. Create project with extracted data.
9. Publish project (set `isDefault: true`).
10. Mark draft as claimed and persist the complete conversion receipt.
11. Run each public cache tag, screen version, and owner-assistant packet invalidation independently with `Promise.allSettled`; one failure cannot suppress the remaining effects.
12. Return store/project details and canonical menu URL.
13. Client success handler calls `useSession().update()` so the newly claimed tenant/store is available before opening the workspace.

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

1. Verify the public job/draft/owner/source binding, then mark the bound draft as `processing`
2. Download source artifact from Storage
3. Call configured Gemini model with menu extraction prompt; image/PDF sources are sent as inline data, text/HTML-derived artifacts are sent as bounded source text
4. Parse, harden, and allowlist the extracted DTO; reject incoherent/orphan data
5. Attempt business name/type detection from content
6. Update draft doc: `extractionStatus: 'completed'`, `extractedData: {...}`

**Error handling:**

- On failure: set `extractionStatus: 'failed'` with a generic owner-safe `extractionError`
- Failed polling responses return the fixed public create-menu retry message instead of raw stored or provider text
- Raw provider/parse/runtime errors are not written into job `error.message` or public polling payloads; bounded source error name/code/status metadata stays in server diagnostics

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

- File input with drag-drop + camera capture (`accept="image/jpeg,image/png,image/webp"` and `capture="environment"`)
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

**June 29, 2026 handoff hardening; June 30 copy rejection fallback; July 5 URL normalization and starter-signal diagnostics:** `src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx` accepts only absolute HTTPS, non-credentialed `menuUrl` and `officialPageUrl` query-string values before rendering links, copying, or composing WhatsApp share text. Invalid query URLs are treated as absent and logged through bounded `public_create_menu_success_url_invalid` diagnostics. The page catches Copy Link and WhatsApp browser failures, shows localized fixed copy from the `Website.CreateMenuSuccess` namespace, opens WhatsApp with `noopener,noreferrer`, and records `MENU_LINK_COPIED` / `WHATSAPP_SHARE_STARTED` starter activation signals only after the browser action succeeds. Copy Link falls through from rejected Clipboard API writes to an acknowledged textarea fallback before failure. Diagnostics log only URL kind/reason/shape metadata, menu/official-page URL presence-length metadata, clipboard/fallback support booleans, message length, WhatsApp URL length, signal enum, raw-claim presence/length, store-presence, and normalized source error name/code. Raw URLs, generated messages, browser exception text, query-string values, raw session-storage claim payloads, and store IDs are not logged.

---

## 7. Security

| Concern               | Mitigation                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| Bot abuse             | Authenticated owner rate limiting, file signature/type/size validation, SAFE_MODE kill switch |
| Storage abuse         | 24h TTL auto-cleanup, pre-parse request body cap, max 10MB per image upload            |
| Claim abuse           | Authenticated publish rate limit and 8KB claim body cap before draft reads             |
| Draft enumeration     | UUID-shaped owner/content hash identity; owner check is required for every route read/write |
| Cost spikes           | Rate limit caps max daily Gemini calls. Feature flag kill switch.                      |
| XSS in extracted data | All extracted text rendered through React (auto-escaped)                               |
| Unclaimed data (GDPR) | 24h auto-delete. No PII stored (IP is hashed).                                         |

---

## 8. Nightly Cleanup (Addition to Existing Scheduler)

**Location:** `functions/src/schedulers/menulistMaintenanceScheduler.ts` — `public_menu_draft_cleanup` task in the consolidated MenuList maintenance scheduler.

```typescript
// Task: public_menu_draft_cleanup
// Daily at 03:30 UTC, max 100 expired unclaimed drafts per run.
// Deletes the temporary Storage source first, then deletes the draft only after acknowledgement.
```

Invalid cross-draft Storage paths are rejected. If Storage deletion fails, the Firestore draft remains as the durable retry record for the next scheduler run; it is not batch-deleted into an unrecoverable orphan state.

**Cost:** Negligible — one query per daily due run, one Storage delete attempt per expired draft, and batch document deletes only for acknowledged/no-path cleanup rows.

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
| U1    | 🟡 MEDIUM   | Earlier broad camera capture risked hiding gallery selection on some mobile browsers                                                     | Superseded July 2: the current input uses exact JPEG/PNG/WebP accept values with `capture="environment"`, while server validation rejects unsupported files                                |

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
**Last Updated:** July 2, 2026
