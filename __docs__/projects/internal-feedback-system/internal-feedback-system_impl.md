# Internal Feedback System — Implementation Plan

**Document Type:** Technical Implementation Blueprint
**Audience:** Developers, Technical Leads
**Version:** 1.0
**Date:** February 1, 2026
**Last Runtime Audit:** July 2, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [ChatGPT Analysis & Disagreements](#2-chatgpt-analysis--disagreements)
3. [Database Schema](#3-database-schema)
4. [API Contracts](#4-api-contracts)
5. [File Structure](#5-file-structure)
6. [Implementation Phases](#6-implementation-phases)
7. [Security Checklist](#7-security-checklist)
8. [Firebase Cost Analysis](#8-firebase-cost-analysis)
9. [Testing Guide](#9-testing-guide)
10. [Progress Tracking](#10-progress-tracking)

---

## 1. Architecture Overview

### June 11, 2026 Runtime Contract

The current production contract is stricter than the original implementation plan:

- Public feedback writes are API/Admin-SDK only. `firestore.rules` denies unauthenticated direct creates to `guestFeedback`.
- `src/app/api/public/feedback/submit/route.ts` verifies the nested project, store tenant match, store active/deleted/blocked state, tenant block state, project/store feedback toggles, and store-owned field defaults before writing.
- The shared public endpoint helper rate-limits by IP before public feedback writes and logs rate-limit infrastructure failures through `secureError()` while preserving the existing fail-open behavior.
- `src/database/guestFeedback/server.ts` owns public feedback creates and compact feedback event writes.
- Public feedback submit route failures use `src/database/guestFeedback/guestFeedbackDiagnostics.ts` with normalized `public_guest_feedback_scope_verification_failed` and `public_guest_feedback_submit_failed` diagnostics. Context is limited to bounded tenant/store/project metadata, source enum, rating, captcha/comment/contact presence booleans, and source error metadata. It must not pass raw route exceptions, guest names, phone/email values, messages, raw project IDs, tenant IDs, store IDs, or provider exceptions to `secureError()`.
- Admin-side compact feedback MOL event failures use the same diagnostics helper with normalized `guest_feedback_admin_mol_event_log_failed` diagnostics. The write remains non-blocking for public feedback submissions, but failed event writes must record only event type, rating, bounded tenant/store/project metadata, and source error metadata.
- Client-side compact feedback MOL event failures use `src/database/guestFeedback/guestFeedbackDiagnostics.ts` with normalized `guest_feedback_mol_event_log_failed` diagnostics. Context is limited to event type, rating, bounded tenant/store/project metadata, and source error metadata; it must not direct-console guest names, messages, contact fields, raw project IDs, tenant IDs, store IDs, or provider exceptions.
- The public QR feedback page uses `src/lib/feedback/publicFeedbackDiagnostics.ts` for bounded server-side page diagnostics. Project/store fetch failures record normalized `public_feedback_page_*` codes with project/store/tenant length metadata and source error name/code/status only; malformed project IDs continue to 404 quietly. The page must not direct-console raw project IDs, store IDs, tenant IDs, Firestore documents, customer feedback, or provider exceptions.
- The guest-facing feedback form uses `src/lib/feedback/guestFeedbackSubmitResponse.ts` and `src/lib/security/boundedResponseBody.ts` to parse `/api/public/feedback/submit` acknowledgements with a 16KB cap before showing success. Successful acknowledgements must include an OK HTTP response, `success: true`, a non-empty `feedbackId`, and optional string/null `reviewUrl`. Parse/shape failures log `public_guest_feedback_submit_response_parse_failed` or `public_guest_feedback_submit_response_invalid` through `src/lib/feedback/publicFeedbackDiagnostics.ts`; network failures log `public_guest_feedback_submit_request_failed`. Diagnostics record only bounded tenant/store/project/source metadata, rating, response status, cap, and source error metadata.
- Safe review URL boundary: returned `reviewUrl` values pass through `normalizeGuestFeedbackReviewUrl()` in both the API and browser form. Only HTTPS Google review/maps URLs are accepted; invalid, non-Google, non-HTTPS, or oversized URLs are treated as absent before rendering.
- Owner desktop and mobile feedback screens use the shared client DAL for reads/status updates. Store-scoped sessions cannot update feedback from another store in the same tenant.
- Owner desktop and mobile feedback status/reply saves must require `assertFeedbackStatusUpdateSucceeded()` before local inbox/detail state, success copy, or resolved status advances. Rejected acknowledgements use `feedback_inbox_status_update_rejected`, `mobile_feedback_status_update_rejected`, or `mobile_feedback_reply_save_rejected` and route through the existing bounded failure handlers.
- Owner desktop and mobile feedback list loads must require `assertFeedbackListLoadSucceeded()` before rendering items. Desktop needs-attention badge counts must require `assertFeedbackCountLoadSucceeded()` before updating the count. Rejected list/count acknowledgements route through the existing bounded load failure handlers.
- `updateFeedbackStatus()` must verify that the internal `getFeedbackById()` result is a shaped feedback record with the expected id before writing. This prevents `apiCallComposer()` fallback values from bypassing tenant/store record verification.
- Desktop feedback load/status-update failures use `src/components/templates/main-app/feedback/feedbackInboxDiagnostics.ts` with normalized `feedback_inbox_load_failed` and `feedback_inbox_status_update_failed` codes. Diagnostics record only bounded project/filter/cursor/status/count metadata and normalized source error metadata; they must not direct-console raw feedback documents, guest contact details, store IDs, tenant IDs, project IDs, or provider/browser exceptions.
- Desktop Feedback QR generation, download, feedback-link copy/open, WhatsApp open, and message-copy failures use the same feedback inbox diagnostics helper with normalized `desktop_feedback_qr_generate_failed`, `desktop_feedback_qr_download_failed`, `desktop_feedback_link_copy_failed`, `desktop_feedback_link_open_failed`, `desktop_feedback_whatsapp_open_failed`, and `desktop_feedback_message_copy_failed` codes. Copy Link and Copy Message check Clipboard API support, use a textarea fallback only when the document fallback is available, and show copied success only after acknowledgement. Diagnostics record only bounded project/store/feedback URL metadata, QR data URL length, filename length, message length, URL length, clipboard/fallback support booleans, and source error metadata; they must not log raw public feedback URLs, QR data URLs, WhatsApp messages, store IDs, tenant IDs, project IDs, or browser exceptions.
- Mobile feedback load failures use `src/components/mobile/utils/mobileOwnerDiagnostics.ts` with the normalized `mobile_feedback_load_failed` code. Diagnostics record only bounded store/tenant/filter metadata, selected-project presence, and normalized source error metadata; they must not direct-console raw feedback documents, guest contact details, store IDs, tenant IDs, project IDs, or provider/browser exceptions.
- Mobile feedback detail resolve/reply failures use the same mobile owner diagnostics helper with normalized `mobile_feedback_status_update_failed` and `mobile_feedback_reply_save_failed` codes. Diagnostics record only bounded store/tenant and feedback ID metadata, previous/next status, rating/attention flags, reply presence, reply length, and normalized source error metadata; they must not direct-console raw feedback documents, customer names, phone/email values, reply text, raw feedback IDs, store IDs, tenant IDs, or provider/browser exceptions.
- Client updates are status-only in rules; original guest rating/message/contact/source fields are immutable from owner clients.
- Feedback writes do not trigger public menu/OBP cache invalidation because they are private workflow records, not public truth packet changes.
- Source gate: `npm run verify:guest-feedback-boundary` locks the public submit route, bounded response parser, safe review URL boundary, Firestore rule/index anchors, owner desktop/mobile acknowledgement guards, retention wiring, and docs parity.

### System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GUEST LAYER (Public)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────┐      ┌─────────────────┐                      │
│   │  Menu Footer    │      │  Feedback QR    │                      │
│   │  "Share         │      │  /feedback?     │                      │
│   │   Feedback"     │      │   p={projectId} │                      │
│   └────────┬────────┘      └────────┬────────┘                      │
│            │                        │                                │
│            └────────────┬───────────┘                                │
│                         ▼                                            │
│            ┌────────────────────────┐                                │
│            │  GuestFeedbackForm.tsx │  src/components/atoms/         │
│            │  • Star rating (1-5)   │  GuestFeedbackForm/index.tsx   │
│            │  • Message (optional)  │                                │
│            │  • Contact (optional)  │                                │
│            └────────────┬───────────┘                                │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Public Endpoint)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  POST /api/public/feedback/submit                            │   │
│   │  src/app/api/public/feedback/submit/route.ts                 │   │
│   │                                                              │   │
│   │  Middleware: withPublicRateLimit (no auth)                   │   │
│   │  Rate Limit: 10 requests / 10 minutes / IP                   │   │
│   │  Validation: Zod schema                                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER (Firestore)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Collection: guestFeedback (flat)                                   │
│   Path: guestFeedback/{feedbackId}                                   │
│                                                                      │
│   Indexes:                                                           │
│   • tId ASC, sId ASC, createdOn DESC                                │
│   • tId ASC, sId ASC, status ASC, createdOn DESC                    │
│   • tId ASC, sId ASC, rating ASC, createdOn DESC                    │
│                                                                      │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         OWNER LAYER (Authenticated)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  FeedbackInbox.tsx                                           │   │
│   │  src/components/templates/main-app/feedback/index.tsx        │   │
│   │                                                              │   │
│   │  Features:                                                   │   │
│   │  • List view with pagination                                 │   │
│   │  • Filters: All | Needs Attention | Resolved                 │   │
│   │  • Contact indicator badge (📞 if phone/email exists)        │   │
│   │  • Expand to view full message                               │   │
│   │  • WhatsApp deep link button (if phone provided)             │   │
│   │  • Mark resolved action                                      │   │
│   │  • Download Feedback QR Code                                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   API Routes (Authenticated):                                        │
│   • GET  /api/feedback          → List feedback                      │
│   • PATCH /api/feedback/[id]    → Update status                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision             | Choice                   | Reason                                                    |
| -------------------- | ------------------------ | --------------------------------------------------------- |
| Collection structure | Flat `guestFeedback`     | Matches existing codebase pattern (`feedback` collection) |
| Public API pattern   | New `/api/public/*` path | Clear separation from authenticated routes                |
| Rate limiting        | IP-based, 10/10min       | Balance spam prevention with legitimate use               |
| Settings location    | `MenuSettings.feedback`  | Per-project configuration, aligns with existing patterns  |

---

## 2. ChatGPT Analysis & Disagreements

### Agreements (Implemented As-Is)

| #   | ChatGPT Suggestion                  | Implementation                                           |
| --- | ----------------------------------- | -------------------------------------------------------- |
| 1   | Separate `guestFeedback` collection | ✅ New collection, not mixed with authenticated feedback |
| 2   | No AI summary to owner              | ✅ Raw list only, no insights                            |
| 3   | No review gating                    | ✅ Google CTA shown to ALL ratings                       |
| 4   | Manual Google Review URL first      | ✅ Store-level `reviewUrl` field                         |
| 5   | Server-only writes for public       | ✅ API route handles all writes                          |
| 6   | 90-day retention                    | ✅ Automatic archival after 90 days                      |

### Disagreements (Modified)

| #   | ChatGPT Said                          | We Changed To                                            | Technical Reason                                                                 |
| --- | ------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | "No per-project toggles"              | Per-project `active` toggle in Advanced Settings         | Compromise: Owner can disable for promotional menus, but toggle is not prominent |
| 2   | "No configuration for contact fields" | Store-level `feedbackDefaults` (not per-project)         | Compromise: Regional privacy at store level, no per-menu decision overload       |
| 3   | Nested path `stores/{sId}/feedback`   | Flat `guestFeedback` collection with `tId`, `sId` fields | Existing codebase uses flat collections (`src/database/feedback/index.ts:9`)     |
| 4   | Rate limit 3/10min                    | Rate limit 10/10min                                      | Too restrictive; guest may submit, notice typo, resubmit                         |
| 5   | "Remove Success Metrics"              | Internal MOL events only (no owner-facing)               | Agreed: Metrics create dashboards, dashboards kill authority                     |

### Items Deferred

| #   | ChatGPT Suggestion                      | Deferred To      | Reason                                                 |
| --- | --------------------------------------- | ---------------- | ------------------------------------------------------ |
| 1   | Nightly aggregation stats               | Not implementing | Not needed for P0 inbox; adds complexity without value |
| 2   | Keyword detection for "needs attention" | Not implementing | Simple rating-based filter (≤3) is sufficient          |

---

## 3. Database Schema

### 3.1 GuestFeedback Document

**Collection:** `guestFeedback`
**Path:** `guestFeedback/{feedbackId}`

```typescript
// src/types/guestFeedback.ts

import { Timestamp } from "firebase/firestore";

/**
 * GuestFeedback - Public feedback submitted by guests
 *
 * NOTE: This is SEPARATE from the authenticated `Feedback` type
 * in src/types/feedback.ts which is for logged-in users.
 */
export interface GuestFeedback {
  /** Auto-generated Firestore document ID */
  id?: string;

  // ─────────────────────────────────────────────────────────────
  // TENANT/STORE ISOLATION (Required for all queries)
  // ─────────────────────────────────────────────────────────────

  /** Tenant ID - required for tenant isolation */
  tId: number;

  /** Store ID - required for store isolation */
  sId: number;

  // ─────────────────────────────────────────────────────────────
  // FEEDBACK CONTENT
  // ─────────────────────────────────────────────────────────────

  /** Rating (1-5 stars) - REQUIRED */
  rating: 1 | 2 | 3 | 4 | 5;

  /** Optional message from guest (max 300 chars) */
  message?: string;

  // ─────────────────────────────────────────────────────────────
  // OPTIONAL CONTACT INFO (Consent-based)
  // ─────────────────────────────────────────────────────────────

  /** Guest name (max 60 chars) */
  customerName?: string;

  /** Guest phone (max 20 chars) */
  customerPhone?: string;

  /** Guest email (max 120 chars) */
  customerEmail?: string;

  // ─────────────────────────────────────────────────────────────
  // SOURCE TRACKING
  // ─────────────────────────────────────────────────────────────

  /** How the guest accessed the feedback form */
  source: "menu_footer" | "feedback_qr" | "direct_link";

  /** Project ID of the menu they were viewing */
  projectId: string;

  // ─────────────────────────────────────────────────────────────
  // STATUS
  // ─────────────────────────────────────────────────────────────

  /** Feedback status */
  status: "new" | "resolved";

  /**
   * Computed field: true when rating <= 3 AND status == 'new'
   * Used for efficient Firestore queries (avoids inequality on multiple fields)
   * Set on create, updated when status changes
   */
  needsAttention: boolean;

  /** Optional owner note when marking resolved (max 300 chars) */
  ownerNote?: string;

  // ─────────────────────────────────────────────────────────────
  // AUDIT FIELDS
  // ─────────────────────────────────────────────────────────────

  /** When feedback was submitted */
  createdOn: Timestamp;

  /** Always 'guest' for public submissions */
  createdBy: "guest";

  /** When status was last updated */
  modifiedOn?: Timestamp;

  /** User ID who updated status (owner/manager) */
  modifiedBy?: string;

  // ─────────────────────────────────────────────────────────────
  // RETENTION (See spec.md "Retention Policy" section)
  // ─────────────────────────────────────────────────────────────

  /**
   * Calculated expiry date (createdOn + 90 days)
   *
   * Used by Cloud Function (guestFeedbackRetention) to auto-delete expired docs.
   * Reasons: Privacy (GDPR-like), legal (no indefinite PII storage), cost savings.
   *
   * After expiry: Document deleted, only anonymized MOL event retained.
   *
   * @see internal-feedback-system_spec.md "Retention Policy (90 Days)"
   */
  expiresOn: Timestamp;
}

/**
 * Filter options for feedback inbox
 */
export type GuestFeedbackFilter = "all" | "needs_attention" | "resolved";

/**
 * Sort options for feedback inbox
 */
export type GuestFeedbackSort =
  | "newest"
  | "oldest"
  | "rating_low"
  | "rating_high";
```

### 3.2 MenuSettings Extension (Per-Project Toggle)

**File:** `src/components/templates/main-app/projects/types/project.types.ts`
**Location:** Lines 113-130 (inside `MenuSettings` interface)

```typescript
// ADD to MenuSettings interface (project.types.ts:113-130)

export interface MenuSettings {
  // ... existing fields ...

  // ─────────────────────────────────────────────────────────────
  // GUEST FEEDBACK TOGGLE (Feature: Internal Feedback System)
  // ─────────────────────────────────────────────────────────────

  /**
   * Enable/disable guest feedback for this menu (default: true)
   *
   * NOTE: Contact field settings are at store level (see Store.feedbackDefaults).
   *
   * UI: This toggle should be in "Advanced Settings", framed as
   * "Disable feedback for this menu" to discourage casual disabling.
   *
   * Usage: if (menuSettings.feedback !== false) → feedback is ON
   */
  feedback?: boolean;
}
```

### 3.2.1 Store Extension (Contact Field Defaults)

**File:** `src/types/store.ts` (or equivalent store type file)
**Location:** Inside Store interface

```typescript
// ADD to Store interface

export interface Store {
  // ... existing fields ...

  // ─────────────────────────────────────────────────────────────
  // GUEST FEEDBACK DEFAULTS (Feature: Internal Feedback System)
  // ─────────────────────────────────────────────────────────────

  /**
   * Default contact field settings for guest feedback in this store
   *
   * Why store-level (not per-project):
   * - Reduces decision overload (1 decision per store, not per menu)
   * - Handles regional compliance (GDPR stores vs India stores)
   * - Multi-chain HQ can set different defaults per region
   *
   * Applied to ALL menus in this store that have feedback enabled.
   */
  feedbackDefaults?: {
    /** Collect customer name (default: false) */
    collectName: boolean;

    /** Collect customer phone (default: true - India market) */
    collectPhone: boolean;

    /** Collect customer email (default: true) */
    collectEmail: boolean;
  };
}
```

**Default Values (if `feedbackDefaults` is undefined):**

- `collectName: false` — Name NOT collected by default
- `collectPhone: true` — Phone collected by default (India market priority)
- `collectEmail: true` — Email collected by default

### 3.3 Store Extension (Google Review URL)

**File:** `src/database/integrations/gbp.ts`
**Location:** Lines 39-51 (inside `GBPConnectionStatus` interface)

```typescript
// ADD to GBPConnectionStatus interface (gbp.ts:39-51)

export interface GBPConnectionStatus {
  // ... existing fields ...

  /**
   * Google Review URL for this store
   * Format: https://g.page/r/[placeId]/review
   *
   * Sources:
   * 1. Manual entry by owner (P0)
   * 2. GBP sync when connected (future, requires GBP_ACTIVATED flag)
   */
  reviewUrl?: string;
}
```

### 3.4 DB_COLLECTIONS Update

**File:** `src/constants/database.ts`
**Location:** Line 25 area

```typescript
// ADD to DB_COLLECTIONS (database.ts)

GUEST_FEEDBACK: "guestFeedback", // Public guest feedback (Internal Feedback System)
```

### 3.5 Firestore Indexes

```
// firestore.indexes.json

{
  "indexes": [
    {
      "collectionGroup": "guestFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tId", "order": "ASCENDING" },
        { "fieldPath": "sId", "order": "ASCENDING" },
        { "fieldPath": "createdOn", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "guestFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tId", "order": "ASCENDING" },
        { "fieldPath": "sId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdOn", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "guestFeedback",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tId", "order": "ASCENDING" },
        { "fieldPath": "sId", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "ASCENDING" },
        { "fieldPath": "createdOn", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 3.6 Firestore Security Rules

```
// firestore.rules - ADD these rules

match /guestFeedback/{feedbackId} {
  // PUBLIC WRITE: Allow guest submissions (no auth required)
  // Rate limiting is handled at API layer, not Firestore rules
  allow create: if
    request.resource.data.rating is int &&
    request.resource.data.rating >= 1 &&
    request.resource.data.rating <= 5 &&
    request.resource.data.tId is int &&
    request.resource.data.sId is int &&
    request.resource.data.status == 'new' &&
    request.resource.data.createdBy == 'guest';

  // AUTHENTICATED READ/UPDATE: Only tenant members can read/update
  allow read, update: if
    request.auth != null &&
    request.auth.token.tId == resource.data.tId;

  // NO DELETE: Retention handled by Cloud Function
  allow delete: if false;
}
```

---

## 4. API Contracts

### 4.1 Public Submit Endpoint (No Auth)

**Endpoint:** `POST /api/public/feedback/submit`
**Auth:** None (public)
**Rate Limit:** 10 requests / 10 minutes / IP
**Body cap:** 16KB bounded JSON before Zod validation, Turnstile verification, project/store reads, or feedback writes.

#### Request Schema (Zod)

```typescript
// src/lib/validation/apiSchemas.ts - ADD

import { z } from "zod";

export const guestFeedbackSubmitSchema = z.object({
  // Required fields
  tId: z.number().int().positive(),
  sId: z.number().int().positive(),
  projectId: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  source: z.enum(["menu_footer", "feedback_qr", "direct_link"]),

  // Optional fields
  message: z.string().max(300).optional(),
  customerName: z.string().max(60).optional(),
  customerPhone: z.string().max(20).optional(),
  customerEmail: z.string().email().max(120).optional(),

  // Honeypot field (for bot detection)
  website: z.string().max(0).optional(), // Must be empty
});

export type GuestFeedbackSubmitRequest = z.infer<
  typeof guestFeedbackSubmitSchema
>;
```

#### Response

```typescript
// Success (201)
{
  "success": true,
  "feedbackId": "abc123...",
  "reviewUrl": "https://g.page/r/.../review" | null
}

// Error (400 - Validation)
{
  "success": false,
  "error": "Validation failed."
}

// Error (429 - Rate Limited)
{
  "success": false,
  "error": "Too many requests. Please try again later."
}
```

### 4.2 Get Feedback List (Authenticated)

**Endpoint:** `GET /api/feedback`
**Auth:** Required (`withAuth`)
**Rate Limit:** Standard authenticated rate limit

#### Query Parameters

| Param        | Type                                     | Default       | Description               |
| ------------ | ---------------------------------------- | ------------- | ------------------------- |
| `filter`     | `all` \| `needs_attention` \| `resolved` | `all`         | Filter by status          |
| `storeId`    | `number`                                 | Current store | Filter by store (HQ only) |
| `limit`      | `number`                                 | `50`          | Items per page            |
| `startAfter` | `string`                                 | —             | Cursor for pagination     |

#### Response

```typescript
{
  "success": true,
  "data": GuestFeedback[],
  "pagination": {
    "hasMore": boolean,
    "nextCursor": string | null
  }
}
```

### 4.3 Update Feedback Status (Authenticated)

**Endpoint:** `PATCH /api/feedback/[id]`
**Auth:** Required (`withAuth`)
**Rate Limit:** Standard authenticated rate limit

#### Request Schema

```typescript
export const guestFeedbackUpdateSchema = z.object({
  status: z.enum(["new", "resolved"]),
  ownerNote: z.string().max(300).optional(),
});
```

#### Response

```typescript
{
  "success": true,
  "data": GuestFeedback
}
```

---

## 4.4 Utility Functions

### WhatsApp Deep Link Generator

```typescript
// src/lib/utils/whatsappLink.ts

/**
 * Generate WhatsApp deep link for guest recovery
 * Works on both mobile (opens WhatsApp app) and desktop (opens WhatsApp Web)
 *
 * @param phone - Phone number (will be cleaned of non-digits)
 * @param message - Optional pre-filled message
 * @returns WhatsApp deep link URL
 */
export function generateWhatsAppLink(phone: string, message?: string): string {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/\D/g, "");

  // Base WhatsApp URL (works on all platforms)
  const baseUrl = "https://wa.me/";

  // Build URL with optional message
  let url = `${baseUrl}${cleanPhone}`;

  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }

  return url;
}

// Usage in FeedbackCard:
// <a href={generateWhatsAppLink(feedback.customerPhone)} target="_blank">
//   Open WhatsApp
// </a>
```

### Feedback QR Code Generator

```typescript
// src/lib/utils/feedbackQrCode.ts

import QRCode from "qrcode";

/**
 * Generate high-resolution QR code for feedback collection
 *
 * @param projectId - Project ID (format: {tId}-{timestamp}-{sId})
 * @param options - QR code options
 * @returns Data URL (base64) for PNG image
 */
export async function generateFeedbackQrCode(
  projectId: string,
  options?: {
    width?: number; // Default: 1024 (high-res for print)
    margin?: number; // Default: 2
    darkColor?: string; // Default: #000000
    lightColor?: string; // Default: #FFFFFF
  },
): Promise<string> {
  const feedbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/feedback/${projectId}`;

  const qrOptions = {
    width: options?.width || 1024,
    margin: options?.margin || 2,
    color: {
      dark: options?.darkColor || "#000000",
      light: options?.lightColor || "#FFFFFF",
    },
    errorCorrectionLevel: "H" as const, // High error correction for print
  };

  // Generate as data URL (base64 PNG)
  return await QRCode.toDataURL(feedbackUrl, qrOptions);
}

/**
 * Download QR code as PNG file
 *
 * @param dataUrl - Base64 data URL from generateFeedbackQrCode
 * @param filename - Download filename
 */
export function downloadQrCode(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

// Usage in FeedbackQrDownload component:
// const qrDataUrl = await generateFeedbackQrCode(project.projectId);
// downloadQrCode(qrDataUrl, `${store.name}-feedback-qr.png`);
```

### Standalone Feedback Page (QR Surface)

```typescript
// src/app/feedback/[projectId]/page.tsx

// Server Component - fetches project and store data
// Renders GuestFeedbackForm with source='feedback_qr'
// URL format: /feedback/{projectId}

import GuestFeedbackForm from '@atoms/GuestFeedbackForm';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { DEFAULT_FEEDBACK_SETTINGS } from '@type/guestFeedback';
import { notFound } from 'next/navigation';

/**
 * Parse projectId to extract tId and sId
 * Format: {tId}-{timestamp}-{sId}
 */
function parseProjectId(projectId: string): { tId: number; sId: number } | null {
    const parts = projectId.split('-');
    if (parts.length < 3) return null;

    const tId = parseInt(parts[0], 10);
    const sId = parseInt(parts[parts.length - 1], 10);

    if (isNaN(tId) || isNaN(sId)) return null;

    return { tId, sId };
}

/**
 * Get project data by projectId
 * Uses correct nested path: projects/{tId}/{sId}/{projectId}
 */
async function getProjectData(projectId: string) {
    const parsed = parseProjectId(projectId);
    if (!parsed) return null;

    const { tId, sId } = parsed;

    // Use correct nested path
    const projectDoc = await firestoreAdmin
        .collection(DB_COLLECTIONS.PROJECTS)
        .doc(String(tId))
        .collection(String(sId))
        .doc(projectId)
        .get();

    if (!projectDoc.exists) return null;

    const data = projectDoc.data();

    // Check active/deleted flags and feedback toggle
    if (data?.active === false || data?.deleted === true) return null;
    if (data?.menuSettings?.feedback === false) return null;

    return { projectId: projectDoc.id, tId, sId, menuSettings: data.menuSettings };
}

/**
 * Get store data including name and feedback settings
 * Uses direct doc fetch by sId (storeId is the document ID)
 */
async function getStoreInfo(tId: number, sId: number) {
    // Direct doc fetch - storeId is the document ID
    const storeDoc = await firestoreAdmin
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(sId))
        .get();

    if (!storeDoc.exists) return null;

    const storeData = storeDoc.data();
    const feedbackEnabled = storeData.feedbackEnabled !== false;

    return {
        storeName: storeData.storeName,
        feedbackEnabled,
        feedbackDefaults: {
            ...DEFAULT_FEEDBACK_SETTINGS,
            ...storeData.feedbackDefaults,
        },
    };
}

export default async function FeedbackPage({ params }) {
    if (!FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK) notFound();

    const project = await getProjectData(params.projectId);
    if (!project) notFound();

    const storeInfo = await getStoreInfo(project.tId, project.sId);
    if (!storeInfo || !storeInfo.feedbackEnabled) notFound();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <GuestFeedbackForm
                    tId={project.tId}
                    sId={project.sId}
                    projectId={project.projectId}
                    source="feedback_qr"
                    storeName={storeInfo.storeName}
                    feedbackDefaults={storeInfo.feedbackDefaults}
                />
                <PublicMenuListAttribution />
            </div>
        </div>
    );
}
```

The form itself must not render a separate `Powered by MenuList` line or its own duplicate business header. The public feedback route owns the shared temporary-status banner, public business identity header, and public menu footer. The footer keeps the same Share Feedback, contact, policy, social, theme toggle, and MenuList attribution treatment as the menu and OBP surfaces so customer-facing pages stay visually consistent.

---

## 5. File Structure

### New Files to Create

| File                                                                | Purpose                           | LOC (Est.) |
| ------------------------------------------------------------------- | --------------------------------- | ---------- |
| `src/types/guestFeedback.ts`                                        | GuestFeedback type definition     | 80         |
| `src/database/guestFeedback/index.ts`                               | DAL for guest feedback CRUD       | 150        |
| `src/app/api/public/feedback/submit/route.ts`                       | Public submit endpoint            | 120        |
| `src/app/api/feedback/route.ts`                                     | Get feedback list (authenticated) | 80         |
| `src/app/api/feedback/[id]/route.ts`                                | Update feedback status            | 60         |
| `src/app/feedback/[projectId]/page.tsx`                             | Standalone feedback page (QR)     | 100        |
| `src/middleware/publicApi.ts`                                       | Public endpoint middleware        | 80         |
| `src/lib/rateLimit/publicLimiter.ts`                                | IP-based rate limiter             | 60         |
| `src/lib/utils/whatsappLink.ts`                                     | WhatsApp deep link generator      | 30         |
| `src/lib/utils/feedbackQrCode.ts`                                   | QR code generator utility         | 50         |
| `src/components/atoms/GuestFeedbackForm/index.tsx`                  | Guest-facing form component       | 200        |
| `src/components/atoms/GuestFeedbackForm/StarRating.tsx`             | Star rating input                 | 80         |
| `src/components/templates/main-app/feedback/index.tsx`              | Owner inbox page                  | 280        |
| `src/components/templates/main-app/feedback/FeedbackCard.tsx`       | Individual feedback card          | 150        |
| `src/components/templates/main-app/feedback/FeedbackFilters.tsx`    | Filter controls                   | 60         |
| `src/components/templates/main-app/feedback/FeedbackQrDownload.tsx` | QR code download component        | 80         |
| **Total**                                                           | —                                 | **~1,660** |

### Existing Files to Modify

| File                                                                | Change                                 | Lines   |
| ------------------------------------------------------------------- | -------------------------------------- | ------- |
| `src/constants/database.ts`                                         | Add `GUEST_FEEDBACK` collection        | +1      |
| `src/lib/rateLimit/configs.ts`                                      | Add `FEEDBACK_SUBMISSION` config       | +8      |
| `src/lib/validation/apiSchemas.ts`                                  | Add `guestFeedbackSubmitSchema`        | +20     |
| `src/config/features.ts`                                            | Add `ENABLE_GUEST_FEEDBACK` flag       | +1      |
| `src/components/templates/main-app/projects/types/project.types.ts` | Add `feedback` to MenuSettings         | +15     |
| `src/database/integrations/gbp.ts`                                  | Add `reviewUrl` to GBPConnectionStatus | +8      |
| **Total**                                                           | —                                      | **~53** |

### Directory Structure

```
src/
├── types/
│   └── guestFeedback.ts                    # NEW: Type definitions
├── database/
│   └── guestFeedback/
│       └── index.ts                        # NEW: DAL
├── app/
│   ├── feedback/
│   │   └── [projectId]/
│   │       └── page.tsx                    # NEW: Standalone feedback page (QR surface)
│   └── api/
│       ├── public/
│       │   └── feedback/
│       │       └── submit/
│       │           └── route.ts            # NEW: Public submit
│       └── feedback/
│           ├── route.ts                    # NEW: List (auth)
│           └── [id]/
│               └── route.ts                # NEW: Update (auth)
├── middleware/
│   └── publicApi.ts                        # NEW: Public middleware
├── lib/
│   ├── rateLimit/
│   │   └── publicLimiter.ts                # NEW: IP limiter
│   └── utils/
│       ├── whatsappLink.ts                 # NEW: WhatsApp deep link generator
│       └── feedbackQrCode.ts               # NEW: QR code generator
├── components/
│   ├── atoms/
│   │   └── GuestFeedbackForm/
│   │       ├── index.tsx                   # NEW: Form component
│   │       └── StarRating.tsx              # NEW: Star input
│   └── templates/
│       └── main-app/
│           └── feedback/
│               ├── index.tsx               # NEW: Inbox page
│               ├── FeedbackCard.tsx        # NEW: Card component
│               ├── FeedbackFilters.tsx     # NEW: Filters
│               └── FeedbackQrDownload.tsx  # NEW: QR download component
└── config/
    └── features.ts                         # MODIFY: Add flag
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1)

| #   | Task                                        | File                                                                    | Status  |
| --- | ------------------------------------------- | ----------------------------------------------------------------------- | ------- |
| 1.1 | Add `GUEST_FEEDBACK` to DB_COLLECTIONS      | `src/constants/database.ts:75`                                          | ✅ DONE |
| 1.2 | Create `GuestFeedback` type                 | `src/types/guestFeedback.ts`                                            | ✅ DONE |
| 1.3 | Add `feedback?: boolean` to MenuSettings    | `src/components/templates/main-app/projects/types/project.types.ts:145` | ✅ DONE |
| 1.4 | Add `feedbackDefaults` to Store type        | `src/types/platform/store.ts:157`                                       | ✅ DONE |
| 1.5 | Add `reviewUrl` to Store type               | `src/types/platform/store.ts:176`                                       | ✅ DONE |
| 1.6 | Add `ENABLE_GUEST_FEEDBACK` feature flag    | `src/config/features.ts:696`                                            | ✅ DONE |
| 1.7 | Add `FEEDBACK_SUBMISSION` rate limit config | `src/lib/rateLimit/configs.ts:168`                                      | ✅ DONE |
| 1.8 | Create `guestFeedbackSubmitSchema`          | `src/lib/validation/apiSchemas.ts:286`                                  | ✅ DONE |
| 1.9 | Create guest feedback DAL                   | `src/database/guestFeedback/index.ts`                                   | ✅ DONE |

### Phase 2: Public API (Week 1-2)

| #   | Task                          | File                                          | Status  |
| --- | ----------------------------- | --------------------------------------------- | ------- |
| 2.1 | Create `publicApi` middleware | `src/middleware/publicApi.ts`                 | ✅ DONE |
| 2.2 | Create IP-based rate limiter  | `src/lib/rateLimit/publicLimiter.ts`          | ✅ DONE |
| 2.3 | Create public submit endpoint | `src/app/api/public/feedback/submit/route.ts` | ✅ DONE |
| 2.4 | Add Firestore security rules  | `firestore.rules:98`                          | ✅ DONE |
| 2.5 | Deploy Firestore indexes      | `firestore.indexes.json:184`                  | ✅ DONE |

### Phase 3: Guest UI (Week 2)

| #   | Task                                 | File                                                    | Status  |
| --- | ------------------------------------ | ------------------------------------------------------- | ------- |
| 3.1 | Create StarRating component          | `src/components/atoms/GuestFeedbackForm/StarRating.tsx` | ✅ DONE |
| 3.2 | Create GuestFeedbackForm component   | `src/components/atoms/GuestFeedbackForm/index.tsx`      | ✅ DONE |
| 3.3 | Add feedback link to menu footer     | `src/components/.../b2cView/output/MenuFooter.tsx`      | ✅ DONE |
| 3.4 | Create standalone feedback page (QR) | `src/app/feedback/[projectId]/page.tsx`                 | ✅ DONE |

### Phase 4: Owner Dashboard (Week 2-3)

| #   | Task                                | File                                                             | Status  |
| --- | ----------------------------------- | ---------------------------------------------------------------- | ------- |
| 4.1 | Create feedback list API            | `src/app/api/feedback/route.ts`                                  | ✅ DONE |
| 4.2 | Create feedback update API          | `src/app/api/feedback/[id]/route.ts`                             | ✅ DONE |
| 4.3 | Create FeedbackFilters component    | `src/components/templates/main-app/feedback/FeedbackFilters.tsx` | ✅ DONE |
| 4.4 | Create FeedbackCard component       | `src/components/templates/main-app/feedback/FeedbackCard.tsx`    | ✅ DONE |
| 4.5 | Create FeedbackInbox page           | `src/components/templates/main-app/feedback/index.tsx`           | ✅ DONE |
| 4.6 | Add contact indicator badge         | (inside FeedbackCard.tsx)                                        | ✅ DONE |
| 4.7 | Create WhatsApp deep link utility   | `src/lib/utils/whatsappLink.ts`                                  | ✅ DONE |
| 4.8 | Add WhatsApp button to FeedbackCard | (inside FeedbackCard.tsx)                                        | ✅ DONE |
| 4.9 | Add navigation menu item            | `src/constants/navigations.ts`                                   | ✅ DONE |

### Phase 5: Settings & Polish (Week 3)

| #   | Task                                          | File                                                                | Status  |
| --- | --------------------------------------------- | ------------------------------------------------------------------- | ------- |
| 5.1 | Add feedback settings UI to project editor    | `src/.../projects/ProjectDetails/ProjectEditModal.tsx`              | ✅ DONE |
| 5.2 | Add Google Review URL input to store settings | `src/.../businessSettings/tabs/FeedbackSettingsTab.tsx`             | ✅ DONE |
| 5.3 | Create QR code generator utility              | `src/lib/utils/feedbackQrCode.ts`                                   | ✅ DONE |
| 5.4 | Create FeedbackQrDownload component           | `src/components/templates/main-app/feedback/FeedbackQrDownload.tsx` | ✅ DONE |
| 5.5 | Add MOL event logging                         | `src/database/guestFeedback/index.ts` (logFeedbackMOLEvent)         | ✅ DONE |
| 5.6 | Add retention Cloud Function                  | `functions/src/analytics/guestFeedbackRetention.ts`                 | ✅ DONE |

---

## 7. Security Checklist

| #   | Requirement             | Implementation                                   | Status |
| --- | ----------------------- | ------------------------------------------------ | ------ |
| 1   | Input validation        | Zod schema for all fields                        | ✅     |
| 2   | XSS prevention          | Sanitize message field (strip HTML)              | ✅     |
| 3   | Rate limiting           | IP-based, 10/10min for public endpoint           | ✅     |
| 4   | Bot detection           | Honeypot field (`website` must be empty)         | ✅     |
| 5   | Tenant isolation        | `tId` + `sId` required on all queries            | ✅     |
| 6   | Auth for owner routes   | NextAuth session check                           | ✅     |
| 7   | RBAC for multi-outlet   | Manager sees own store, HQ sees all              | ✅     |
| 8   | No contact data in logs | Exclude customerPhone/Email from logging         | ✅     |
| 9   | Firestore rules         | Public create with constraints, auth read/update | ✅     |
| 10  | HTTPS only              | All endpoints require HTTPS (Vercel default)     | ✅     |

### Public Endpoint Security Pattern

```typescript
// src/middleware/publicApi.ts

import { NextRequest, NextResponse } from "next/server";
import { publicRateLimiter } from "@lib/rateLimit/publicLimiter";

export async function withPublicRateLimit(
  req: NextRequest,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  // 1. Get client IP (handle proxies)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // 2. Check rate limit
  const { allowed, remaining, resetIn } = await publicRateLimiter.check(ip);

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetIn),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // 3. Execute handler
  const response = await handler();

  // 4. Add rate limit headers
  response.headers.set("X-RateLimit-Remaining", String(remaining));

  return response;
}
```

---

## 8. Firebase Cost Analysis

### Read Operations

| Operation             | Frequency (Monthly) | Reads per Op | Total Reads |      Cost |
| --------------------- | ------------------: | -----------: | ----------: | --------: |
| Submit scope check    |               1,000 |            3 |       3,000 |    $0.018 |
| Load inbox (50 items) |                 500 |           50 |      25,000 |     $0.15 |
| View feedback detail  |               1,000 |            1 |       1,000 |    $0.006 |
| Check settings        |                 500 |            1 |         500 |    $0.003 |
| **Total Reads**       |                   — |            — |  **29,500** | **$0.18** |

### Write Operations

| Operation        | Frequency (Monthly) | Writes per Op | Total Writes |      Cost |
| ---------------- | ------------------: | ------------: | -----------: | --------: |
| Submit feedback  |               1,000 |             1 |        1,000 |    $0.018 |
| Mark resolved    |                 800 |             1 |          800 |    $0.014 |
| Update settings  |                  50 |             1 |           50 |    $0.001 |
| **Total Writes** |                   — |             — |    **1,850** | **$0.03** |

### Storage

| Data     | Size per Doc | Docs (90 days) |  Total |    Cost |
| -------- | -----------: | -------------: | -----: | ------: |
| Feedback |   ~500 bytes |          3,000 | 1.5 MB | $0.0004 |

### Monthly Total

```
Reads:   $0.18
Writes:  $0.03
Storage: $0.0004
─────────────────
Total:   $0.21 / month (per 1000 feedback/month)
```

Mobile feedback diagnostic and copy-acknowledgement hardening is cost-neutral. It changes failed read diagnostics plus the browser-local feedback-link copy handoff in `MobileFeedbackScreen`. Copy success now waits for Clipboard API or acknowledged textarea fallback success, and failures add clipboard/fallback support booleans to the existing bounded mobile owner context. This adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, provider calls, cache invalidations, fields, rules, indexes, Firebase deploy requirement, Vercel deploy action, or owner settings.

Desktop Feedback QR handoff hardening is also cost-neutral. It changes only browser-local QR generation/download, feedback-link copy/open, WhatsApp open, and message-copy acknowledgement/diagnostics in `FeedbackQrDownload`. Copy success now waits for Clipboard API or acknowledged textarea fallback success, and failures add clipboard/fallback support booleans. This adds no Firestore reads/writes, Storage operations, Cloud Functions, API routes, provider calls, cache invalidations, fields, rules, indexes, Firebase deploy requirement, Vercel deploy action, or owner settings.

Guest feedback submit response/request hardening is cost-neutral. It changes only browser-side submit request policy, response parsing, acknowledgement checks, and bounded diagnostics in `GuestFeedbackForm`; the form submits with same-origin credentials, no-store cache policy, and manual redirect handling before the 16KB acknowledgement guard, then shows success only after an OK HTTP response plus a non-empty `feedbackId`. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, provider calls, cache invalidations, fields, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

July 1, 2026 public submit tenant-block hardening adds one tenant-document read to the valid public feedback scope check, after IP rate limiting, bounded body parsing, schema validation, honeypot handling, and Turnstile verification. Valid submissions now read project, store, and tenant before writing so tenant-blocked stores cannot accept new public feedback. This adds no writes/deletes, Storage operations, Cloud Functions, cache invalidations, fields, rules, indexes, owner settings, Firebase deploy requirement, or Vercel deploy action.

---

## 9. Testing Guide

### Manual Testing Checklist

#### Guest Feedback Flow

| #   | Test                                  | Expected Result           | Status |
| --- | ------------------------------------- | ------------------------- | ------ |
| 1   | Submit feedback with valid rating     | Success, shows Google CTA | ⬜     |
| 2   | Submit feedback without rating        | Validation error          | ⬜     |
| 3   | Submit feedback with rating 6         | Validation error          | ⬜     |
| 4   | Submit feedback with 301 char message | Validation error          | ⬜     |
| 5   | Submit 11 feedbacks in 10 minutes     | 11th request rate limited | ⬜     |
| 6   | Submit with honeypot filled           | Request rejected silently | ⬜     |
| 7   | Submit from disabled project          | Error: Feedback disabled  | ⬜     |

#### Owner Inbox Flow

| #   | Test                          | Expected Result                    | Status |
| --- | ----------------------------- | ---------------------------------- | ------ |
| 8   | View inbox with no feedback   | Empty state shown                  | ⬜     |
| 9   | View inbox with 50+ items     | Pagination works                   | ⬜     |
| 10  | Filter by "Needs Attention"   | Only rating ≤3 shown               | ⬜     |
| 11  | Filter by "Resolved"          | Only resolved shown                | ⬜     |
| 12  | Mark feedback resolved        | Status changes, card updates       | ⬜     |
| 13  | Mark resolved feedback as new | Status reverts                     | ⬜     |
| 14  | Manager views feedback        | Only own store shown               | ⬜     |
| 15  | HQ views feedback             | All stores shown, filter available | ⬜     |

#### Settings Flow

| #   | Test                         | Expected Result              | Status |
| --- | ---------------------------- | ---------------------------- | ------ |
| 16  | Disable feedback for project | Menu footer link hidden      | ⬜     |
| 17  | Disable name collection      | Name field not shown in form | ⬜     |
| 18  | Add Google Review URL        | URL shown in post-submit CTA | ⬜     |
| 19  | Remove Google Review URL     | CTA not shown                | ⬜     |

### Integration Tests (Future)

```typescript
// __tests__/api/public/feedback/submit.test.ts

describe("POST /api/public/feedback/submit", () => {
  it("should accept valid feedback", async () => {
    const res = await request(app).post("/api/public/feedback/submit").send({
      tId: 1,
      sId: 1,
      projectId: "test-project",
      rating: 4,
      source: "menu_footer",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("should reject missing rating", async () => {
    const res = await request(app).post("/api/public/feedback/submit").send({
      tId: 1,
      sId: 1,
      projectId: "test-project",
      source: "menu_footer",
    });

    expect(res.status).toBe(400);
  });

  it("should rate limit after 10 requests", async () => {
    // ... rate limit test
  });
});
```

---

## 10. Progress Tracking

| Phase                      | Task Count | Completed | Status   |
| -------------------------- | ---------- | --------- | -------- |
| Phase 1: Foundation        | 8          | 8         | ✅ DONE  |
| Phase 2: Public API        | 5          | 5         | ✅ DONE  |
| Phase 3: Guest UI          | 4          | 4         | ✅ DONE  |
| Phase 4: Owner Dashboard   | 6          | 6         | ✅ DONE  |
| Phase 5: Settings & Polish | 5          | 5         | ✅ DONE  |
| **Total**                  | **28**     | **28**    | **100%** |

> **STALE DOC NOTE (Feb 24, 2026):** This progress table was never updated during implementation. The feature IS fully built. See codebase evidence below.

### Implementation Log

| Date           | Phase | Task         | Notes                       |
| -------------- | ----- | ------------ | --------------------------- |
| Pre-Session 13 | All   | All 28 tasks | Built but doc never updated |

### Codebase Evidence (verified Feb 24, 2026)

- `src/database/guestFeedback/index.ts` — DAL (15 functions)
- `src/app/api/public/feedback/submit/route.ts` — Public submission API
- `src/components/atoms/GuestFeedbackForm/index.tsx` — Guest-facing form
- `src/app/feedback/[projectId]/page.tsx` — Public feedback page
- `src/types/guestFeedback.ts` — Type definitions
- `src/hooks/useFeedback.ts` — React hook
- `src/components/templates/main-app/feedback/` — Owner dashboard (index, FeedbackCard, FeedbackFilters)
- `src/components/mobile/screens/MobileFeedbackScreen.tsx` + `MobileFeedbackDetail.tsx` — Mobile
- `src/lib/rateLimit/configs.ts` — Rate limit config for feedback
- `src/lib/validation/apiSchemas.ts` — Zod validation
- `firestore.rules` — Firestore security rules for `guestFeedback` collection

---

## Appendix A: Rate Limit Configuration

```typescript
// src/lib/rateLimit/configs.ts - ADD

export const RATE_LIMIT_CONFIGS = {
  // ... existing configs ...

  /**
   * Public feedback submission
   * Stricter than authenticated routes to prevent spam
   */
  FEEDBACK_SUBMISSION: {
    limit: 10, // 10 requests
    window: 600, // per 10 minutes (600 seconds)
    keyPrefix: "feedback_submit",
  },
} as const;
```

---

## Appendix B: MOL Event Types

```typescript
// src/types/mol.types.ts - ADD

export type MOLEventType =
  // ... existing types ...
  | "FEEDBACK_SUBMITTED" // Guest submitted feedback
  | "FEEDBACK_RESOLVED"; // Owner marked feedback resolved
```

---

## Appendix C: Feature Flag

```typescript
// src/config/features.ts - ADD

export const FEATURE_FLAGS = {
  // ... existing flags ...

  /**
   * Internal Feedback System
   * Enables guest feedback collection from menu
   */
  ENABLE_GUEST_FEEDBACK: true,
} as const;
```

---

_Document Owner: Engineering Team_
_Last Updated: July 1, 2026_
_Status: ✅ FULLY IMPLEMENTED — All 28 tasks complete_
