# Messaging Onboarding — Implementation Plan

**Feature:** Messaging Onboarding — Zero-Friction SMB Acquisition Engine
**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification
**Architecture:** Firebase Cloud Functions + Firestore State Machine + Provider-Agnostic Adapter Layer
**Last Updated:** July 16, 2026

> **Launch boundary:** Not current launch certification or deploy approval. Current source registers WhatsApp only, while checked-in Functions environments keep provider processing disabled. `/whatsapp` is informational and routes its actions to the signed-in `/create-menu` photo or public-link intake. Production use still requires current audit/runbook/local aggregate evidence, a final owned provider account, real Meta secrets, webhook registration, explicit target enablement and scoped deploy evidence, provider smoke, browser/device QA, and production-host smoke.

### July 16, 2026 Provider Network Boundary

Lifecycle notification delivery treats persisted store scope as a security boundary. Canonical and legacy tenant/store aliases must be exact and agree before owner/contact resolution; direct store reads also require the expected tenant. Ambiguous legacy rows fail without a provider call.

All authenticated WhatsApp Graph API requests in `WhatsAppAdapter.ts` set `redirect: "manual"`. Media metadata and outbound sends use a 15-second abort boundary; media binary downloads use a 30-second abort boundary. Redirect responses fail as provider errors instead of forwarding the bearer token to another location, and stalled provider calls release the worker within a bounded interval. `scripts/verification/test-messaging-whatsapp-adapter.ts` exercises the request options and `npm run verify:menu-extraction-pipeline` source-gates them. This is a cost-neutral provider hardening change; the checked-in runtime gate remains disabled.

### July 13, 2026 Platform Monitor Data Contract

- `src/app/api/ops/messaging-onboarding/route.ts` is server-authorized with `requiredPlatformRole: 'PLATFORM'`; the client redirect is only a secondary UX guard.
- `src/lib/ops/messagingOnboardingOpsBoundary.ts` is the single persisted-to-API and API-to-browser contract. It does not forward Firestore `runMetrics`, `metrics`, `costs`, `retention`, event metadata, event errors, sessions, or alerts as raw stored objects.
- The health producer intentionally stores fields such as `retention.retainPublishedSourceFiles`; the ops projection omits producer-only fields and returns only the numeric owner-safe monitor fields declared by `MessagingOnboardingOpsHealth`. This prevents the real producer snapshot from failing the browser response guard.
- Health alerts are capped at 8. Recent events are capped at 12, sessions at 8, and messaging alerts at 8. Stored alert title/message text is represented only as presence/length context.
- Event counts use one closed `[generatedAt - 24h, generatedAt]` window, so records timestamped later than `generatedAt` cannot enter the current monitor.
- The browser aborts superseded refreshes, ignores superseded responses, and clears old monitor state when the current request fails validation or transport.
- The alert query uses `metadata.subsystem == messaging_onboarding`, descending `timestamp`, and limit 8. `firestore.indexes.json` carries the matching composite index.
- Regression gate: `npm run verify:messaging-onboarding-monitor-boundary` runs both source-contract checks and `test:messaging-onboarding-ops-boundary` adversarial producer/read-model tests.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│ MESSAGING PROVIDERS                                                    │
│                                                                        │
│  WhatsApp (Meta Cloud API)  │  Reserved provider extension candidates    │
│  Owner sends images/PDF ────┼──────────────────────┼──► webhook POST  │
│  System sends replies   ◄───┼──────────────────────┼─── outbound API  │
└──────────────────────┬─────────────────────────────────────────────────┘
                       │ webhook POST (per-provider endpoint)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PROVIDER ADAPTER LAYER (implements IMessagingProvider)                 │
│                                                                        │
│  WhatsAppAdapter                │  Additional adapters require review │
│    ├─ verifyWebhook()           │    ├─ verifyWebhook()               │
│    ├─ parseIncomingMessages()   │    ├─ parseIncomingMessages()        │
│    ├─ downloadMedia()           │    ├─ downloadMedia()               │
│    └─ sendMessage()             │    └─ sendMessage()                 │
│                                                                        │
│  Output: NormalizedMessage[] { provider, userId, media, text }        │
└──────────────────────┬─────────────────────────────────────────────────┘
                       │ NormalizedMessage
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ DURABLE INBOUND QUEUE                                                  │
│                                                                        │
│  inboundQueue                                                          │
│    ├─ Dedup key: SHA-256(provider + providerMessageId)                │
│    ├─ Bulk-create every sanitized message in a provider batch         │
│    ├─ Checkpoint session handling before outbound reply delivery      │
│    └─ Process from menulistMaintenanceScheduler.messaging_intake      │
│       after durable provider ACK                                      │
└──────────────────────┬─────────────────────────────────────────────────┘
                       │ queued NormalizedMessage
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CORE SESSION ENGINE (provider-agnostic)                               │
│                                                                        │
│  webhookHandler (onRequest — per-provider routes)                     │
│    ├─ providerAdapter.verifyWebhook()                                 │
│    ├─ providerAdapter.parseIncomingMessages() → NormalizedMessage[]   │
│    ├─ inboundQueue.enqueueInboundMessages()                           │
│    └─ ACK provider only after queue write succeeds                    │
│                                                                        │
│  inboundQueue/processQueuedInboundMessage                              │
│    ├─ sessionEngine.handleMessage(normalizedMsg)                      │
│    └─ providerAdapter.sendMessage()                                   │
│                                                                        │
│  intakeProcessor (onSchedule — every 2 min)                           │
│    ├─ drainPendingInboundMessages()                                   │
│    ├─ findSessionsReadyForProcessing()                                │
│    ├─ assetIntelligence.validate() ← Gemini AI                       │
│    ├─ triggerExtraction() → reuses processMenuImagesJobLogic          │
│    └─ recordMessagingOnboardingHealth() hourly                        │
│                                                                        │
│  sessionCleanup (onSchedule — daily)                                  │
│    ├─ expireOldSessions()                                             │
│    ├─ sendReminders() → resolves provider adapter per session         │
│    └─ cleanupExpiredStorage()                                         │
│                                                                        │
│  publish executor (Next API route → src/lib/messaging-onboarding)     │
│    ├─ Firestore transaction: tenant + store + user + project          │
│    ├─ projectsSummary + session LIVE finalization                     │
│    ├─ public cache revalidation after commit                          │
│    └─ providerAdapter.sendMessage(publishConfirmation) via scheduler  │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ FIRESTORE                                                              │
│                                                                        │
│  messagingOnboardingSessions/{sessionId}  ← State machine (provider   │
│                                              field identifies source)  │
│  messagingOnboardingInboundMessages/{id}   ← Durable webhook queue     │
│  messagingOnboardingRateLimits/{userHash} ← Per-user rate limits      │
│  messagingOnboardingEvents/{eventId}       ← Lifecycle/cost events     │
│  systemHealth/messaging_onboarding_control ← Last health snapshot id    │
│  systemHealth/messaging_onboarding_*       ← Hourly health snapshots   │
│  menuImageProcessingJobs/{jobId}         ← Reused extraction jobs     │
│  tenants/{tId}                           ← Created on publish         │
│  stores/{sId}                            ← Created on publish         │
│  users/{uId}                             ← Created/linked on publish  │
│  platformSummary/summary                 ← Counters updated           │
│  platformSummary/storesSummary           ← Store synced               │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ NEXT.JS (Dashboard)                                                    │
│                                                                        │
│  Preview page: /msg-preview/[sessionId]                               │
│    ├─ Reads session + extracted data                                  │
│    ├─ Renders menu (reuses existing menu components)                  │
│    ├─ Shows editable business info (pre-filled from AI)               │
│    ├─ "Approve & Publish" → calls approve API route                   │
│    ├─ "Request Fix" → structured form → updates session               │
│    └─ Post-publish Copy/WhatsApp handoffs are browser-local and bounded│
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

Hourly snapshot documents are complete authoritative projections and use exact
replacement. The control document remains a partial mutable lease/status record.
Threshold alerts settle independently: a failed alert write is logged with its
bounded alert key/severity and does not prevent later warning or critical alerts
from being attempted.

**June 29, 2026 handoff hardening; June 30 copy acknowledgement:** the post-publish success state in `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx` now catches Copy Link and WhatsApp browser failures, shows fixed owner copy, opens WhatsApp with `noopener,noreferrer`, and logs only session/link presence-length plus message/URL length metadata. Copy Link checks Clipboard API support, falls through from rejected Clipboard API writes to textarea fallback, uses the textarea fallback only when the document fallback exists, and sets copied state only after acknowledged browser handoff; failed copy diagnostics include clipboard/fallback support booleans. The same preview page now parses preview load, approve, and fix responses through `src/lib/messaging-onboarding/previewClientResponse.ts`, which caps response JSON at 2MB and requires the expected preview/publish/fix response envelopes before updating page state. The approve/fix API routes, publish transaction, cache revalidation, provider confirmation, Firestore rules/indexes, Cloud Functions, and Vercel deployment are unchanged.

**June 29, 2026 WhatsApp media lookup diagnostics:** `functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts` still rejects media downloads when Meta's media lookup response does not yield a valid public HTTPS URL, but malformed or oversized lookup JSON now emits `WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED` with response status and bounded source error metadata before falling into the existing URL-rejected path. Raw provider response bodies and media URLs are not logged.

---

## 1B. Implementation Invariants (Hard Rules)

> **Source:** ChatGPT stress-test review (Feb 17, 2026) — evaluated by Cascade against codebase. Only validated items included.

### INV-1: Safe-Ignore Principle

**Every incoming message MUST be safely ignorable without breaking session state.**

No message — regardless of type, content, or timing — should ever:

- Corrupt session state
- Trigger unintended processing
- Create a cost explosion
- Restart extraction incorrectly

If a message is unclear or unrecognized → ignore silently. The webhook handler must NEVER throw on unexpected input. Unknown message types return 200 and are logged but not processed.

### INV-2: Token-Based Preview Security (ADR-13)

**Decision:** Preview approval uses token-only authentication. No WhatsApp "Reply YES" confirmation required.

**Security model:**

- `previewToken` is a unique 20+ char cryptographically random string
- Token is sent ONLY to the owner's verified WhatsApp number (the same number that uploaded the menu)
- Token is bound to a single session — cannot be reused
- Token expires when session expires (24h)
- Approve endpoint validates: `request.token === session.previewToken`

**Why NOT WhatsApp confirmation:**

- Adds friction (contradicts "zero-friction" core promise)
- Adds +1 WhatsApp API call cost per onboarding
- Adds latency (owner must switch apps, reply, wait)
- Menu data is inherently public (it goes live anyway)
- Token-to-verified-channel IS the proof of ownership (same pattern as email magic links)
- If owner forwards link to manager who approves → that's valid business delegation

**Risk accepted:** If owner forwards preview link, recipient can approve. This is the owner's choice and the data is non-sensitive.

### INV-3: Extraction Cost Cap

**Hard cap: `MAX_PROCESSING_RUNS_PER_SESSION: 2`**

After 2 extraction runs in a single session:

- New uploads are accepted but do NOT trigger extraction
- Reply: "To update your menu, please send all menu photos again in a new message."
- Session stays in current state (no restart)
- `processingRuns` counter in session tracks this

**Why:** Prevents AI cost spiral from repeated upload-during-processing cycles. Each extraction costs ~₹2-5 in Gemini API calls. Without cap, a confused/malicious user could trigger 10+ extractions.

**Flow with cap:**

```
Upload → Extract (run 1) → Preview → Owner sends new photos → Extract (run 2) → Preview
→ Owner sends AGAIN → "Send all menu photos again in a new message to update your menu." (no extraction)
```

### INV-4: BusinessType Is Non-Blocking (Soft Intelligence Only)

**businessType MUST NEVER:**

- Block publish
- Break UI rendering
- Restrict features or access
- Gate menu functionality

**businessType DOES:**

- Set defaults (time slot presets, schema prompts)
- Influence tone (OBP styling, extraction hints)
- Pre-fill preview dropdown (owner can always correct)

**Fallback chain:** AI detection → `Other` / best known category, defaulting to `specialty`

### INV-5: No Conversation Intelligence (NEVER)

> **Source:** ChatGPT final founder-level audit (Feb 17, 2026)

**This system is NOT a chatbot. NEVER add AI message interpretation.**

The system reacts ONLY to:

- **Media uploads** (images, PDFs) → store + process
- **Preview approval** (approve button on preview page)
- **Structured fix** (fix form on preview page)
- **Full resend** (3+ new images after preview → restart)

Everything else → ignored or generic reply. No NLP. No intent detection. No "let me understand what you mean."

**Why:** If you add conversation intelligence, this becomes a WhatsApp agency tool, not infrastructure. The tunnel is deterministic — media in, menu out.

### INV-6: One Session = One Outlet = One Truth

> **Source:** ChatGPT final founder-level audit (Feb 17, 2026)

**NEVER allow:**

- Multiple outlets in one session
- Multiple menus in one session
- Branching flows within a session
- Parallel active sessions for same provider+user

**One phone number → one active session → one store → one menu.**

If an owner wants a second outlet → dashboard only. The messaging tunnel creates exactly ONE entity set per session. This preserves clarity and prevents data corruption forever.

### INV-7: Tunnel Closes After Publish (Hard Boundary)

> **Source:** ChatGPT final founder-level audit (Feb 17, 2026)

**After publish, every message from this phone gets the SAME response:**

> "Your menu is live! Manage it here: {dashboardUrl}"

No exceptions. Not for "small help." Not for "just one change." Not for "add one item."

If messaging becomes a support channel, scalability dies. The tunnel is a **one-time activation**, not an ongoing relationship. All post-publish interaction happens on the dashboard.

### INV-8: Cost Monitoring From Day 1

> **Source:** ChatGPT final founder-level audit (Feb 17, 2026)

**Track these metrics from first deployment:**

```typescript
// functions/src/messagingOnboarding/constants.ts
const COST_MONITORING = {
  TARGET_COST_PER_PUBLISH: 7, // ₹ — target max cost per successful publish
  ALERT_COST_PER_PUBLISH: 15, // ₹ — alert threshold (investigate if exceeded)
  TARGET_PUBLISH_RATE: 0.6, // 60% of started sessions should publish
  MAX_SESSIONS_PER_DAY_ALERT: 100, // Alert if >100 sessions/day (capacity planning)
  HEALTH_SNAPSHOT_INTERVAL_MS: 60 * 60 * 1000, // hourly health/cost snapshot
  SOURCE_FILE_RETENTION_REVIEW_DAYS: 90,
  PUBLISHED_SOURCE_STORAGE_WARN_BYTES: 1024 * 1024 * 1024,
};
```

**Tracked via §16 Onboarding Observation Layer and `healthMonitor.ts`:**

- Estimated AI cost per publish (INR)
- Sessions per day
- Publish rate (published / started)
- Avg extractions per session
- Avg time to publish
- Failure events
- Published source-file storage sample

If cost per publish exceeds `ALERT_COST_PER_PUBLISH` → investigate immediately. Do NOT wait for scale.

---

## 2. Provider Adapter Interface (Multi-Provider Core)

### IMessagingProvider Interface

Every messaging provider implements this interface. The core session engine interacts ONLY through this interface — never directly with provider APIs.

```typescript
// functions/src/messagingOnboarding/providers/IMessagingProvider.ts

interface IMessagingProvider {
  /** Provider identifier */
  readonly providerId: MessagingProvider; // 'whatsapp' | 'telegram' | ...

  /** Verify incoming webhook authenticity (signature check) */
  verifyWebhook(req: functions.https.Request): boolean;

  /** Parse every user message in a potentially batched webhook */
  parseIncomingMessages(req: functions.https.Request): NormalizedMessage[];

  /** Download media file from provider API to Buffer */
  downloadMedia(providerMediaId: string): Promise<Buffer>;

  /** Send a text message to the user */
  sendTextMessage(userId: string, text: string): Promise<void>;

  /** Send a message with a link/button */
  sendLinkMessage(
    userId: string,
    text: string,
    url: string,
    buttonLabel: string,
  ): Promise<void>;

  /** Get webhook challenge response (for initial webhook registration) */
  handleWebhookChallenge?(req: functions.https.Request): string | null;
}

/** Normalized message — provider-agnostic representation of any incoming message */
interface NormalizedMessage {
  provider: MessagingProvider;
  providerMessageId: string; // Provider's unique message ID (for dedup)
  userId: string; // Provider-specific user ID (phone for WA, chatId for Telegram)
  userDisplayId: string; // Human-readable ID (phone number, @username)
  messageType: "image" | "document" | "text" | "unsupported";
  text?: string; // For text messages
  media?: {
    providerMediaId: string; // Provider's media ID for download
    mimeType: string; // image/jpeg, application/pdf, etc.
    fileSize?: number; // Bytes (if available from provider)
    fileName?: string; // Original filename (if available)
  };
  timestamp: Date;
  rawPayload: unknown; // Runtime-only; the durable queue always stores null
}

/** Supported messaging providers */
type MessagingProvider = "whatsapp";
```

