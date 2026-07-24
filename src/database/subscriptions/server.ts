import { DEFAULT_PRODUCT_ID } from "@constant/product";
import {
    ECOMSAI_PLATFORM_USER_ID,
    ECOMSAI_PLATFORM_USER_NAME,
    ECOMSAI_PLATFORM_USER_ROLE,
} from "@constant/user";
import { DB_COLLECTIONS } from "@constant/database";
import {
    normalizeBillingSubscriptionDocumentId,
    normalizeBillingSubscriptionScopeDocumentId,
} from "@lib/billing/subscriptionDocumentIdBoundary";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { MinimalStoreDataType } from "@type/platform/store";
import { getGracePeriodInfo } from "@util/razorpay";
import { admitManualSubscriptionConfirmation } from "@lib/billing/manualSubscriptionConfirmation";
import { appendBoundedBillingStatusHistory } from "@lib/billing/subscriptionStatusHistory";
import { getMenuListSubscriptionEntitlementScope } from "@lib/billing/menuListSubscriptionEntitlementBoundary";
import { getProductSubscriptionBillingScope } from "@lib/billing/productSubscriptionScopeBoundary";

const COLLECTION = DB_COLLECTIONS.SUBSCRIPTIONS;

export const getSubscriptionsCollectionRefServer = () => firestoreAdmin.collection(COLLECTION);

export { normalizeBillingSubscriptionScopeDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";

const getSubscriptionDocRefServer = (docId: string) => {
    const normalizedDocId = normalizeBillingSubscriptionDocumentId(docId);
    if (!normalizedDocId) throw new Error("Invalid billing subscription id.");
    return getSubscriptionsCollectionRefServer().doc(normalizedDocId);
};

type TimestampLike = {
    toDate: () => Date;
    seconds: number;
};

const isTimestampLike = (value: unknown): value is TimestampLike => (
    value
    && typeof value === "object"
    && typeof (value as Partial<TimestampLike>).toDate === "function"
    && typeof (value as Partial<TimestampLike>).seconds === "number"
);

const sanitizeForAdminFirestore = (value: any): any => {
    return sanitizeForFirestore(value, {
        atomicTransform: (atomicValue) => {
            if (!isTimestampLike(atomicValue)) return { handled: false };
            return { handled: true, value: admin.firestore.Timestamp.fromDate(atomicValue.toDate()) };
        },
    });
};

const composeServerSubscriptionPayload = (
    data: Record<string, any>,
    options: { isNew?: boolean } = {},
) => {
    const now = admin.firestore.Timestamp.now();
    const suppliedProductAliases = [data.pId, data.productId]
        .filter((value) => value !== undefined);
    if (suppliedProductAliases.some((value) => value !== DEFAULT_PRODUCT_ID)) {
        throw new Error('MenuList subscription product identity is invalid.');
    }
    const productId = DEFAULT_PRODUCT_ID;
    const hasSuppliedScope = ['tId', 'tenantId', 'sId', 'storeId']
        .some((key) => Object.prototype.hasOwnProperty.call(data, key));
    const scope = hasSuppliedScope || options.isNew
        ? getProductSubscriptionBillingScope(DEFAULT_PRODUCT_ID, {
            ...data,
            pId: productId,
            productId,
        })
        : null;
    if ((hasSuppliedScope || options.isNew) && !scope) {
        throw new Error('MenuList subscription tenant/store identity is invalid.');
    }
    const userId = data.uId ?? data.userId ?? (options.isNew ? ECOMSAI_PLATFORM_USER_ID : undefined);
    const {
        pId: _pId,
        productId: _productId,
        sId: _sId,
        storeId: _storeId,
        tId: _tId,
        tenantId: _tenantId,
        ...subscriptionData
    } = data;
    const payload = sanitizeForAdminFirestore({
        ...subscriptionData,
        productId,
        pId: productId,
        ...(scope ? { sId: scope.storeId, storeId: scope.storeId } : {}),
        ...(scope ? { tId: scope.tenantId, tenantId: scope.tenantId } : {}),
        ...(data.role || options.isNew ? { role: data.role ?? ECOMSAI_PLATFORM_USER_ROLE } : {}),
        ...(userId !== undefined ? { uId: userId } : {}),
        modifiedBy: data.modifiedBy ?? ECOMSAI_PLATFORM_USER_NAME,
        modifiedOn: now,
        ...(options.isNew && !data.createdOn ? { createdOn: now } : {}),
        ...(options.isNew && !data.createdBy ? { createdBy: ECOMSAI_PLATFORM_USER_NAME } : {}),
    });

    return payload;
};

export const composeInitialSubscriptionPayloadServer = (
    data: Omit<FirestoreSubscriptionDoc, "id">,
) => composeServerSubscriptionPayload(data, { isNew: true });

export const createInitialSubscriptionServer = async (
    providerSubscriptionId: string,
    data: Omit<FirestoreSubscriptionDoc, "id">,
): Promise<void> => {
    await getSubscriptionDocRefServer(providerSubscriptionId).create(
        composeInitialSubscriptionPayloadServer(data),
    );
};

export const updateSubscriptionServer = async (
    subscriptionId: string,
    data: Partial<FirestoreSubscriptionDoc>,
): Promise<void> => {
    const subscriptionRef = getSubscriptionDocRefServer(subscriptionId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists || !getMenuListSubscriptionEntitlementScope(snapshot.data())) {
            throw new Error('MenuList subscription does not match the requested product and scope.');
        }
        transaction.set(subscriptionRef, composeServerSubscriptionPayload(data), { merge: true });
    });
};

