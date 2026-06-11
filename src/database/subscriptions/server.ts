import { DEFAULT_PRODUCT_ID } from "@constant/product";
import {
    ECOMSAI_PLATFORM_STORE_ID,
    ECOMSAI_PLATFORM_TENANT_ID,
    ECOMSAI_PLATFORM_USER_ID,
    ECOMSAI_PLATFORM_USER_NAME,
    ECOMSAI_PLATFORM_USER_ROLE,
} from "@constant/user";
import { DB_COLLECTIONS } from "@constant/database";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { MinimalStoreDataType } from "@type/platform/store";
import { getGracePeriodInfo } from "@util/razorpay";

const COLLECTION = DB_COLLECTIONS.SUBSCRIPTIONS;

export const getSubscriptionsCollectionRefServer = () => firestoreAdmin.collection(COLLECTION);

const getSubscriptionDocRefServer = (docId: string) => getSubscriptionsCollectionRefServer().doc(docId);

const isTimestampLike = (value: any) => (
    value
    && typeof value === "object"
    && typeof value.toDate === "function"
    && typeof value.seconds === "number"
);

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (isTimestampLike(value)) return admin.firestore.Timestamp.fromDate(value.toDate());
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    if (typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeForAdminFirestore(nestedValue)]),
        );
    }
    return value;
};

const composeServerSubscriptionPayload = (
    data: Record<string, any>,
    options: { isNew?: boolean } = {},
) => {
    const now = admin.firestore.Timestamp.now();
    const productId = data.productId ?? data.pId ?? DEFAULT_PRODUCT_ID;
    const tenantId = data.tId ?? data.tenantId ?? (options.isNew ? ECOMSAI_PLATFORM_TENANT_ID : undefined);
    const storeId = data.sId ?? data.storeId ?? (options.isNew ? ECOMSAI_PLATFORM_STORE_ID : undefined);
    const userId = data.uId ?? data.userId ?? (options.isNew ? ECOMSAI_PLATFORM_USER_ID : undefined);
    const payload = sanitizeForAdminFirestore({
        ...data,
        productId,
        pId: productId,
        ...(storeId !== undefined ? { sId: storeId } : {}),
        ...(tenantId !== undefined ? { tId: tenantId } : {}),
        ...(data.role || options.isNew ? { role: data.role ?? ECOMSAI_PLATFORM_USER_ROLE } : {}),
        ...(userId !== undefined ? { uId: userId } : {}),
        modifiedBy: data.modifiedBy ?? ECOMSAI_PLATFORM_USER_NAME,
        modifiedOn: now,
        ...(options.isNew && !data.createdOn ? { createdOn: now } : {}),
        ...(options.isNew && !data.createdBy ? { createdBy: ECOMSAI_PLATFORM_USER_NAME } : {}),
    });

    return payload;
};

export const createInitialSubscriptionServer = async (
    providerSubscriptionId: string,
    data: Omit<FirestoreSubscriptionDoc, "id">,
): Promise<void> => {
    await getSubscriptionDocRefServer(providerSubscriptionId).set(
        composeServerSubscriptionPayload(data, { isNew: true }),
    );
};

export const updateSubscriptionServer = async (
    subscriptionId: string,
    data: Partial<FirestoreSubscriptionDoc>,
): Promise<void> => {
    await getSubscriptionDocRefServer(subscriptionId).set(
        composeServerSubscriptionPayload(data),
        { merge: true },
    );
};

export const getSubscriptionByIdServer = async (id: string): Promise<FirestoreSubscriptionDoc | null> => {
    const docSnap = await getSubscriptionDocRefServer(id).get();
    if (!docSnap.exists) return null;
    return { ...(docSnap.data() as FirestoreSubscriptionDoc), id };
};

