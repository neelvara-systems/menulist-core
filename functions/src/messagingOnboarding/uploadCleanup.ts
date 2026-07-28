import * as functions from "firebase-functions";
import { DB_COLLECTIONS } from "../constants/database";
import { firestoreAdmin, storageAdmin } from "../firebaseAdmin";
import { normalizeMessagingPendingUploadCleanupPaths } from "../sharedData/messagingReplacementUploads";
import { getBoundedFunctionsErrorName, getBoundedFunctionsErrorCode } from '../utils/boundedErrorContext';

const logger = functions.logger;
const sessionsCol = DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS;

export type MessagingUploadCleanupResult = {
  deleted: number;
  status: "drained" | "failed" | "invalid" | "missing" | "skipped";
};

function logCleanupOperationFailure(
  sessionId: string,
  count: number,
  operation: string,
  error: unknown,
): void {
  const code = getBoundedFunctionsErrorCode(error);
  logger.warn("[MessagingUploadCleanup] Cleanup operation failed", {
    ...cleanupLogContext(sessionId, count),
    operation,
    sourceErrorCode: code,
    sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
  });
}

function cleanupLogContext(sessionId: string, count: number) {
  return {
    cleanupPathCount: count,
    sessionIdLength: sessionId.length,
    sessionIdPresent: sessionId.length > 0,
  };
}

async function quarantineInvalidUploadCleanup(
  sessionId: string,
  sessionRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  let quarantined: boolean;
  try {
    quarantined = await firestoreAdmin.runTransaction(async (transaction) => {
      const current = await transaction.get(sessionRef);
      if (!current.exists || current.get("uploadCleanupPending") !== true) return false;
      const currentPaths = normalizeMessagingPendingUploadCleanupPaths(
        current.get("pendingUploadCleanupPaths") ?? [],
        sessionId,
      );
      const currentPending = current.get("uploadCleanupPending");
      const contractIsValid = current.get("sessionId") === sessionId
        && currentPaths !== null
        && typeof currentPending === "boolean"
        && currentPending === (currentPaths.length > 0);
      if (contractIsValid) return false;

      // Retain every raw pointer for investigation or later safe recovery, but
      // remove the malformed row from the bounded daily retry query so it
      // cannot starve later valid work.
      transaction.update(sessionRef, { uploadCleanupPending: false });
      return true;
    });
  } catch (error) {
    logCleanupOperationFailure(sessionId, 0, "quarantine_transaction", error);
    return;
  }

  if (quarantined) {
    logger.error("[MessagingUploadCleanup] Invalid cleanup row quarantined", {
      ...cleanupLogContext(sessionId, 0),
      failureCode: "MESSAGING_UPLOAD_CLEANUP_CONTRACT_INVALID",
    });
  }
}

/**
 * Deletes only server-validated, session-owned orphan paths. The Firestore
 * pointers remain durable when Storage deletion fails, and the completion
 * transaction removes only paths deleted by this worker so a concurrent
 * producer cannot lose newer cleanup work.
 */
export async function drainMessagingPendingUploadCleanup(params: {
  deletePath?: (storagePath: string) => Promise<void>;
  sessionId: string;
}): Promise<MessagingUploadCleanupResult> {
  const sessionRef = firestoreAdmin.collection(sessionsCol).doc(params.sessionId);
  let snapshot: FirebaseFirestore.DocumentSnapshot;
  try {
    snapshot = await sessionRef.get();
  } catch (error) {
    logCleanupOperationFailure(params.sessionId, 0, "source_read", error);
    return { deleted: 0, status: "failed" };
  }
  if (!snapshot.exists) return { deleted: 0, status: "missing" };
  if (snapshot.get("sessionId") !== params.sessionId) {
    await quarantineInvalidUploadCleanup(params.sessionId, sessionRef);
    return { deleted: 0, status: "invalid" };
  }

  const paths = normalizeMessagingPendingUploadCleanupPaths(
    snapshot.get("pendingUploadCleanupPaths") ?? [],
    params.sessionId,
  );
  const pending = snapshot.get("uploadCleanupPending");
  if (!paths || typeof pending !== "boolean" || pending !== (paths.length > 0)) {
    await quarantineInvalidUploadCleanup(params.sessionId, sessionRef);
    return { deleted: 0, status: "invalid" };
  }
  if (!pending) return { deleted: 0, status: "skipped" };

  const deletePath = params.deletePath || (async (storagePath: string) => {
    await storageAdmin.bucket().file(storagePath).delete({ ignoreNotFound: true });
  });
  try {
    await Promise.all(paths.map((storagePath) => deletePath(storagePath)));
  } catch (error) {
    logCleanupOperationFailure(params.sessionId, paths.length, "storage_delete", error);
    return { deleted: 0, status: "failed" };
  }

  const deletedPaths = new Set(paths);
  let completion: MessagingUploadCleanupResult;
  try {
    completion = await firestoreAdmin.runTransaction(async (transaction) => {
      const current = await transaction.get(sessionRef);
      if (!current.exists) return { deleted: 0, status: "missing" as const };
      if (current.get("sessionId") !== params.sessionId) {
        return { deleted: 0, status: "invalid" as const };
      }
      const currentPaths = normalizeMessagingPendingUploadCleanupPaths(
        current.get("pendingUploadCleanupPaths") ?? [],
        params.sessionId,
      );
      if (!currentPaths || typeof current.get("uploadCleanupPending") !== "boolean") {
        return { deleted: 0, status: "invalid" as const };
      }
      const removed = currentPaths.filter((storagePath) => deletedPaths.has(storagePath)).length;
      const remaining = currentPaths.filter((storagePath) => !deletedPaths.has(storagePath));
      transaction.update(sessionRef, {
        pendingUploadCleanupPaths: remaining,
        uploadCleanupPending: remaining.length > 0,
      });
      return { deleted: removed, status: "drained" as const };
    });
  } catch (error) {
    logCleanupOperationFailure(params.sessionId, paths.length, "completion_transaction", error);
    return { deleted: 0, status: "failed" };
  }

  if (completion.status === "invalid") {
    await quarantineInvalidUploadCleanup(params.sessionId, sessionRef);
  }
  return completion;
}
