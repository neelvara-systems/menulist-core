import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { secureError } from "@lib/security/secureLogger";

const SERVER_SCREEN_TOUCH_FAILED_CODE = "digital_screen_server_content_version_touch_failed";

function getScreenTouchErrorName(error: unknown): string {
    return error instanceof Error ? error.name || "Error" : typeof error;
}

function logServerScreenTouchFailure(
    error: unknown,
    storeId: string,
    context: string,
): void {
    secureError(
        "[Digital Screen] Server invalidation failed",
        new Error(SERVER_SCREEN_TOUCH_FAILED_CODE),
        {
            contextPresent: Boolean(context.trim()),
            contextLength: context.length,
            errorName: getScreenTouchErrorName(error),
            storeIdLength: storeId.length,
        },
    );
}

export async function touchDigitalScreenContentVersionForStoreServer(
    storeId?: string | number | null,
    context = "serverScreenInvalidation",
): Promise<void> {
    const normalizedStoreId = String(storeId ?? "").trim();
    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId) return;

    try {
        const now = admin.firestore.Timestamp.now();
        const screenRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`campaigns_${normalizedStoreId}`);
        const screenSnap = await screenRef.get();
        const screen = screenSnap.exists ? screenSnap.data()?.screen : null;

        if (!screen?.screenToken) return;

        const nextContentVersion = Number(screen.contentVersion || 0) + 1;
        const publicScreenRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`screen_${normalizedStoreId}`);
        const batch = firestoreAdmin.batch();

        batch.update(screenRef, {
            "screen.contentVersion": admin.firestore.FieldValue.increment(1),
            "screen.lastContentChangeAt": now,
        });
        batch.set(publicScreenRef, {
            contentVersion: nextContentVersion,
            enabled: screen.enabled === true,
            lastContentChangeAt: now,
            screenToken: screen.screenToken,
            storeId: normalizedStoreId,
            updatedAt: now,
        }, { merge: true });

        await batch.commit();
    } catch (error) {
        logServerScreenTouchFailure(error, normalizedStoreId, context);
    }
}