### Provider Registry

```typescript
// functions/src/messagingOnboarding/providers/providerRegistry.ts

const providerRegistry: Partial<Record<MessagingProvider, () => IMessagingProvider>> = {
  whatsapp: () => new WhatsAppAdapter(),
};

/** Resolve adapter for a given provider */
function getProviderAdapter(provider: MessagingProvider): IMessagingProvider {
  const factory = providerRegistry[provider];
  if (!factory) throw new Error(`Unknown provider: ${provider}`);
  return factory();
}

/** Resolve adapter from webhook request path */
function getProviderFromWebhookPath(path: string): MessagingProvider | null {
  // /messagingOnboarding/whatsapp → 'whatsapp'
  const match = path.match(/\/messagingOnboarding\/(\w+)/);
  return match ? (match[1] as MessagingProvider) : null;
}
```

Current source registers WhatsApp only. Non-WhatsApp provider adapters are reserved extension candidates and are not runtime behavior.

### WhatsApp Adapter (v1 — Launch Provider)

```typescript
// functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts
// Implements IMessagingProvider for Meta WhatsApp Cloud API
// verifyWebhook (HMAC-SHA256), parseIncomingMessages (all Meta entries/changes/messages),
//             downloadMedia (Graph API), sendTextMessage/sendLinkMessage
// See §8.3 for WhatsApp-specific API patterns
```

### Reserved Provider Adapter Candidate

```typescript
// No non-WhatsApp adapter is registered in current source.
// Adding one requires adapter code, secrets, webhook registration,
// docs/cost/security review, deploy evidence, and provider smoke.
```

---

## 2B. ChatGPT vs Codebase Analysis

| ChatGPT Proposal              | Codebase Reality                                                                       | Decision                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| StoreDraft entity             | We have atomic store creation in `src/app/api/onboarding/create-subscription/route.ts` | **REJECT StoreDraft.** Create real store directly on publish using existing transaction pattern. |
| PublishJob entity             | Publish is a single atomic transaction                                                 | **REJECT separate entity.** Publish is a function call, not a job queue.                         |
| Generic webhook endpoint      | Firebase Cloud Functions support `onRequest` for HTTP endpoints                        | **USE `onRequest`** — isolated from dashboard, no NextAuth overhead.                             |
| Preview page as new system    | We have existing digital menu rendering components                                     | **REUSE existing menu renderer** for preview display.                                            |
| Create account for owner      | We have existing user creation in onboarding route                                     | **REUSE pattern** but adapted for phone-based identity.                                          |
| No knowledge of OBP           | OBP is built from store/public URL truth and existing public surfaces                   | **DO NOT BLOCK PUBLISH ON OBP/QR GENERATION.** Publish store/project URL truth; existing share/public surfaces handle OBP and QR access. |
| No knowledge of storesSummary | Cost optimization pattern exists                                                       | **SYNC to storesSummary** on publish per `__docs__/patterns/summary-document-pattern.md`.        |
| 10-min intake window          | No existing equivalent                                                                 | **IMPLEMENT as described** — good UX pattern.                                                    |
| Asset Intelligence Layer      | No existing equivalent (extraction processes ALL files)                                | **IMPLEMENT as NEW layer** before extraction. Single Gemini call for validation + business info. |

---

## 3. Database Schema

### 3.1 Onboarding Session

**Collection:** `messagingOnboardingSessions/{sessionId}`

> **Note:** Collection is provider-agnostic. The `provider` field identifies which messaging platform originated the session.

```typescript
interface MessagingOnboardingSession {
  // Identity
  sessionId: string; // Auto-generated doc ID
  provider: MessagingProvider; // 'whatsapp' | 'telegram' — which provider originated this session
  providerUserId: string; // Provider-specific user ID (phone for WA, chatId for Telegram)
  providerDisplayId: string; // Human-readable (E.164 phone for WA, @username for Telegram)
  providerMessageIds: string[]; // First-session, full-resend, and invalid-upload reply markers. Durable general dedup lives in messagingOnboardingInboundMessages.

  // State
  state: MessagingOnboardingState; // State machine enum
  stateHistory: Array<{
    // Audit trail
    state: MessagingOnboardingState;
    timestamp: Timestamp;
    reason?: string;
  }>;

  // Uploads
  uploads: Array<{
    id: string; // Unique upload ID
    providerMediaId: string; // Provider media ID (WhatsApp media ID, Telegram file_id, etc.)
    storagePath: string; // Firebase Storage path
    storageUrl: string; // Download URL
    mimeType: string; // image/jpeg, application/pdf, etc.
    fileSize: number; // Bytes
    sha256: string; // For dedup
    uploadedAt: Timestamp;
  }>;

Each provider download uses an attempt-unique Storage object. Session-create and upload-append compensation does not treat a thrown Firestore transaction as proof that the write failed: it re-reads the exact session, validates both authoritative upload arrays, retains the object when its path is referenced or persisted truth is malformed/unavailable, and deletes only after a successful read proves non-reference. This preserves a committed source across acknowledgement loss while still reclaiming definite rejected attempts.

  // Asset Intelligence Results
  validMenuFiles: string[]; // Upload IDs that are valid menu pages
  invalidFiles: string[]; // Upload IDs that are NOT menu pages
  menuCompleteness: "complete" | "likely_complete" | "partial" | "insufficient";
  validationConfidence: "high" | "medium" | "low";

  // Extracted Business Info (suggestions, not truth)
  extractedBusinessInfo: {
    businessName: string | null;
    phoneNumber: string | null;
    address: string | null;
    logoPresent: boolean;
    cuisineHint: string | null;
    confidence: "high" | "medium" | "low";
  } | null;

  // Detected Business Type (from Asset Intelligence — §8.4)
  // Uses existing BUSINESS_TYPES from src/data/shared/businessTypes.ts (60+ types, 7 categories)
  detectedBusinessType: string | null; // e.g., "Restaurant", "Salon", "Cafe" — from BUSINESS_TYPES[].value
  detectedBusinessCategory: string | null; // e.g., "food", "service", "health" — from BUSINESS_CATEGORIES[].value
  typeConfidence: "high" | "medium" | "low" | null;
  typeSource: "ai" | "fallback" | "manual"; // How businessType was determined (INV-4)
  // "ai" = detected by Asset Intelligence, "fallback" = default "Other", "manual" = owner corrected on preview
  // Shown on preview page as pre-filled editable dropdown. Owner can correct before publish.
  // On publish: stored as store.businessType + store.businessCategory (drives schema, prompts, OBP, defaults)
  // Fallback: "Other" plus the best known businessCategory, or "specialty" if category is unknown

  // Extraction
  extractionJobId: string | null; // menuImageProcessingJobs/{jobId}
  extractedMenuData: any | null; // Combined extraction result (same shape as project.files[].extractedData)
  qualityScore: number | null; // 0-100

  // Preview
  previewToken: string | null; // Signed token — generated when preview is ready (NOT at session creation)
  previewUrl: string | null; // Full preview URL — set together with previewToken

  // Published Result
  publishedResult: {
    tenantId: number;
    storeId: number;
    projectId: string;
    userId: string;
    publicUrl: string; // e.g., spice-garden.menulist.online
    dashboardUrl: string; // e.g., menulist.ai/login
  } | null;

  // Fix Request Details
  fixRequests: Array<{
    issues: string[]; // e.g. ['price_incorrect', 'item_missing']
    note: string | null;
    requestedAt: Timestamp;
  }>;

  // Counters & Safety
  invalidUploadAttempts: number; // Tracks junk uploads
  processingRuns: number; // Tracks extraction attempts
  correctionCount: number; // Tracks fix requests
  reminderSentAt: Timestamp | null;
  pendingUploadsWhileProcessing: boolean; // True if new uploads arrived during PROCESSING_MENU
  previewMessagePending?: boolean; // True until preview link is delivered by provider
  confirmationPending?: boolean; // True until publish confirmation is delivered
  fixMessagePending?: boolean; // True until fix acknowledgement is delivered

  // Timing
  lastUploadAt: Timestamp | null;
  intakeExpiresAt: Timestamp | null; // lastUploadAt + 10 min
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null; // Set when state transitions to LIVE
  expiresAt: Timestamp; // createdAt + 24h
}

type MessagingOnboardingState =
  | "COLLECTING_INPUT"
  | "VALIDATING_ASSETS"
  | "AWAITING_MORE_UPLOADS"
  | "PROCESSING_MENU"
  | "PREVIEW_READY"
  | "AWAITING_APPROVAL"
  | "PUBLISHING"
  | "LIVE"
  | "FAILED"
  | "EXPIRED"
  | "COOLDOWN";
```

### 3.2 User Rate Limit Tracking

**Collection:** `messagingOnboardingRateLimits/{userHash}`

> **Note:** `userHash` is SHA-256 of `{provider}:{providerUserId}` — unique per provider-user combination.

```typescript
interface MessagingOnboardingRateLimit {
  userHash: string; // SHA-256 of '{provider}:{providerUserId}' (never store raw)
  activeSessionId?: string | null; // transactionally serialized first-session admission
  sessionsToday: number;
  sessionsThisWeek: number;
  processingRunsThisWeek: number;
  lastSessionAt: Timestamp;
  cooldownUntil: Timestamp | null;
  dayResetAt: Timestamp; // Midnight UTC of next day
  weekResetAt: Timestamp; // Monday midnight UTC
  expiresAt?: Timestamp; // 90 days after the latest admitted session/quota/cooldown write; optional only for legacy rows
}
```

Every admitted session creation, extraction-quota consumption, or cooldown write refreshes `expiresAt`. The guarded MenuList Firestore TTL setup owns eventual deletion after 90 days of inactivity. TTL delay does not weaken rate enforcement because active callers continue to use the same transaction-current daily, weekly and cooldown fields; a deleted inactive row is equivalent to a user returning after all windows have expired.

### 3.3 Durable Inbound Message

**Collection:** `messagingOnboardingInboundMessages/{messageId}`

`messageId = SHA-256(provider + providerMessageId)`. This collection owns provider webhook dedup so the session document does not grow with one message ID per active-session message.

```typescript
interface MessagingOnboardingInboundMessage {
  messageId: string;
  provider: MessagingProvider;
  providerMessageId: string;
  providerUserId: string;
  providerDisplayId: string;
  messageType: "image" | "document" | "text" | "unsupported";
  text?: string; // truncated before storage
  media?: {
    providerMediaId: string;
    mimeType: string;
    fileSize?: number;
    fileName?: string;
  };
  providerTimestamp: Timestamp;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Timestamp;
  processingStartedAt?: Timestamp | null;
  processingToken?: string | null;
  handlerCompletedAt?: Timestamp | null;
  replyText?: string | null; // bounded fixed reply used for delivery retries
  processedAt?: Timestamp | null;
  lastError?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp; // 30-day TTL field
}
```

### 3.4 Firestore Indexes Required

```
// messagingOnboardingSessions
- provider ASC, providerUserId ASC, state ASC   (find active session for provider+user)
- state ASC, intakeExpiresAt ASC                (find sessions ready for processing)
- state ASC, expiresAt ASC                      (find expired sessions)
- state ASC, reminderSentAt ASC, expiresAt ASC  (find sessions needing reminder)
- state ASC, previewMessagePending ASC          (retry generated preview links)
- state ASC, confirmationPending ASC            (find pending publish confirmations)
- state ASC, fixMessagePending ASC              (find pending fix acknowledgements)
- state ASC, publishedAt ASC                    (source-retention health sample; uses existing ASC index)

// messagingOnboardingInboundMessages
- status ASC, nextAttemptAt ASC                 (drain pending queue)
- status ASC, processingStartedAt ASC           (reset stale PROCESSING messages)

// messagingOnboardingEvents
- sessionId ASC, timestamp ASC                  (all events for a session)
- eventType ASC, timestamp DESC                 (recent events by type)
```

---

## 4. API Contracts

### 4.1 Messaging Webhook (Firebase Cloud Function — `onRequest`)

**URL Pattern:** `https://us-central1-{project}.cloudfunctions.net/messagingOnboarding/{provider}`

Each registered provider gets its own webhook endpoint. The current source registers WhatsApp only. The webhook handler resolves the provider from the URL path, loads the correct `IMessagingProvider` adapter, and delegates all provider-specific work.

**WhatsApp endpoint:** `.../messagingOnboarding/whatsapp`

**GET** — Webhook Verification (provider-specific challenge)

```typescript
// WhatsApp: GET ?hub.mode=subscribe&hub.verify_token={token}&hub.challenge={challenge}
// Handler delegates to: providerAdapter.handleWebhookChallenge(req)
```

**POST** — Incoming Messages

```typescript
// 1. Resolve provider from URL path
// 2. providerAdapter.verifyWebhook(req) — reject if invalid
// 3. providerAdapter.parseIncomingMessages(req) → NormalizedMessage[]
// 4. inboundQueue.enqueueInboundMessages(messages) — bulk durable dedup writes
// 5. Send provider ACK only after every message is durably written
// 6. menulistMaintenanceScheduler.messaging_intake drains pending queue items every 2 minutes
// Must ACK provider quickly after durable queue write
```

**Webhook Handler Check Order (CRITICAL — must follow this exact sequence):**

```typescript
// webhookHandler ordered checks:
// 1. Runtime feature flag check → if OFF, return 200 (no processing)
// 2. Provider enabled check → if provider not in MESSAGING_ONBOARDING_PROVIDERS, return 200
// 3. Signature verification → reject invalid provider signatures
// 4. Parse every batched message → status-only/no-message payloads ACK and stop
// 5. Bulk durable queue dedup → partial failure returns 500; retry is idempotent
// 6. Scheduled queue claim handles state, checkpoints the reply, then delivers it

// sessionEngine.handleMessage(msg) still owns product-state checks after queue claim:
// 1. Existing LIVE session check → reply with dashboard link
// 2. Existing store check → reply with dashboard link
// 3. Active session check → handle per state rules
// 4. Rate limit check → if phone in cooldown or daily/weekly limit exceeded, reply "try again later"
// 5. Session creation → only if first valid media (image/PDF). Text/sticker/emoji → generic reply, no session
```

**State-specific media handling** (when active session exists):

| Current State           | Media Upload                                           | Text Message                |
| ----------------------- | ------------------------------------------------------ | --------------------------- |
| `COLLECTING_INPUT`      | Store upload, reset intake timer                       | No reply (waiting for more) |
| `AWAITING_MORE_UPLOADS` | Store upload, reset intake timer (same as COLLECTING)  | No reply                    |
| `VALIDATING_ASSETS`     | Store upload; stale model result is discarded and intake restarts | No reply       |
| `PROCESSING_MENU`       | Store upload, set `pendingUploadsWhileProcessing=true` | No reply                    |
| `PREVIEW_READY`         | If ≥3: full resend. If <3: reply with preview link     | Reply with preview link     |
| `AWAITING_APPROVAL`     | If ≥3: full resend. If <3: reply with preview link     | Reply with preview link     |
| `PUBLISHING`            | Ignore (publish in progress)                           | Ignore                      |

### 4.2 Preview Page API (Next.js API Route)

**GET** `/api/msg-preview/[sessionId]`

```typescript
// Zod schema
const PreviewParamsSchema = z.object({
  sessionId: z.string().min(10),
  token: z.string().min(20),
});

// Response: Session data + extracted menu + business info
// No auth required (token-based access)
// Rate limited by hashed session/IP key before session read
// Returns 404 if session expired or not found
// Unexpected failures log messaging_preview_get_route_failed with bounded context
```

**POST** `/api/msg-preview/[sessionId]/approve`

```typescript
const ApproveSchema = z.object({
  sessionId: z.string(),
  token: z.string(),
  businessName: z.string().min(1).max(100),
  phone: z.string().optional(),
  address: z.string().max(200).optional(),
});

// Triggers publish pipeline
// Validates token matches session
// Rejects request bodies above 4KB before JSON parsing
// Rate limited: PUBLISH_OPERATION per hashed IP before publish work
// Publish transaction is state/idempotency guarded
```

**POST** `/api/msg-preview/[sessionId]/fix`

