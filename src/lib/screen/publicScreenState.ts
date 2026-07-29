import { DB_COLLECTIONS } from "@constant/database";
import { doc, setDoc, Timestamp } from "@firebase/firestore";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import type { DigitalScreenState } from "@type/campaigns";

export interface PublicScreenState {
    contentVersion: number;
    enabled: boolean;
    lastContentChangeAt: unknown;
    storeId: string;
    updatedAt: unknown;
}

export const getPublicScreenStateDocId = (storeId: string | number) => `screen_${storeId}`;

export const getPublicScreenStateDocRef = (storeId: string | number) => (
    doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, getPublicScreenStateDocId(storeId))
);

export function toPublicScreenState(
    storeId: string | number,
    screen: Pick<DigitalScreenState, "contentVersion" | "enabled" | "lastContentChangeAt">,
): PublicScreenState | null {
    const normalizedStoreId = String(storeId || "").trim();
    if (!normalizedStoreId) return null;

    const parsedContentVersion = Number(screen.contentVersion || 1);
    const contentVersion = Number.isFinite(parsedContentVersion)
        ? Math.max(1, Math.floor(parsedContentVersion))
        : 1;

    return {
        contentVersion,
        enabled: screen.enabled === true,
        lastContentChangeAt: screen.lastContentChangeAt || Timestamp.now(),
        storeId: normalizedStoreId,
        updatedAt: Timestamp.now(),
    };
}

export async function syncPublicScreenState(
    storeId: string | number,
    screen: Pick<DigitalScreenState, "contentVersion" | "enabled" | "lastContentChangeAt">,
) {
    const publicState = toPublicScreenState(storeId, screen);
    if (!publicState) return;

    await setDoc(getPublicScreenStateDocRef(storeId), publicState, { merge: false });
}
