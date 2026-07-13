import * as crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin } from "../firebaseAdmin";
import type {
  MessagingOnboardingState,
  MessagingProvider,
  PublishedResult,
} from "../types/messagingOnboarding.types";
import { normalizeMessagingPublishedResult } from "./publishedResultBoundary";

export type MessagingPendingMessageKind = "preview" | "confirmation" | "fix";

type DeliveryFields = {
  attempts: "confirmationMessageDeliveryAttempts" | "fixMessageDeliveryAttempts" | "previewMessageDeliveryAttempts";
  leaseToken: "confirmationMessageLeaseToken" | "fixMessageLeaseToken" | "previewMessageLeaseToken";
  leaseUntil: "confirmationMessageLeaseUntil" | "fixMessageLeaseUntil" | "previewMessageLeaseUntil";
  pending: "confirmationPending" | "fixMessagePending" | "previewMessagePending";
};

export type MessagingPendingMessageSession = {
  createdAt: Timestamp;
  previewUrl: string | null;
  provider: MessagingProvider;
  providerUserId: string;
  publishedResult: PublishedResult | null;
  sessionId: string;
  state: MessagingOnboardingState;
};

export type MessagingPendingMessageClaim =
  | {
      leaseToken: string;
      session: MessagingPendingMessageSession;
      status: "claimed";
    }
  | {
      reason: "attempts_exhausted" | "attempts_invalid" | "lease_invalid" | "session_expired" | "session_invalid";
      status: "discarded";
    };

const DELIVERY_FIELDS: Record<MessagingPendingMessageKind, DeliveryFields> = {
  preview: {
    attempts: "previewMessageDeliveryAttempts",
    leaseToken: "previewMessageLeaseToken",
    leaseUntil: "previewMessageLeaseUntil",
    pending: "previewMessagePending",
  },
  confirmation: {
    attempts: "confirmationMessageDeliveryAttempts",
    leaseToken: "confirmationMessageLeaseToken",
    leaseUntil: "confirmationMessageLeaseUntil",
    pending: "confirmationPending",
  },
  fix: {
    attempts: "fixMessageDeliveryAttempts",
    leaseToken: "fixMessageLeaseToken",
    leaseUntil: "fixMessageLeaseUntil",
    pending: "fixMessagePending",
  },
};

const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_DELIVERY_ATTEMPTS = 5;
const sessions = firestoreAdmin.collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS);

