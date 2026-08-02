import { DB_COLLECTIONS } from "@constant/database";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";
import { normalizeMenuListPublicEntityIdentityAliases } from "@lib/publicTruth/entityEligibility";
import type { DigitalScreenDisplayMode } from "@type/campaigns";
import { FieldValue } from "firebase-admin/firestore";
import { getDigitalScreenSeenWriteDecision } from "./screenSeenAcknowledgement";
import { isCurrentScreenSeenPublicScope } from "./screenSeenScope";

export type ScreenSeenCommitResult =
    | "already_seen"
    | "ineligible"
    | "recorded"
    | "stale_version";

export async function commitCurrentScreenSeen(params: {
    controlRef: FirebaseFirestore.DocumentReference;
    mode?: DigitalScreenDisplayMode;
    requestedContentVersion?: number;
    screenRef: FirebaseFirestore.DocumentReference;
    storeId: string;
    token: string;
}): Promise<ScreenSeenCommitResult> {
    const storeScope = normalizeStorePermissionScopeDocumentId(params.storeId);
    if (!storeScope) return "ineligible";
    const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [controlSnapshot, screenSnapshot, storeSnapshot] = await Promise.all([
            transaction.get(params.controlRef),
            transaction.get(params.screenRef),
            transaction.get(storeRef),
        ]);
        const control = controlSnapshot.data();
        const screen = screenSnapshot.data()?.screen;
        const storeData = storeSnapshot.data();
        const tenantScope = normalizeMenuListPublicEntityIdentityAliases([
            storeData?.tenantId,
            storeData?.tId,
        ]);
        const privateTokenMatches = controlSnapshot.exists
            && control?.screenToken === params.token
            && String(control?.storeId || "") === storeScope.documentId;
        const legacyTokenMatches = !controlSnapshot.exists
            && screen?.screenToken === params.token;
        if (
            !screenSnapshot.exists
            || (!privateTokenMatches && !legacyTokenMatches)
            || screen?.enabled !== true
            || !tenantScope
            || (
                controlSnapshot.exists
                && String(control?.tenantId || "") !== tenantScope.documentId
            )
        ) {
            return "ineligible";
        }

        const currentContentVersion = screen?.contentVersion;
        if (
            !Number.isSafeInteger(currentContentVersion)
            || Number(currentContentVersion) < 1
        ) {
            return "ineligible";
        }

        const tenantRef = firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
        const tenantSnapshot = await transaction.get(tenantRef);
        if (!isCurrentScreenSeenPublicScope({
            storeData,
            storeDocumentId: storeScope.documentId,
            tenantData: tenantSnapshot.data(),
            tenantDocumentId: tenantScope.documentId,
        })) {
            return "ineligible";
        }

        const decision = getDigitalScreenSeenWriteDecision({
            currentContentVersion: Number(currentContentVersion),
            lastSeenAt: screen.screenLastSeenAt,
            mode: params.mode,
            modeReceipt: params.mode ? screen.screenSeenByMode?.[params.mode] : undefined,
            requestedContentVersion: params.requestedContentVersion,
        });
        if (decision !== "recorded") return decision;

        const updates: Record<string, FieldValue | number> = {
            "screen.screenLastSeenAt": FieldValue.serverTimestamp(),
        };
        if (params.mode && params.requestedContentVersion !== undefined) {
            updates[`screen.screenSeenByMode.${params.mode}.contentVersion`] = params.requestedContentVersion;
            updates[`screen.screenSeenByMode.${params.mode}.seenAt`] = FieldValue.serverTimestamp();
        }
        transaction.update(params.screenRef, updates);
        return "recorded";
    });
}