```typescript
const FixRequestSchema = z.object({
  sessionId: z.string(),
  token: z.string(),
  issues: z
    .array(
      z.enum([
        "price_incorrect",
        "item_missing",
        "spelling_error",
        "wrong_category",
        "other",
      ]),
    )
    .min(1)
    .max(5),
  note: z.string().max(200).optional(),
});

// Rejects request bodies above 4KB before JSON parsing
// Rate limited by hashed session/IP key before session read or mutation

// Updates session state, sends WhatsApp message asking for new photos
// Rejects request bodies above 4KB before JSON parsing
// Rate limited per session/IP before Firestore work
```

---

## 5. File Structure

### Cloud Functions (NEW files)

```
functions/src/
├── messagingOnboarding/
│   ├── index.ts                    # Exports all messaging onboarding functions
│   ├── webhookHandler.ts           # onRequest: verifies provider webhook and enqueues message
│   ├── inboundQueue.ts             # Durable dedup/retry queue for sanitized provider messages
│   ├── sessionEngine.ts            # Core state machine logic (provider-agnostic)
│   ├── assetIntelligence.ts        # Gemini validation + business info extraction
│   ├── intakeProcessor.ts          # Scheduled: checks intake windows, triggers processing
│   ├── healthMonitor.ts            # Hourly cost/health/source-retention snapshots + alerts
│   ├── publishPipeline.ts          # Legacy CF copy; not active runtime publish path
│   ├── extractionWatcher.ts        # onDocumentUpdated: detects extraction completion for msg sessions
│   ├── eventLogger.ts              # Fire-and-forget tracking (MOL-inspired, §16)
│   ├── constants.ts                # Limits, timeouts, message templates
│   └── providers/
│       ├── IMessagingProvider.ts    # Provider interface + NormalizedMessage type
│       ├── providerRegistry.ts      # Provider factory + lookup
│       ├── whatsapp/
│       │   └── WhatsAppAdapter.ts   # Meta Cloud API: verify, parse, download, send
├── schedulers/
│   └── messagingSessionCleanup.ts  # Scheduled: expiry, reminders, storage cleanup
└── types/
    └── messagingOnboarding.types.ts # All TypeScript interfaces (provider-agnostic)
```

### Dashboard (NEW files)

```
src/
├── app/
│   └── (global-pages)/
│       └── msg-preview/
│           └── [sessionId]/
│               └── page.tsx        # Preview page (public, no auth, provider-agnostic)
├── app/api/
│   └── msg-preview/
│       └── [sessionId]/
│           ├── route.ts            # GET: fetch session data for preview
│           ├── approve/
│           │   └── route.ts        # POST: trigger publish
│           └── fix/
│               └── route.ts        # POST: submit fix request
├── lib/
│   └── messaging-onboarding/
│       └── publish.ts              # Active publish executor used by approve route
└── config/
    └── features.ts                 # ENABLE_MESSAGING_ONBOARDING + MESSAGING_ONBOARDING_PROVIDERS flags
```

### Modified Files

```
functions/src/index.ts              # Export new messaging onboarding functions
functions/src/firebaseAdmin.ts      # No changes (already exports firestoreAdmin)
functions/package.json              # May need axios for provider API calls
```

---

## 6. Security Checklist

| #   | Requirement                    | Implementation                                                                                                 |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1   | Webhook signature verification | Provider-specific: delegated to `IMessagingProvider.verifyWebhook()`. WA: HMAC-SHA256. Telegram: secret token. |
| 2   | Preview token security         | Signed token (crypto.randomBytes) tied to sessionId, expires with session                                      |
| 3   | Approval authorization         | Token + user verification (session.providerUserId must match webhook sender)                                   |
| 4   | Rate limiting                  | Per-user limits in Firestore (not Upstash — external webhook)                                                  |
| 5   | Input validation               | Zod schemas on all API routes                                                                                  |
| 6   | Media safety                   | Only accept image/\* and application/pdf MIME types                                                            |
| 7   | Storage isolation              | Session-scoped paths: `messagingOnboarding/{sessionId}/{fileId}`                                               |
| 8   | PII protection                 | User ID stored in session, hashed as `{provider}:{userId}` in rate limit collection                            |
| 9   | Session expiry                 | 24h hard expiry, media cleaned up on expiry                                                                    |
| 10  | Publish idempotency            | Approve route returns existing `publishedResult` for already-live sessions, rejects active `PUBLISHING`, and finalizes `LIVE` inside the publish transaction |
| 11  | Webhook durability             | `messagingOnboardingInboundMessages` queue stores sanitized messages before ACK; raw provider payload is not persisted |
| 12  | No sensitive data in logs      | User IDs are masked in onboarding events and logs; provider payloads are not stored in the queue |
| 13  | Firestore rules                | `messagingOnboardingSessions`, inbound queue, rate limits, and events are admin-only access                    |

The 24-hour session boundary is enforced at every active runtime edge, not only by the daily cleanup sweep. Active-session lookup expires stale non-terminal rows before routing another message, while upload append and invalid-upload accounting re-check `expiresAt` transactionally after provider download. Intake claim, validation commit/failure, extraction enqueue, and extraction success/failure also re-read `expiresAt` inside their authoritative transaction. Expired validation/processing work records the required `FAILED` → `EXPIRED` audit path, clears pending delivery/lease state, unbinds any terminal extraction job, and cannot create a job, preview, recovery message, or additional model work after expiry.

---

## 7. Implementation Status

### Runtime Area: Foundation (Core Session Engine)

| #    | Task                                                                                | File                                                                      | Status |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| 1.1  | Add feature flags (`ENABLE_MESSAGING_ONBOARDING`, `MESSAGING_ONBOARDING_PROVIDERS`) | `src/config/features.ts`                                                  | ✅      |
| 1.2  | Create types file with all interfaces (provider-agnostic)                           | `functions/src/types/messagingOnboarding.types.ts`                        | ✅      |
| 1.3  | Create `IMessagingProvider` interface + `NormalizedMessage`                         | `functions/src/messagingOnboarding/providers/IMessagingProvider.ts`       | ✅      |
| 1.4  | Create provider registry + factory                                                  | `functions/src/messagingOnboarding/providers/providerRegistry.ts`         | ✅      |
| 1.5  | Create WhatsApp adapter (implements `IMessagingProvider`)                           | `functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts` | ✅      |
| 1.6  | Create constants file (limits, templates, states)                                   | `functions/src/messagingOnboarding/constants.ts`                          | ✅      |
| 1.7  | Create session engine (CRUD + state transitions, provider-agnostic)                 | `functions/src/messagingOnboarding/sessionEngine.ts`                      | ✅      |
| 1.8  | Create webhook handler (routes to provider adapter)                                 | `functions/src/messagingOnboarding/webhookHandler.ts`                     | ✅      |
| 1.9  | Export functions in index.ts                                                        | `functions/src/index.ts`                                                  | ✅      |
| 1.10 | Add Firestore indexes                                                               | `firestore.indexes.json`                                                  | ✅      |

### Runtime Area: Intelligence Layer

| #   | Task                                                  | File                                                     | Status |
| --- | ----------------------------------------------------- | -------------------------------------------------------- | ------ |
| 2.1 | Create Asset Intelligence Layer (Gemini validation)   | `functions/src/messagingOnboarding/assetIntelligence.ts` | ✅      |
| 2.2 | Create intake processor (scheduled, every 2 min)      | `functions/src/messagingOnboarding/intakeProcessor.ts`   | ✅      |
| 2.3 | Connect to existing extraction pipeline               | Reuse `processMenuImagesJobLogic`                        | ✅      |
| 2.4 | Create extraction watcher (onDocumentUpdated trigger) | `functions/src/messagingOnboarding/extractionWatcher.ts` | ✅      |

### Runtime Area: Preview & Publish

| #   | Task                                             | File                                                           | Status |
| --- | ------------------------------------------------ | -------------------------------------------------------------- | ------ |
| 3.1 | Create preview page (Next.js, provider-agnostic) | `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`      | ✅      |
| 3.2 | Create preview API route (GET session data)      | `src/app/api/msg-preview/[sessionId]/route.ts`                 | ✅      |
| 3.3 | Create approve API route                         | `src/app/api/msg-preview/[sessionId]/approve/route.ts`         | ✅      |
| 3.4 | Create fix request API route                     | `src/app/api/msg-preview/[sessionId]/fix/route.ts`             | ✅      |
| 3.5 | Create active publish executor (atomic store creation) | `src/lib/messaging-onboarding/publish.ts`                 | ✅      |
| 3.6 | Send publish confirmation via provider adapter   | Resolved at runtime via `getProviderAdapter(session.provider)` | ✅      |

### Runtime Area: Cleanup & Hardening

| #    | Task                                                                               | File                                                   | Status |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| 4.1  | Create session cleanup scheduler                                                   | `functions/src/schedulers/messagingSessionCleanup.ts`  | ✅      |
| 4.2  | Create reminder logic (12h after preview, uses provider adapter for sending)       | `functions/src/schedulers/messagingSessionCleanup.ts`  | ✅      |
| 4.3  | Implement rate limiting logic                                                      | `functions/src/messagingOnboarding/sessionEngine.ts`   | ✅      |
| 4.4  | Handle post-publish messages (redirect to dashboard)                               | `functions/src/messagingOnboarding/webhookHandler.ts`  | ✅      |
| 4.5a | Handle unsupported message types (video, audio, sticker, location, contact)        | `functions/src/messagingOnboarding/webhookHandler.ts`  | ✅      |
| 4.5b | Handle uploads-during-processing (queue + restart after completion)                | `functions/src/messagingOnboarding/sessionEngine.ts`   | ✅      |
| 4.5c | Message deduplication by providerMessageId                                         | `functions/src/messagingOnboarding/inboundQueue.ts`    | ✅      |
| 4.5d | Blank prevention gate (0 items → FAILED, not preview)                              | `functions/src/messagingOnboarding/intakeProcessor.ts` | ✅      |
| 4.5e | Publish validation gate (min 1 category + 1 priced item)                           | `src/app/api/msg-preview/[sessionId]/approve/route.ts` | ✅      |
| 4.5f | Extraction cost cap: `processingRuns >= MAX (2)` → reject, ask new session (INV-3) | `functions/src/messagingOnboarding/intakeProcessor.ts` | ✅      |
| 4.5g | Progress message: send "Your menu is being prepared..." when extraction starts     | `functions/src/messagingOnboarding/intakeProcessor.ts` | ✅      |
| 4.5  | Storage cleanup for expired sessions                                               | `functions/src/schedulers/messagingSessionCleanup.ts`  | ✅      |
| 4.6  | Add Firestore security rules for new collections                                   | `firestore.rules`                                      | ✅      |

---

## 8. Key Design Patterns

### 8.1 Reusing Existing Extraction Pipeline

The extraction step MUST reuse `processMenuImagesJobLogic` from `functions/src/logic/processMenuImagesJob.ts`. The messaging onboarding creates a `menuImageProcessingJobs` document (same as dashboard), which triggers the same Cloud Function.

**Blank Prevention Gate:** After extraction completes, if `combinedData` has 0 categories OR 0 items, do NOT generate preview. Set session state to FAILED and ask for clearer photos. This prevents blank previews.

**Publish Validation Gate:** Before publishing, validate extracted data has ≥1 category with ≥1 item that has a price. Integrates conceptually with MCE (Menu Correctness Engine) — same principle of "never publish garbage."

```typescript
// In intakeProcessor.ts — after asset validation
const jobData: MenuImageProcessingJob = {
  projectId: `msg-onboarding-${sessionId}`, // Extraction-only project ID; never saved as a real project
  sId: "msg-onboarding", // Extraction-only store ID
  tId: "msg-onboarding", // Extraction-only tenant ID
  uId: "msg-system", // System user
  files: validMenuFiles.map((f) => ({
    uid: f.id,
    name: f.fileName || f.id,
    size: f.fileSize,
    type: f.mimeType,
    url: f.storageUrl,
  })),
  targetLanguages: [{ code: "en", name: "English" }],
  action: "IMAGE_PROCESSING",
  businessType: detectedBusinessType || "Other",
  businessCategory: detectedBusinessCategory || "specialty",
  source: "MESSAGING_ONBOARDING",
  skipProjectSave: true,
  status: "pending",
  // ... standard fields
};

// Create job doc → triggers processMenuImagesJob Cloud Function
const jobRef = await db.collection("menuImageProcessingJobs").add(jobData);
// Store jobId in session for tracking
await sessionRef.update({ extractionJobId: jobRef.id });
```

#### 8.1.1 Extraction-Only Job Save Skip (CRITICAL — Verified Against Codebase)

**Problem discovered during codebase review:** The existing `processMenuImagesJobLogic` is shared with dashboard and mobile uploads. First-time manual extraction normally reads the project, redistributes extracted items per uploaded file, saves the file array to `projects/{tId}/{sId}/{projectId}`, verifies the write, and invalidates public cache. Messaging onboarding only needs the extraction result in the session until the owner approves the preview.

**Current solution:** Messaging onboarding creates the same `menuImageProcessingJobs` document but sets `source: "MESSAGING_ONBOARDING"` and `skipProjectSave: true`. The shared extraction function still performs Gemini extraction, validation, category hardening, per-file redistribution, job result writing, and confidence summary generation. It skips only the manual-dashboard project read/write/verify/cache side effects.

1. `intakeProcessor.ts` creates an extraction-only job with the `msg-onboarding-{sessionId}` project ID and `skipProjectSave: true`
2. `processMenuImagesJob.ts` skips `getProject()`, `saveFilesToProject()`, project verification, and public cache revalidation for that job
3. The completed job stores `result.combinedData` plus `result.redistributedFiles`
4. `extractionWatcher.ts` copies the preview-shaped menu data to `session.extractedMenuData` and the manual-project file shape to `session.extractedProjectFiles`
5. The real project is created later in the approval transaction with the correct `{tId}-default-{sId}` format and manual-compatible file entries

```typescript
// In extractionWatcher.ts — after reading the completed extraction job
await sessionRef.update({
  extractedMenuData: previewMenuData,
  extractedProjectFiles, // mirrors projects.files[] from saveFilesToProject()
  qualityScore: qualityScore,
  state: "PREVIEW_READY",
  // ... generate preview token, etc.
});
```

**Cost impact:** This removes the temporary project read/write/verify/delete cycle for messaging sessions while preserving the shared extraction engine. Cleanup of old temp projects remains guarded for legacy jobs that were created before `skipProjectSave` existed.

Legacy temp-project cleanup is non-blocking but observable. If `msgExtractionWatcher` still sees an older job without `skipProjectSave` and the temp project delete fails, it logs `Temp project cleanup failed` with bounded session ID, temp project ID, cleanup target, and source error name/code metadata only. It must not log raw session IDs, temp project IDs, Firestore paths, project payloads, or exception text.

#### 8.1.2 AI Rate Limiting Note

The extraction pipeline has its own rate limiting via `checkExpensiveAIRateLimit(projectId)` using Upstash (`processMenuImages.ts:651`). For messaging onboarding:

- Rate limit key = `msg-onboarding-{sessionId}` (per-session, not per-user)
- This is **separate from** the messaging session rate limits (`messagingOnboardingRateLimits`)
- No conflict with dashboard users since extraction-only `msg-onboarding-*` project IDs never collide with real project IDs

### 8.2 Reusing Existing Store Creation Pattern

The publish pipeline reuses the atomic transaction pattern from `src/app/api/onboarding/create-subscription/route.ts` but with key differences: **no Razorpay subscription**, **no NextAuth session**, and **user CREATION instead of update**.

**Reference:** `src/app/api/onboarding/create-subscription/route.ts:127-224`

Key functions reused:

- `createDefaultRoles(storeId, email)` from `src/data/defaultRoles.ts`
- `getDefaultTimeSlotPresets(businessType, tId, sId)` from `src/config/defaultTimeSlotPresets.ts`
- `resolveStoreBusinessCategory(businessType, businessCategory)` from `src/data/shared/businessTypes.ts`
- `getOwnerRoleId()` from `src/data/defaultRoles.ts`
- platformSummary counter update pattern
- storesSummary sync pattern

#### 8.2.1 Exact Fields Created (Verified Against Codebase)

**Tenant document** (`tenants/{newTenantId}`):

```typescript
{
  name: businessName, // From preview (owner-edited)
  businessType: session.detectedBusinessType || 'Other', // AI-detected or owner-corrected on preview
  businessIndustry: '', // Not applicable for messaging onboarding
  email: generatedEmail, // See §8.2.2 Email Handling
  active: true,
  verified: false,
  storesList: [{
    storeId: newStoreId,
    name: `${businessName} - Main Store`,
    isMaster: true,
  }],
  tenantId: newTenantId, // Collision-checked canonical platform counter allocation
  tenantKey: businessName.toLowerCase().replaceAll(" ", "_"),
  createdOn: Timestamp.now(),
  modifiedOn: Timestamp.now(),
}
```

