/**
 * Messaging Onboarding — Type Definitions (Provider-Agnostic)
 *
 * All TypeScript interfaces for the messaging onboarding system.
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §3
 */

import { Timestamp } from "firebase-admin/firestore";
import type { ExtractedBusinessProfile } from "../sharedData/extractedBusinessProfile";

// ═══════════════════════════════════════════════════════════════
// PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════

/** Supported messaging providers */
export type MessagingProvider = "whatsapp" | "telegram";

// ═══════════════════════════════════════════════════════════════
// SESSION STATE MACHINE
// ═══════════════════════════════════════════════════════════════

export type MessagingOnboardingState =
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

/** Terminal states — no further transitions allowed (spec §State Machine) */
export const TERMINAL_STATES: MessagingOnboardingState[] = [
  "LIVE",
  "EXPIRED",
  "COOLDOWN",
];

/** States that accept new media uploads */
export const UPLOAD_ACCEPTING_STATES: MessagingOnboardingState[] = [
  "COLLECTING_INPUT",
  "AWAITING_MORE_UPLOADS",
  "VALIDATING_ASSETS",
  "PROCESSING_MENU",
  "PREVIEW_READY",
  "AWAITING_APPROVAL",
  "FAILED",
];

// ═══════════════════════════════════════════════════════════════
// SESSION DOCUMENT
// ═══════════════════════════════════════════════════════════════

/** Session upload entry */
export interface SessionUpload {
  id: string;
  fileName?: string;
  providerMediaId: string;
  storagePath: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  uploadedAt: Timestamp;
}

/** Extracted business info from Asset Intelligence */
export interface ExtractedBusinessInfo {
  businessName: string | null;
  phoneNumber: string | null;
  address: string | null;
  logoPresent: boolean;
  cuisineHint: string | null;
  confidence: "high" | "medium" | "low";
}

/** Fix request entry */
export interface FixRequest {
  issues: string[];
  note: string | null;
  requestedAt: Timestamp;
}

/** Published result after successful publish */
export interface PublishedResult {
  tenantId: number;
  storeId: number;
  projectId: string;
  userId: string;
  publicUrl: string;
  dashboardUrl: string;
}

/** Acquisition source for growth tracking (OOR metric) */
export type AcquisitionSource = "direct_share" | "obp_page" | "google_search" | "referral" | "unknown";

/** State history entry */
export interface StateHistoryEntry {
  state: MessagingOnboardingState;
  timestamp: Timestamp;
  reason?: string;
}

/**
 * Messaging Onboarding Session Document
 * Collection: messagingOnboardingSessions/{sessionId}
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §3.1
 */
export interface MessagingOnboardingSession {
  // Identity
  sessionId: string;
  provider: MessagingProvider;
  providerUserId: string;
  providerDisplayId: string;
  /** First-session, full-resend, and invalid-upload reply markers. Queue docs own general deduplication. */
  providerMessageIds: string[];

  // State
  state: MessagingOnboardingState;
  stateHistory: StateHistoryEntry[];

  // Uploads
  uploads: SessionUpload[];
  /** Post-preview files staged separately until the full-resend threshold is met. */
  replacementUploads?: SessionUpload[];
  /** Server-owned Storage paths awaiting idempotent deletion. */
  pendingUploadCleanupPaths?: string[];
  uploadCleanupPending?: boolean;

  // Asset Intelligence Results
  validMenuFiles: string[];
  invalidFiles: string[];
  menuCompleteness:
  | "complete"
  | "likely_complete"
  | "partial"
  | "insufficient"
  | null;
  validationConfidence: "high" | "medium" | "low" | null;

  // Extracted Business Info
  extractedBusinessInfo: ExtractedBusinessInfo | null;

  // Detected Business Type
  detectedBusinessType: string | null;
  detectedBusinessCategory: string | null;
  typeConfidence: "high" | "medium" | "low" | null;
  typeSource: "ai" | "fallback" | "manual";

  // Extraction
  extractionJobId: string | null;
  /** Exact job whose terminal result advanced this session. */
  extractionCompletedJobId?: string | null;
  extractedMenuData: unknown | null;
  extractedBusinessProfile?: ExtractedBusinessProfile | null;
  extractedProjectFiles?: unknown[] | null;
  qualityScore: number | null;

  // Preview
  previewToken: string | null;
  previewUrl: string | null;

  // Published Result
  publishedResult: PublishedResult | null;

  // Fix Requests
  fixRequests: FixRequest[];

  // Growth Tracking
  acquisitionSource: AcquisitionSource;

  // Counters & Safety
  invalidUploadAttempts: number;
  processingRuns: number;
  correctionCount: number;
  reminderSentAt: Timestamp | null;
  reminderMessageLeaseToken?: string | null;
  reminderMessageLeaseUntil?: Timestamp | null;
  pendingUploadsWhileProcessing: boolean;
  previewMessagePending?: boolean;
  previewMessageDeliveryAttempts?: number;
  previewMessageLeaseToken?: string | null;
  previewMessageLeaseUntil?: Timestamp | null;
  confirmationPending?: boolean;
  confirmationMessageDeliveryAttempts?: number;
  confirmationMessageLeaseToken?: string | null;
  confirmationMessageLeaseUntil?: Timestamp | null;
  fixMessagePending?: boolean;
  fixMessageDeliveryAttempts?: number;
  fixMessageLeaseToken?: string | null;
  fixMessageLeaseUntil?: Timestamp | null;