export const getSubscriptionByIdServer = async (id: string): Promise<FirestoreSubscriptionDoc | null> => {
    const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(id);
    if (!normalizedSubscriptionId) return null;

    const docSnap = await getSubscriptionsCollectionRefServer().doc(normalizedSubscriptionId).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data() as FirestoreSubscriptionDoc;
    if (!getMenuListSubscriptionEntitlementScope(data)) return null;
    return { ...data, id: docSnap.id };
};

export type ManualSubscriptionPaymentConfirmationResult =
    | {
        amount: number;
        alreadyConfirmed: boolean;
        currency: 'INR';
        kind: 'confirmed';
        planId: string | null;
        storeId: number;
        tenantId: number;
    }
    | { kind: 'forbidden' }
    | { kind: 'invalid_state' }
    | { kind: 'malformed' }
    | { kind: 'not_found' }
    | { kind: 'wrong_mode' };

export const confirmManualSubscriptionPaymentServer = async (params: {
    actorId: string;
    isPlatformUser: boolean;
    subscriptionId: string;
}): Promise<ManualSubscriptionPaymentConfirmationResult> => {
    const subscriptionId = normalizeBillingSubscriptionDocumentId(params.subscriptionId);
    if (!subscriptionId) return { kind: 'not_found' };
    const subscriptionRef = getSubscriptionsCollectionRefServer().doc(subscriptionId);

    return firestoreAdmin.runTransaction<ManualSubscriptionPaymentConfirmationResult>(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists) return { kind: 'not_found' };

        const admission = admitManualSubscriptionConfirmation({
            actorId: params.actorId,
            isPlatformUser: params.isPlatformUser,
            subscriptionData: snapshot.data(),
        });
        if (admission.kind !== 'eligible' && admission.kind !== 'already_confirmed') {
            return admission;
        }

        if (admission.kind === 'eligible') {
            const confirmedAt = admin.firestore.Timestamp.now();
            transaction.set(subscriptionRef, composeServerSubscriptionPayload({
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: confirmedAt,
                status: 'active',
                statuses: [
                    ...admission.statuses,
                    {
                        amount: admission.amount,
                        currency: admission.currency,
                        remark: 'Offline payment confirmed by reseller',
                        status: 'active',
                        timestamp: confirmedAt,
                    },
                ],
            }), { merge: true });
        }

        return {
            amount: admission.amount,
            alreadyConfirmed: admission.kind === 'already_confirmed',
            currency: admission.currency,
            kind: 'confirmed',
            planId: admission.planId,
            storeId: admission.storeId,
            tenantId: admission.tenantId,
        };
    });
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
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return null;

    const now = admin.firestore.Timestamp.now();
    const collectionRef = getSubscriptionsCollectionRefServer();

    const activeSnapshot = await collectionRef
        .where("pId", "==", DEFAULT_PRODUCT_ID)
        .where("productId", "==", DEFAULT_PRODUCT_ID)
        .where("status", "in", ["active", "past_due", "cancelled", "paused"])
        .where("cycleEndDate", ">=", now)
        .where("tenantId", "==", tenantScope.numericId)
        .where("storeId", "==", storeScope.numericId)
        .orderBy("cycleEndDate", "desc")
        .limit(1)
        .get();

    if (!activeSnapshot.empty) {
        const docSnap = activeSnapshot.docs[0];
        const subscription = { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };
        const scope = getMenuListSubscriptionEntitlementScope(subscription);
        return scope?.tenantId === tenantScope.numericId && scope.storeId === storeScope.numericId
            ? subscription
            : null;
    }

    for (const status of ["paused", "pending"]) {
        const fallbackSnapshot = await collectionRef
            .where("pId", "==", DEFAULT_PRODUCT_ID)
            .where("productId", "==", DEFAULT_PRODUCT_ID)
            .where("status", "==", status)
            .where("tenantId", "==", tenantScope.numericId)
            .where("storeId", "==", storeScope.numericId)
            .limit(1)
            .get();

        if (!fallbackSnapshot.empty) {
            const docSnap = fallbackSnapshot.docs[0];
            const subscription = { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };
            const scope = getMenuListSubscriptionEntitlementScope(subscription);
            return scope?.tenantId === tenantScope.numericId && scope.storeId === storeScope.numericId
                ? subscription
                : null;
        }
    }

    return null;
};