**Store document** (`stores/{newStoreId}`):

```typescript
{
  name: `${businessName} - Main Store`,
  businessType: session.detectedBusinessType || 'Other', // AI-detected or owner-corrected
  businessCategory: resolveStoreBusinessCategory(session.detectedBusinessType || 'Other', session.detectedBusinessCategory),
  businessIndustry: '',
  email: generatedEmail,
  active: true,
  verified: false,
  tenantId: newTenantId,
  storeId: newStoreId,
  storeKey: storeName.toLowerCase().replaceAll(" ", "_"),
  timeSlotPresets: getDefaultTimeSlotPresets(session.detectedBusinessType || 'Other', newTenantId, newStoreId, businessCategory),
  roles: createDefaultRoles(newStoreId, generatedEmail),
  isMaster: true, // First store is always master
  onboardingSource: 'MESSAGING_ONBOARDING', // Identifies messaging-onboarded stores (§17)
  starterActivationStatus: 'starter_active',
  starterActivatedAt: Timestamp.now(),
  activationDeadline: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day starter activation (§17.5)

  // Fields NOT in existing dashboard onboarding (create-subscription/route.ts) but
  // messaging onboarding can infer from available data (§18 Gap Analysis):
  phoneNumber: session.providerDisplayId || '', // WhatsApp phone number — BETTER than dashboard (which sets this later)
  addressLine: approvedAddress || extractedBusinessInfo.address || '', // Same store field used by manual intake identity acceptance
  defaultLanguage: extractedLanguage || 'en', // From Gemini extraction primary language
  country: inferredCountry || '', // From phone number country code (e.g., +91 → 'IN')
  currencyCode: inferredCurrency || 'INR', // From country (e.g., 'IN' → 'INR')
  currencySymbol: inferredCurrencySymbol || '₹', // From currencyCode
  timeZone: inferredTimeZone || 'Asia/Kolkata', // From country (e.g., 'IN' → 'Asia/Kolkata')
  logo: '', // No logo at publish time (owner adds later in dashboard)

  createdOn: Timestamp.now(),
  modifiedOn: Timestamp.now(),
}
```

**User document** (`users/{newUserId}`) — **CREATED, not updated**:

```typescript
{
  // CRITICAL DIFFERENCE from dashboard onboarding:
  // Dashboard updates an EXISTING user (NextAuth session).
  // Messaging onboarding CREATES a new user (no NextAuth account yet).
  phone: providerDisplayId, // E.164 phone from WhatsApp
  email: generatedEmail, // See §8.2.2
  name: businessName, // Best guess, owner can change later
  tenantId: newTenantId,
  storeId: newStoreId,
  stores: [{
    storeId: newStoreId,
    name: storeName,
    role: getOwnerRoleId(), // 'owner'
  }],
  provider: session.provider, // 'whatsapp' | 'telegram'
  providerUserId: session.providerUserId,
  createdVia: 'messaging-onboarding', // Distinguishes from dashboard users
  createdOn: Timestamp.now(),
  modifiedOn: Timestamp.now(),
}
```

**platformSummary** update: `tenants.count` and `stores.count` incremented.

**storesSummary** merge: `stores.{newStoreId}` with `tId`, `businessType`, `businessCategory`, `active`, `name`.

#### 8.2.2 Email Handling for Phone-Only Users

**Problem:** The existing codebase requires `email` on tenant, store, and user documents. But messaging onboarding users have only a phone number — no email.

**Solution:** Generate a deterministic placeholder email from the phone number:

```typescript
// Format: phone@msg.menulist.ai
// Example: +919876543210@msg.menulist.ai
const generatedEmail = `${providerDisplayId.replace("+", "")}@msg.menulist.ai`;
```

**Why this works:**

1. Deterministic — same phone always generates same email (idempotent)
2. Valid email format — won't break any email validation in existing code
3. Clearly identifiable as messaging-onboarded user (`@msg.menulist.ai` domain)
4. On first dashboard login, owner can set their real email (phone-to-email linking)
5. Does NOT send any actual emails to this address (it's a placeholder, not a real mailbox)

#### 8.2.3 Dashboard Login Flow (Post-Publish)

**Problem:** Owner has no password, no email, no NextAuth account. How do they log into the dashboard?

**Solution:** Claim link with three setup choices:

1. WhatsApp publish confirmation includes a dashboard claim URL: `menulist.ai/signin?claim={claimToken}`
2. Owner opens the claim URL and sees the business name plus masked WhatsApp number
3. Owner can claim with Google, email/password, or WhatsApp number/passcode
4. WhatsApp number/passcode keeps the generated `@msg.menulist.ai` email as the Firebase Auth email and stores `phoneUsername` as the owner-facing login alias
5. Email/password claim stores the real email and also keeps the WhatsApp number as a phone login alias
6. Subsequent credential login accepts email, Staff ID, or phone; Firebase Auth still verifies one canonical auth account

> **ADR-8 (NEW):** Magic link via messaging for first dashboard login. Phone number is the initial identity. Email linking is optional and happens on first dashboard visit. This keeps onboarding zero-friction while enabling full dashboard access later.

#### 8.2.4 Billing State at First Login

**Problem:** The existing onboarding creates a Razorpay subscription immediately. Messaging onboarding publishes for FREE.

**Solution:**

1. No subscription record created during publish
2. Owner gets full free access to their single store
3. Billing triggers when owner wants premium features (multi-outlet, campaigns, digital screens)
4. On premium feature attempt: redirect to existing subscription creation flow (`/api/razorpay/create-subscription`)
5. This aligns with spec decision: "Indefinite free tier for single menu. Upsell on premium features."

#### 8.2.5 Full Resend Detection Logic

**Problem:** How does the system distinguish "owner sends 1 more photo after preview" (C-06) from "owner sends all new photos to restart" (C-07)?

**Decision:** Threshold-based detection:

```typescript
const FULL_RESEND_THRESHOLD = 3; // 3+ images after preview = full resend

if (
  session.state === "PREVIEW_READY" ||
  session.state === "AWAITING_APPROVAL"
) {
  if (newUploadCount >= FULL_RESEND_THRESHOLD) {
    // Full resend → keep only uploads received after the latest preview,
    // clear stale extracted/delivery state, and restart the session.
    resetToCollectingInput(session);
  } else {
    // Partial addition → reply with existing preview link
    sendMessage(
      "Your preview is ready. Send full menu photos again to update.",
    );
  }
}
```

**Rationale:** 3+ images strongly signals "I'm sending a whole new menu," not "I want to add one more page." This threshold is a constant in `constants.ts`, easily adjustable.

The restart transaction must not retain pre-preview uploads in the new extraction input. Post-preview files stage in `replacementUploads` (maximum 15) instead of consuming the authoritative 15-file `uploads` cap. On the third replacement file, the transaction promotes only the staged set to `uploads`, clears `replacementUploads`, resets extracted business/menu/project data and obsolete preview/fix/reminder leases, and moves superseded Storage paths into `pendingUploadCleanupPaths` (maximum 45). Immediate idempotent deletion is followed by the daily scheduler when Storage is unavailable. Publishing the old preview moves its 1-2 staged files into the same cleanup queue without adding them to the project; a fix request queues all prior source/staged files and starts a clean upload set. Legacy rows that appended post-preview files into `uploads` are split by the latest preview timestamp on their next read/mutation. A malformed cleanup row is never allowed to consume the bounded retry batch forever: its raw pointers are retained without deletion, while a transaction clears only `uploadCleanupPending` and emits a bounded contract-failure log so later valid rows remain reachable. Operational Firestore read/completion failures return a durable retry result rather than escaping after the core user mutation has committed, and concurrent workers report only the pointers their completion transaction actually removed. Terminal `COOLDOWN` sessions remain immutable during the 24-hour abuse window and become eligible for the same safe 48-hour retention cleanup as `EXPIRED` sessions. If a terminal document itself is invalid after that retention threshold, the scheduler precondition-deletes only the queried document reference; it never follows an unvalidated embedded session ID or Storage path, and emits a bounded error so any deliberately untouched orphan can be investigated without blocking later rows.

#### 8.2.6 Extraction Completion Detection

**Problem:** How does the system know when extraction is done?

**Decision:** Use `onDocumentUpdated` trigger on `menuImageProcessingJobs/{jobId}`:

```typescript
// functions/src/messagingOnboarding/extractionWatcher.ts
// Uses v2 Firebase Functions syntax (same as processMenuImagesJob in functions/src/index.ts:92)
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { MENU_IMAGE_PROCESSING_JOBS_COLLECTION } from "../types";

// Triggered when extraction job status changes to 'completed' or 'failed'
exports.msgExtractionWatcher = onDocumentUpdated(
  { document: `${MENU_IMAGE_PROCESSING_JOBS_COLLECTION}/{jobId}` },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Only handle messaging onboarding jobs (prefix: msg-onboarding-)
    if (!after.projectId?.startsWith("msg-onboarding-")) return;

    // Only trigger on status change (not progress updates)
    if (before.status === after.status) return;

    if (after.status === "completed") {
      const sessionId = after.projectId.replace("msg-onboarding-", "");
      await handleExtractionComplete(sessionId, after);
    } else if (after.status === "failed") {
      const sessionId = after.projectId.replace("msg-onboarding-", "");
      await handleExtractionFailed(sessionId);
    }
  },
);
```

**Why onDocumentUpdated (not polling):**

1. Real-time — no 2-minute delay after extraction completes
2. No wasted reads — only fires when job status actually changes
3. Follows existing pattern — `processMenuImagesJob` already updates the job doc status
4. Scoped — prefix filter ensures it only triggers for messaging onboarding jobs

> **ADR-9 (NEW):** Extraction completion uses `onDocumentUpdated` trigger on job doc, not intake processor polling. The intake processor only handles intake window timing. Extraction watching is a separate concern.

#### 8.2.7 Preview → Publish Connection

The preview page `/msg-preview/[sessionId]` calls the Next.js API route `/api/msg-preview/[sessionId]/approve`, which:

1. Validates token and session state
2. If the session is already `LIVE` with `publishedResult`, returns that result idempotently
3. If the session is `PUBLISHING`, returns a 409 "already in progress" response
4. **Double-publish protection (CRITICAL):** Uses a Firestore transaction to atomically read session state AND update it to `PUBLISHING`. If state is not `AWAITING_APPROVAL`, the transaction rejects.
5. Calls `executeMessagingOnboardingPublish()` from `src/lib/messaging-onboarding/publish.ts`
6. Before tenant/store creation, the publish transaction re-reads and claims the exact phone-owner document. New messaging owners and phone-OTP owners share the same HMAC-derived `phone_{digest}` document ID. Existing users must still match the normalized phone and have no tenant, store, or store mapping.
7. The publish executor then creates tenant + store + claimed user + project + summary + session `LIVE` finalization in that same transaction. A concurrent or already-scoped phone claim rolls the whole transaction back and returns 409 without a retry.
8. After the transaction commits, `executeMessagingOnboardingPublish()` revalidates public cache tags; the intake scheduler sends the provider confirmation from `confirmationPending=true`

```typescript
// Double-publish protection pattern (inside approve API route)
const session = await db.runTransaction(async (tx) => {
  const sessionDoc = await tx.get(sessionRef);
  const data = sessionDoc.data();
  if (data?.state !== "AWAITING_APPROVAL") {
    throw new Error(
      `Cannot publish: session state is ${data?.state}, not AWAITING_APPROVAL`,
    );
  }
  tx.update(sessionRef, { state: "PUBLISHING", updatedAt: Timestamp.now() });
  return data;
});
// Only THEN proceed with executeMessagingOnboardingPublish(sessionId, params)

// PUBLISH FAILURE RECOVERY (spec §Publish Failure Recovery):
// If publish transaction fails after retry:
try {
  await executeMessagingOnboardingPublish(sessionId, params);
  // Success → state = LIVE
} catch (publishError) {
  // Retry once
  try {
    await executeMessagingOnboardingPublish(sessionId, params);
  } catch (retryError) {
    // Recovery: return to AWAITING_APPROVAL (not FAILED)
    // Owner can retry approve from preview page
    await sessionRef.update({
      state: "AWAITING_APPROVAL",
      stateHistory: FieldValue.arrayUnion({
        state: "AWAITING_APPROVAL",
        timestamp: Timestamp.now(),
        reason: "Publish failed after retry",
      }),
    });
    // Send error message via provider
    await sendMessage("Publishing is temporarily unavailable. Try again.");
    // Log PUBLISH_FAILED event
  }
}
```

**Why direct (not separate CF):**

1. Preview page and API route are in the same Next.js deployment
2. API route already has access to Firebase Admin SDK
3. Adding a separate CF adds latency (cold start) for no benefit
4. The Firestore transaction is the same pattern whether in a CF or API route

> **ADR-10 (NEW):** Publish executes in the Next.js API route directly, not via a separate Cloud Function. The API route already has Firebase Admin SDK access. The only CF call is for sending the confirmation message via the provider adapter (since the adapter code lives in the functions codebase).

### 8.3 WhatsApp Cloud API Integration (Inside WhatsAppAdapter)

> **Note:** All code patterns below live inside `WhatsAppAdapter.ts` — the provider-specific adapter implementing `IMessagingProvider`. Other providers (Telegram, LINE) have their own adapters with equivalent logic.

\*\*Environment Variables (functions/.env):

```
WHATSAPP_PHONE_NUMBER_ID=xxxx
WHATSAPP_ACCESS_TOKEN=xxxx
WHATSAPP_APP_SECRET=xxxx      # For webhook signature verification
WHATSAPP_VERIFY_TOKEN=xxxx    # For webhook GET verification
```

**Message Sending Pattern:**

```typescript
// messageSender.ts
async function sendTextMessage(phone: string, text: string): Promise<void> {
  const encodedPhoneNumberId = encodeURIComponent(PHONE_NUMBER_ID);
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${encodedPhoneNumberId}/messages`,
    {
      method: "POST",
      redirect: "manual",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
      signal: AbortSignal.timeout(WHATSAPP_API_TIMEOUT_MS),
    },
  );
}
```

**Media Download Pattern:**

```typescript
// mediaDownloader.ts
async function downloadMedia(mediaId: string): Promise<Buffer> {
  // Step 1: Get media URL
  const encodedMediaId = encodeURIComponent(mediaId);
  const metaResponse = await fetch(
    `https://graph.facebook.com/v21.0/${encodedMediaId}`,
    {
      redirect: "manual",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(WHATSAPP_API_TIMEOUT_MS),
    },
  );
  const metaPayload = await readJsonResponseWithLimit<{ url?: unknown }>(metaResponse, WHATSAPP_PROVIDER_JSON_MAX_BYTES);
  const url = typeof metaPayload?.url === "string" ? metaPayload.url : "";

  // Step 2: Validate public HTTPS + DNS target, then download media
  const urlValidation = await validateNetworkTargetUrl(url);
  if (!urlValidation.valid || !urlValidation.normalizedUrl) {
    throw new Error("media target rejected");
  }

  const mediaResponse = await fetch(urlValidation.normalizedUrl, {
    redirect: "manual",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(WHATSAPP_MEDIA_DOWNLOAD_TIMEOUT_MS),
  });
  try {
    const mediaBytes = await readResponseUint8ArrayWithLimit(mediaResponse, UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES);
    return Buffer.from(mediaBytes);
  } catch (error) {
    if (!isResponseBodyTooLargeError(error)) throw error;
    throw createWhatsAppProviderError(WHATSAPP_MEDIA_TOO_LARGE_CODE);
  }
}
```

Provider media download URLs are treated as untrusted even though they come from Meta. `WhatsAppAdapter.ts` reads the Meta media-URL lookup response through a 64KB bounded JSON reader, validates the returned URL through the shared Functions `validateNetworkTargetUrl()` helper, and only then downloads the binary. The lookup and download both refuse redirects, so the bearer credential is never forwarded through a redirect chain. The target validator requires HTTPS and rejects localhost, private, link-local, multicast, or metadata-style network targets. The adapter then reads the media response through `readResponseUint8ArrayWithLimit()`, which checks `content-length`, cancels the response stream when the byte limit is crossed, and maps oversize media to `WHATSAPP_MEDIA_TOO_LARGE` before returning the media buffer. Provider calls also carry the bounded 15-second API or 30-second media-download abort signal. Rejections use `WHATSAPP_MEDIA_URL_REJECTED`, `WHATSAPP_MEDIA_TOO_LARGE`, or the existing provider download failure code with bounded URL length and validation metadata only.

### 8.4 Asset Intelligence Gemini Prompt

```typescript
// assetIntelligence.ts
const VALIDATION_PROMPT = `
You are a menu validation system. Analyze the provided images and return ONLY valid JSON.

For each image, determine:
1. Is this an actual menu page with items and prices? (not a logo, interior photo, selfie, etc.)
2. Is there business information visible? (name, phone, address)
3. What type of business is this? (detect from menu content, items, services, pricing patterns)

Return this exact JSON structure:
{
  "valid_menu_files": [1, 3, 4],
  "invalid_files": [2, 5],
  "menu_completeness": "likely_complete" | "partial" | "insufficient",
  "confidence": "high" | "medium" | "low",
  "extracted_business_info": {
    "business_name": "string or null",
    "phone_number": "string or null",
    "address": "string or null",
    "logo_present": true/false,
    "cuisine_hint": "string or null",
    "confidence": "high" | "medium" | "low"
  },
  "detected_business_type": {
    "business_type": "Restaurant or null",
    "business_category": "food",
    "type_confidence": "high" | "medium" | "low"
  }
}

ALLOWED BUSINESS TYPES (choose ONLY from this list):
${JSON.stringify(BUSINESS_TYPES.map((bt) => ({ value: bt.value, category: bt.category })))}

If unsure about the specific type, use: { "business_type": null, "business_category": "food|service|retail|professional|creative|health|specialty", "type_confidence": "low" }. The system stores this as `Other` with the best known category.

RULES:
- Valid menu: contains item names AND prices OR service list
- Invalid: logos, interiors, people, business cards, GST certificates, random photos, personal documents
- For PDFs: identify which PAGE NUMBERS contain actual menu content (skip title pages, terms & conditions, license pages)
- menu_completeness: "likely_complete" if most categories seem present, "partial" if obvious gaps, "insufficient" if too few items
- Extract business info aggressively — even low confidence is useful
- Business type: infer from menu items, pricing patterns, service descriptions. Food menus → food category. Service price lists → service/health category.
- Return ONLY JSON, no other text
`;

