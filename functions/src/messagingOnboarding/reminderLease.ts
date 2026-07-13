import * as crypto from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { DB_COLLECTIONS } from "../constants/database";
import type { MessagingCleanupSession } from "./sessionCleanupBoundary";
import {
  isMessagingReminderDue,
  normalizeMessagingCleanupSession,
} from "./sessionCleanupBoundary";

const REMINDER_LEASE_MS = 5 * 60 * 1_000;

export type MessagingReminderClaim =
  | {
    status: "claimed";
    session: MessagingCleanupSession & { previewUrl: string };
    token: string;
  }
  | { status: "invalid" | "not_due" | "leased" | "missing" };

export async function claimMessagingReminder(params: {
  db: FirebaseFirestore.Firestore;
  expectedPreviewBaseUrl: string;
  now: Timestamp;
  reminderAfterMs: number;
  sessionId: string;
}): Promise<MessagingReminderClaim> {
  const ref = params.db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .doc(params.sessionId);
  const token = crypto.randomUUID();
  return params.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return { status: "missing" as const };
    const session = normalizeMessagingCleanupSession(
      snapshot.data(),
      params.sessionId,
      params.expectedPreviewBaseUrl,
    );
    if (!session) return { status: "invalid" as const };
    if (!isMessagingReminderDue(session, params.now.toMillis(), params.reminderAfterMs)) {
      return { status: "not_due" as const };
    }
    const previewUrl = session.previewUrl;
    if (!previewUrl) return { status: "not_due" as const };
    if (
      session.reminderLeaseToken
      && session.reminderLeaseUntilMillis !== null
      && session.reminderLeaseUntilMillis > params.now.toMillis()
    ) return { status: "leased" as const };

    transaction.update(ref, {
      reminderMessageLeaseToken: token,
      reminderMessageLeaseUntil: Timestamp.fromMillis(params.now.toMillis() + REMINDER_LEASE_MS),
      updatedAt: params.now,
    });
    return { session: { ...session, previewUrl }, status: "claimed" as const, token };
  });
}

export async function completeMessagingReminder(params: {
  db: FirebaseFirestore.Firestore;
  now: Timestamp;
  sessionId: string;
  token: string;
}): Promise<boolean> {
  const ref = params.db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .doc(params.sessionId);
  return params.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.get("reminderMessageLeaseToken") !== params.token) return false;
    if (snapshot.get("state") !== "AWAITING_APPROVAL") {
      transaction.update(ref, {
        reminderMessageLeaseToken: null,
        reminderMessageLeaseUntil: null,
        updatedAt: params.now,
      });
      return false;
    }
    transaction.update(ref, {
      reminderMessageLeaseToken: null,
      reminderMessageLeaseUntil: null,
      reminderSentAt: params.now,
      updatedAt: params.now,
    });
    return true;
  });
}

export async function releaseMessagingReminder(params: {
  db: FirebaseFirestore.Firestore;
  now: Timestamp;
  sessionId: string;
  token: string;
}): Promise<boolean> {
  const ref = params.db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .doc(params.sessionId);
  return params.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.get("reminderMessageLeaseToken") !== params.token) return false;
    transaction.update(ref, {
      reminderMessageLeaseToken: null,
      reminderMessageLeaseUntil: null,
      updatedAt: params.now,
    });
    return true;
  });
}

export function quarantineInvalidMessagingCleanupSession(params: {
  docRef: FirebaseFirestore.DocumentReference;
  lastUpdateTime: FirebaseFirestore.Timestamp;
  now: Timestamp;
  stage: "cleanup" | "expiry" | "reminder";
}): Promise<FirebaseFirestore.WriteResult> {
  return params.docRef.update({
    cleanupBlockedAt: params.now,
    cleanupBlockedReason: `invalid_${params.stage}_session`,
    state: "COOLDOWN",
    stateHistory: FieldValue.arrayUnion({
      reason: `Invalid persisted session blocked during ${params.stage}`,
      state: "COOLDOWN",
      timestamp: params.now,
    }),
    updatedAt: params.now,
  }, { lastUpdateTime: params.lastUpdateTime });
}
