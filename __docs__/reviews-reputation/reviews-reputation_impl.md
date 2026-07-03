# Reviews & Reputation — Implementation Plan

**Document Type:** Technical Implementation Blueprint  
**Audience:** Developers, Technical Leads  
**Version:** 1.0  
**Status:** 🔒 SPEC LOCKED — Implementation blocked until GBP API access granted  
**Date:** February 2, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [ChatGPT Analysis & Disagreements](#2-chatgpt-analysis--disagreements)
3. [Database Schema](#3-database-schema)
4. [API Contracts](#4-api-contracts)
5. [File Structure](#5-file-structure)
6. [Implementation Checklist](#6-implementation-checklist)
7. [Security Checklist](#7-security-checklist)
8. [Firebase Cost Analysis](#8-firebase-cost-analysis)
9. [Testing Guide](#9-testing-guide)
10. [Progress Tracking](#10-progress-tracking)

---

## 1. Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL LAYER (Google)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Google Business Profile API                                 │   │
│   │  • Read reviews (read-only)                                  │   │
│   │  • No write operations for reviews                           │   │
│   │  • Shared GBP credentials with GBP Sync feature              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ (Nightly Cloud Function)
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER (Cloud Functions)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  reviewsIngestion.ts (Cloud Function)                        │   │
│   │  functions/src/reviews/reviewsIngestion.ts                   │   │
│   │                                                              │   │
│   │  Schedule: 2:30 AM UTC (after GBP Sync at 2:00 AM)          │   │
│   │  • Fetch reviews from GBP API                                │   │
│   │  • Store in reviews/{tId}/{sId}/{reviewId}                   │   │
│   │  • Trigger classification                                     │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  reviewsClassifier.ts (Cloud Function)                       │   │
│   │  functions/src/reviews/reviewsClassifier.ts                  │   │
│   │                                                              │   │
│   │  Triggered by: New review document                           │   │
│   │  • Apply classification rules                                │   │
│   │  • Update state in reviewsState/{tId}/{sId}/{reviewId}       │   │
│   │  • Log to MOL                                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Firestore)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Collection: reviews/{tId}/{sId}/{reviewId}                        │
│   • Raw review data from GBP                                        │
│   • Immutable after ingestion                                       │
│                                                                      │
│   Collection: reviewsState/{tId}/{sId}/{reviewId}                   │
│   • Classification state                                            │
│   • Block/Escalation flags                                          │
│   • Last updated timestamp                                          │
│                                                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER (Owner UI)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  ReputationGuard.tsx                                         │   │
│   │  src/components/templates/main-app/reviews/ReputationGuard.tsx│  │
│   │                                                              │   │
│   │  Features:                                                   │   │
│   │  • Minimal UI (almost invisible)                             │   │
│   │  • Shows Block message if state = negative_high_risk         │   │
│   │  • Shows Escalation message if state = volatile              │   │
│   │  • Warning auto-expires after 24h (no dismiss button)        │   │
│   │  • No dashboard, no list, no analytics                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision             | Choice                                  | Reason                              |
| -------------------- | --------------------------------------- | ----------------------------------- |
| Collection structure | Nested `reviews/{tId}/{sId}/{reviewId}` | Matches projects pattern            |
| Sync frequency       | Nightly (2:30 AM UTC)                   | Balance cost and freshness          |
| Classification       | Rule-based                              | ML is over-engineering for P0       |
| State separation     | Separate `reviewsState` collection      | Keeps raw data immutable            |
| UI approach          | ReputationGuard (passive notice)        | Minimal UI, no interaction required |

---

## 2. ChatGPT Analysis & Disagreements

### Agreements (Implemented As-Is)

| #   | ChatGPT Suggestion               | Implementation                                             |
| --- | -------------------------------- | ---------------------------------------------------------- |
| 1   | Silent defensive infrastructure  | ✅ Minimal UI, no dashboards                               |
| 2   | 5 internal classification states | ✅ benign, informational, negative_low/high_risk, volatile |
| 3   | Owner sees exactly 2 messages    | ✅ Block and Escalation only                               |
| 4   | No AI reply generation           | ✅ Hard ban, never build                                   |
| 5   | No analytics/dashboards          | ✅ Hard ban, never build                                   |
| 6   | Feature flags for all features   | ✅ Granular control                                        |
| 7   | MOL logging                      | ✅ All actions logged                                      |
| 8   | FTC compliance                   | ✅ Read-only, no manipulation                              |

### Disagreements (Modified)

| #   | ChatGPT Said                          | We Changed To                    | Technical Reason                                                                                              |
| --- | ------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | "Reply interception"                  | Reply Assistant (pre-check)      | GBP API doesn't support interception hooks. Owner must voluntarily check assistant before replying in GBP UI. |
| 2   | Nested path `reviews_raw/{tId}/{sId}` | `reviews/{tId}/{sId}/{reviewId}` | Simpler naming, matches `projects` pattern in codebase                                                        |
| 3   | ML-based classification               | Rule-based first                 | Over-engineering. Rule-based is sufficient for P0. ML enhancement gated by feature flag.                      |
| 4   | "Phase 1" / "Phase 2" language        | State-based language             | Violates Law 1 (3-Year Freeze). Use "BLOCKED until X" not "Phase 2"                                           |

### Items NOT Implemented (Hard Bans)

| #   | ChatGPT Mentioned        | Status    | Reason               |
| --- | ------------------------ | --------- | -------------------- |
| 1   | AI reply drafting        | ❌ BANNED | Pre-Rejected Feature |
| 2   | Sentiment dashboard      | ❌ BANNED | Pre-Rejected Feature |
| 3   | Rating analytics         | ❌ BANNED | Violates Law 7       |
| 4   | Review volume tracking   | ❌ BANNED | Violates Law 7       |
| 5   | Competitive benchmarking | ❌ BANNED | Violates Law 3       |

---

## 3. Database Schema

### 3.1 Reviews Collection (Raw Data)

**Collection:** `reviews/{tId}/{sId}/{reviewId}`

```typescript
// src/types/reviews.ts

import { Timestamp } from "firebase/firestore";

/**
 * Review - Raw review data from Google Business Profile
 *
 * NOTE: This data is IMMUTABLE after ingestion.
 * Classification state is stored separately in reviewsState collection.
 */
export interface Review {
  /** Auto-generated Firestore document ID (matches GBP review ID) */
  id: string;

  // ─────────────────────────────────────────────────────────────
  // TENANT/STORE ISOLATION (Required for all queries)
  // ─────────────────────────────────────────────────────────────

  /** Tenant ID */
  tId: number;

  /** Store ID */
  sId: number;

  // ─────────────────────────────────────────────────────────────
  // REVIEW CONTENT (From GBP)
  // ─────────────────────────────────────────────────────────────

  /** Star rating (1-5) */
  rating: 1 | 2 | 3 | 4 | 5;

  /** Review text (may be empty for rating-only reviews) */
  comment?: string;

  /** Reviewer display name */
  reviewerName: string;

  /** Reviewer profile photo URL (optional) */
  reviewerPhotoUrl?: string;

  /** Review creation time (from GBP) */
  reviewTime: Timestamp;

  /** Owner's reply (if any, from GBP) */
  ownerReply?: {
    comment: string;
    updateTime: Timestamp;
  };

  // ─────────────────────────────────────────────────────────────
  // METADATA
  // ─────────────────────────────────────────────────────────────

  /** GBP review name/ID (e.g., "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}") */
  gbpReviewName: string;

  /** When MenuList ingested this review */
  ingestedOn: Timestamp;

  /** Source of ingestion (for debugging) */
  source: "gbp_api" | "manual_import";
}
```

### 3.2 Reviews State Collection (Classification)

**Collection:** `reviewsState/{tId}/{sId}/{reviewId}`

```typescript
// src/types/reviews.ts (continued)

/**
 * ReviewState - Classification and state for a review
 *
 * Separate from raw review data to allow state updates
 * without modifying source data.
 */
export interface ReviewState {
  /** Document ID (matches review ID) */
  id: string;

  /** Tenant ID */
  tId: number;

  /** Store ID */
  sId: number;

  // ─────────────────────────────────────────────────────────────
  // CLASSIFICATION (Internal Only - Owner Never Sees)
  // ─────────────────────────────────────────────────────────────

  /** Internal classification state */
  classification: ReviewClassification;

  /** Keywords that triggered classification (for debugging) */
  triggerKeywords?: string[];

  // ─────────────────────────────────────────────────────────────
  // OWNER-FACING STATE
  // ─────────────────────────────────────────────────────────────

  /** Block state active (shows "don't reply" message) */
  blockActive: boolean;

  /** Escalation state active (shows "needs careful handling" message) */
  escalationActive: boolean;

  /** Warning auto-expires after this time (24h from classification) */
  autoExpiresAt: Timestamp;

  // ─────────────────────────────────────────────────────────────
  // METADATA
  // ─────────────────────────────────────────────────────────────

  /** Classification timestamp */
  classifiedOn: Timestamp;

  /** Classification version (for rule updates) */
  classifierVersion: string;

  /** Last state update */
  updatedOn: Timestamp;
}

/**
 * Internal classification states
 * Owner NEVER sees these - only used for internal logic
 */
export type ReviewClassification =
  | "benign" // Safe - no action needed
  | "informational" // Neutral - no action needed
  | "negative_low_risk" // Negative but recoverable
  | "negative_high_risk" // Triggers Block state
  | "volatile"; // Triggers Escalation state
```

### 3.3 Classification Rules

```typescript
// functions/src/reviews/classificationRules.ts

export interface ClassificationRule {
  id: string;
  name: string;
  keywords: string[];
  patterns: RegExp[];
  resultState: ReviewClassification;
  priority: number; // Higher = checked first
}

/**
 * Classification rules (rule-based, not ML)
 *
 * Priority order: volatile > negative_high_risk > negative_low_risk > informational > benign
 */
export const CLASSIFICATION_RULES: ClassificationRule[] = [
  // VOLATILE (Escalation) - Check first
  {
    id: "volatile_legal",
    name: "Legal threat detection",
    keywords: ["lawyer", "sue", "legal action", "court", "attorney"],
    patterns: [/\b(i will|going to)\s+(sue|report|contact|lawyer)/i],
    resultState: "volatile",
    priority: 100,
  },
  {
    id: "volatile_viral",
    name: "Viral threat detection",
    keywords: ["viral", "news", "reporter", "journalist", "expose"],
    patterns: [/\b(go|going)\s+viral/i, /\bcontact(ing)?\s+(news|media)/i],
    resultState: "volatile",
    priority: 99,
  },
  {
    id: "volatile_health",
    name: "Health department threat",
    keywords: ["health department", "health inspector", "fda", "food safety"],
    patterns: [/\breport(ing)?\s+(to\s+)?(health|food\s+safety)/i],
    resultState: "volatile",
    priority: 98,
  },

  // NEGATIVE_HIGH_RISK (Block) - Check second
  {
    id: "high_risk_hygiene",
    name: "Hygiene complaints",
    keywords: [
      "dirty",
      "filthy",
      "cockroach",
      "roach",
      "rat",
      "mouse",
      "bug",
      "hair in food",
      "unsanitary",
    ],
    patterns: [/\b(found|saw)\s+(a\s+)?(bug|hair|insect|roach)/i],
    resultState: "negative_high_risk",
    priority: 80,
  },
  {
    id: "high_risk_safety",
    name: "Safety concerns",
    keywords: [
      "food poisoning",
      "sick",
      "hospital",
      "vomit",
      "diarrhea",
      "allergic reaction",
    ],
    patterns: [/\b(got|made\s+me)\s+sick/i, /\bfood\s+poisoning/i],
    resultState: "negative_high_risk",
    priority: 79,
  },
  {
    id: "high_risk_price",
    name: "Price dispute (verifiable)",
    keywords: ["overcharged", "wrong price", "price mismatch", "charged more"],
    patterns: [
      /\b(charged|cost)\s+(more|extra|wrong)/i,
      /\bprice\s+(was|is)\s+(wrong|different)/i,
    ],
    resultState: "negative_high_risk",
    priority: 78,
  },
  {
    id: "high_risk_staff",
    name: "Staff misconduct",
    keywords: ["rude staff", "manager yelled", "staff cursed", "discriminat"],
    patterns: [
      /\b(staff|manager|waiter|server)\s+(was\s+)?(rude|yelled|cursed)/i,
    ],
    resultState: "negative_high_risk",
    priority: 77,
  },

  // NEGATIVE_LOW_RISK - Recoverable negatives
  {
    id: "low_risk_service",
    name: "Service complaints (recoverable)",
    keywords: ["slow service", "long wait", "forgot order", "cold food"],
    patterns: [/\b(waited|wait)\s+(too\s+)?long/i, /\bfood\s+(was\s+)?cold/i],
    resultState: "negative_low_risk",
    priority: 50,
  },

  // INFORMATIONAL - Neutral
  {
    id: "info_question",
    name: "Questions/requests",
    keywords: ["?", "do you", "can you", "please add", "would be nice"],
    patterns: [/\?$/],
    resultState: "informational",
    priority: 20,
  },

  // BENIGN - Default (safe)
  {
    id: "benign_positive",
    name: "Positive review",
    keywords: [], // No keywords - rating-based
    patterns: [],
    resultState: "benign",
    priority: 0, // Lowest - default fallback
  },
];

/**
 * Classify a review based on rules
 */
export function classifyReview(
  rating: number,
  comment: string | undefined,
): { classification: ReviewClassification; triggerKeywords: string[] } {
  // Positive reviews (4-5 stars) without concerning content = benign
  if (rating >= 4 && !comment) {
    return { classification: "benign", triggerKeywords: [] };
  }

  // Check rules in priority order
  const sortedRules = [...CLASSIFICATION_RULES].sort(
    (a, b) => b.priority - a.priority,
  );

  for (const rule of sortedRules) {
    if (!comment) continue;

    const lowerComment = comment.toLowerCase();
    const matchedKeywords: string[] = [];

    // Check keywords
    for (const keyword of rule.keywords) {
      if (lowerComment.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    // Check patterns
    for (const pattern of rule.patterns) {
      if (pattern.test(comment)) {
        matchedKeywords.push(`pattern:${pattern.source}`);
      }
    }

    if (matchedKeywords.length > 0) {
      return {
        classification: rule.resultState,
        triggerKeywords: matchedKeywords,
      };
    }
  }

  // Default based on rating (conservative: 1★ = high_risk)
  if (rating === 1) {
    return {
      classification: "negative_high_risk",
      triggerKeywords: ["1_star_rating"],
    };
  }
  if (rating === 2) {
    return {
      classification: "negative_low_risk",
      triggerKeywords: ["2_star_rating"],
    };
  }
  if (rating === 3) {
    return {
      classification: "informational",
      triggerKeywords: ["neutral_rating"],
    };
  }

  return { classification: "benign", triggerKeywords: [] };
}
```

### 3.4 Firestore Indexes

```
# firestore.indexes.json (additions)

{
  "indexes": [
    {
      "collectionGroup": "reviewsState",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tId", "order": "ASCENDING" },
        { "fieldPath": "sId", "order": "ASCENDING" },
        { "fieldPath": "blockActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reviewsState",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tId", "order": "ASCENDING" },
        { "fieldPath": "sId", "order": "ASCENDING" },
        { "fieldPath": "escalationActive", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 4. API Contracts

### 4.1 Get Review States (Authenticated)

**Endpoint:** `GET /api/reviews/states`  
**File:** `src/app/api/reviews/states/route.ts`  
**Auth:** Required (withAuth middleware)

Diagnostics: unexpected read failures log `reviews_states_fetch_failed` through the shared runtime diagnostics helper with tenant/store/user presence-length metadata and source error name/code/status only. The owner response remains generic.

```typescript
// Request (query params)
interface GetReviewStatesParams {
  // No params needed - uses session tId/sId
}

// Response (booleans only - no counts to prevent dashboard mentality)
interface GetReviewStatesResponse {
  success: boolean;
  data?: {
    hasBlockActive: boolean; // Any review with block state (non-expired)
    hasEscalationActive: boolean; // Any review with escalation state (non-expired)
  };
  error?: string;
}
```

**Response Shape:**

```typescript
// src/app/api/reviews/states/route.ts
{
  success: true,
  data: {
    hasBlockActive: boolean;
    hasEscalationActive: boolean;
  }
}
```

`ReputationGuard` must not update local warning state from a cached, followed-redirect, unbounded, or malformed browser response. It calls `/api/reviews/states` with no-store cache policy, same-origin credentials, and manual redirect handling, then parses the response through `readJsonResponseWithLimit()` with a 16KB cap and the shared `isReputationStateResponse()` guard. Rejected responses log `reputation_guard_state_response_rejected`; malformed or oversized responses log `reputation_guard_state_response_parse_failed`; invalid acknowledgements log `reputation_guard_state_response_invalid`; request failures log `reputation_guard_state_request_failed`. Diagnostics use bounded endpoint/status/cap metadata only and preserve the passive no-error UI.

### 4.2 Review Reply Suggestion (Authenticated, Disabled)

**Endpoint:** `POST /api/reviews/suggest`
**File:** `src/app/api/reviews/suggest/route.ts`
**UI:** `src/components/templates/main-app/reviews/ReviewReplyTool.tsx`

The route is guarded by `withAuth`, `ENABLE_REVIEWS_REPUTATION`, `ENABLE_AI_REPLY_ASSIST`, SAFE_MODE, bounded JSON-body reads, Zod validation, tenant verification, rate limiting, AI capacity checks, and shared AI operation accounting. MenuList returns a suggestion only; it does not post replies to Google.

Diagnostics:

- Pasted review text is normalized before provider prompt construction: control/template characters are stripped, whitespace is collapsed, the prompt input stays capped at 2000 characters, and sanitized text is serialized with `JSON.stringify()` instead of raw interpolation.
- `businessType` is capped at 80 characters, normalized before industry-constraint matching, and sanitized before AI accounting metadata is recorded.
- Browser suggestion requests use same-origin credentials, no-store cache policy, and manual redirect handling before response parsing.
- Generation failures log `desktop_review_reply_generation_failed` with bounded rating, business-type, and review-text length metadata only.
- Browser response parse failures log `desktop_review_reply_response_parse_failed` with bounded status/cap and review metadata only.
- Invalid successful suggestion envelopes log `desktop_review_reply_response_invalid`, and the UI only shows a reply after `{ success: true, reply, source: "ai" | "fallback" }` is present.
- Accounting failures log `review_reply_accounting_failed` with bounded tenant/store/user/business-type metadata and source error name/code/status only.
- Clipboard copied feedback waits for Clipboard API success or acknowledged textarea fallback success. Clipboard copy failures log `desktop_review_reply_copy_failed` with rating, reply source, attempt count, clipboard/fallback support booleans, and presence/length metadata for business type, pasted review text, and generated reply only.
- Raw pasted review text, generated reply text, provider exception text, and raw API response text must not be shown to the owner or written to logs.

### 4.3 Rate Limiting

| Endpoint                | Rate Limit | Window |
| ----------------------- | ---------- | ------ |
| GET /api/reviews/states | 30 req     | 1 min  |
| POST /api/reviews/suggest | 10 req   | 1 min  |

Rate limiting uses existing `checkRateLimit` from `@lib/rateLimit`.
Provider keys hash owner, tenant, and store key material before calling the shared limiter. Raw user IDs, tenant IDs, and store IDs must not be stored in review-state or review-suggest limiter key names.

> **NOTE:** No dismiss endpoint. Warnings auto-expire after 24h. This prevents owner from having to make a decision (Law 6: No Cognitive Load).

---

## 5. File Structure

### 5.1 New Files to Create

```
src/
├── types/
│   └── reviews.ts                    # Review, ReviewState, ReviewClassification types
│
├── database/
│   └── reviews/
│       └── index.ts                  # DAL for reviews and reviewsState collections
│
├── app/
│   └── api/
│       └── reviews/
│           └── states/
│               └── route.ts          # GET review states (booleans only)
│
├── components/
│   └── templates/
│       └── main-app/
│           └── reviews/
│               └── ReputationGuard.tsx  # Passive warning notice (auto-expires)
│
└── config/
    └── features.ts                   # Add feature flags (modify existing)

functions/
└── src/
    └── reviews/
        ├── reviewsIngestion.ts       # Cloud Function - nightly ingestion
        ├── reviewsClassifier.ts      # Cloud Function - classification
        └── classificationRules.ts    # Classification rules
```

### 5.2 Files to Modify

| File                                          | Modification                                 |
| --------------------------------------------- | -------------------------------------------- |
| `src/config/features.ts`                      | Add ENABLE_REVIEWS_REPUTATION and sub-flags  |
| `src/constants/database.ts`                   | Add REVIEWS, REVIEWS_STATE to DB_COLLECTIONS |
| `functions/src/schedulers/masterScheduler.ts` | Add reviews ingestion task                   |

---

## 6. Implementation Checklist

### Week 1: Foundation (Spec Only - BLOCKED)

| #   | Task                                | File                                           | Status     |
| --- | ----------------------------------- | ---------------------------------------------- | ---------- |
| 1   | Define Review and ReviewState types | `src/types/reviews.ts`                         | 🔶 BLOCKED |
| 2   | Add DB_COLLECTIONS constants        | `src/constants/database.ts`                    | 🔶 BLOCKED |
| 3   | Add feature flags                   | `src/config/features.ts`                       | 🔶 BLOCKED |
| 4   | Create DAL skeleton                 | `src/database/reviews/index.ts`                | 🔶 BLOCKED |
| 5   | Create classification rules         | `functions/src/reviews/classificationRules.ts` | 🔶 BLOCKED |

### Week 2: Backend (BLOCKED)

| #   | Task                        | File                                          | Status     |
| --- | --------------------------- | --------------------------------------------- | ---------- |
| 6   | Implement reviews ingestion | `functions/src/reviews/reviewsIngestion.ts`   | 🔶 BLOCKED |
| 7   | Implement classifier        | `functions/src/reviews/reviewsClassifier.ts`  | 🔶 BLOCKED |
| 8   | Add to master scheduler     | `functions/src/schedulers/masterScheduler.ts` | 🔶 BLOCKED |
| 9   | Create Firestore indexes    | `firestore.indexes.json`                      | 🔶 BLOCKED |

### Week 3: Frontend & Integration (BLOCKED)

| #   | Task                             | File                                                            | Status     |
| --- | -------------------------------- | --------------------------------------------------------------- | ---------- |
| 10  | Create GET /api/reviews/states   | `src/app/api/reviews/states/route.ts`                           | 🔶 BLOCKED |
| 11  | Create ReputationGuard component | `src/components/templates/main-app/reviews/ReputationGuard.tsx` | 🔶 BLOCKED |
| 12  | Add MOL event types              | `src/types/mol.types.ts`                                        | 🔶 BLOCKED |
| 13  | Integration testing              | -                                                               | 🔶 BLOCKED |

---

## 7. Security Checklist

| #   | Requirement                      | Implementation                    | Status     |
| --- | -------------------------------- | --------------------------------- | ---------- |
| 1   | Auth required for all API routes | `withAuth` middleware             | 🔶 BLOCKED |
| 2   | Tenant isolation in all queries  | `where('tId', '==', session.tId)` | 🔶 BLOCKED |
| 3   | Store isolation in all queries   | `where('sId', '==', session.sId)` | 🔶 BLOCKED |
| 4   | Rate limiting on all endpoints   | `checkRateLimit`                  | 🔶 BLOCKED |
| 5   | Input validation (Zod)           | Zod schemas for all requests      | 🔶 BLOCKED |
| 6   | No PII logging                   | Exclude review/reply content from logs; log length/presence only for diagnostics | 🔶 BLOCKED |
| 7   | Feature flag protection          | Check `ENABLE_REVIEWS_REPUTATION` | 🔶 BLOCKED |

### Security Rules (Firestore)

```javascript
// firestore.rules (additions)

match /reviews/{tId}/{sId}/{reviewId} {
  // Read: Authenticated users with matching tenant/store
  allow read: if request.auth != null
    && request.auth.token.tId == int(tId)
    && request.auth.token.sId == int(sId);

  // Write: Cloud Functions only (service account)
  allow write: if false; // Frontend cannot write
}

match /reviewsState/{tId}/{sId}/{reviewId} {
  // Read: Authenticated users with matching tenant/store
  allow read: if request.auth != null
    && request.auth.token.tId == int(tId)
    && request.auth.token.sId == int(sId);

  // Write: Cloud Functions only (no frontend writes - auto-expire handles state)
  allow write: if false;
}
```

---

## 8. Firebase Cost Analysis

### Estimated Operations (per store/month)

| Operation                          | Volume      | Cost                 |
| ---------------------------------- | ----------- | -------------------- |
| Reviews ingestion (reads from GBP) | ~30 reviews | $0.00 (GBP API free) |
| Firestore writes (reviews)         | ~30 docs    | $0.054               |
| Firestore writes (reviewsState)    | ~30 docs    | $0.054               |
| Firestore reads (states check)     | ~100 reads  | $0.006               |
| Cloud Function invocations         | ~60         | $0.00 (free tier)    |

### Total Estimated Cost

| Scale       | Monthly Cost |
| ----------- | ------------ |
| 10 stores   | ~$1.14       |
| 100 stores  | ~$11.40      |
| 1000 stores | ~$114.00     |

### Cost Optimization

- Nightly sync (not real-time) reduces API calls
- Batch writes for ingestion
- Minimal reads (only check states, not full reviews)
- 90-day retention with automatic cleanup

---

## 9. Testing Guide

### 9.1 Manual Testing Steps

#### Test 1: Classification Rules

```
1. Open Cloud Functions emulator
2. Simulate review with hygiene keywords
3. Verify classification = negative_high_risk
4. Verify blockActive = true in reviewsState
```

#### Test 2: Block State Display

```
1. Create review with classification = negative_high_risk
2. Open Reply Assistant UI
3. Verify message: "It's better not to respond to this publicly."
4. Verify no other information is displayed
```

#### Test 3: Escalation State Display

```
1. Create review with classification = volatile
2. Open Reply Assistant UI
3. Verify message: "A recent review may need careful handling."
4. Verify no other information is displayed
```

#### Test 4: Dismiss Functionality

```
1. With block/escalation active
2. Click dismiss
3. Verify ownerDismissedAt is set
4. Verify warning no longer shows
```

### 9.2 Security Tests

| Test                              | Expected Result            |
| --------------------------------- | -------------------------- |
| Access without auth               | 401 Unauthorized           |
| Access different tenant's reviews | 403 Forbidden (no results) |
| Rate limit exceeded               | 429 Too Many Requests      |
| Invalid reviewId in dismiss       | 400 Bad Request            |

---

## 10. Progress Tracking

| Task              | Status     | Blocker | Notes              |
| ----------------- | ---------- | ------- | ------------------ |
| Spec complete     | ✅ DONE    | -       | This document      |
| Types defined     | 🔶 BLOCKED | GBP API | Ready to implement |
| DAL created       | 🔶 BLOCKED | GBP API | Ready to implement |
| Cloud Functions   | 🔶 BLOCKED | GBP API | Ready to implement |
| API routes        | 🔶 BLOCKED | GBP API | Ready to implement |
| UI component      | 🔶 BLOCKED | GBP API | Ready to implement |
| Integration test  | 🔶 BLOCKED | GBP API | Ready to implement |
| Production deploy | 🔶 BLOCKED | GBP API | Ready to implement |

### Dependency Status

| Dependency       | Status     | ETA                                   |
| ---------------- | ---------- | ------------------------------------- |
| GBP API Access   | 🔶 BLOCKED | Unknown - waiting for Google approval |
| GBP Sync Feature | 🔶 BLOCKED | Same blocker                          |

---

## Document References

| Document               | Location                                                                      |
| ---------------------- | ----------------------------------------------------------------------------- |
| Product Spec           | `reviews-reputation_spec.md`                                                  |
| Marketing Collateral   | `reviews-reputation_marketing.md`                                             |
| Critical Review        | `_archive/CHATGPT-CONVERSATION-CRITICAL-REVIEW.md`                            |
| Internal Feedback Impl | `__docs__/projects/internal-feedback-system/internal-feedback-system_impl.md` |
| GBP Sync Spec          | `__docs__/gbp-sync/gbp-sync_spec.md`                                          |
| Security Patterns      | `__docs__/security/`                                                          |

---

**DOCUMENT STATUS:** 🔒 LOCKED  
**IMPLEMENTATION STATUS:** BLOCKED (GBP API dependency)

---

_Implementation begins only after GBP API access is granted. All code patterns are ready to execute._
