/**
 * Messaging Onboarding — Constants, Limits, and Message Templates
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §1B, §4, §8
 * @see __docs__/messaging-onboarding/messaging-onboarding_spec.md §Abuse Prevention
 */

import { MessagingOnboardingState } from "../types/messagingOnboarding.types";
import { MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES } from "../sharedData/menuExtractionJob";

// ═══════════════════════════════════════════════════════════════
// RATE LIMITS & SAFETY
// ═══════════════════════════════════════════════════════════════

export const RATE_LIMITS = {
  SESSIONS_PER_DAY: 2,
  SESSIONS_PER_WEEK: 5,
  MAX_PROCESSING_RUNS_PER_WEEK: 5,
  MAX_INVALID_UPLOAD_ATTEMPTS: 3,
  MAX_CORRECTIONS_PER_SESSION: 3,
  COOLDOWN_HOURS: 24,
} as const;

// ═══════════════════════════════════════════════════════════════
// TIMING
// ═══════════════════════════════════════════════════════════════

export const TIMING = {
  INTAKE_WINDOW_MS: 10 * 60 * 1000, // 10 minutes (max wait — catch-all)
  FAST_START_IDLE_MS: 90 * 1000, // 90 seconds idle after ≥4 uploads
  PDF_FAST_START_IDLE_MS: 60 * 1000, // 60 seconds idle after PDF received
  FAST_START_MIN_UPLOADS: 4, // Minimum uploads for fast-start trigger
  SESSION_EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  REMINDER_AFTER_MS: 12 * 60 * 60 * 1000, // 12 hours after preview
  ACTIVATION_DEADLINE_MS: 24 * 60 * 60 * 1000, // 24h grace period post-publish
  INTAKE_PROCESSOR_INTERVAL: "every 2 minutes",
  CLEANUP_SCHEDULE: "0 4 * * *", // Daily at 4 AM UTC
} as const;

// ═══════════════════════════════════════════════════════════════
// UPLOAD LIMITS
// ═══════════════════════════════════════════════════════════════

export const UPLOAD_LIMITS = {
  MAX_IMAGES_PER_SESSION: 15,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB (spec §Media Limits — WhatsApp limit)
  ALLOWED_MIME_TYPES: MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES,
} as const;

// ═══════════════════════════════════════════════════════════════
// EXTRACTION & PROCESSING
// ═══════════════════════════════════════════════════════════════

export const PROCESSING = {
  MAX_PROCESSING_RUNS_PER_SESSION: 2, // INV-3: Extraction cost cap
  FULL_RESEND_THRESHOLD: 3, // 3+ images after preview = full resend
  MIN_CATEGORIES_FOR_PUBLISH: 1,
  MIN_PRICED_ITEMS_FOR_PUBLISH: 1,
} as const;

// ═══════════════════════════════════════════════════════════════
// COST MONITORING (INV-8)
// ═══════════════════════════════════════════════════════════════

export const COST_MONITORING = {
  TARGET_COST_PER_PUBLISH: 7, // ₹ — target max cost per successful publish
  ALERT_COST_PER_PUBLISH: 15, // ₹ — alert threshold
  TARGET_PUBLISH_RATE: 0.6, // 60% of started sessions should publish
  MAX_SESSIONS_PER_DAY_ALERT: 100, // Alert if >100 sessions/day
  MIN_SESSIONS_FOR_PUBLISH_RATE_ALERT: 10,
  FAILED_EVENT_ALERT_THRESHOLD: 3,
  ESTIMATED_AI_COST_PER_PROCESSING_RUN_INR: 4,
  HEALTH_SNAPSHOT_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  HEALTH_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
  HEALTH_SESSION_SAMPLE_LIMIT: 200,
  HEALTH_EVENT_SAMPLE_LIMIT: 1000,
  PUBLISHED_SOURCE_SAMPLE_LIMIT: 250,
  SOURCE_FILE_RETENTION_REVIEW_DAYS: 90,
  PUBLISHED_SOURCE_STORAGE_WARN_BYTES: 1024 * 1024 * 1024, // 1 GB sampled retained sources
  PUBLISHED_SOURCE_STORAGE_CRITICAL_BYTES: 5 * 1024 * 1024 * 1024, // 5 GB sampled retained sources
} as const;

// ═══════════════════════════════════════════════════════════════
// RETENTION
// ═══════════════════════════════════════════════════════════════