const expireIfGracePeriodEndedServer = async (
    sub: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (!sub.pastDueSinceAt) return sub;

    const initialGracePeriod = getGracePeriodInfo(sub.pastDueSinceAt);
    if (!initialGracePeriod.hasKnownGracePeriod || initialGracePeriod.remainingDays > 0) return sub;

    if (!validateTransition(sub.status, "expired", "server:grace-period-auto-expire")) {
        return sub;
    }

    const subscriptionId = normalizeBillingSubscriptionDocumentId(sub.id);
    if (!subscriptionId) return sub;
    const subscriptionRef = getSubscriptionsCollectionRefServer().doc(subscriptionId);
    const result = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists) return { expired: false, subscription: null };

        const current = {
            ...(snapshot.data() as FirestoreSubscriptionDoc),
            id: snapshot.id,
        } as FirestoreSubscriptionDoc;
        if (!getMenuListSubscriptionEntitlementScope(current)) {
            return { expired: false, subscription: null };
        }
        if (current.status !== "past_due") {
            return { expired: false, subscription: current };
        }

        const gracePeriod = getGracePeriodInfo(current.pastDueSinceAt);
        if (!gracePeriod.hasKnownGracePeriod || gracePeriod.remainingDays > 0) {
            return { expired: false, subscription: current };
        }
        if (!validateTransition(current.status, "expired", "server:grace-period-auto-expire")) {
            return { expired: false, subscription: current };
        }

        const expiredAt = admin.firestore.Timestamp.now();
        const update: Partial<FirestoreSubscriptionDoc> = {
            status: "expired",
            cycleEndDate: expiredAt as any,
            subscriptionEndDate: expiredAt as any,
            statuses: appendBoundedBillingStatusHistory(current.statuses, {
                    status: "expired",
                    timestamp: expiredAt as any,
                    amount: current.amount,
                    currency: current.currency,
                    remark: `Expired after the payment recovery period ended on ${gracePeriod.graceEndsDate?.toLocaleDateString()}`,
            }),
        };
        transaction.set(subscriptionRef, composeServerSubscriptionPayload(update), { merge: true });
        return {
            expired: true,
            subscription: { ...current, ...update, id: snapshot.id } as FirestoreSubscriptionDoc,
        };
    });

    if (!result.subscription) return null;
    if (!result.expired) {
        return ["expired", "completed"].includes(result.subscription.status)
            ? null
            : result.subscription;
    }

    await safeSyncStorePlanEntitlementFromSubscription(result.subscription, "server:grace-period-auto-expire");
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
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return null;

    const raw = await fetchSubscriptionRawServer(tenantScope.numericId, storeScope.numericId);
    if (raw) return await expireIfGracePeriodEndedServer(raw);

    let masterStoreId: number | null = null;
    if (tenantStoresList) {
        masterStoreId = getMasterStoreIdFromList(tenantStoresList);
    } else {
        const tenantSnap = await firestoreAdmin
            .collection(DB_COLLECTIONS.TENANTS)
            .doc(tenantScope.documentId)
            .get();
        masterStoreId = getMasterStoreIdFromList(tenantSnap.data()?.storesList);
    }

    if (!masterStoreId || masterStoreId === storeScope.numericId) return null;

    const masterRaw = await fetchSubscriptionRawServer(tenantScope.numericId, masterStoreId);
    if (!masterRaw) return null;
    return await expireIfGracePeriodEndedServer(masterRaw);
};

export const getCollectionRef = getSubscriptionsCollectionRefServer;
export const createInitialSubscription = createInitialSubscriptionServer;
export const updateSubscription = updateSubscriptionServer;
export const getSubscriptionById = getSubscriptionByIdServer;
export const confirmManualSubscriptionPayment = confirmManualSubscriptionPaymentServer;
export const getDirectActiveSubscriptionForStore = getDirectActiveSubscriptionForStoreServer;
export const getActiveSubscriptionForStore = getActiveSubscriptionForStoreServer;
