import { DB_COLLECTIONS } from "@constant/database";
import { doc, getDoc, increment, Timestamp, updateDoc } from "@firebase/firestore";
import { FEATURE_FLAGS } from "@config/features";
import { firebaseClient } from "@lib/firebase/firebaseClient";

const pendingScreenTouches = new Map<string, Promise<void>>();

export const touchDigitalScreenContentVersion = async (
    storeId?: string | number | null,
    context = "screenInvalidation",
): Promise<void> => {
    const normalizedStoreId = String(storeId ?? "").trim();
    if (!FEATURE_FLAGS.DIGITAL_SCREENS_ENABLED || !normalizedStoreId || typeof window === "undefined") {
        return;
    }

    const pending = pendingScreenTouches.get(normalizedStoreId);
    if (pending) {
        return pending;
    }

    const touch = (async () => {
        try {
            const screenRef = doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `campaigns_${normalizedStoreId}`);
            const screenSnap = await getDoc(screenRef);
            const screen = screenSnap.exists() ? screenSnap.data()?.screen : null;

            if (!screen?.screenToken) {
                return;
            }

            await updateDoc(screenRef, {
                "screen.contentVersion": increment(1),
                "screen.lastContentChangeAt": Timestamp.now(),
            });
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.warn(`[screen-invalidation] ${context} failed to update screen content version`, error);
            }
        } finally {
            pendingScreenTouches.delete(normalizedStoreId);
        }
    })();

    pendingScreenTouches.set(normalizedStoreId, touch);
    return touch;
};