function readTimestampMillis(value: unknown): number | null {
  if (!isRecord(value) || typeof value.toMillis !== "function") return null;
  try {
    const millis = value.toMillis.call(value);
    return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes("\0");
}

function isSafeOwnerUrl(value: unknown): value is string {
  if (!isBoundedString(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function readPendingMessageSession(
  value: unknown,
  sessionId: string,
  expectedState: MessagingOnboardingState,
  kind: MessagingPendingMessageKind,
): MessagingPendingMessageSession | null {
  if (!isRecord(value) || value.sessionId !== sessionId || value.state !== expectedState) return null;
  const createdAtMillis = readTimestampMillis(value.createdAt);
  const expiresAtMillis = readTimestampMillis(value.expiresAt);
  const provider = value.provider;
  const publishedResult = value.publishedResult === null
    ? null
    : normalizeMessagingPublishedResult(value.publishedResult);
  const previewUrl = value.previewUrl === null
    ? null
    : isSafeOwnerUrl(value.previewUrl)
      ? value.previewUrl
      : undefined;
  if (
    (provider !== "whatsapp" && provider !== "telegram")
    || !isBoundedString(value.providerUserId, 160)
    || createdAtMillis === null
    || expiresAtMillis === null
    || expiresAtMillis <= createdAtMillis
    || previewUrl === undefined
    || (value.publishedResult !== null && !publishedResult)
    || (kind === "preview" && !previewUrl)
    || (kind === "confirmation" && !publishedResult)
  ) {
    return null;
  }
  return {
    createdAt: Timestamp.fromMillis(createdAtMillis),
    previewUrl,
    provider,
    providerUserId: value.providerUserId,
    publishedResult,
    sessionId,
    state: expectedState,
  };
}

function readLeaseTimestamp(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null) return null;
  return readTimestampMillis(value) ?? "invalid";
}

function isLeaseToken(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function claimMessagingPendingMessage(params: {
  expectedState: MessagingOnboardingState;
  kind: MessagingPendingMessageKind;
  leaseMs?: number;
  now?: Timestamp;
  sessionId: string;
}): Promise<MessagingPendingMessageClaim | null> {
  const now = params.now || Timestamp.now();
  const leaseMs = typeof params.leaseMs === "number"
    && Number.isSafeInteger(params.leaseMs)
    && params.leaseMs > 0
    ? Math.min(params.leaseMs, DEFAULT_LEASE_MS)
    : DEFAULT_LEASE_MS;
  const fields = DELIVERY_FIELDS[params.kind];
  const ref = sessions.doc(params.sessionId);
  const leaseToken = crypto.randomUUID();

  return firestoreAdmin.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const rawSession: unknown = snapshot.data();
    if (!isRecord(rawSession) || rawSession[fields.pending] !== true) return null;
    if (rawSession.state !== params.expectedState) return null;
    const expiresAtMillis = readTimestampMillis(rawSession.expiresAt);
    if (
      params.kind !== "confirmation"
      && expiresAtMillis !== null
      && expiresAtMillis <= now.toMillis()
    ) {
      transaction.update(ref, {
        [fields.attempts]: 0,
        [fields.leaseToken]: null,
        [fields.leaseUntil]: null,
        [fields.pending]: false,
        updatedAt: now,
      });
      return { reason: "session_expired", status: "discarded" };
    }
    const session = readPendingMessageSession(
      rawSession,
      params.sessionId,
      params.expectedState,
      params.kind,
    );
    if (!session) {
      transaction.update(ref, {
        [fields.attempts]: 0,
        [fields.leaseToken]: null,
        [fields.leaseUntil]: null,
        [fields.pending]: false,
        updatedAt: now,
      });
      return { reason: "session_invalid", status: "discarded" };
    }

    const leaseUntilMillis = readLeaseTimestamp(rawSession[fields.leaseUntil]);
    const currentLeaseToken = rawSession[fields.leaseToken];
    const hasCurrentLeaseToken = currentLeaseToken !== undefined && currentLeaseToken !== null;
    if (
      leaseUntilMillis === "invalid"
      || hasCurrentLeaseToken && !isLeaseToken(currentLeaseToken)
      || (leaseUntilMillis === null) !== !hasCurrentLeaseToken
    ) {
      transaction.update(ref, {
        [fields.attempts]: 0,
        [fields.leaseToken]: null,
        [fields.leaseUntil]: null,
        [fields.pending]: false,
        updatedAt: now,
      });
      return { reason: "lease_invalid", status: "discarded" };
    }
    if (leaseUntilMillis !== null && leaseUntilMillis > now.toMillis()) return null;

    // A claim consumes one attempt. This bounds both explicit send failures and
    // workers that disappear after claiming but before they can release.
    const rawAttempts = rawSession[fields.attempts];
    const attempts = rawAttempts === undefined || rawAttempts === null ? 0 : rawAttempts;
    if (
      typeof attempts !== "number"
      || !Number.isSafeInteger(attempts)
      || attempts < 0
      || attempts > MAX_DELIVERY_ATTEMPTS
    ) {
      transaction.update(ref, {
        [fields.attempts]: 0,
        [fields.leaseToken]: null,
        [fields.leaseUntil]: null,
        [fields.pending]: false,
        updatedAt: now,
      });
      return { reason: "attempts_invalid", status: "discarded" };
    }
    if (attempts >= MAX_DELIVERY_ATTEMPTS) {
      transaction.update(ref, {
        [fields.attempts]: 0,
        [fields.leaseToken]: null,
        [fields.leaseUntil]: null,
        [fields.pending]: false,
        updatedAt: now,
      });
      return { reason: "attempts_exhausted", status: "discarded" };
    }

    transaction.update(ref, {
      [fields.attempts]: attempts + 1,
      [fields.leaseToken]: leaseToken,
      [fields.leaseUntil]: Timestamp.fromMillis(now.toMillis() + leaseMs),
      updatedAt: now,
    });
    return { leaseToken, session, status: "claimed" };
  });
}

export async function completeMessagingPendingMessage(params: {
  kind: MessagingPendingMessageKind;
  leaseToken: string;
  now?: Timestamp;
  sessionId: string;
}): Promise<boolean> {
  const now = params.now || Timestamp.now();
  const fields = DELIVERY_FIELDS[params.kind];
  const ref = sessions.doc(params.sessionId);

  return firestoreAdmin.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const session: unknown = snapshot.data();
    if (
      !isRecord(session)
      || session.sessionId !== params.sessionId
      || session[fields.pending] !== true
      || session[fields.leaseToken] !== params.leaseToken
    ) {
      return false;
    }

    transaction.update(ref, {
      [fields.attempts]: 0,
      [fields.leaseToken]: null,
      [fields.leaseUntil]: null,
      [fields.pending]: false,
      updatedAt: now,
    });
    return true;
  });
}

export async function releaseMessagingPendingMessage(params: {
  kind: MessagingPendingMessageKind;
  leaseToken: string;
  now?: Timestamp;
  sessionId: string;
}): Promise<boolean> {
  const now = params.now || Timestamp.now();
  const fields = DELIVERY_FIELDS[params.kind];
  const ref = sessions.doc(params.sessionId);

  return firestoreAdmin.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const session: unknown = snapshot.data();
    if (
      !isRecord(session)
      || session.sessionId !== params.sessionId
      || session[fields.leaseToken] !== params.leaseToken
    ) {
      return false;
    }

    transaction.update(ref, {
      [fields.leaseToken]: null,
      [fields.leaseUntil]: null,
      updatedAt: now,
    });
    return true;
  });
}