// For PDF uploads, the response includes:
// "pdf_valid_pages": [1, 2, 3, 5]  — only these pages sent to extraction
// This prevents extracting from title pages, T&C pages, etc.
```

---

## 9. Firestore Security Rules

```javascript
// Add to firestore.rules

// Messaging Onboarding Sessions - Admin SDK only (Cloud Functions + Next.js API routes)
match /messagingOnboardingSessions/{sessionId} {
  allow read, write: if false;  // Only Cloud Functions / Admin SDK
}

// Messaging Onboarding Rate Limits - Admin SDK only
match /messagingOnboardingRateLimits/{userHash} {
  allow read, write: if false;  // Only Cloud Functions / Admin SDK
}

// Messaging Onboarding Events (Tracking) - Admin SDK only
match /messagingOnboardingEvents/{eventId} {
  allow read, write: if false;  // Only Cloud Functions / Admin SDK (fire-and-forget writes)
}
```

---

## 10. Environment Variables

### Runtime Feature Gates

| File | Current Value | Purpose |
| ---- | ------------- | ------- |
| `src/config/features.ts` → `ENABLE_MESSAGING_ONBOARDING` | `true` | Keeps app/preview surfaces available. |
| Runtime env `ENABLE_MESSAGING_ONBOARDING` read by `functions/src/messagingOnboarding/constants.ts` | `false` in checked-in MenuList Functions env files/templates | Keeps Cloud Function webhook/scheduler processing off until real provider credentials and Meta webhook registration exist; set `true` only for the target being smoked. |
| Runtime env `MESSAGING_ONBOARDING_PROVIDERS` read by `functions/src/messagingOnboarding/constants.ts` | `whatsapp` | Enables only configured providers. |

Do not use dummy WhatsApp secrets. Missing real provider credentials are an operational blocker, not an application fallback case.

### Shared Secrets (All Providers)

| Variable        | Purpose                                 | Where                      |
| --------------- | --------------------------------------- | -------------------------- |
| `GEMINI_AI_KEY` | Already exists — for asset intelligence | Firebase Functions secrets |

### WhatsApp Provider Secrets

| Variable                   | Purpose                                          | Where                      |
| -------------------------- | ------------------------------------------------ | -------------------------- |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp phone number ID                    | Firebase Functions secrets |
| `WHATSAPP_ACCESS_TOKEN`    | Meta API access token (permanent)                | Firebase Functions secrets |
| `WHATSAPP_APP_SECRET`      | For webhook signature verification (HMAC-SHA256) | Firebase Functions secrets |
| `WHATSAPP_VERIFY_TOKEN`    | For webhook GET challenge                        | Firebase Functions secrets |

### Reserved Provider Secret Pattern

| Variable                  | Purpose                                   | Where                      |
| ------------------------- | ----------------------------------------- | -------------------------- |
| Provider-specific token   | Adapter API token                         | Firebase Functions secrets |
| Provider-specific webhook secret | Adapter webhook verification secret | Firebase Functions secrets |

> **Pattern:** Each provider's secrets are namespaced by provider name. Adding a non-WhatsApp provider requires separate adapter code, namespaced secrets, webhook registration, docs, deploy evidence, and provider smoke. No shared env vars between providers.

### Dashboard Environment

| Variable                           | Purpose                    | Where  |
| ---------------------------------- | -------------------------- | ------ |
| `NEXT_PUBLIC_MSG_PREVIEW_BASE_URL` | Required base URL for preview pages. Dev/staging uses `https://qa.menulist.digital`; production uses `https://menulist.ai` unless a later approved preview host changes it. | Function runtime env |

---

## 11. Testing Guide

### Unit Tests

| Test                                | Description                                |
| ----------------------------------- | ------------------------------------------ |
| Session state transitions           | Verify all valid/invalid state transitions |
| Webhook signature verification      | Test valid/invalid signatures              |
| Rate limit enforcement              | Test daily/weekly limits + cooldown        |
| Asset Intelligence response parsing | Test all Gemini response scenarios         |
| Publish pipeline atomicity          | Test rollback on failure                   |

### Integration Tests

| #   | Scenario             | Steps                                    | Expected                            |
| --- | -------------------- | ---------------------------------------- | ----------------------------------- |
| 1   | Happy path           | Send 4 images → wait → preview → approve | Session reaches LIVE, store created |
| 2   | Blurry images        | Send 2 blurry images                     | System asks for clearer photos      |
| 3   | Junk uploads         | Send selfies/logos                       | System asks for menu photos         |
| 4   | Existing store       | Send from known phone                    | Redirect to dashboard message       |
| 5   | Session expiry       | Send images, don't approve for 24h       | Session expires, media cleaned      |
| 6   | Duplicate images     | Send same image twice                    | Deduplicated silently               |
| 7   | Rate limit           | Create 3 sessions in one day             | Third session blocked               |
| 8   | Fix request loop     | Request fix 4 times                      | Third fix allowed, fourth blocked   |
| 9   | Post-publish message | Send message after store is live         | Dashboard redirect message          |
| 10  | PDF upload           | Send multi-page PDF                      | All pages processed                 |

### Manual Testing Workflow

```bash
# 1. Verify and deploy Cloud Functions to QA through the scoped certification gate
npm run verify:functions-deploy-preflight
# Then use the scoped menulist-qa Gate 1 command from __docs__/production-readiness/external-certification-runbook.md

# 2. Register webhook URL with Meta
# URL: https://us-central1-{project}.cloudfunctions.net/messagingOnboarding/whatsapp

# 3. Send test message to WhatsApp number
# Upload menu images from test phone

# 4. Monitor in Firebase Console
# Collection: messagingOnboardingSessions
# Check state transitions

# 5. Open preview URL in browser
# Verify menu rendering
# Click Approve & Publish

# 6. Verify in Firebase Console
# New tenant, store, project created
# Session state = LIVE
```

---

## 12. Cost Estimation

See `messaging-onboarding_firebase.md` for detailed Firebase cost tracking.

**Summary per successful onboarding:**

| Cost Component                             | Estimate                                      |
| ------------------------------------------ | --------------------------------------------- |
| WhatsApp API (inbound messages)            | Free (service conversations, 1000/month free) |
| WhatsApp API (outbound messages)           | ~₹0.50 per conversation                       |
| Gemini AI (asset validation)               | ~₹0.50 per session                            |
| Gemini AI (menu extraction)                | ~₹2-5 per session (depends on file count)     |
| Firebase (Firestore + Storage + Functions) | ~₹1 per session                               |
| **Total per successful onboarding**        | **~₹4-7 (~$0.05-0.08)**                       |

---

## 13. Monitoring & Observability

### Key Metrics to Track (Internal Only)

| Metric                           | How                                          | Alert Threshold |
| -------------------------------- | -------------------------------------------- | --------------- |
| Sessions created / day           | Counter in session creation                  | None            |
| Publish rate (% sessions → LIVE) | sessions(LIVE) / sessions(total)             | < 40%           |
| Median time to publish           | publishedAt - createdAt                      | > 10 minutes    |
| Fix loop rate                    | sessions with correctionCount > 1 / total    | > 25%           |
| Extraction failure rate          | sessions(FAILED) / sessions(PROCESSING_MENU) | > 15%           |
| Cost per onboarding              | Total API costs / sessions(LIVE)             | > ₹25           |

### Logging

All Cloud Functions use structured logging:

```typescript
functions.logger.info("[Msg-Onboarding] Message received", {
  sessionId,
  provider: session.provider, // 'whatsapp' | 'telegram'
  userId: userId.slice(-4), // Last 4 digits/chars only (PII protection)
  messageType: "image",
});
```

---

## 14. Architectural Decision Records (ADRs)

### ADR-1: Why Firebase Cloud Functions for Webhook (Not Next.js API Route)

**Decision:** WhatsApp webhook handler is a Firebase Cloud Function (`onRequest`), not a Next.js API route.

**Reason:**

1. External webhook — no NextAuth session available or needed
2. Must respond to Meta within 5 seconds — Cloud Functions are faster for cold starts than Vercel serverless
3. Needs access to Firebase Admin SDK directly (same as other Cloud Functions)
4. Isolates WhatsApp infrastructure from dashboard deployment
5. Follows existing pattern where external triggers use Cloud Functions (e.g., `processMenuImagesJob`)

### ADR-2: Why No StoreDraft Entity

**Decision:** No intermediate "draft" store. Real store created directly on publish.

**Reason:**

1. Existing `create-subscription/route.ts` already creates stores atomically
2. Draft → Real conversion adds complexity with no benefit
3. If publish fails, transaction rolls back — no orphaned data
4. Preview data lives in session document, not a draft store

### ADR-3: Why Intake Processor is Scheduled (Not Real-Time)

**Decision:** Intake processor runs every 2 minutes via `onSchedule`, not triggered by each upload.

**Reason:**

1. Must wait for intake window to close (10 min max)
2. Each upload extends the window — real-time trigger would fire too early
3. Scheduled check is simpler and more reliable
4. 2-minute polling interval means max 2-min delay after intake closes
5. Alternative: `onDocumentUpdated` trigger on session — more complex, same result

### ADR-4: Why Preview Page is in Next.js (Not Static)

**Decision:** Preview page is a Next.js page, not a static site or separate app.

**Reason:**

1. Needs to read session data from Firestore (server-side)
2. Can reuse existing menu rendering components from the dashboard
3. Approve/fix actions need API routes (same Next.js deployment)
4. Token validation happens server-side
5. Same deployment pipeline as rest of dashboard

### ADR-5: Why Phone-Based Identity (Not Email)

**Decision:** User identity is initially phone-based (from WhatsApp sender number).

**Reason:**

1. WhatsApp provides verified phone number — no additional verification needed
2. Owner may not have or check email regularly
3. Phone is the primary communication channel for target ICP (Indian SMBs)
4. Dashboard claim link is sent to WhatsApp; owner can claim with Google, email/password, or WhatsApp number/passcode

### ADR-6: Why Provider-Agnostic Architecture from Day One

**Decision:** Build the messaging onboarding system with a provider adapter layer (`IMessagingProvider` interface) from the start, even though WhatsApp is the only v1 provider.

**Reason:**

1. **Global expansion requires it** — WhatsApp is dominant in India/Brazil/SE Asia but weak in Russia (Telegram), Japan (LINE), Eastern Europe (Viber)
2. **3-Year Architecture Freeze** — MenuList doctrine requires building extensibly from day one. Retrofitting a provider layer later is expensive.
3. **Minimal overhead** — The adapter interface adds ~100 lines of code. The WhatsApp adapter would exist anyway. Only difference: it implements an interface instead of being called directly.
4. **Natural seam** — The provider-specific work (webhook parsing, media download, message sending) is already isolated from the core session logic. The interface formalizes what's already true.
5. **Clean teardown** — Removing a provider = deleting one adapter file + removing its env vars. No core logic changes.
6. **Risk mitigation** — If WhatsApp changes pricing/terms, we can switch to Telegram without touching session engine, extraction, preview, or publish code.

### ADR-7: Why Provider-Agnostic Collection Names

**Decision:** Firestore collections use `messagingOnboardingSessions` and `messagingOnboardingRateLimits` instead of `whatsappOnboardingSessions`.

**Reason:**

1. Collections are the most expensive thing to rename in production (requires data migration)
2. The session document is already provider-agnostic — only the `provider` field differs
3. Using generic names from day one avoids a costly migration when adding Telegram
4. A `provider` field + index enables efficient per-provider queries without separate collections
5. Single collection = simpler cleanup scheduler, simpler analytics, simpler monitoring

---

## 15. Isolation Guarantees & Clean Teardown

### Zero-Impact Verification

Before implementation begins, verify these isolation properties:

```
☐ No imports from messagingOnboarding/ in any existing file (except index.ts exports)
☐ No reads/writes to existing collections except during publish (which mirrors existing patterns)
☐ No modifications to existing API routes, pages, or components
☐ No NextAuth dependency (all auth is token-based or signature-based)
☐ Feature flag check is the FIRST line in webhook handler (before any processing)
☐ Provider flag check happens before webhook processing (unknown provider = 200 + ignore)
```

### Dependency Graph

```
messagingOnboarding/ ─── depends on ───► processMenuImagesJobLogic (read-only reuse)
                      ─── depends on ───► createDefaultRoles (helper function, no side effects)
                      ─── depends on ───► getDefaultTimeSlotPresets (helper function)
                      ─── depends on ───► getBusinessCategory (helper function)
                      ─── depends on ───► platformSummary update pattern (write, same as existing)
                      ─── depends on ───► storesSummary sync pattern (write, same as existing)

Nothing depends on messagingOnboarding/ ─── safe to delete entirely
```

### Clean Teardown Procedure

| Step | Action                                                             | Time    | Impact                                    |
| ---- | ------------------------------------------------------------------ | ------- | ----------------------------------------- |
| 1    | Set runtime env `ENABLE_MESSAGING_ONBOARDING=false`                 | Instant | All webhooks return 200. No new sessions. |
| 2    | Wait 24h for active sessions to expire                             | 24h     | Sessions expire naturally.                |
| 3    | Run cleanup: delete `messagingOnboardingSessions` collection       | ~5 min  | Admin script.                             |
| 4    | Run cleanup: delete `messagingOnboardingRateLimits` collection     | ~1 min  | Admin script.                             |
| 5    | Run cleanup: delete `messagingOnboardingEvents` collection         | ~5 min  | Admin script. Tracking data.              |
| 6    | Run cleanup: delete only unpublished/expired `messagingOnboarding/` Storage folders | ~10 min | Admin script. Do not delete files referenced by published projects unless those project file URLs are migrated first. |
| 7    | Remove `messagingOnboarding` exports from `functions/src/index.ts` | ~1 min  | Code change.                              |
| 8    | Delete `functions/src/messagingOnboarding/` directory              | Instant | Code deletion.                            |
| 9    | Delete `src/app/(global-pages)/msg-preview/` directory             | Instant | Code deletion.                            |
| 10   | Delete `src/app/api/msg-preview/` directory                        | Instant | Code deletion.                            |
| 11   | Remove feature flags from `src/config/features.ts`                 | ~1 min  | Code change.                              |
| 12   | Remove provider env vars from Firebase Functions secrets           | ~2 min  | Config change.                            |

**Published stores/tenants/users/projects are NOT deleted** — they are real entities.

**Total teardown time: ~1 hour. Zero impact on any other feature.**

---

