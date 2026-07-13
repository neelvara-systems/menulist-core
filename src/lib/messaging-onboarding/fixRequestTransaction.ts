import { DB_COLLECTIONS } from "@constant/database";
import {
  MAX_MESSAGING_REPLACEMENT_UPLOADS,
  isMessagingOnboardingUploadStoragePath,
  mergeMessagingPendingUploadCleanupPaths,
  normalizeMessagingPendingUploadCleanupPaths,
} from "@data/shared/messagingReplacementUploads";
import { admin } from "@lib/firebase/firebaseAdmin";
import { normalizeMessagingPreviewSessionId } from "@lib/messaging-onboarding/previewRouteBoundary";
import crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { drainMessagingPendingUploadCleanupServer } from "./uploadCleanup";

export const MAX_MESSAGING_ONBOARDING_CORRECTIONS_PER_SESSION = 3;
export const MESSAGING_ONBOARDING_FIX_ISSUES = [
  "price_incorrect",
  "item_missing",
  "spelling_error",
  "wrong_category",
  "other",
] as const;

export type MessagingOnboardingFixIssue =
  (typeof MESSAGING_ONBOARDING_FIX_ISSUES)[number];

type MessagingFixRequestFailureStatus =
  | "not_found"
  | "invalid_token"
  | "invalid_state"
  | "max_reached"
  | "expired"
  | "invalid_session"
  | "invalid_input";

export type MessagingFixSessionContext = {
  correctionCount: number;
  createdAtMillis: number;
  provider: "telegram" | "whatsapp";
  providerUserId: string;
  state: "AWAITING_APPROVAL" | "PREVIEW_READY";
};

export type MessagingFixRequestMutationResult =
  | { [Status in MessagingFixRequestFailureStatus]: { status: Status } }[MessagingFixRequestFailureStatus]
  | {
    correctionNumber: number;
    session: MessagingFixSessionContext;
    status: "updated";
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0")
    ? value
    : null;
}

