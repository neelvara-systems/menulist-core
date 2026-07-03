import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";

export type FailedOnboardingCompensationSource = "WEBSITE_ONBOARDING" | "RESELLER_ONBOARDING";

const PAYMENT_PROVIDER_FAILED_STATUS = "payment_provider_failed";

const normalizePositiveId = (value: string | number): number => {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new Error("Invalid onboarding compensation scope");
    }
    return id;
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
    const tenantId = normalizePositiveId(params.tenantId);
    const storeId = normalizePositiveId(params.storeId);
    const reason = params.reason.slice(0, 80);

    await params.db.runTransaction(async (transaction) => {
        const now = admin.firestore.FieldValue.serverTimestamp();
        const tenantRef = params.db.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));
        const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        const storesSummaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc("storesSummary");
        const userRef = params.db.collection(DB_COLLECTIONS.USERS).doc(params.userId);
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
                [storeId]: {
                    active: false,
                    modifiedOn: now,
                    onboardingStatus: PAYMENT_PROVIDER_FAILED_STATUS,
                },
            },
        }, { merge: true });

        if (userSnap.exists) {
            transaction.set(userRef, userUpdate, { merge: true });
        }
    });
}