## 16. Onboarding Observation Layer — Internal Tracking (MOL-Inspired)

> **Pattern Source:** Menu Observation Layer (MOL v0) — `src/lib/pricing/molLogger.ts`, `src/types/mol.types.ts`
> **Principle:** Build memory now. Intelligence later. Same as MOL — silent, immutable, fire-and-forget.
> **Collection:** `messagingOnboardingEvents/{eventId}` (flat — sessions exist before tenants)

### 16.1 Why a Separate Tracking System

The onboarding flow is critical (primary acquisition engine). Without tracking:

- We can't measure funnel conversion (where do sessions drop off?)
- We can't identify extraction quality patterns (which menu types fail?)
- We can't detect abuse patterns before they become costly
- We can't compare provider performance (WhatsApp vs Telegram)
- We can't optimize timing (is the intake window too long? too short?)
- We can't identify cost outliers (which sessions burn money on re-extraction?)

MOL tracks menu **changes** (price, hours, items). This tracks onboarding **lifecycle** (session creation → publish or expiry). Different domain, same philosophy: **observe silently, analyze later**.

### 16.2 Event Types

```typescript
// functions/src/types/messagingOnboarding.types.ts (add to existing types file)

/** Onboarding lifecycle event types — every significant action logged */
type MsgOnboardingEventType =
  // Session Lifecycle
  | "SESSION_CREATED" // New session started
  | "SESSION_STATE_CHANGED" // State machine transition (with before/after)
  | "SESSION_EXPIRED" // 24h expiry triggered
  | "SESSION_RESTARTED" // Full resend → session reset to COLLECTING_INPUT

  // Upload & Media
  | "UPLOAD_RECEIVED" // Media file received and stored
  | "UPLOAD_DEDUPLICATED" // Duplicate detected via SHA-256 (silently skipped)
  | "UPLOAD_REJECTED" // Invalid MIME type or size exceeded
  | "UPLOAD_LIMIT_REACHED" // Max 15 images hit

  // Asset Intelligence
  | "ASSET_VALIDATION_STARTED" // Gemini validation initiated
  | "ASSET_VALIDATION_COMPLETED" // Gemini returned results
  | "ASSET_VALIDATION_FAILED" // Gemini API error

  // Extraction
  | "EXTRACTION_STARTED" // menuImageProcessingJobs doc created
  | "EXTRACTION_COMPLETED" // Job finished successfully
  | "EXTRACTION_FAILED" // Job failed
  | "BLANK_PREVENTION_TRIGGERED" // 0 items extracted → preview blocked

  // Preview
  | "PREVIEW_GENERATED" // Preview token created, link sent to owner
  | "PREVIEW_VIEWED" // Owner opened preview page
  | "PREVIEW_APPROVED" // Owner clicked Approve & Publish
  | "PREVIEW_FIX_REQUESTED" // Owner submitted fix request

  // Publish
  | "PUBLISH_STARTED" // Atomic transaction initiated
  | "PUBLISH_COMPLETED" // Tenant/store/project/user created
  | "PUBLISH_FAILED" // Transaction failed
  | "PUBLISH_ROLLBACK" // Transaction rolled back after failure

  // Messaging
  | "MESSAGE_SENT" // Outbound message sent via provider adapter
  | "MESSAGE_SEND_FAILED" // Provider API error on send
  | "REMINDER_SENT" // 12h reminder sent

  // Rate Limiting & Abuse
  | "RATE_LIMIT_HIT" // User hit daily/weekly session limit
  | "COOLDOWN_APPLIED" // 24h cooldown activated
  | "INVALID_ATTEMPT_RECORDED" // Junk upload counter incremented

  // Detection
  | "EXISTING_STORE_DETECTED" // Phone linked to existing store → redirect
  | "POST_PUBLISH_MESSAGE" // Message received after tunnel closed
  | "FULL_RESEND_DETECTED" // 3+ images after preview → restart
  | "WEBHOOK_SIGNATURE_INVALID" // Failed signature verification

  // Provider
  | "PROVIDER_MEDIA_DOWNLOAD_FAILED" // Failed to download media from provider API
  | "INTAKE_WINDOW_CLOSED"; // Timer expired, processing starts
```

### 16.3 Event Structure

```typescript
// functions/src/types/messagingOnboarding.types.ts

interface MsgOnboardingEvent {
  /** Auto-generated event ID */
  eventId: string;

  /** Links to session (primary index) */
  sessionId: string;

  /** Which messaging provider */
  provider: MessagingProvider; // 'whatsapp' | 'telegram'

  /** Event classification */
  eventType: MsgOnboardingEventType;

  /** Session state AT TIME of event (for funnel analysis) */
  sessionState: MessagingOnboardingState;

  /** Masked user ID (last 4 chars only — PII protection) */
  userIdMasked: string; // e.g., '3210' (from +919876543210)

  /** Event-specific data (varies by event type) */
  metadata: Record<string, any>;
  // Examples:
  //   UPLOAD_RECEIVED: { mimeType, fileSize, uploadIndex }
  //   ASSET_VALIDATION_COMPLETED: { validCount, invalidCount, completeness, confidence }
  //   EXTRACTION_COMPLETED: { categoryCount, itemCount, qualityScore, durationMs }
  //   PUBLISH_COMPLETED: { tenantId, storeId, projectId }
  //   SESSION_STATE_CHANGED: { fromState, toState, reason }
  //   RATE_LIMIT_HIT: { sessionsToday, sessionsThisWeek, limit }

  /** Timing */
  timestamp: Timestamp;
  expiresAt?: Timestamp; // 30-day Firestore TTL field
  sessionAgeMs: number; // Milliseconds since session creation (for timing analysis)

  /** Error details (only for failure events) */
  error?: {
    code: string; // e.g., 'GEMINI_API_ERROR', 'FIRESTORE_TRANSACTION_FAILED'
    retryable: boolean; // Was this retried? Could it be?
    retryCount?: number; // How many retries attempted
  };
}
```

### 16.4 Logger Implementation

```typescript
// functions/src/messagingOnboarding/eventLogger.ts

import * as functions from "firebase-functions";
import { admin } from "../firebaseAdmin";
import { FEATURE_FLAGS, RETENTION } from "./constants";

const db = admin.firestore();

/**
 * Log an onboarding event (fire-and-forget, non-blocking)
 *
 * Pattern: Same as MOL's logMOLEvent — NEVER blocks the main operation.
 * Failures are logged to Cloud Functions logger but do not throw.
 *
 * @see src/lib/pricing/molLogger.ts for MOL reference implementation
 */
export async function logOnboardingEvent(params: {
  sessionId: string;
  provider: MessagingProvider;
  eventType: MsgOnboardingEventType;
  sessionState: MessagingOnboardingState;
  userIdMasked: string;
  metadata?: Record<string, any>;
  sessionCreatedAt?: Timestamp; // For sessionAgeMs calculation
  error?: MsgOnboardingEvent["error"];
}): Promise<void> {
  // Feature flag check — skip if tracking disabled
  // Uses same pattern as ENABLE_MENU_OBSERVATION in MOL
  if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_TRACKING) return;

  try {
    const now = admin.firestore.Timestamp.now();
    const sessionAgeMs = params.sessionCreatedAt
      ? now.toMillis() - params.sessionCreatedAt.toMillis()
      : 0;

    const event: MsgOnboardingEvent = {
      eventId: db.collection("_").doc().id, // Auto-generate ID
      sessionId: params.sessionId,
      provider: params.provider,
      eventType: params.eventType,
      sessionState: params.sessionState,
      userIdMasked: params.userIdMasked,
      metadata: params.metadata || {},
      timestamp: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + RETENTION.EVENT_TTL_MS),
      sessionAgeMs,
      ...(params.error && { error: params.error }),
    };

    // Fire-and-forget write (same pattern as MOL)
    db.collection("messagingOnboardingEvents")
      .doc(event.eventId)
      .set(event)
      .catch((err) => {
        functions.logger.warn("[Msg-Tracking] Failed to log event", {
          eventType: params.eventType,
          failureCode: "MSG_ONBOARDING_EVENT_WRITE_FAILED",
          sessionIdLength: params.sessionId.length,
          sourceErrorName: err instanceof Error ? err.name : typeof err,
          sourceErrorCode: err instanceof Error ? (err as any).code : undefined,
        });
      });
  } catch (err) {
    // Silent failure — tracking is non-critical (same as MOL)
    functions.logger.warn("[Msg-Tracking] Error preparing event", {
      eventType: params.eventType,
      failureCode: "MSG_ONBOARDING_EVENT_PREPARE_FAILED",
      sourceErrorName: err instanceof Error ? err.name : typeof err,
      sourceErrorCode: err instanceof Error ? (err as any).code : undefined,
    });
  }
}

/** Helper: mask user ID for PII protection */
export function maskUserId(providerUserId: string): string {
  return providerUserId.slice(-4); // Last 4 chars only
}
```

### 16.5 Integration Points (Where Events Are Logged)

| File                         | Events Logged                                                                                                                                                                         | When                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `webhookHandler.ts`          | `SESSION_CREATED`, `UPLOAD_RECEIVED`, `UPLOAD_REJECTED`, `WEBHOOK_SIGNATURE_INVALID`, `POST_PUBLISH_MESSAGE`, `EXISTING_STORE_DETECTED`                                               | On each incoming webhook                        |
| `inboundQueue.ts`            | `INBOUND_MESSAGE_QUEUED`, `INBOUND_MESSAGE_PROCESSED`, `INBOUND_MESSAGE_FAILED`, `MESSAGE_SENT`                                                                                         | Durable webhook queue claim/process/retry       |
| `sessionEngine.ts`           | `SESSION_STATE_CHANGED`, `RATE_LIMIT_HIT`, `COOLDOWN_APPLIED`, `INVALID_ATTEMPT_RECORDED`, `FULL_RESEND_DETECTED`, `SESSION_RESTARTED`, `UPLOAD_DEDUPLICATED`, `UPLOAD_LIMIT_REACHED` | On state transitions and session operations     |
| `assetIntelligence.ts`       | `ASSET_VALIDATION_STARTED`, `ASSET_VALIDATION_COMPLETED`, `ASSET_VALIDATION_FAILED`                                                                                                   | Before/after Gemini API call                    |
| `intakeProcessor.ts`         | `INTAKE_WINDOW_CLOSED`, `EXTRACTION_STARTED`                                                                                                                                          | When intake timer expires and extraction begins |
| `extractionWatcher.ts`       | `EXTRACTION_COMPLETED`, `EXTRACTION_FAILED`, `BLANK_PREVENTION_TRIGGERED`, `PREVIEW_GENERATED`                                                                                        | On extraction job completion                    |
| `src/lib/messaging-onboarding/publish.ts` | `PUBLISH_STARTED`, `PUBLISH_COMPLETED`                                                                                                                                     | During active atomic publish                    |
| `approve/route.ts`           | `PREVIEW_APPROVED`, `PUBLISH_FAILED`                                                                                                                                                    | Before publish and on failure recovery          |
| `messagingSessionCleanup.ts` | `REMINDER_SENT`, `SESSION_EXPIRED`                                                                                                                                                    | Scheduler runs                                  |
| Preview API routes           | `PREVIEW_VIEWED`, `PREVIEW_APPROVED`, `PREVIEW_FIX_REQUESTED`                                                                                                                         | On preview page interactions                    |
| Provider adapters            | `MESSAGE_SENT`, `MESSAGE_SEND_FAILED`, `PROVIDER_MEDIA_DOWNLOAD_FAILED`                                                                                                               | On provider API calls                           |

`assetIntelligence.ts` diagnostics are bounded. Asset Intelligence never re-fetches an owned object through its persisted public token URL. `assetStorageBoundary.ts` first requires the configured Firebase bucket URL to decode to the exact immutable `messagingOnboarding/{sessionId}/{uploadId.ext}` path, then the Functions Admin Storage SDK streams that exact object with CRC validation, a 15-second timeout, and a 10 MB byte ceiling. The downloaded bytes must match the persisted byte length, MIME signature, and SHA-256 before Gemini can see them. Invalid records and mismatched bytes use `ASSET_VALIDATION_UPLOAD_RECORD_REJECTED` or `ASSET_VALIDATION_UPLOAD_INTEGRITY_REJECTED`; Storage read failures use `ASSET_VALIDATION_UPLOAD_FETCH_FAILED`.

Gemini inline media is used only when the estimated base64-expanded request remains at or below the conservative 18 MiB application ceiling, below the provider's 20 MB `generateContent` inline request limit. Larger valid sessions use temporary Gemini Files API references with three-way bounded upload concurrency. Every known provider file is deleted in `finally`, including partial-upload failure, and every local temp file is deleted per upload. Provider/temp cleanup failures log count/length metadata only. Gemini parse failures log `ASSET_VALIDATION_RESPONSE_PARSE_FAILED` with response length and source error name/code/status only. Raw upload IDs, raw Storage URLs, provider file names, raw Gemini response snippets, and raw exception messages must not be logged.

`sessionEngine.ts` applies failed-session recovery and invalid-upload cooldown atomically. A valid upload received in `FAILED` appends the source, clears stale job/extraction/preview fields, and writes `COLLECTING_INPUT` in one transaction. The third invalid upload in any media-accepting active state writes both `COOLDOWN` and the per-user 24-hour cooldown in the same transaction, so an active session cannot bypass the new-session rate check.

Queue/session replay is deterministic across the narrow gap between a committed session mutation and the inbound queue handler checkpoint. The session keeps the initial provider message ID plus bounded full-resend and invalid-upload reply markers. A replay reconstructs `FIRST_UPLOAD` or `NON_MENU_FILE` without creating a second session, upload, restart, or invalid-upload strike. General provider-message dedup remains owned by `messagingOnboardingInboundMessages`.

Pending preview, confirmation, and fix deliveries use token-bound five-minute leases and a maximum of five acquired claims. A poison row is discarded and logged after the ceiling instead of starving the next `.limit(1)` candidate. Expired preview/fix rows are discarded, while a live publish confirmation remains deliverable. Every producer transition resets its new delivery counter/lease and invalidates obsolete preview, fix, or reminder leases so an older cycle cannot become eligible again.

`sessionEngine.ts` duplicate-upload cleanup is non-blocking but observable. If a duplicate media upload is detected after Storage upload, the engine still attempts to delete the orphaned object and returns no owner reply for the duplicate. Failed cleanup logs `Duplicate upload cleanup failed` with session ID, upload ID, and Storage path presence/length metadata plus bounded source error name/code only. It must not log raw session IDs, upload IDs, Storage paths, provider media IDs, hashes, file names, or exception text.

`intakeProcessor.ts` non-blocking provider-send diagnostics are bounded. Intake processing still treats processing-cap notices, validation-recovery guidance, invalid-upload guidance, partial-menu prompts, and extraction-progress messages as non-blocking so session state and extraction can continue. If a provider send rejects, it logs `INTAKE_PROVIDER_MESSAGE_SEND_FAILED` with fixed message trigger, provider enum, session state, bounded session ID metadata, and source error name/code only. The weekly processing-run counter fallback logs `INTAKE_RATE_LIMIT_COUNTER_UPDATE_FAILED` with the same bounded session context. These diagnostics must not log raw provider user IDs, phone numbers, message text, provider responses, raw session IDs, hashed rate-limit keys, or exception text.

`extractionWatcher.ts` temp-project cleanup diagnostics are bounded. Legacy jobs that predate `skipProjectSave` still attempt temp project deletion after ignored stale states, extraction failure, blank extraction, and preview-ready handling. Failed cleanup logs `Temp project cleanup failed` with session ID, temp project ID, fixed cleanup target, and source error name/code metadata only; it does not block session state, preview handling, provider messages, or extraction failure recovery.

`extractionWatcher.ts` recovery-message diagnostics are bounded. When extraction fails or returns an unusable blank result, the watcher still transitions the session through the existing recovery path and attempts to send `MESSAGES.ASK_CLEARER_PHOTOS`. If the provider send rejects, it logs `EXTRACTION_CLEARER_PHOTOS_SEND_FAILED` with bounded session ID metadata, provider enum, session state, and source error name/code only. It must not log raw provider user IDs, phone numbers, message text, provider responses, session IDs, or exception text, and it must not block failure recovery.

`messagingSessionCleanup.ts` uses bounded scheduler diagnostics. Expire, reminder, storage cleanup, cleanup-query, and inbound queue cleanup failures log stable `MESSAGING_*` failure codes with session ID length and source error name/code/status metadata only; they do not log raw session IDs or exception messages. Expired-session upload cleanup ignores true missing Storage objects, but failed deletes for other reasons log `MESSAGING_SESSION_FILE_CLEAN_FAILED` with session ID, upload ID, and Storage path presence/length metadata only before continuing the rest of the cleanup.