const getMasterStoreIdFromList = (storesList?: MinimalStoreDataType[]): number | null => {
    if (!storesList?.length) return null;

    const normalizedStores = storesList
        .map((store) => {
            const storeId = Number(store?.storeId);
            return Number.isFinite(storeId) && storeId > 0
                ? { store, storeId }
                : null;
        })
        .filter((store): store is { store: MinimalStoreDataType; storeId: number } => Boolean(store));

    const explicitMaster = normalizedStores.find(({ store }) => (
        store?.isMaster === true
        || store?.storeDetails?.isMaster === true
    ));
    if (explicitMaster) return explicitMaster.storeId;

    // Legacy tenants may have store.isMaster=true while tenants.storesList
    // missed the same marker. If all outlets are explicitly isMaster:false,
    // the remaining active unflagged store is the master without another read.
    const activeStores = normalizedStores.filter(({ store }) => (
        (store as any)?.active !== false
        && store?.storeDetails?.active !== false
    ));
    if (activeStores.length === 1) return activeStores[0].storeId;

    const unflaggedActiveStores = activeStores.filter(({ store }) => (
        store?.isMaster !== false
        && store?.storeDetails?.isMaster !== false
    ));
    if (unflaggedActiveStores.length === 1) return unflaggedActiveStores[0].storeId;

    return null;
};

const fetchSubscriptionRawServer = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const now = admin.firestore.Timestamp.now();
    const collectionRef = getSubscriptionsCollectionRefServer();

    const activeSnapshot = await collectionRef
        .where("status", "in", ["active", "past_due", "cancelled", "paused"])
        .where("cycleEndDate", ">=", now)
        .where("tenantId", "==", tenantId)
        .where("storeId", "==", storeId)
        .limit(1)
        .get();

    if (!activeSnapshot.empty) {
        const docSnap = activeSnapshot.docs[0];
        return { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };
    }

    for (const status of ["paused", "pending"]) {
        const fallbackSnapshot = await collectionRef
            .where("status", "==", status)
            .where("tenantId", "==", tenantId)
            .where("storeId", "==", storeId)
            .limit(1)
            .get();

        if (!fallbackSnapshot.empty) {
            const docSnap = fallbackSnapshot.docs[0];
            return { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };
        }
    }

    return null;
};

const expireIfGracePeriodEndedServer = async (
    sub: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (!sub.pastDueSinceAt) return sub;

    const { remainingDays, graceEndsDate } = getGracePeriodInfo(sub.pastDueSinceAt);
    if (remainingDays > 0) return sub;

    if (!validateTransition(sub.status, "expired", "server:grace-period-auto-expire")) {
        return sub;
    }
    await updateSubscriptionServer(sub.id, {
        status: "expired",
        cycleEndDate: admin.firestore.Timestamp.now() as any,
        subscriptionEndDate: admin.firestore.Timestamp.now() as any,
        statuses: [
            ...sub.statuses,
            {
                status: "expired",
                timestamp: admin.firestore.Timestamp.now() as any,
                amount: sub.amount,
                currency: sub.currency,
                remark: `Expired due to payment failed and past due since ${graceEndsDate?.toLocaleDateString()}`,
            },
        ],
    });
    await safeSyncStorePlanEntitlementFromSubscription(
        { ...sub, status: "expired" },
        "server:grace-period-auto-expire",
    );

    return null;
};

export const getDirectActiveSubscriptionForStoreServer = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const raw = await fetchSubscriptionRawServer(tenantId, storeId);
    if (!raw) return null;
    return await expireIfGracePeriodEndedServer(raw);
};

export const getActiveSubscriptionForStoreServer = async (
    tenantId: number,
    storeId: number,
    tenantStoresList?: MinimalStoreDataType[],
): Promise<FirestoreSubscriptionDoc | null> => {
    const raw = await fetchSubscriptionRawServer(tenantId, storeId);
    if (raw) return await expireIfGracePeriodEndedServer(raw);

    let masterStoreId: number | null = null;
    if (tenantStoresList) {
        masterStoreId = getMasterStoreIdFromList(tenantStoresList);
    } else {
        const tenantSnap = await firestoreAdmin
            .collection(DB_COLLECTIONS.TENANTS)
            .doc(String(tenantId))
            .get();
        masterStoreId = getMasterStoreIdFromList(tenantSnap.data()?.storesList);
    }

    if (!masterStoreId || masterStoreId === storeId) return null;

    const masterRaw = await fetchSubscriptionRawServer(tenantId, masterStoreId);
    if (!masterRaw) return null;
    return await expireIfGracePeriodEndedServer(masterRaw);
};

export const getCollectionRef = getSubscriptionsCollectionRefServer;
export const createInitialSubscription = createInitialSubscriptionServer;
export const updateSubscription = updateSubscriptionServer;
export const getSubscriptionById = getSubscriptionByIdServer;
export const getDirectActiveSubscriptionForStore = getDirectActiveSubscriptionForStoreServer;
export const getActiveSubscriptionForStore = getActiveSubscriptionForStoreServer;