function timestampMillis(value: unknown): number | null {
  if (!isRecord(value) || typeof value.toMillis !== "function") return null;
  try {
    const millis = value.toMillis.call(value);
    return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

function readFixSession(
  value: unknown,
  expectedSessionId: string,
): (MessagingFixSessionContext & { expiresAtMillis: number; previewToken: string }) | null {
  if (!isRecord(value) || value.sessionId !== expectedSessionId) return null;
  const provider = value.provider === "whatsapp" || value.provider === "telegram"
    ? value.provider
    : null;
  const state = value.state === "AWAITING_APPROVAL" || value.state === "PREVIEW_READY"
    ? value.state
    : null;
  const providerUserId = boundedString(value.providerUserId, 160);
  const previewToken = boundedString(value.previewToken, 256);
  const createdAtMillis = timestampMillis(value.createdAt);
  const expiresAtMillis = timestampMillis(value.expiresAt);
  const correctionCount = value.correctionCount;
  const stateHistory = value.stateHistory;
  const lastHistory = Array.isArray(stateHistory) && stateHistory.length > 0
    ? stateHistory[stateHistory.length - 1]
    : null;
  if (
    !provider
    || !state
    || !providerUserId
    || !previewToken
    || !/^[A-Za-z0-9_-]{20,256}$/.test(previewToken)
    || createdAtMillis === null
    || expiresAtMillis === null
    || typeof correctionCount !== "number"
    || !Number.isSafeInteger(correctionCount)
    || correctionCount < 0
    || !isRecord(lastHistory)
    || lastHistory.state !== state
    || timestampMillis(lastHistory.timestamp) === null
  ) {
    return null;
  }
  return {
    correctionCount,
    createdAtMillis,
    expiresAtMillis,
    previewToken,
    provider,
    providerUserId,
    state,
  };
}

function previewTokensMatch(expected: unknown, provided: string): boolean {
  if (typeof expected !== "string") return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function readUploadStoragePaths(
  value: unknown,
  sessionId: string,
  max = MAX_MESSAGING_REPLACEMENT_UPLOADS,
): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const storagePath = candidate.storagePath;
    if (
      !isMessagingOnboardingUploadStoragePath(storagePath, sessionId)
      || seen.has(storagePath)
    ) return null;
    seen.add(storagePath);
    paths.push(storagePath);
  }
  return paths;
}

export async function applyMessagingOnboardingFixRequest(params: {
  cleanupPendingUploads?: (sessionId: string) => Promise<unknown>;
  issues: readonly MessagingOnboardingFixIssue[];
  note?: string;
  now?: Timestamp;
  sessionId: string;
  token: string;
}): Promise<MessagingFixRequestMutationResult> {
  const sessionId = normalizeMessagingPreviewSessionId(params.sessionId);
  const allowedIssues = new Set<string>(MESSAGING_ONBOARDING_FIX_ISSUES);
  const normalizedNote = typeof params.note === "string" ? params.note.trim() : params.note;
  if (
    !sessionId
    || typeof params.token !== "string"
    || params.token.length < 20
    || params.token.length > 256
    || !Array.isArray(params.issues)
    || params.issues.length < 1
    || params.issues.length > 5
    || params.issues.some((issue) => !allowedIssues.has(issue))
    || new Set(params.issues).size !== params.issues.length
    || (normalizedNote !== undefined && (typeof normalizedNote !== "string" || normalizedNote.length > 200))
  ) {
    return { status: "invalid_input" };
  }

  const db = admin.firestore();
  const sessionRef = db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .doc(sessionId);
  const now = params.now || Timestamp.now();

  const result = await db.runTransaction(async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists) return { status: "not_found" as const };
    const rawSession: unknown = sessionDoc.data();
    if (!isRecord(rawSession) || rawSession.sessionId !== sessionId) {
      return { status: "invalid_session" as const };
    }
    if (rawSession.state !== "AWAITING_APPROVAL" && rawSession.state !== "PREVIEW_READY") {
      return { status: "invalid_state" as const };
    }
    const session = readFixSession(rawSession, sessionId);
    if (!session) return { status: "invalid_session" as const };
    if (!previewTokensMatch(session.previewToken, params.token)) {
      return { status: "invalid_token" as const };
    }
    if (session.expiresAtMillis <= now.toMillis()) return { status: "expired" as const };

    const authoritativePaths = readUploadStoragePaths(rawSession.uploads ?? [], sessionId);
    const replacementPaths = readUploadStoragePaths(
      rawSession.replacementUploads ?? [],
      sessionId,
    );
    const pendingPaths = normalizeMessagingPendingUploadCleanupPaths(
      rawSession.pendingUploadCleanupPaths ?? [],
      sessionId,
    );
    const uploadCleanupPending = rawSession.uploadCleanupPending ?? false;
    if (
      !authoritativePaths
      || !replacementPaths
      || !pendingPaths
      || typeof uploadCleanupPending !== "boolean"
      || uploadCleanupPending !== (pendingPaths.length > 0)
    ) return { status: "invalid_session" as const };
    const nextCleanupPaths = mergeMessagingPendingUploadCleanupPaths(
      pendingPaths,
      [...authoritativePaths, ...replacementPaths],
      sessionId,
    );
    if (!nextCleanupPaths) return { status: "invalid_session" as const };

    const rawCorrectionCount = session.correctionCount;
    if (rawCorrectionCount >= MAX_MESSAGING_ONBOARDING_CORRECTIONS_PER_SESSION) {
      return { status: "max_reached" as const };
    }

    const correctionNumber = rawCorrectionCount + 1;
    transaction.update(sessionRef, {
      correctionCount: correctionNumber,
      detectedBusinessCategory: null,
      detectedBusinessType: null,
      extractedBusinessInfo: null,
      extractedBusinessProfile: null,
      extractedMenuData: null,
      extractedProjectFiles: null,
      extractionCompletedJobId: null,
      extractionJobId: null,
      fixMessageDeliveryAttempts: 0,
      fixMessageLeaseToken: null,
      fixMessageLeaseUntil: null,
      fixMessagePending: true,
      fixRequests: FieldValue.arrayUnion({
        issues: params.issues,
        note: normalizedNote || null,
        requestedAt: now,
      }),
      intakeExpiresAt: Timestamp.fromMillis(now.toMillis() + 10 * 60 * 1000),
      invalidFiles: [],
      menuCompleteness: null,
      pendingUploadsWhileProcessing: false,
      pendingUploadCleanupPaths: nextCleanupPaths,
      previewMessageDeliveryAttempts: 0,
      previewMessageLeaseToken: null,
      previewMessageLeaseUntil: null,
      previewMessagePending: false,
      previewToken: null,
      previewUrl: null,
      qualityScore: null,
      reminderMessageLeaseToken: null,
      reminderMessageLeaseUntil: null,
      reminderSentAt: null,
      replacementUploads: [],
      state: "COLLECTING_INPUT",
      stateHistory: FieldValue.arrayUnion({
        state: "COLLECTING_INPUT",
        timestamp: now,
        reason: `Fix requested: ${params.issues.join(", ")}`,
      }),
      typeConfidence: null,
      typeSource: "fallback",
      uploadCleanupPending: nextCleanupPaths.length > 0,
      updatedAt: now,
      uploads: [],
      validMenuFiles: [],
      validationConfidence: null,
    });
    return {
      correctionNumber,
      session: {
        correctionCount: rawCorrectionCount,
        createdAtMillis: session.createdAtMillis,
        provider: session.provider,
        providerUserId: session.providerUserId,
        state: session.state,
      },
      status: "updated" as const,
    };
  });
  if (result.status === "updated") {
    const cleanupPendingUploads = params.cleanupPendingUploads
      || ((pendingSessionId: string) => drainMessagingPendingUploadCleanupServer({
        sessionId: pendingSessionId,
      }));
    await cleanupPendingUploads(sessionId);
  }
  return result;
}
