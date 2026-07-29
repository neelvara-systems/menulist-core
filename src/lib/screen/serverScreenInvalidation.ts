import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import {
    getPrivateScreenControlDocId,
    getPrivateScreenTokenCacheTag,
} from "@lib/screen/privateScreenControl";
import { secureError } from "@lib/security/secureLogger";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import { revalidateTag } from "next/cache";

const SERVER_SCREEN_TOUCH_FAILED_CODE = "digital_screen_server_content_version_touch_failed";

function getScreenTouchErrorName(error: unknown): string {
    return getBoundedErrorName(error) || typeof error;
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
): Promise<{ touched: boolean; tokenCacheTag?: string }> {
    const normalizedStoreId = String(storeId ?? "").trim();
    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId) {
        return { touched: false };
    }

    try {
        const screenRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`campaigns_${normalizedStoreId}`);
        const controlRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getPrivateScreenControlDocId(normalizedStoreId));
        const publicScreenRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`screen_${normalizedStoreId}`);

        const result = await firestoreAdmin.runTransaction(async (transaction) => {
            const [screenSnap, controlSnap] = await Promise.all([
                transaction.get(screenRef),
                transaction.get(controlRef),
            ]);
            const screen = screenSnap.exists ? screenSnap.data()?.screen : null;

            if (!screen || typeof screen.enabled !== "boolean") {
                return { touched: false } as const;
            }

            const now = admin.firestore.Timestamp.now();
            const nextContentVersion = Number(screen.contentVersion || 0) + 1;
            const privateToken = controlSnap.exists
                ? String(controlSnap.data()?.screenToken || "").trim()
                : "";
            const legacyToken = String(screen.screenToken || "").trim();
            const screenToken = /^[a-z0-9]{6,24}$/i.test(privateToken)
                ? privateToken
                : /^[a-z0-9]{6,24}$/i.test(legacyToken)
                    ? legacyToken
                    : "";

            transaction.update(screenRef, {
                "screen.contentVersion": nextContentVersion,
                "screen.lastContentChangeAt": now,
            });
            transaction.set(publicScreenRef, {
                contentVersion: nextContentVersion,
                enabled: screen.enabled === true,
                lastContentChangeAt: now,
                storeId: normalizedStoreId,
                updatedAt: now,
            }, { merge: false });

            return {
                touched: true,
                ...(screenToken
                    ? { tokenCacheTag: getPrivateScreenTokenCacheTag(screenToken) }
                    : {}),
            } as const;
        });
        if ("tokenCacheTag" in result && result.tokenCacheTag) {
            revalidateTag(result.tokenCacheTag, { expire: 0 });
        }
        return result;
    } catch (error) {
        logServerScreenTouchFailure(error, normalizedStoreId, context);
        return { touched: false };
    }
}