export const RETENTION = {
  INBOUND_MESSAGE_TTL_MS: 30 * 24 * 60 * 60 * 1000,
  EVENT_TTL_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

// ═══════════════════════════════════════════════════════════════
// RUNTIME FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

function readProvidersEnv(): string[] {
  const raw = process.env.MESSAGING_ONBOARDING_PROVIDERS;
  if (!raw) return ["whatsapp"];
  return raw
    .split(",")
    .map((provider) => provider.trim())
    .filter(Boolean);
}

export const FEATURE_FLAGS = {
  ENABLE_MESSAGING_ONBOARDING: readBooleanEnv("ENABLE_MESSAGING_ONBOARDING", false),
  MESSAGING_ONBOARDING_PROVIDERS: readProvidersEnv(),
  ENABLE_MESSAGING_ONBOARDING_TRACKING: readBooleanEnv("ENABLE_MESSAGING_ONBOARDING_TRACKING", true),
} as const;

// ═══════════════════════════════════════════════════════════════
// FORBIDDEN STATE TRANSITIONS (Safety Guard)
// ═══════════════════════════════════════════════════════════════

/** Forbidden transitions — spec §State Machine §Forbidden State Transitions (Safety Guard)
 * "Enforce strictly in the state machine transition function.
 *  Any transition not explicitly listed in the Session States table above is forbidden by default."
 */
export const FORBIDDEN_TRANSITIONS: Array<{
  from: MessagingOnboardingState;
  to: MessagingOnboardingState;
  reason: string;
}> = [
    // Spec rule 1: COLLECTING_INPUT → LIVE — Cannot skip validation, extraction, preview, and publish
    {
      from: "COLLECTING_INPUT",
      to: "LIVE",
      reason: "Cannot skip validation, extraction, preview, and publish",
    },
    // Spec rule 2: PROCESSING_MENU → COLLECTING_INPUT — Processing must complete or fail before restart
    {
      from: "PROCESSING_MENU",
      to: "COLLECTING_INPUT",
      reason: "Processing must complete or fail before restart (use full-resend only from PREVIEW_READY/AWAITING_APPROVAL)",
    },
    // Spec rule 3: LIVE → any onboarding state — Terminal state, tunnel permanently closed
    {
      from: "LIVE",
      to: "COLLECTING_INPUT",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "VALIDATING_ASSETS",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "AWAITING_MORE_UPLOADS",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "PROCESSING_MENU",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "PREVIEW_READY",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "AWAITING_APPROVAL",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "PUBLISHING",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "FAILED",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "EXPIRED",
      reason: "Terminal state — tunnel permanently closed",
    },
    {
      from: "LIVE",
      to: "COOLDOWN",
      reason: "Terminal state — tunnel permanently closed",
    },
    // Spec rule 4: EXPIRED → PROCESSING_MENU — Expired sessions cannot be revived
    {
      from: "EXPIRED",
      to: "PROCESSING_MENU",
      reason: "Expired sessions cannot be revived — must start fresh",
    },
    {
      from: "EXPIRED",
      to: "COLLECTING_INPUT",
      reason: "Expired sessions cannot be revived — must start fresh",
    },
    {
      from: "EXPIRED",
      to: "VALIDATING_ASSETS",
      reason: "Expired sessions cannot be revived — must start fresh",
    },
    // Spec rule 5: COOLDOWN → PROCESSING_MENU — Cooldown must expire before any new activity
    {
      from: "COOLDOWN",
      to: "PROCESSING_MENU",
      reason: "Cooldown must expire before any new activity",
    },
    {
      from: "COOLDOWN",
      to: "COLLECTING_INPUT",
      reason: "Cooldown must expire before any new activity",
    },
    // Spec rule 6: PUBLISHING → COLLECTING_INPUT — Publish failure must not lose extraction data
    {
      from: "PUBLISHING",
      to: "COLLECTING_INPUT",
      reason: "Publish failure must not lose extraction data — recovery only to AWAITING_APPROVAL or terminal FAILED",
    },
    {
      from: "PUBLISHING",
      to: "EXPIRED",
      reason: "Cannot expire during active publish",
    },
    // Additional safety: cannot skip validation/extraction
    {
      from: "COLLECTING_INPUT",
      to: "AWAITING_APPROVAL",
      reason: "Must go through validation and extraction first",
    },
  ];

/** Check if a state transition is forbidden */
export function isTransitionForbidden(
  from: MessagingOnboardingState,
  to: MessagingOnboardingState,
): string | null {
  const forbidden = FORBIDDEN_TRANSITIONS.find(
    (t) => t.from === from && t.to === to,
  );
  return forbidden ? forbidden.reason : null;
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE TEMPLATES (All 15 locked — spec §WhatsApp Message Templates)
// ═══════════════════════════════════════════════════════════════

export const MESSAGES = {
  FIRST_UPLOAD:
    "Got it. Preparing your menu.",

  EXTRACTION_PROGRESS:
    "Your menu is being prepared...",

  ASK_MORE_UPLOADS:
    "Send the full menu for best result.",

  ASK_CLEARER_PHOTOS:
    "Send clearer menu photos or a menu PDF.",

  PREVIEW_READY: (link: string) =>
    `Your menu preview is ready: ${link}`,

  REMINDER: (link: string) =>
    `Your menu preview is ready: ${link}`,

  PUBLISHED: (menuLink: string, dashboardLink: string) =>
    `Your menu is live: ${menuLink}\nManage anytime: ${dashboardLink}`,

  EXISTING_STORE: (dashboardLink: string) =>
    `Your menu is already live. Manage here: ${dashboardLink}`,

  RATE_LIMITED:
    "Try again later.",

  POST_PUBLISH: (dashboardLink: string) =>
    `Your menu is live. Manage it here: ${dashboardLink}`,

  NON_MENU_FILE:
    "Send menu photos or a menu PDF.",

  UPLOAD_LIMIT_REACHED:
    "Combine remaining pages into a PDF or send fewer clearer photos.",

  EXTRACTION_CAP_REACHED:
    "Send all menu photos again in a new message to update your menu.",

  PUBLISH_FAILED:
    "Publishing is temporarily unavailable. Try again.",

  PARTIAL_UPLOAD_AFTER_PREVIEW: (link: string) =>
    `Your preview is ready. Send full menu photos again to update.\n${link}`,

  PASSWORD_PROTECTED_PDF:
    "This PDF is locked. Send an unlocked PDF or photos.",

  FIX_REQUEST_ACKNOWLEDGED:
    "Send updated menu photos for best results.",
} as const;

// ═══════════════════════════════════════════════════════════════
// COUNTRY / CURRENCY / PHONE INFERENCE
// Moved to ./countryData.ts — derived from frontend countryData.ts (252 countries)
// Import: { inferCountryFromPhone, getCurrencyForCountry, DEFAULT_COUNTRY } from "./countryData"
// ═══════════════════════════════════════════════════════════════