  // Timing
  lastUploadAt: Timestamp | null;
  intakeExpiresAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt: Timestamp | null;
  expiresAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT DOCUMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Rate limit tracking per provider+user combination
 * Collection: messagingOnboardingRateLimits/{userHash}
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §3.2
 */
export interface MessagingOnboardingRateLimit {
  userHash: string;
  activeSessionId?: string | null;
  sessionsToday: number;
  sessionsThisWeek: number;
  processingRunsThisWeek: number;
  lastSessionAt: Timestamp;
  cooldownUntil: Timestamp | null;
  dayResetAt: Timestamp;
  weekResetAt: Timestamp;
  /** Legacy rows may omit this until their next admitted write. */
  expiresAt?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZED MESSAGE (Provider-Agnostic)
// ═══════════════════════════════════════════════════════════════

/** Normalized message — provider-agnostic representation of any incoming message */
export interface NormalizedMessage {
  provider: MessagingProvider;
  providerMessageId: string;
  userId: string;
  userDisplayId: string;
  messageType: "image" | "document" | "text" | "unsupported";
  text?: string;
  media?: {
    providerMediaId: string;
    mimeType: string;
    fileSize?: number;
    fileName?: string;
  };
  timestamp: Date;
  rawPayload: unknown;
}

export type MessagingInboundStatus =
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED";

/**
 * Durable inbound webhook message.
 * Collection: messagingOnboardingInboundMessages/{messageId}
 *
 * Stores only the provider-normalized payload required to process the message.
 * The raw provider payload is intentionally not persisted.
 */
export interface MessagingOnboardingInboundMessage {
  messageId: string;
  provider: MessagingProvider;
  providerMessageId: string;
  providerUserId: string;
  providerDisplayId: string;
  messageType: NormalizedMessage["messageType"];
  text?: string;
  media?: NormalizedMessage["media"];
  providerTimestamp: Timestamp;
  status: MessagingInboundStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Timestamp;
  processingStartedAt?: Timestamp | null;
  processingToken?: string | null;
  handlerCompletedAt?: Timestamp | null;
  replyText?: string | null;
  processedAt?: Timestamp | null;
  lastError?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// ASSET INTELLIGENCE TYPES
// ═══════════════════════════════════════════════════════════════

/** Gemini validation response from Asset Intelligence */
export interface AssetValidationResult {
  valid_menu_files: number[];
  invalid_files: number[];
  menu_completeness: "complete" | "likely_complete" | "partial" | "insufficient";
  confidence: "high" | "medium" | "low";
  extracted_business_info: {
    business_name: string | null;
    phone_number: string | null;
    address: string | null;
    logo_present: boolean;
    cuisine_hint: string | null;
    confidence: "high" | "medium" | "low";
  };
  detected_business_type: {
    business_type: string;
    business_category: string;
    type_confidence: "high" | "medium" | "low";
  };
}

// ═══════════════════════════════════════════════════════════════
// EVENT TRACKING (Onboarding Observation Layer — §16)
// ═══════════════════════════════════════════════════════════════

/** Onboarding lifecycle event types */
export const MSG_ONBOARDING_EVENT_TYPES = [
  "INBOUND_MESSAGE_QUEUED",
  "INBOUND_MESSAGE_PROCESSED",
  "INBOUND_MESSAGE_FAILED",
  "SESSION_CREATED",
  "SESSION_STATE_CHANGED",
  "SESSION_EXPIRED",
  "SESSION_RESTARTED",
  "UPLOAD_RECEIVED",
  "UPLOAD_DEDUPLICATED",
  "UPLOAD_REJECTED",
  "UPLOAD_LIMIT_REACHED",
  "ASSET_VALIDATION_STARTED",
  "ASSET_VALIDATION_COMPLETED",
  "ASSET_VALIDATION_FAILED",
  "EXTRACTION_STARTED",
  "EXTRACTION_COMPLETED",
  "EXTRACTION_FAILED",
  "BLANK_PREVENTION_TRIGGERED",
  "PREVIEW_GENERATED",
  "PREVIEW_VIEWED",
  "PREVIEW_APPROVED",
  "PREVIEW_FIX_REQUESTED",
  "PUBLISH_STARTED",
  "PUBLISH_COMPLETED",
  "PUBLISH_FAILED",
  "PUBLISH_ROLLBACK",
  "MESSAGE_SENT",
  "MESSAGE_SEND_FAILED",
  "REMINDER_SENT",
  "RATE_LIMIT_HIT",
  "COOLDOWN_APPLIED",
  "INVALID_ATTEMPT_RECORDED",
  "EXISTING_STORE_DETECTED",
  "POST_PUBLISH_MESSAGE",
  "FULL_RESEND_DETECTED",
  "WEBHOOK_SIGNATURE_INVALID",
  "PROVIDER_MEDIA_DOWNLOAD_FAILED",
  "INTAKE_WINDOW_CLOSED",
] as const;

export type MsgOnboardingEventType = (typeof MSG_ONBOARDING_EVENT_TYPES)[number];

/** Onboarding event document */
export interface MsgOnboardingEvent {
  eventId: string;
  sessionId: string;
  provider: MessagingProvider;
  eventType: MsgOnboardingEventType;
  sessionState: MessagingOnboardingState;
  userIdMasked: string;
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
  expiresAt?: Timestamp;
  sessionAgeMs: number;
  error?: {
    code: string;
    retryable: boolean;
    retryCount?: number;
  };
}