`src/lib/messaging-onboarding/publish.ts` uses bounded runtime diagnostics for best-effort active publish cache revalidation and lifecycle-event writes. After the publish transaction commits, the shared store public-truth runner independently settles the two store tags, both global tags, Digital Screens touch, and project-scoped Owner Business Assistant invalidation, so one rejected effect cannot suppress later refresh work or falsify publication success. Aggregate failures log `messaging_onboarding_publish_cache_revalidation_failed` with tenant/store/project/user presence-length metadata, tag count, failed-effect count, and source error name/code/status only. Lifecycle event write failures log `messaging_onboarding_publish_event_write_failed` with session/provider presence-length metadata, fixed event type/state, metadata key count, and source error name/code/status only; raw IDs and raw exception messages must not be logged.

The active publish transaction also owns publication freshness and exact
renderer truth. One transaction-local timestamp is written to the store,
project, project summary and session so Menu Presence, setup progress,
discovery and public freshness consumers agree that messaging publication is
live. Admission validates both the normalized aggregate and the exact
`extractedProjectFiles` graph persisted for public rendering. Persisted LIVE
results are replayable or deliverable only when the project ID's encoded
tenant/store matches `publishedResult.tenantId/storeId`; the same check exists
in the app and Functions consumers. The source fingerprint includes extracted
address truth so a transaction cannot silently publish a stale corrected
address.

Preview route failures use bounded runtime diagnostics. `route.ts` logs `messaging_preview_get_route_failed`; `approve/route.ts` logs `messaging_preview_publish_retry_failed` and `messaging_preview_approve_route_failed`; `fix/route.ts` logs `messaging_preview_fix_route_failed`. Best-effort preview event write failures log `messaging_preview_event_write_failed` with fixed event type/state, metadata key count, route/session/provider context, and source error name/code/status only. Context is limited to route, session/provider/request-IP presence-length metadata, state/count booleans or counts, and source error name/code/status. The approve transaction maps expected invalid-token, missing-session, in-progress, not-ready, and expired-session states through typed local error codes instead of raw exception-message matching. `PUBLISH_FAILED` event documents and state-history recovery reasons stay code-only and must not persist raw retry exception messages.

### 16.6 Feature Flag

```typescript
// functions/src/messagingOnboarding/constants.ts
ENABLE_MESSAGING_ONBOARDING_TRACKING = process.env.ENABLE_MESSAGING_ONBOARDING_TRACKING ?? true;
```

**Why ON by default:** Unlike the main feature flag (`ENABLE_MESSAGING_ONBOARDING`), tracking should be on whenever onboarding is on. The overhead is minimal (1 extra Firestore write per event, fire-and-forget). The value of having data from day one far outweighs the tiny cost.

### 16.7 Firestore Collection & Indexes

**Collection:** `messagingOnboardingEvents/{eventId}` (flat, not tenant-scoped)

> **Why flat (not tenant-scoped like MOL)?** MOL uses `menuChangeLog/{tId}/{sId}/{eventId}` because events belong to existing tenants/stores. But onboarding events happen BEFORE a tenant exists. The session is the primary grouping, not the tenant.

**Indexes:**

```
- sessionId ASC, timestamp ASC          (all events for a session, in order)
- eventType ASC, timestamp DESC         (find all events of a type, most recent first)
- inbound queue: status ASC, nextAttemptAt ASC
- inbound queue stale recovery: status ASC, processingStartedAt ASC
```

### 16.8 Key Metrics Derivable from Events

| Metric                     | How to Compute                                                         | Business Value             |
| -------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| **Funnel conversion rate** | `SESSION_CREATED → PREVIEW_GENERATED → PUBLISH_COMPLETED`              | Core health metric         |
| **Drop-off point**         | Most common last event before `SESSION_EXPIRED`                        | Where owners abandon       |
| **Extraction quality**     | `EXTRACTION_COMPLETED` metadata: avg `qualityScore`, `itemCount`       | Menu reading accuracy      |
| **Time to preview**        | `sessionAgeMs` of `PREVIEW_GENERATED` events                           | Owner wait experience      |
| **Time to publish**        | `sessionAgeMs` of `PUBLISH_COMPLETED` events                           | Total onboarding time      |
| **Fix loop rate**          | Sessions with `PREVIEW_FIX_REQUESTED` / total sessions                 | Extraction quality signal  |
| **Failure patterns**       | Group `error.code` by frequency                                        | System reliability         |
| **Provider comparison**    | All metrics segmented by `provider` field                              | Provider performance       |
| **Cost per session**       | Sessions with `EXTRACTION_STARTED` count × avg extraction cost         | Cost optimization          |
| **Abuse patterns**         | `RATE_LIMIT_HIT` + `COOLDOWN_APPLIED` frequency                        | Security health            |
| **Asset rejection rate**   | `ASSET_VALIDATION_COMPLETED` metadata: avg `invalidCount / totalCount` | User guidance quality      |
| **Blank prevention rate**  | `BLANK_PREVENTION_TRIGGERED` / `EXTRACTION_COMPLETED`                  | Extraction pipeline health |

### 16.9 Data Retention & Cleanup

| Age       | Action                                                                 |
| --------- | ---------------------------------------------------------------------- |
| 0-30 days | Full event data retained for funnel, failure, abuse, and cost analysis |
| 30+ days  | Firestore TTL deletes `messagingOnboardingEvents.expiresAt` documents  |

Event cleanup uses Firestore TTL, not the `menulistMaintenanceScheduler.messaging_session_cleanup` task. This avoids a scheduled collection scan and keeps tracking storage bounded.

### 16.10 Security Rules

```javascript
// Add to firestore.rules
match /messagingOnboardingEvents/{eventId} {
  allow read, write: if false; // Admin SDK only (Cloud Functions)
}
```

### 16.11 Cost Impact

| Metric                              | Value          | Notes                          |
| ----------------------------------- | -------------- | ------------------------------ |
| Events per successful session       | ~15-20         | Session lifecycle events       |
| Events per failed session           | ~5-8           | Shorter lifecycle              |
| Firestore writes per 1,000 sessions | ~15,000-20,000 | At ₹15/100K = ₹2.25-3.00       |
| Storage per event                   | ~0.5-1 KB      | Minimal                        |
| **Monthly cost at 1,000 sessions**  | **~₹3**        | **Negligible vs ₹4,283 total** |

> **ROI:** ₹3/month for complete short-window observability of a ₹4,283/month system. The tracking data is more valuable than its cost because it catches abuse, extraction failures, and conversion drops early without permanently retaining event documents.

### 16.12 ADR-11: Why Separate Collection (Not Reuse MOL)

**Decision:** Onboarding events go to `messagingOnboardingEvents`, not the existing `menuChangeLog`.

**Reason:**

1. **Different domain** — MOL tracks menu data changes (price, items). Onboarding tracks session lifecycle.
2. **Different structure** — MOL has `before/after` snapshots for data changes. Onboarding has session state + metadata.
3. **Different scoping** — MOL is tenant-scoped (`{tId}/{sId}/{eventId}`). Onboarding is session-scoped (no tenant exists yet).
4. **Clean teardown** — Deleting `messagingOnboardingEvents` during teardown doesn't touch MOL data.
5. **Query patterns** — MOL queries by entity/type within a store. Onboarding queries by session/funnel/provider.
6. **Same philosophy** — Fire-and-forget, immutable, non-blocking, feature-flag gated. Pattern is reused; data is separate.

---

## 17. Post-Publish Access Model & Billing Integration (ADR-12)

> **Source:** ChatGPT Conversation Review #2 (Feb 17, 2026) — validated against existing billing architecture.
> **Codebase references:** `src/utils/razorpay.ts:34` (`hasValidSubscriptionAccess`), `src/database/subscriptions/index.ts`, `src/lib/billing/subscriptionStateMachine.ts`, `src/app/api/onboarding/create-subscription/route.ts`

### 17.1 The Problem

Existing dashboard onboarding creates tenant + store + Razorpay subscription **atomically** in `create-subscription/route.ts:127-224`. The subscription is created as `pending`, then activated on payment.

Messaging onboarding creates tenant + store **without any subscription** (ADR-8.2.4: free publish, billing later). This means:

- `getActiveSubscriptionForStore()` returns `null` for messaging-onboarded stores
- `hasValidSubscriptionAccess()` returns `false`
- Dashboard would show "no subscription" state

### 17.2 Post-Publish Flow (Locked)

```
PUBLISH → 7-day starter activation → Focused starter workspace → Owner pays → Full access
```

| Phase                         | Public Menu                          | Dashboard Access                               | Duration  |
| ----------------------------- | ------------------------------------ | ---------------------------------------------- | --------- |
| **1. Starter active**         | Live at the permanent public URL     | Focused starter workspace — menu, sharing, QR, business basics, billing | 7 days |
| **2. Starter expired (unpaid)** | Same URL preserved with recovery/billing path | Billing/help recovery only until payment | After 7 days |
| **3. Owner pays**             | Permanently live                     | Full access (same as dashboard-onboarded user) | Ongoing   |

### 17.3 Store Document: `onboardingSource` Field

Messaging-onboarded stores are identified by a new field:

```typescript
// In src/app/api/msg-preview/[sessionId]/approve/route.ts — store creation
transaction.set(storeRef, {
  // ... existing fields (§8.2.1) ...
  onboardingSource: "MESSAGING_ONBOARDING", // Identifies messaging-onboarded stores
  starterActivationStatus: "starter_active",
  starterActivatedAt: Timestamp.now(),
  activationDeadline: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from publish
});
```

**Why `onboardingSource` not a separate collection:** Minimal field addition to existing store schema. No new collection. Dashboard access checks can use this field to distinguish messaging-onboarded stores from dashboard-onboarded stores.

### 17.4 Dashboard Access Check (Modified)

The existing `hasValidSubscriptionAccess()` in `src/utils/razorpay.ts:34` returns `false` when no subscription exists. For messaging-onboarded stores, the dashboard shows restricted mode instead of "no subscription" error:

```typescript
// Conceptual — in dashboard access gate component
if (!subscription && store.onboardingSource === 'MESSAGING_ONBOARDING') {
  // Show restricted mode: menu preview + "Activate Plan" CTA
  // Owner can see their menu but not edit
  return <RestrictedDashboard store={store} />;
}
```

### 17.5 Public Menu Behavior (7-Day Starter Activation)

- **First 7 days after publish:** Menu is visible at the permanent OBP/QR link. Owner can share, test, show staff, and place the same URL on customer surfaces.
- **After 7 days (if unpaid):** The same URL stays reserved for recovery. Public behavior should be a calm inactive/recovery state, not a hard 404 and not a URL change.
- **After payment:** Menu permanently live. No further gates.

### 17.6 WhatsApp Message (Post-Publish)

No payment discussion on WhatsApp. Clean separation.

```
Your menu is live: {menuLink}
Manage and activate here: {dashboardLink}
```

Payment happens entirely inside the dashboard.

### 17.7 ADR-12: Why Free Publish → Pay Later (Not Pay Before Publish)

**Decision:** Owner publishes into a verified 7-day starter activation. Payment is required to keep the same public URL live and unlock full ongoing management.

**Reason:**

1. **Conversion psychology** — Owner sees real value (live menu) before paying. Reduces risk perception.
2. **Momentum** — Asking for payment before preview kills the "wow" moment. Completion rate drops.
3. **India SMB reality** — Non-tech SMB owners distrust upfront payment for unseen output. Trust via demonstration.
4. **Existing billing infra** — Razorpay subscription creation (`src/app/api/razorpay/create-subscription/route.ts`) works independently. Owner pays when ready, same flow as existing users.
5. **Competitor protection** — Dashboard restricted immediately (not after 24h). Competitors cannot explore system without paying. Rate limits prevent mass test accounts.

### 17.8 Business Type Detection Confidence Logic

During Asset Intelligence (§8.4), the Gemini prompt returns `detected_business_type` with confidence level. The session engine handles it as follows:

```typescript
// In sessionEngine.ts — after asset validation
const { business_type, business_category, type_confidence } =
  validationResult.detected_business_type;

if (type_confidence === "high" || type_confidence === "medium") {
  // Use detected type directly
  session.detectedBusinessType = business_type; // e.g., "Restaurant"
  session.detectedBusinessCategory = business_category; // e.g., "food"
  session.typeConfidence = type_confidence;
} else {
  // Low confidence or missing → safe fallback
  session.detectedBusinessType = "Other";
  session.detectedBusinessCategory = business_category || "specialty";
  session.typeConfidence = "low";
}
// Owner can correct on preview page (editable dropdown, pre-filled with detected value)
```

**Existing functions that consume businessType (all work unchanged):**

| Function                                  | File                                   | What It Does                    |
| ----------------------------------------- | -------------------------------------- | ------------------------------- |
| `getDefaultTimeSlotPresets(businessType, tId, sId, businessCategory)` | `src/config/defaultTimeSlotPresets.ts` | Time slot defaults per category |
| `getBusinessCategory(businessType)`       | `src/data/shared/businessTypes.ts`     | Category lookup from type       |
| `getSchemaType(businessType)`             | `src/lib/schema/index.ts:149`          | schema.org @type mapping        |
| `getAvailabilityLabels(businessType, businessCategory)` | `src/config/businessLabels.ts:74`      | UI labels per category          |
| `getDecisionConfig(businessType, businessCategory)`     | `src/config/decisionBlocks.ts:246`     | Decision block config           |
| `FILTER_ALLOWLIST[category]`              | `src/data/shared/businessTypes.ts`     | Menu filters per category       |

**On publish:** `store.businessType = session.detectedBusinessType` (or owner-corrected value from preview page).

---

## 18. Gap Analysis: Deep Codebase Cross-Check (Feb 17, 2026)

> **Methodology:** Line-by-line trace of `create-subscription/route.ts` (existing dashboard onboarding), `outlets/create/route.ts` (outlet creation), `addStore()` DAL function, `defaultRoles.ts`, `OnboardingSubscriptionSchema`, and `OnboardingModal.tsx`. Every field, import, and data structure compared against messaging onboarding docs.

### 18.1 CRITICAL DISCOVERY: `businessType` Data Model Inconsistency

**Found:** In existing dashboard onboarding, `store.businessType` stores `'B2C'` or `'B2B'` (from `OnboardingSubscriptionSchema.userType` which is `z.enum(['B2C', 'B2B'])`), NOT actual business types like "Restaurant".

**Evidence:**

- `src/lib/validation/apiSchemas.ts:161` — `userType: z.enum(['B2C', 'B2B'])`
- `create-subscription/route.ts:174` — `store.businessType = userType` → stores `'B2C'`
- `OnboardingModal.tsx:146` — `businessIndustry` dropdown populated from `IMAGE_VIEW_TYPES[].businessType` (actual types like "Restaurant")
- `create-subscription/route.ts:176` — `store.businessIndustry = businessIndustry` → stores actual type

**Consequence:** `getBusinessCategory('B2C')` returns `undefined` → falls back to `'specialty'`. Functions like `getSchemaType()`, `getDefaultTimeSlotPresets()`, `getAvailabilityLabels()` all receive `'B2C'` and fall back to defaults.

**Owner can fix later:** `BasicInfoTab.tsx:32` has a `businessType` dropdown from `BUSINESS_TYPES` — owner can change in store settings.

**Messaging onboarding is BETTER:** We detect actual business type ("Restaurant", "Salon") from menu content and store it directly. This means messaging-onboarded stores will have correct `businessType` from day one, unlike dashboard-onboarded stores which start with `'B2C'`.

**FIX APPLIED (Feb 17, 2026):** The inconsistency has been fixed in `create-subscription/route.ts:146-197`. Values are now swapped:

- `store.businessType = businessIndustry || 'Other'` (actual type from onboarding form, or canonical fallback)
- `store.businessIndustry = userType` ('B2C'/'B2B' plan type)
- `getDefaultTimeSlotPresets()` and `resolveStoreBusinessCategory()` now receive the actual type and best known broad category
- Migration script at `scripts/migrate-business-type-swap.ts` for existing stores
- See `__docs__/business-type-data-model/README.md` for full tracking

**Impact on messaging onboarding docs:** Our §8.2.1 store fields are CORRECT and now ALIGNED with the fixed dashboard onboarding. Both flows store actual business type in `store.businessType`.

### 18.2 Missing Store Fields — Now Added

**Found:** Outlet creation (`outlets/create/route.ts:128-150`) includes fields not in existing dashboard onboarding AND not in our original docs:

