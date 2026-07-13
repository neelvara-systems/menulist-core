import { DB_COLLECTIONS } from "@constant/database";
import { normalizeMessagingPendingUploadCleanupPaths } from "@data/shared/messagingReplacementUploads";
import { admin, storageAdmin } from "@lib/firebase/firebaseAdmin";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";

const db = admin.firestore();

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
  logRuntimeFailure("messaging_onboarding_upload_cleanup_failed", error, {
    ...getBoundedRuntimeStringContext("sessionId", sessionId),
    cleanupPathCount: count,
    operation,
  });
}

async function quarantineInvalidUploadCleanup(
  sessionId: string,
  sessionRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  let quarantined: boolean;
  try {
    quarantined = await db.runTransaction(async (transaction) => {
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

      transaction.update(sessionRef, { uploadCleanupPending: false });
      return true;
    });
  } catch (error) {
    logCleanupOperationFailure(sessionId, 0, "quarantine_transaction", error);
    return;
  }

  if (quarantined) {
    logRuntimeFailure(
      "messaging_onboarding_upload_cleanup_contract_invalid",
      new Error("MESSAGING_UPLOAD_CLEANUP_CONTRACT_INVALID"),
      {
        ...getBoundedRuntimeStringContext("sessionId", sessionId),
        operation: "cleanup_quarantine",
      },
    );
  }
}

export async function drainMessagingPendingUploadCleanupServer(params: {
  deletePath?: (storagePath: string) => Promise<void>;
  sessionId: string;
}): Promise<MessagingUploadCleanupResult> {
  const sessionRef = db
    .collection(DB_COLLECTIONS.MESSAGING_ONBOARDING_SESSIONS)
    .doc(params.sessionId);
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
    completion = await db.runTransaction(async (transaction) => {
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
