import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { requireOnboardingUserId } from "./onboardingUserId";
import { deleteOwnerReferralAttributionInTransaction } from "@lib/ownerReferral/ownerReferralAttributionServer";

export type FailedOnboardingCompensationSource = "WEBSITE_ONBOARDING" | "RESELLER_ONBOARDING";

const PAYMENT_PROVIDER_FAILED_STATUS = "payment_provider_failed";
const ONBOARDING_COMPENSATION_SCOPE_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;

type OnboardingCompensationScope = {
    documentId: string;
    numericId: number;
};

const normalizePositiveId = (value: string | number): OnboardingCompensationScope => {
    const documentId = String(value);
    if (
        !ONBOARDING_COMPENSATION_SCOPE_DOCUMENT_ID_PATTERN.test(documentId)
        || !isValidFirestoreDocumentId(documentId)
    ) {
        throw new Error("Invalid onboarding compensation scope");
    }
    const numericId = Number(documentId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0 || String(numericId) !== documentId) {
        throw new Error("Invalid onboarding compensation scope");
    }
    return { documentId, numericId };
};

const removeStoreFromList = (stores: unknown, storeId: number) => (
    Array.isArray(stores)
        ? stores.filter((store) => Number((store as any)?.storeId) !== storeId)
        : []
);

const removeStoreIdFromList = (storeIds: unknown, storeId: number) => (
    Array.isArray(storeIds)
        ? storeIds.filter((id) => Number(id) !== storeId)
        : []
);

export async function compensateFailedTenantStoreOnboarding(params: {
    db: FirebaseFirestore.Firestore;
    reason: string;
    source: FailedOnboardingCompensationSource;
    storeId: string | number;
    tenantId: string | number;
    userId: string;
}): Promise<void> {
    const tenantScope = normalizePositiveId(params.tenantId);
    const storeScope = normalizePositiveId(params.storeId);
    const tenantId = tenantScope.numericId;
    const storeId = storeScope.numericId;
    const userId = requireOnboardingUserId(params.userId);
    const reason = params.reason.slice(0, 80);

    await params.db.runTransaction(async (transaction) => {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
        const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId);
        const storesSummaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc("storesSummary");
        const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(userId);
        const userSnap = await transaction.get(userRef);
        const userData = userSnap.exists ? userSnap.data() || {} : {};
        const remainingStores = removeStoreFromList(userData.stores, storeId);
        const remainingStoreIds = removeStoreIdFromList(userData.storeIds, storeId);
        const userUpdate: Record<string, unknown> = {
            modifiedOn: now,
            onboardingCompensatedAt: now,
            onboardingCompensationReason: reason,
            onboardingCompensationSource: params.source,
            onboardingStatus: PAYMENT_PROVIDER_FAILED_STATUS,
            storeIds: remainingStoreIds,
            stores: remainingStores,
        };

        if (Number(userData.storeId) === storeId) {
            userUpdate.storeId = null;
        }
        if (Number(userData.tenantId) === tenantId) {
            userUpdate.tenantId = null;
        }

        transaction.set(tenantRef, {
            active: false,
            modifiedOn: now,
            onboardingCompensatedAt: now,
            onboardingCompensationReason: reason,
            onboardingStatus: PAYMENT_PROVIDER_FAILED_STATUS,
        }, { merge: true });

        transaction.set(storeRef, {
            active: false,
            modifiedOn: now,
            onboardingCompensatedAt: now,
            onboardingCompensationReason: reason,
            onboardingStatus: PAYMENT_PROVIDER_FAILED_STATUS,
        }, { merge: true });

        transaction.set(storesSummaryRef, {
            lastUpdated: now,
            stores: {
                [storeScope.documentId]: {
                    active: false,
                    modifiedOn: now,
                    onboardingStatus: PAYMENT_PROVIDER_FAILED_STATUS,
                },
            },
        }, { merge: true });

        if (userSnap.exists) {
            transaction.set(userRef, userUpdate, { merge: true });
        }

        deleteOwnerReferralAttributionInTransaction({
            transaction,
            db: params.db,
            referredScope: { tenantId, storeId },
        });
    });
}