| Field             | In Dashboard Onboarding? | In Outlet Creation?                        | In Our Docs (before fix)? | Resolution                                       |
| ----------------- | ------------------------ | ------------------------------------------ | ------------------------- | ------------------------------------------------ |
| `phoneNumber`     | ❌ Not set               | ✅ Copied from master                      | ❌ Missing                | ✅ **Added** — use WhatsApp phone                |
| `defaultLanguage` | ❌ Not set               | ✅ `masterStore.defaultLanguage \|\| 'en'` | ❌ Missing                | ✅ **Added** — from Gemini extraction            |
| `country`         | ❌ Not set               | ✅ `masterStore.country \|\| ''`           | ❌ Missing                | ✅ **Added** — infer from phone country code     |
| `currencyCode`    | ❌ Not set               | ✅ `masterStore.currencyCode \|\| 'INR'`   | ❌ Missing                | ✅ **Added** — from country                      |
| `currencySymbol`  | ❌ Not set               | ✅ `masterStore.currencySymbol \|\| '₹'`   | ❌ Missing                | ✅ **Added** — from currencyCode                 |
| `logo`            | ❌ Not set               | ✅ `masterStore.logo \|\| ''`              | ❌ Missing                | ✅ **Added** — empty string (no logo at publish) |

**Note:** These fields are NOT set during existing dashboard onboarding either (owner configures them later in settings). But messaging onboarding has MORE data available at publish time (phone number → country → currency), so we set them proactively.

### 18.3 Phone Number → Country → Currency Inference

```typescript
// In src/lib/messaging-onboarding/publish.ts — country/currency inference
import { parsePhoneNumber } from "libphonenumber-js"; // Already in project or use lightweight equivalent

const phoneInfo = parsePhoneNumber(session.providerDisplayId);
const inferredCountry = phoneInfo?.country || ""; // e.g., 'IN', 'US', 'GB'

// Simple country → currency mapping (covers 95% of MenuList markets)
const COUNTRY_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  IN: { code: "INR", symbol: "₹" },
  US: { code: "USD", symbol: "$" },
  GB: { code: "GBP", symbol: "£" },
  AE: { code: "AED", symbol: "د.إ" },
  SA: { code: "SAR", symbol: "﷼" },
  SG: { code: "SGD", symbol: "S$" },
  MY: { code: "MYR", symbol: "RM" },
  // Add more as MenuList expands. Fallback: INR
};

const currency = COUNTRY_CURRENCY_MAP[inferredCountry] || {
  code: "INR",
  symbol: "₹",
};
```

### 18.4 Tenant `businessType` Field

**Existing behavior:** `tenant.businessType = 'B2C'` or `'B2B'` (plan type, not business type).

**Messaging onboarding:** We set `tenant.businessType = session.detectedBusinessType || 'Other'` (actual detected type when confident, canonical fallback otherwise).

**Decision:** This is intentionally different. The tenant `businessType` field in the existing system is effectively unused for logic (only the store's `businessType` drives behavior). Storing the actual type is more useful long-term. Dashboard-onboarded tenants may have `'B2C'` — this is acceptable legacy.

### 18.5 Project Creation on Publish

**Verified:** Messaging publish now aligns with the manual project/extraction contract. The project ID format is `{tId}-default-{sId}` so the messaging-created store has one predictable default menu project.

**Gap check:** The project document needs:

- `projectId` — generated
- `name: "Menu"` and `description`
- ownership fields: `tenantId`, `storeId`, `tId`, `sId`, `uId`, `pId`, `role`
- `onboardingSource: "MESSAGING_ONBOARDING"`
- `businessType` and `businessCategory` when available
- `isDefault: true`
- `config.design.menu` — same design preset/default structure as manually created projects
- `files` — from `session.extractedProjectFiles`, matching the `saveFilesToProject()` file-entry shape
- `languages` and `defaultLanguage` — normalized from extraction output
- `active: true`
- `deleted: false`

The extraction data handoff has two fields by design: `session.extractedMenuData` renders the preview, while `session.extractedProjectFiles` preserves per-upload extracted data for the final project. Approval writes the real project with those file entries, then deletes `extractedProjectFiles` from the live session to reduce long-term session size.

### 18.6 Remaining Verified Items (No Gaps)

| Item                                        | Verified Against                                   | Status                                               |
| ------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- |
| `createDefaultRoles(storeId, email)`        | `src/data/defaultRoles.ts:193`                     | ✅ Correctly documented                              |
| `getOwnerRoleId()`                          | `src/data/defaultRoles.ts:211` — returns `'owner'` | ✅ Correctly used in user.stores[].role              |
| `getDefaultTimeSlotPresets(type, tId, sId)` | `src/config/defaultTimeSlotPresets.ts:96`          | ✅ Correctly documented                              |
| `getBusinessCategory(type)`                 | `src/data/shared/businessTypes.ts`                 | ✅ Correctly documented                              |
| platformSummary counters                    | `create-subscription/route.ts:218-221`             | ✅ Correctly documented                              |
| storesSummary sync                          | `create-subscription/route.ts:192-202`             | ✅ Correctly documented                              |
| User `stores` array format                  | `create-subscription/route.ts:209-213`             | ✅ `{ storeId, name, role }`                         |
| User `modifiedOn` timestamp                 | `create-subscription/route.ts:214`                 | ✅ Documented                                        |
| Tenant `storesList` format                  | `create-subscription/route.ts:151-155`             | ✅ `{ storeId, name, isMaster }`                     |
| Tenant `tenantKey` format                   | `create-subscription/route.ts:157`                 | ✅ `businessName.toLowerCase().replaceAll(" ", "_")` |

---

## 19. Third-Party Implementation Notes (Codebase-Specific Knowledge)

> **Context:** This section captures implementation details that are specific to the MenuList codebase and would not be obvious from reading the rest of the documentation alone. If a third-party developer were implementing this feature from our docs, these are the things they'd need to know.

### 19.1 `onRequest` is NEW to This Codebase

The messaging onboarding webhook (`messagingOnboardingWebhook`) uses `onRequest` from `firebase-functions/v2/https`. This is the **first `onRequest` function** in the codebase. All existing Cloud Functions use `onCall`, `onDocumentCreated`, `onDocumentUpdated`, `onSchedule`, or `onTaskDispatched`.

**What this means for implementation:**

- Import `onRequest` from `firebase-functions/v2/https` (add to existing import line in `index.ts`)
- `onRequest` does NOT have automatic auth — webhook uses signature verification instead
- `onRequest` receives raw `Request`/`Response` objects (not the `CallableRequest` from `onCall`)
- CORS is NOT needed (Meta/WhatsApp calls our endpoint directly, no browser involved)
- Must respond with 200 status within 5 seconds (Meta retries on timeout)

```typescript
// In functions/src/index.ts — add onRequest to existing import:
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
```

### 19.2 DB_COLLECTIONS Centralization (CRITICAL)

All Firestore collection names are centralized in TWO files that must stay in sync:

| File          | Location                                                 | Purpose               |
| ------------- | -------------------------------------------------------- | --------------------- |
| **Functions** | `functions/src/constants/database.ts` → `DB_COLLECTIONS` | Cloud Functions use   |
| **Frontend**  | `src/constants/database.ts` → `DB_COLLECTIONS`           | Dashboard/Next.js use |

**New collections to add to BOTH files:**

```typescript
// Add to DB_COLLECTIONS object in both files:
MESSAGING_ONBOARDING_SESSIONS: 'messagingOnboardingSessions',
MESSAGING_ONBOARDING_RATE_LIMITS: 'messagingOnboardingRateLimits',
MESSAGING_ONBOARDING_EVENTS: 'messagingOnboardingEvents',
```

**Never use raw string collection names.** Always reference `DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS`.

### 19.3 Job Creation Without NextAuth

The existing `createMenuProcessingJob()` in `src/lib/firebase/menuProcessing.ts` requires `getActiveSession()` (NextAuth). The messaging onboarding webhook runs in a Cloud Function WITHOUT NextAuth.

**Solution:** Create extraction jobs directly via Firebase Admin SDK in the Cloud Function:

```typescript
// In the intake processor Cloud Function (NOT using client-side createMenuProcessingJob):
const jobRef = await firestoreAdmin
  .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
  .add({
    projectId: `msg-onboarding-${sessionId}`,
    files: validFiles.map((f) => ({
      uid: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      url: f.storageUrl,
    })),
    targetLanguages: detectedLanguages,
    action: "IMAGE_PROCESSING",
    status: "pending",
    progress: 0,
    currentStep: "Queued",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // NO sId, tId, uId — these don't exist yet (created at publish time)
  });
```

The existing `processMenuImagesJobLogic` does NOT use `sId`/`tId` in its processing logic — they're only for tracking. So omitting them is safe.

### 19.4 User Document Completeness

When creating a new user for a phone-only owner (no prior NextAuth account), the user doc MUST include all fields that other parts of the codebase expect:

```typescript
// Minimum viable user doc for messaging onboarding:
{
  email: '919876543210@msg.menulist.ai',  // Placeholder (§8.2.2)
  name: businessName,                      // From preview approval
  phoneNumber: '+919876543210',            // From WhatsApp
  tenantId: newTenantId,
  storeId: newStoreId,
  stores: [{ storeId: newStoreId, name: storeName, role: 'owner' }],
  profileImage: '',
  active: true,
  createdOn: Timestamp.now(),
  modifiedOn: Timestamp.now(),
  onboardingSource: 'MESSAGING_ONBOARDING',
}
```

**Key field: `email`** — Many existing dashboard components read `user.email`. The placeholder email ensures no null reference errors when the owner first logs in.

### 19.5 Secrets Configuration

Existing Cloud Functions use the `secrets` array in function options for sensitive values:

```typescript
// Existing pattern (from index.ts):
const CallableFunctionOptions = {
  ...functionOptions,
  secrets: ["GEMINI_AI_KEY"],
};

// Messaging onboarding webhook needs:
const MessagingWebhookOptions = {
  ...functionOptions,
  secrets: [
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
  ],
};

// Intake processor (needs Gemini for Asset Intelligence):
const IntakeProcessorOptions = {
  ...functionOptions,
  secrets: ["GEMINI_AI_KEY"],
};
```

Secrets are stored in Google Cloud Secret Manager (not `.env` files). Set them in QA first:

```bash
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project menulist-qa
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN --project menulist-qa
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN --project menulist-qa
firebase functions:secrets:set WHATSAPP_APP_SECRET --project menulist-qa
```

Production values require QA provider smoke evidence and explicit production secret approval before repeating the same commands with `--project menulist`.

### 19.6 NextAuth Phone Login Integration

The current credentials provider accepts email, Staff ID, or phone as the first field. Phone-based auth does not use a custom magic-link provider; it resolves the phone alias to the user document and then verifies the same Firebase Auth password/passcode used by that account.

1. `claim-account` Mode 3 creates/updates Firebase Auth for the generated `@msg.menulist.ai` email
2. The user doc stores `phoneUsername` as the owner-facing login alias
3. The sign-in form accepts the WhatsApp number
4. `getAuthUserByLoginIdentifier()` resolves `phoneUsername`, E.164 phone, or digits-only phone
5. NextAuth session is populated with `tenantId`, `storeId`, and `stores[]`

This keeps WhatsApp-number login inside the existing Firebase Auth + NextAuth stack instead of adding a second auth system.

### 19.7 Firestore Indexes (Exact Entries)

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "messagingOnboardingSessions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "provider", "order": "ASCENDING" },
    { "fieldPath": "providerUserId", "order": "ASCENDING" },
    { "fieldPath": "state", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "messagingOnboardingSessions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "state", "order": "ASCENDING" },
    { "fieldPath": "intakeExpiresAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "messagingOnboardingSessions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "state", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "messagingOnboardingEvents",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sessionId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "ASCENDING" }
  ]
}
```

### 19.8 `(global-pages)` Route Group

The preview page lives at `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`. The `(global-pages)` route group **already exists** in the codebase and is used for public pages that don't require authentication. This is the correct location — the preview page must be accessible without login.

**July 5 route-param boundary; July 6 strict raw-param update:** the preview API routes under `src/app/api/msg-preview/[sessionId]/` normalize `[sessionId]` with `src/lib/messaging-onboarding/previewRouteBoundary.ts` before using it in hashed rate-limit keys, Firestore session document reads, publish transactions, or fix-request writes. The active publish executor in `src/lib/messaging-onboarding/publish.ts` also normalizes its `sessionId` input before publish lifecycle event writes or session document access, so helper-level callers cannot bypass the route guard. Valid links use the Firestore auto-ID session shape generated by `functions/src/messagingOnboarding/sessionEngine.ts`; malformed, reserved, path-shaped, or whitespace-mutated session IDs return `400 Invalid session` at the route boundary or fail closed before publish Firestore work in the helper.

---

## 20. Optimization Opportunities & Cost Notes

### 20.1 Accepted for v1 (No Change Needed)

| Area                                        | Current Design                                                            | Why It's Fine for v1                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Intake processor polling (every 2 min)      | 720 runs/day, bounded queue/session/outbox checks plus one health-control read | Baseline Firestore reads are still <₹10/month at 1K sessions. Cloud Tasks alternative adds complexity for negligible savings. |
| Inbound queue dedup                         | Atomic `create()` on SHA-256(provider + providerMessageId) document ID         | Avoids a pre-create transaction read and skips duplicate post-ACK processing reads.                                         |
| Separate validation + extraction calls      | 2 Gemini API calls per session                                            | Combined call would be riskier and harder to debug. Validation is cheap (~₹0.50/session).                           |
| Extraction watcher fires on all job updates | `msgExtractionWatcher` triggers on every `menuImageProcessingJobs` update | Early return check (`projectId.startsWith('msg-onboarding-')`) makes cost negligible (~0 writes per false trigger). |
| Session query at webhook time               | Composite index query per incoming message                                | Sub-100ms even at 10K active sessions. Firestore handles this natively.                                             |
| Extraction-only save skip                   | Messaging jobs set `skipProjectSave: true`                                | Reuses the shared extraction engine without temporary project read/write/delete side effects.                       |
| Published source-file retention             | Uploaded menu files remain in Storage after publish                        | Required because project `files[].url` points to these files for dashboard source preview and extraction retry workflows. |

### 20.2 Conditional Optimizations (If Scale Demands)

| Optimization                            | Trigger Condition                    | Expected Savings                     | Complexity                                             |
| --------------------------------------- | ------------------------------------ | ------------------------------------ | ------------------------------------------------------ |
| **Cloud Tasks instead of polling**      | >5K sessions/month                   | ₹1/month (negligible)                | Medium — replace scheduler with task queue             |
| **Combined validation + extraction**    | Gemini API costs >₹10K/month         | ~30% Gemini cost reduction           | High — single complex prompt, harder debugging         |
| **Delta extraction for fix requests**   | >50% of sessions use "Request Fix"   | ~50% extraction cost on fix requests | Very High — requires diff logic in extraction pipeline |
| **Cleanup scheduler frequency**         | First 3 months (<100 sessions/month) | Minimal                              | Low — change cron from daily to weekly                 |
| **Session archival to cold collection** | >50K total sessions                  | Faster queries on active sessions    | Low — move LIVE/EXPIRED to archive collection          |
| **Source-file retention policy**       | >50 GB published upload storage      | Storage cost control                 | Medium — requires copying project source files to a stable archive path or removing dashboard source-preview dependency |

### 20.3 Cost Monitoring Thresholds (INV-8)

| Metric                   | Yellow Alert | Red Alert | Action                                             |
| ------------------------ | ------------ | --------- | -------------------------------------------------- |
| Gemini API cost/month    | >₹5,000      | >₹10,000  | Review extraction efficiency, check for abuse      |
| Firestore reads/month    | >100K        | >500K     | Check intake processor query efficiency            |
| Expired-session storage  | >10 GB       | >50 GB    | Verify cleanup scheduler is running                |
| Published source storage | >50 GB       | >100 GB   | Review source-file retention policy; do not delete files still referenced by projects |
| Average cost per session | >₹10         | >₹25      | Audit: extraction failures, retry rates, abuse     |
| WhatsApp API cost/month  | >₹500        | >₹2,000   | Check for message loops, unnecessary notifications |

---

_Document Status: Source implementation current (v3.13 — July 13, 2026 delivery leases, pre-checkpoint replay replies, producer invalidation, bounded replacement staging/cleanup, poison/failure/concurrency cleanup convergence, safe invalid-terminal retirement, cooldown retention, and transactional hard-expiry enforcement are documented. Provider enablement and hosted smoke remain separate launch evidence.)_
