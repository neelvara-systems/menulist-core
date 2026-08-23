import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import {
    createInitialSubscription as createMenuListInitialSubscription,
    getActiveSubscriptionForStore as getMenuListActiveSubscriptionForStore,
    getDirectActiveSubscriptionForStore as getMenuListDirectActiveSubscriptionForStore,
    getSubscriptionById as getMenuListSubscriptionById,
    updateSubscription as updateMenuListSubscription,
} from '@database/subscriptions/server';
import {
    normalizeAnswerlatticeBillingScopeDocumentId,
    normalizeAnswerlatticeSubscriptionId,
} from '@lib/answerlattice/billingDocumentIdBoundary';
import {
    isAnswerlatticeSubscriptionInScope,
} from '@lib/answerlattice/billingScopeBoundary';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { isAnswerlatticeWorkspaceBillingActivationAllowed } from '@lib/answerlattice/workspaceLifecycleContracts';
import {
    canUseAnswerlatticeManagement,
    getAnswerlatticeScopedSession,
    isAnswerlatticeStoreInScope,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import {
    getAnswerlatticeSubscriptionTimestampMillis,
    isAnswerlatticeSubscriptionCurrent,
    projectAnswerlatticeSubscriptionForRead,
} from '@lib/answerlattice/subscriptionReadBoundary';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { FieldValue } from 'firebase-admin/firestore';
import { calculateRemainingCredits, getGracePeriodInfo } from '@util/razorpay';
import type { MinimalStoreDataType } from '@type/platform/store';
import type { FirestoreSubscriptionDoc } from '@type/razorpay';
import { getActivePlanTypeForSubscription, safeSyncStorePlanEntitlementFromSubscription } from './subscriptionEntitlementSync';
import {
    normalizeBillingSubscriptionDocumentId,
    normalizeBillingSubscriptionScopeDocumentId,
} from './subscriptionDocumentIdBoundary';
import { getMenuListSessionProviderScopeKey } from '@lib/multiOutlet/sessionProviderScopeBoundary';
import { getProductSubscriptionBillingScope } from './productSubscriptionScopeBoundary';
import { getFounderSubscriptionMrrPaise } from '@lib/ops/founderRevenueReadModel';
import { isValidBillingPeriodKey } from './billingPeriod';
import { MENULIST_PURCHASED_CREDIT_REACTIVATION_DAYS } from '@data/shared/contentCreditPolicy';
import { resolveSubscriptionUpgradeCreditTransfer } from './subscriptionUpgradeSettlement';
import { validateTransition } from './subscriptionStateMachine';
import { appendBoundedBillingStatusHistory } from './subscriptionStatusHistory';
import {
    normalizeBillingProductId,
    isAnswerlatticeBillingProduct,
    isProductBillingDisabled,
} from './productBillingPlans';

export type ProductBillingScope = {
    productId: ProductId;
    tenantId: number;
    storeId: number;
    userId: string;
    scopedSession: any;
};

export { normalizeAnswerlatticeBillingScopeDocumentId } from '@lib/answerlattice/billingDocumentIdBoundary';
export { getProductSubscriptionBillingScope } from './productSubscriptionScopeBoundary';

export const isProductBillingFirestoreConfigured = (productId: ProductId): boolean => (
    productId === PRODUCT_IDS.ANSWERLATTICE
        ? Boolean(answerlatticeFirestoreAdmin)
        : !isProductBillingDisabled(productId)
);

const isTimestampLike = (value: any) => (
    value
    && typeof value === 'object'
    && typeof value.toDate === 'function'
    && typeof value.seconds === 'number'
);

const getTimestampMillis = (value: unknown): number | null => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (!value || typeof value !== 'object') return null;
    try {
        const toDate = (value as { toDate?: unknown }).toDate;
        if (typeof toDate === 'function') {
            const date = toDate.call(value);
            return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
        }
        const seconds = Number((value as { seconds?: unknown }).seconds);
        return Number.isFinite(seconds) ? seconds * 1000 : null;
    } catch {
        return null;
    }
};

const toNonNegativeSafeInteger = (value: unknown): number => {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) && numericValue >= 0 ? numericValue : 0;
};

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof FieldValue) return value;
    if (isTimestampLike(value)) return admin.firestore.Timestamp.fromDate(value.toDate());
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeForAdminFirestore(nestedValue)]),
        );
    }
    return value;
};

const getDisabledBillingMessage = (productId: ProductId): string => (
    productId === PRODUCT_IDS.MYCODEX
        ? 'MyCodex billing is not configured.'
        : 'CampaignCue billing is not configured.'
);

const getAnswerlatticeBillingEntitlementLogContext = (
    subscription: FirestoreSubscriptionDoc,
    source: string,
) => ({
    ...getBoundedAnswerlatticeStringContext('subscriptionId', subscription.id),
    ...getBoundedAnswerlatticeStringContext('tenantId', subscription.tenantId),
    ...getBoundedAnswerlatticeStringContext('storeId', subscription.storeId),
    ...getBoundedAnswerlatticeStringContext('planId', subscription.planId),
    ...getBoundedAnswerlatticeStringContext('status', subscription.status),
    ...getBoundedAnswerlatticeStringContext('source', source),
});

const assertAnswerlatticeWorkspaceAllowsBillingActivation = async (
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    scope: { tenantId: number; storeId: number },
): Promise<void> => {
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
    const storeSnapshot = await transaction.get(storeRef);
    if (
        !storeSnapshot.exists
        || !isAnswerlatticeStoreInScope(
            storeSnapshot.data(),
            { tenantId: scope.tenantId, storeId: scope.storeId },
            storeSnapshot.id,
        )
        || !isAnswerlatticeWorkspaceBillingActivationAllowed(storeSnapshot.data())
    ) {
        throw new Error('Answerlattice workspace billing activation is not allowed.');
    }
};

export const getBillingFirestoreAdminForProduct = (productId: ProductId): FirebaseFirestore.Firestore => {
    if (productId === PRODUCT_IDS.ANSWERLATTICE) {
        if (!answerlatticeFirestoreAdmin) {
            throw new Error('Answerlattice Firebase is not configured.');
        }
        return answerlatticeFirestoreAdmin;
    }
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    return firestoreAdmin;
};

export const resolveBillingScopeFromSession = (
    session: any,
    rawProductId?: unknown,
): ProductBillingScope | null => {
    const productId = normalizeBillingProductId(rawProductId);
    const userId = session?.user?.id;
    if (!userId) return null;
    if (isProductBillingDisabled(productId)) return null;

    if (productId === PRODUCT_IDS.ANSWERLATTICE) {
        if (!canUseAnswerlatticeManagement(session)) return null;
        const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
        if (!answerlatticeScope) return null;

        return {
            productId,
            tenantId: answerlatticeScope.tenantId,
            storeId: answerlatticeScope.storeId,
            userId,
            scopedSession: getAnswerlatticeScopedSession(session),
        };
    }

    if (!getMenuListSessionProviderScopeKey(session)) return null;
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(session?.user?.tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(session?.user?.storeId);
    if (!tenantScope || !storeScope) return null;

    return {
        productId,
        tenantId: tenantScope.numericId,
        storeId: storeScope.numericId,
        userId,
        scopedSession: session,
    };
};

const productDocPayload = (
    productId: ProductId,
    data: Record<string, any>,
    options: { isNew?: boolean } = {},
) => {
    const now = admin.firestore.Timestamp.now();
    const suppliedProductAliases = [data.pId, data.productId]
        .filter((value) => value !== undefined);
    if (suppliedProductAliases.some((value) => value !== productId)) {
        throw new Error('Subscription product identity is invalid.');
    }
    const hasSuppliedScope = ['tId', 'tenantId', 'sId', 'storeId']
        .some((key) => Object.prototype.hasOwnProperty.call(data, key));
    const scope = hasSuppliedScope || options.isNew
        ? getProductSubscriptionBillingScope(productId, {
            ...data,
            pId: productId,
            productId,
        })
        : null;
    if ((hasSuppliedScope || options.isNew) && !scope) {
        throw new Error('Subscription tenant/store identity is invalid.');
    }
    const userId = data.uId ?? data.userId;
    const {
        pId: _pId,
        productId: _productId,
        sId: _sId,
        storeId: _storeId,
        tId: _tId,
        tenantId: _tenantId,
        ...subscriptionData
    } = data;
    return sanitizeForAdminFirestore({
        ...subscriptionData,
        pId: productId,
        productId,
        ...(scope ? { sId: scope.storeId, storeId: scope.storeId } : {}),
        ...(scope ? { tId: scope.tenantId, tenantId: scope.tenantId } : {}),
        ...(userId !== undefined ? { uId: userId } : {}),
        modifiedOn: now,
        ...(options.isNew && !data.createdOn ? { createdOn: now } : {}),
        ...(options.isNew && !data.createdBy ? { createdBy: data.name || data.email || 'Billing' } : {}),
        ...(options.isNew && !data.modifiedBy ? { modifiedBy: data.name || data.email || 'Billing' } : {}),
    });
};

const normalizeAnswerlatticeSubscription = (
    data: unknown,
    id: string,
    tenantId: number,
    storeId: number,
): FirestoreSubscriptionDoc | null => projectAnswerlatticeSubscriptionForRead(
    data,
    id,
    tenantId,
    storeId,
);

const isAnswerlatticeSubscriptionForScope = (
    subscription: FirestoreSubscriptionDoc,
    tenantId: number,
    storeId: number,
): boolean => isAnswerlatticeSubscriptionInScope(subscription, { tId: tenantId, sId: storeId });

const isCurrentAnswerlatticeSubscription = isAnswerlatticeSubscriptionCurrent;

export const createProductInitialSubscription = async (
    productId: ProductId,
    providerSubscriptionId: string,
    data: Omit<FirestoreSubscriptionDoc, 'id'>,
): Promise<void> => {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        await createMenuListInitialSubscription(providerSubscriptionId, data);
        return;
    }

    const subscriptionId = normalizeAnswerlatticeSubscriptionId(providerSubscriptionId);
    if (!subscriptionId) throw new Error('Invalid Answerlattice subscription id.');

    const db = getBillingFirestoreAdminForProduct(productId);
    const payload = productDocPayload(productId, data, { isNew: true });
    const scope = getProductSubscriptionBillingScope(productId, payload);
    if (!scope) throw new Error('Invalid Answerlattice subscription scope.');
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    await db.runTransaction(async (transaction) => {
        await assertAnswerlatticeWorkspaceAllowsBillingActivation(transaction, db, scope);
        transaction.create(subscriptionRef, payload);
    });
};

export const updateProductSubscription = async (
    productId: ProductId,
    subscriptionId: string,
    data: Partial<FirestoreSubscriptionDoc>,
): Promise<void> => {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        await updateMenuListSubscription(subscriptionId, data);
        return;
    }

    const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscriptionId);
    if (!normalizedSubscriptionId) throw new Error('Invalid Answerlattice subscription id.');

    const db = getBillingFirestoreAdminForProduct(productId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(normalizedSubscriptionId);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists || !getProductSubscriptionBillingScope(productId, snapshot.data())) {
            throw new Error('Subscription does not match the requested product and scope.');
        }
        const scope = getProductSubscriptionBillingScope(productId, snapshot.data());
        const requestedStatus = data.status;
        if (
            scope
            && (
                requestedStatus === 'active'
                || (requestedStatus === undefined && snapshot.data()?.status === 'active')
            )
        ) {
            await assertAnswerlatticeWorkspaceAllowsBillingActivation(transaction, db, scope);
        }
        transaction.set(subscriptionRef, productDocPayload(productId, data), { merge: true });
    });
};

export const getProductSubscriptionById = async (
    productId: ProductId,
    id: string,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (isProductBillingDisabled(productId)) {
        return null;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        return await getMenuListSubscriptionById(id);
    }

    const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(id);
    if (!normalizedSubscriptionId) return null;

    const docSnap = await getBillingFirestoreAdminForProduct(productId)
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(normalizedSubscriptionId)
        .get();

    if (!docSnap.exists) return null;
    const subscription = { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };
    const scope = getProductSubscriptionBillingScope(productId, subscription);
    if (!scope) return null;
    return projectAnswerlatticeSubscriptionForRead(
        docSnap.data(),
        docSnap.id,
        scope.tenantId,
        scope.storeId,
    );
};

const fetchAnswerlatticeSubscriptionRaw = async (
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(tenantId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(storeId);
    if (!tenantScope || !storeScope) return null;

    const db = getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE);
    const collectionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();
    const storeData = storeSnap.exists ? storeSnap.data() || {} : {};
    const storeInScope = storeSnap.exists && isAnswerlatticeStoreInScope(
        storeData,
        { tenantId: tenantScope.numericId, storeId: storeScope.numericId },
        storeSnap.id,
    );
    const subscriptionSummary = storeInScope ? storeData.answerlatticeSubscription : null;
    const rawSummarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || '').trim();
    const summarySubscriptionId = normalizeAnswerlatticeSubscriptionId(rawSummarySubscriptionId);

    if (summarySubscriptionId) {
        const subscriptionSnap = await collectionRef.doc(summarySubscriptionId).get();
        if (subscriptionSnap.exists) {
            const subscriptionData = subscriptionSnap.data() || {};
            if (isAnswerlatticeSubscriptionInScope(subscriptionData, {
                tId: tenantScope.numericId,
                sId: storeScope.numericId,
            })) {
                const subscription = normalizeAnswerlatticeSubscription(subscriptionData, subscriptionSnap.id, tenantScope.numericId, storeScope.numericId);
                if (subscription && isCurrentAnswerlatticeSubscription(subscription)) return subscription;
            }
        }
    }

    const fallbackSnapshot = await collectionRef
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tenantId', '==', tenantScope.numericId)
        .where('storeId', '==', storeScope.numericId)
        .where('tId', '==', tenantScope.numericId)
        .where('sId', '==', storeScope.numericId)
        .limit(10)
        .get();

    return fallbackSnapshot.docs
        .filter((docSnap) => isAnswerlatticeSubscriptionInScope(docSnap.data(), {
            tId: tenantScope.numericId,
            sId: storeScope.numericId,
        }))
        .map((docSnap) => normalizeAnswerlatticeSubscription(docSnap.data(), docSnap.id, tenantScope.numericId, storeScope.numericId))
        .filter((subscription): subscription is FirestoreSubscriptionDoc => Boolean(subscription))
        .filter(isCurrentAnswerlatticeSubscription)
        .sort((a, b) => (
            (getAnswerlatticeSubscriptionTimestampMillis(b.cycleEndDate) || 0)
            - (getAnswerlatticeSubscriptionTimestampMillis(a.cycleEndDate) || 0)
        ))[0] || null;
};

const expireIfGracePeriodEnded = async (
    productId: ProductId,
    sub: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (!sub.pastDueSinceAt) return sub;

    const initialGracePeriod = getGracePeriodInfo(sub.pastDueSinceAt);
    if (!initialGracePeriod.hasKnownGracePeriod || initialGracePeriod.remainingDays > 0) return sub;

    if (!validateTransition(sub.status, 'expired', 'server:grace-period-auto-expire')) {
        return sub;
    }

    const subscriptionId = isAnswerlatticeBillingProduct(productId)
        ? normalizeAnswerlatticeSubscriptionId(sub.id)
        : normalizeBillingSubscriptionDocumentId(sub.id);
    if (!subscriptionId) return sub;
    const db = getBillingFirestoreAdminForProduct(productId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const result = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists) return { expired: false, subscription: null };

        const currentRecord = {
            ...(snapshot.data() as FirestoreSubscriptionDoc),
            id: snapshot.id,
        } as FirestoreSubscriptionDoc;
        const currentScope = getProductSubscriptionBillingScope(productId, currentRecord);
        if (!currentScope) {
            return { expired: false, subscription: null };
        }
        const current = isAnswerlatticeBillingProduct(productId)
            ? projectAnswerlatticeSubscriptionForRead(
                snapshot.data(),
                snapshot.id,
                currentScope.tenantId,
                currentScope.storeId,
            )
            : currentRecord;
        if (!current) return { expired: false, subscription: null };
        if (current.status !== 'past_due') {
            return { expired: false, subscription: current };
        }

        const gracePeriod = getGracePeriodInfo(current.pastDueSinceAt);
        if (!gracePeriod.hasKnownGracePeriod || gracePeriod.remainingDays > 0) {
            return { expired: false, subscription: current };
        }
        if (!validateTransition(current.status, 'expired', 'server:grace-period-auto-expire')) {
            return { expired: false, subscription: current };
        }

        const expiredAt = admin.firestore.Timestamp.now();
        const update: Partial<FirestoreSubscriptionDoc> = {
            status: 'expired',
            cycleEndDate: expiredAt as any,
            subscriptionEndDate: expiredAt as any,
            statuses: appendBoundedBillingStatusHistory(current.statuses, {
                    status: 'expired',
                    timestamp: expiredAt as any,
                    amount: current.amount,
                    currency: current.currency,
                    remark: `Expired after the payment recovery period ended on ${gracePeriod.graceEndsDate?.toLocaleDateString()}`,
            }),
        };
        transaction.set(subscriptionRef, productDocPayload(productId, update), { merge: true });
        return {
            expired: true,
            subscription: { ...current, ...update, id: snapshot.id } as FirestoreSubscriptionDoc,
        };
    });

    if (!result.subscription) return null;
    if (!result.expired) {
        return ['expired', 'completed'].includes(result.subscription.status)
            ? null
            : result.subscription;
    }

    await safeSyncProductSubscriptionEntitlementFromSubscription(
        productId,
        result.subscription,
        'server:grace-period-auto-expire',
    );
    return null;
};

export const getDirectActiveProductSubscriptionForStore = async (
    productId: ProductId,
    tenantId: number,
    storeId: number,
): Promise<FirestoreSubscriptionDoc | null> => {
    if (isProductBillingDisabled(productId)) {
        return null;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        return await getMenuListDirectActiveSubscriptionForStore(tenantId, storeId);
    }

    const raw = await fetchAnswerlatticeSubscriptionRaw(tenantId, storeId);
    if (!raw) return null;
    return await expireIfGracePeriodEnded(productId, raw);
};

export const getActiveProductSubscriptionForStore = async (
    productId: ProductId,
    tenantId: number,
    storeId: number,
    tenantStoresList?: MinimalStoreDataType[],
): Promise<FirestoreSubscriptionDoc | null> => {
    if (isProductBillingDisabled(productId)) {
        return null;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        return await getMenuListActiveSubscriptionForStore(tenantId, storeId, tenantStoresList);
    }

    return await getDirectActiveProductSubscriptionForStore(productId, tenantId, storeId);
};

export const writeProductPaymentTransactionAudit = async (
    productId: ProductId,
    data: Record<string, unknown>,
    auditDocumentId: string,
): Promise<string> => {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }

    const db = getBillingFirestoreAdminForProduct(productId);
    const normalizedAuditDocumentId = String(auditDocumentId || '').trim();
    if (
        normalizedAuditDocumentId !== auditDocumentId
        || normalizedAuditDocumentId.length > 180
        || !isValidFirestoreDocumentId(normalizedAuditDocumentId)
    ) {
        throw new Error('Invalid billing audit document id.');
    }
    if (data.pId !== productId || data.productId !== productId) {
        throw new Error('Billing audit product identity is invalid.');
    }
    const hasScope = [data.tenantId, data.tId, data.storeId, data.sId]
        .some((value) => value != null);
    const scope = hasScope ? getProductSubscriptionBillingScope(productId, data) : null;
    if (hasScope && !scope) throw new Error('Billing audit scope identity is invalid.');
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(normalizedAuditDocumentId);
    const payload = sanitizeForAdminFirestore({
        ...data,
        webhookEventKey: normalizedAuditDocumentId,
        pId: productId,
        productId,
        tenantId: scope?.tenantId ?? null,
        storeId: scope?.storeId ?? null,
        tId: scope?.tenantId ?? null,
        sId: scope?.storeId ?? null,
        modifiedOn: now,
    });
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        const existing = snapshot.data();
        if (snapshot.exists) {
            const existingHasScope = [existing?.tenantId, existing?.tId, existing?.storeId, existing?.sId]
                .some((value) => value != null);
            const existingScope = existingHasScope
                ? getProductSubscriptionBillingScope(productId, existing)
                : null;
            const immutableFields = [
                'webhookEventKey',
                'event',
                'transactionType',
                'paymentId',
                'subscriptionId',
                'orderId',
                'amount',
                'currency',
                'created_at',
            ] as const;
            if (
                existing?.pId !== productId
                || existing?.productId !== productId
                || existingHasScope !== hasScope
                || (hasScope && (
                    existingScope?.tenantId !== scope?.tenantId
                    || existingScope?.storeId !== scope?.storeId
                ))
                || immutableFields.some((field) => (existing?.[field] ?? null) !== (payload[field] ?? null))
            ) {
                throw new Error('Billing audit document identity conflict.');
            }
        }
        const existingCreatedOn = existing?.createdOn;
        transaction.set(docRef, {
            ...payload,
            createdOn: isTimestampLike(existingCreatedOn) ? existingCreatedOn : now,
        }, { merge: true });
    });

    return docRef.id;
};

export type ProductSubscriptionPaymentApplicationResult = {
    applied: boolean;
    duplicate: boolean;
    previousSubscription: FirestoreSubscriptionDoc;
    subscription: FirestoreSubscriptionDoc;
};

export const getMenuListPurchasedCreditRecoveryId = (tenantId: number, storeId: number): string => (
    `${tenantId}_${storeId}`
);

export async function freezeMenuListPurchasedCreditsForCancellation(params: {
    storeId: number;
    subscriptionId: string;
    tenantId: number;
}): Promise<number> {
    const subscriptionId = normalizeBillingSubscriptionDocumentId(params.subscriptionId);
    const tenantScope = normalizeBillingSubscriptionScopeDocumentId(params.tenantId);
    const storeScope = normalizeBillingSubscriptionScopeDocumentId(params.storeId);
    if (!subscriptionId || !tenantScope || !storeScope) {
        throw new Error('Invalid purchased credit recovery scope.');
    }
    const db = getBillingFirestoreAdminForProduct(PRODUCT_IDS.MENULIST);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const recoveryId = getMenuListPurchasedCreditRecoveryId(tenantScope.numericId, storeScope.numericId);
    const recoveryRef = db.collection(DB_COLLECTIONS.MENULIST_PURCHASED_CREDIT_RECOVERIES).doc(recoveryId);

    return db.runTransaction(async (transaction) => {
        const [subscriptionSnapshot, recoverySnapshot] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(recoveryRef),
        ]);
        if (!subscriptionSnapshot.exists) throw new Error('Subscription not found for purchased credit recovery.');
        const subscription = subscriptionSnapshot.data() as FirestoreSubscriptionDoc;
        const scope = getProductSubscriptionBillingScope(PRODUCT_IDS.MENULIST, subscription);
        if (
            !scope
            || scope.tenantId !== tenantScope.numericId
            || scope.storeId !== storeScope.numericId
        ) {
            throw new Error('Purchased credit recovery scope mismatch.');
        }

        const purchasedCredits = toNonNegativeSafeInteger(subscription.topUpCredits);
        const existingRecovery = recoverySnapshot.data() || {};
        const existingRestoreUntilMillis = getTimestampMillis(existingRecovery.restoreUntil);
        const existingCredits = existingRecovery.status === 'frozen'
            && existingRestoreUntilMillis !== null
            && existingRestoreUntilMillis > Date.now()
            ? toNonNegativeSafeInteger(existingRecovery.purchasedCredits)
            : 0;
        if (purchasedCredits === 0) {
            return existingCredits;
        }
        const frozenCredits = existingCredits + purchasedCredits;
        if (!Number.isSafeInteger(frozenCredits)) {
            throw new Error('Purchased credit recovery balance is invalid.');
        }

        const frozenAt = admin.firestore.Timestamp.now();
        const restoreUntil = admin.firestore.Timestamp.fromMillis(
            frozenAt.toMillis()
            + MENULIST_PURCHASED_CREDIT_REACTIVATION_DAYS * 24 * 60 * 60 * 1000,
        );
        transaction.set(recoveryRef, {
            pId: PRODUCT_IDS.MENULIST,
            productId: PRODUCT_IDS.MENULIST,
            tenantId: tenantScope.numericId,
            storeId: storeScope.numericId,
            sourceSubscriptionId: subscriptionId,
            purchasedCredits: frozenCredits,
            frozenAt,
            restoreUntil,
            status: 'frozen',
            updatedAt: frozenAt,
        }, { merge: true });
        transaction.set(subscriptionRef, {
            topUpCredits: 0,
            purchasedCreditsFrozenAt: frozenAt,
            purchasedCreditsRestoreUntil: restoreUntil,
            purchasedCreditsRecoveryId: recoveryId,
        }, { merge: true });
        return frozenCredits;
    });
}

/**
 * Apply one captured subscription payment exactly once. The provider payment ID
 * is both billing-history evidence and the transaction idempotency key. The
 * transaction serializes the cycle reset against concurrent AI consumption, so
 * replay cannot replenish credits that were consumed after the first apply.
 */
export async function applyProductSubscriptionPayment(
    productId: ProductId,
    params: {
        billingPeriod: number;
        paymentHistoryId: string;
        statusEntry: FirestoreSubscriptionDoc['statuses'][number];
        subscriptionId: string;
        terminalSettlementPaymentId?: string;
        update: Partial<FirestoreSubscriptionDoc>;
    },
): Promise<ProductSubscriptionPaymentApplicationResult | null> {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }
    const subscriptionId = isAnswerlatticeBillingProduct(productId)
        ? normalizeAnswerlatticeSubscriptionId(params.subscriptionId)
        : normalizeBillingSubscriptionDocumentId(params.subscriptionId);
    const paymentHistoryId = String(params.paymentHistoryId || '').trim();
    if (
        !subscriptionId
        || paymentHistoryId !== params.paymentHistoryId
        || paymentHistoryId.length > 180
        || !/^pay_[A-Za-z0-9]+$/.test(paymentHistoryId)
        || !isValidFirestoreDocumentId(paymentHistoryId)
        || !isValidBillingPeriodKey(params.billingPeriod)
    ) {
        throw new Error('Invalid subscription payment application.');
    }

    const db = getBillingFirestoreAdminForProduct(productId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists) return null;

        const current = {
            ...(snapshot.data() as FirestoreSubscriptionDoc),
            id: snapshot.id,
        } as FirestoreSubscriptionDoc;
        if (!getProductSubscriptionBillingScope(productId, current)) return null;
        const currentScope = getProductSubscriptionBillingScope(productId, current);
        const billingHistory = Array.isArray(current.billingHistory)
            ? current.billingHistory.filter((entry): entry is string => typeof entry === 'string')
            : [];
        if (billingHistory.includes(paymentHistoryId)) {
            return {
                applied: false,
                duplicate: true,
                previousSubscription: current,
                subscription: current,
            };
        }
        const isTerminalSettlementRecovery = params.terminalSettlementPaymentId === paymentHistoryId
            && paymentHistoryId.startsWith('pay_')
            && (current.status === 'cancelled' || current.status === 'completed');
        if (
            !isTerminalSettlementRecovery
            && !validateTransition(current.status, 'active', 'payment:captured')
        ) {
            return {
                applied: false,
                duplicate: false,
                previousSubscription: current,
                subscription: current,
            };
        }
        if (isAnswerlatticeBillingProduct(productId) && currentScope && !isTerminalSettlementRecovery) {
            await assertAnswerlatticeWorkspaceAllowsBillingActivation(transaction, db, currentScope);
        }

        const safeUpdate = isTerminalSettlementRecovery
            ? (params.update.paymentMethod ? { paymentMethod: params.update.paymentMethod } : {})
            : params.update;
        let restoredPurchasedCredits = 0;
        let recoveryRef: FirebaseFirestore.DocumentReference | null = null;
        let recoveryData: FirebaseFirestore.DocumentData | null = null;
        if (productId === PRODUCT_IDS.MENULIST && currentScope && !isTerminalSettlementRecovery) {
            recoveryRef = db.collection(DB_COLLECTIONS.MENULIST_PURCHASED_CREDIT_RECOVERIES).doc(
                getMenuListPurchasedCreditRecoveryId(currentScope.tenantId, currentScope.storeId),
            );
            const recoverySnapshot = await transaction.get(recoveryRef);
            recoveryData = recoverySnapshot.exists ? recoverySnapshot.data() || null : null;
            const restoreUntilMillis = getTimestampMillis(recoveryData?.restoreUntil);
            if (
                recoveryData?.status === 'frozen'
                && recoveryData?.sourceSubscriptionId !== subscriptionId
                && Number(recoveryData?.tenantId) === currentScope.tenantId
                && Number(recoveryData?.storeId) === currentScope.storeId
                && restoreUntilMillis !== null
                && restoreUntilMillis > Date.now()
            ) {
                restoredPurchasedCredits = toNonNegativeSafeInteger(recoveryData.purchasedCredits);
            }
        }
        const shouldResetCredits = !isTerminalSettlementRecovery && (
            billingHistory.length === 0
            || current.creditsLastResetMonth !== params.billingPeriod
        );
        const nextAllowance = safeUpdate.monthlyCreditsAllowance ?? current.monthlyCreditsAllowance ?? 0;
        if (!Number.isSafeInteger(nextAllowance) || nextAllowance < 0) {
            throw new Error('Subscription monthly credit allowance is invalid.');
        }
        const update: Partial<FirestoreSubscriptionDoc> = {
            ...safeUpdate,
            status: isTerminalSettlementRecovery ? current.status : 'active' as const,
            ...(isTerminalSettlementRecovery ? {} : { pastDueSinceAt: null }),
            capturedPaymentSyncPending: false,
            billingHistory: [...billingHistory, paymentHistoryId],
            statuses: appendBoundedBillingStatusHistory(current.statuses, params.statusEntry),
            ...(shouldResetCredits ? {
                monthlyCredits: nextAllowance,
                creditsLastResetMonth: params.billingPeriod,
            } : {}),
            ...(restoredPurchasedCredits > 0 ? {
                topUpCredits: toNonNegativeSafeInteger(current.topUpCredits) + restoredPurchasedCredits,
            } : {}),
        };
        if (!Number.isSafeInteger(update.topUpCredits ?? 0)) {
            throw new Error('Restored purchased credit balance is invalid.');
        }
        transaction.set(subscriptionRef, productDocPayload(productId, update), { merge: true });
        if (recoveryRef && recoveryData && restoredPurchasedCredits > 0) {
            transaction.set(recoveryRef, {
                purchasedCredits: 0,
                restoredCredits: restoredPurchasedCredits,
                restoredAt: admin.firestore.Timestamp.now(),
                restoredToSubscriptionId: subscriptionId,
                status: 'restored',
                updatedAt: admin.firestore.Timestamp.now(),
            }, { merge: true });
        }

        return {
            applied: true,
            duplicate: false,
            previousSubscription: current,
            subscription: {
                ...current,
                ...update,
                id: snapshot.id,
            } as FirestoreSubscriptionDoc,
        };
    });
}

export type ProductSubscriptionWebhookApplicationResult = {
    applied: boolean;
    duplicate: boolean;
    previousSubscription: FirestoreSubscriptionDoc;
    subscription: FirestoreSubscriptionDoc;
};

export type ProductSubscriptionStatusTransitionResult = {
    applied: boolean;
    duplicate: boolean;
    previousSubscription: FirestoreSubscriptionDoc;
    subscription: FirestoreSubscriptionDoc;
};

/**
 * Apply an owner/provider-confirmed lifecycle transition against the current
 * subscription snapshot. Re-reading in the transaction prevents a route that
 * started from stale state from overwriting a concurrent payment or webhook.
 */
export async function applyProductSubscriptionStatusTransition(
    productId: ProductId,
    params: {
        expectedStatuses?: FirestoreSubscriptionDoc['status'][];
        nextStatus: FirestoreSubscriptionDoc['status'];
        statusEntry: FirestoreSubscriptionDoc['statuses'][number];
        subscriptionId: string;
        update?: Partial<FirestoreSubscriptionDoc>;
    },
): Promise<ProductSubscriptionStatusTransitionResult | null> {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }
    const subscriptionId = isAnswerlatticeBillingProduct(productId)
        ? normalizeAnswerlatticeSubscriptionId(params.subscriptionId)
        : normalizeBillingSubscriptionDocumentId(params.subscriptionId);
    if (!subscriptionId) throw new Error('Invalid subscription status transition.');

    const db = getBillingFirestoreAdminForProduct(productId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists) return null;

        const current = {
            ...(snapshot.data() as FirestoreSubscriptionDoc),
            id: snapshot.id,
        } as FirestoreSubscriptionDoc;
        if (!getProductSubscriptionBillingScope(productId, current)) return null;
        if (current.status === params.nextStatus) {
            return {
                applied: false,
                duplicate: true,
                previousSubscription: current,
                subscription: current,
            };
        }
        if (
            params.expectedStatuses?.length
            && !params.expectedStatuses.includes(current.status)
        ) {
            return {
                applied: false,
                duplicate: false,
                previousSubscription: current,
                subscription: current,
            };
        }
        if (!validateTransition(current.status, params.nextStatus, 'api:lifecycle-status-transaction')) {
            return {
                applied: false,
                duplicate: false,
                previousSubscription: current,
                subscription: current,
            };
        }
        const currentScope = getProductSubscriptionBillingScope(productId, current);
        if (
            isAnswerlatticeBillingProduct(productId)
            && params.nextStatus === 'active'
            && currentScope
        ) {
            await assertAnswerlatticeWorkspaceAllowsBillingActivation(transaction, db, currentScope);
        }

        const {
            billingHistory: _ignoredBillingHistory,
            creditsLastResetMonth: _ignoredResetPeriod,
            id: _ignoredId,
            monthlyCredits: _ignoredMonthlyCredits,
            monthlyCreditsAllowance: _ignoredMonthlyCreditsAllowance,
            pId: _ignoredProductCode,
            planId: _ignoredPlanId,
            productId: _ignoredProductId,
            providerSubscriptionId: _ignoredProviderSubscriptionId,
            sId: _ignoredStoreCode,
            status: _ignoredStatus,
            statuses: _ignoredStatuses,
            storeId: _ignoredStoreId,
            tId: _ignoredTenantCode,
            tenantId: _ignoredTenantId,
            topUpCredits: _ignoredTopUpCredits,
            webhookEventHistory: _ignoredWebhookEventHistory,
            ...safeUpdate
        } = params.update || {};
        const update = {
            ...safeUpdate,
            status: params.nextStatus,
            statuses: appendBoundedBillingStatusHistory(current.statuses, params.statusEntry),
        };
        transaction.set(subscriptionRef, productDocPayload(productId, update), { merge: true });

        return {
            applied: true,
            duplicate: false,
            previousSubscription: current,
            subscription: {
                ...current,
                ...update,
                id: snapshot.id,
            } as FirestoreSubscriptionDoc,
        };
    });
}

export type ProductSubscriptionUpgradeApplicationResult = {
    applied: boolean;
    duplicate: boolean;
    newSubscription: FirestoreSubscriptionDoc;
    oldSubscription: FirestoreSubscriptionDoc;
    remainingCredits: number;
};

const normalizeProductBillingScopeDocumentId = (productId: ProductId, value: unknown) => (
    isAnswerlatticeBillingProduct(productId)
        ? normalizeAnswerlatticeBillingScopeDocumentId(value)
        : normalizeBillingSubscriptionScopeDocumentId(value)
);

/**
 * Expire the old subscription and add its remaining credits to the verified
 * replacement as one transaction. This prevents partial carry-forward and
 * prevents retries or concurrent top-ups from overwriting the new balance.
 */
export async function applyProductSubscriptionUpgradeCarryForward(
    productId: ProductId,
    params: {
        newSubscriptionId: string;
        oldSubscriptionId: string;
        storeId: number;
        terminalCapturedPaymentId?: string;
        tenantId: number;
    },
): Promise<ProductSubscriptionUpgradeApplicationResult | null> {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }
    const normalizeSubscriptionId = isAnswerlatticeBillingProduct(productId)
        ? normalizeAnswerlatticeSubscriptionId
        : normalizeBillingSubscriptionDocumentId;
    const oldSubscriptionId = normalizeSubscriptionId(params.oldSubscriptionId);
    const newSubscriptionId = normalizeSubscriptionId(params.newSubscriptionId);
    const tenantScope = normalizeProductBillingScopeDocumentId(productId, params.tenantId);
    const storeScope = normalizeProductBillingScopeDocumentId(productId, params.storeId);
    if (
        !oldSubscriptionId
        || !newSubscriptionId
        || oldSubscriptionId === newSubscriptionId
        || !tenantScope
        || !storeScope
    ) {
        throw new Error('Invalid subscription upgrade application.');
    }

    const db = getBillingFirestoreAdminForProduct(productId);
    const subscriptionCollection = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const oldSubscriptionRef = subscriptionCollection.doc(oldSubscriptionId);
    const newSubscriptionRef = subscriptionCollection.doc(newSubscriptionId);
    return db.runTransaction(async (transaction) => {
        const [oldSnapshot, newSnapshot] = await Promise.all([
            transaction.get(oldSubscriptionRef),
            transaction.get(newSubscriptionRef),
        ]);
        if (!oldSnapshot.exists || !newSnapshot.exists) return null;

        const oldSubscription = {
            ...(oldSnapshot.data() as FirestoreSubscriptionDoc),
            id: oldSnapshot.id,
        } as FirestoreSubscriptionDoc;
        const newSubscription = {
            ...(newSnapshot.data() as FirestoreSubscriptionDoc),
            id: newSnapshot.id,
        } as FirestoreSubscriptionDoc;
        const oldScope = getProductSubscriptionBillingScope(productId, oldSubscription);
        const newScope = getProductSubscriptionBillingScope(productId, newSubscription);
        const scopeMatches = Boolean(
            oldScope
            && newScope
            && oldScope.tenantId === tenantScope.numericId
            && newScope.tenantId === tenantScope.numericId
            && oldScope.storeId === storeScope.numericId
            && newScope.storeId === storeScope.numericId
        );
        const carriedFromId = normalizeSubscriptionId(newSubscription.carryForwardFromSubscriptionId);
        const storedCarryForwardCredits = Number(newSubscription.carryForwardCredits);
        const terminalCapturedPaymentId = typeof params.terminalCapturedPaymentId === 'string'
            && params.terminalCapturedPaymentId.startsWith('pay_')
            ? params.terminalCapturedPaymentId
            : null;
        const terminalReplacementAllowed = terminalCapturedPaymentId !== null
            && Array.isArray(newSubscription.billingHistory)
            && newSubscription.billingHistory.includes(terminalCapturedPaymentId)
            && (newSubscription.status === 'cancelled' || newSubscription.status === 'completed');
        const duplicate = (
            scopeMatches
            && oldSubscription.status === 'expired'
            && carriedFromId === oldSubscriptionId
            && Number.isSafeInteger(storedCarryForwardCredits)
            && storedCarryForwardCredits >= 0
        );
        if (duplicate) {
            return {
                applied: false,
                duplicate: true,
                newSubscription,
                oldSubscription,
                remainingCredits: storedCarryForwardCredits,
            };
        }
        if (
            !scopeMatches
            || oldSubscription.status === 'expired'
            || (newSubscription.status !== 'active' && !terminalReplacementAllowed)
            || (carriedFromId && carriedFromId !== oldSubscriptionId)
            || !validateTransition(oldSubscription.status, 'expired', 'api:upgrade-subscription-transaction')
        ) {
            return {
                applied: false,
                duplicate: false,
                newSubscription,
                oldSubscription,
                remainingCredits: 0,
            };
        }
        if (isAnswerlatticeBillingProduct(productId)) {
            await assertAnswerlatticeWorkspaceAllowsBillingActivation(transaction, db, {
                tenantId: tenantScope.numericId,
                storeId: storeScope.numericId,
            });
        }

        const isMenuListCreditPolicy = productId === PRODUCT_IDS.MENULIST;
        const calculatedCredits = calculateRemainingCredits(
            oldSubscription,
            new Date(),
            isMenuListCreditPolicy
                ? {
                    includeCurrentMonthlyCredits: false,
                    includeFutureYearlyCredits: false,
                }
                : {},
        );
        const creditTransfer = resolveSubscriptionUpgradeCreditTransfer({
            calculatedRemainingCredits: calculatedCredits.totalRemainingCredits,
            currentNewTopUpCredits: newSubscription.topUpCredits,
            oldSubscriptionId,
            replacementCarryForwardCredits: storedCarryForwardCredits,
            replacementCarryForwardFromSubscriptionId: carriedFromId,
        });
        if (!creditTransfer) {
            throw new Error('Subscription upgrade credit balance is invalid.');
        }
        const {
            carryAlreadyApplied,
            carryForwardCredits,
            nextTopUpCredits,
            remainingCredits,
        } = creditTransfer;

        const appliedAt = admin.firestore.Timestamp.now();
        const nowMillis = appliedAt.toMillis();
        const oldPromotionalExpiryMillis = getTimestampMillis(oldSubscription.promotionalCreditsExpireAt);
        const transferablePromotionalCredits = isMenuListCreditPolicy
            && oldPromotionalExpiryMillis !== null
            && oldPromotionalExpiryMillis > nowMillis
            ? toNonNegativeSafeInteger(oldSubscription.promotionalCredits)
            : 0;
        const newPromotionalExpiryMillis = getTimestampMillis(newSubscription.promotionalCreditsExpireAt);
        const currentNewPromotionalCredits = newPromotionalExpiryMillis !== null
            && newPromotionalExpiryMillis > nowMillis
            ? toNonNegativeSafeInteger(newSubscription.promotionalCredits)
            : 0;
        const nextPromotionalCredits = currentNewPromotionalCredits + transferablePromotionalCredits;
        if (!Number.isSafeInteger(nextPromotionalCredits)) {
            throw new Error('Subscription upgrade promotional credit balance is invalid.');
        }
        const nextPromotionalExpiryAt = nextPromotionalCredits > 0
            ? (
                oldPromotionalExpiryMillis !== null
                && oldPromotionalExpiryMillis >= (newPromotionalExpiryMillis || 0)
                    ? oldSubscription.promotionalCreditsExpireAt
                    : newSubscription.promotionalCreditsExpireAt
            )
            : null;
        const oldUpdate: Partial<FirestoreSubscriptionDoc> & Record<string, unknown> = {
            status: 'expired',
            cycleEndDate: appliedAt as any,
            subscriptionEndDate: appliedAt as any,
            upgradeReplacementSubscriptionId: newSubscriptionId,
            ...(isMenuListCreditPolicy ? {
                topUpCredits: 0,
                promotionalCredits: 0,
                promotionalCreditsExpireAt: null,
            } : {}),
            statuses: appendBoundedBillingStatusHistory(oldSubscription.statuses, {
                    status: 'expired',
                    timestamp: appliedAt as any,
                    amount: oldSubscription.amount,
                    currency: oldSubscription.currency,
                    remark: `Upgraded with ${remainingCredits} credits transferred to ${newSubscriptionId}`,
            }),
        };
        const newUpdate: Partial<FirestoreSubscriptionDoc> & Record<string, unknown> = {
            topUpCredits: nextTopUpCredits,
            ...(isMenuListCreditPolicy ? {
                promotionalCredits: nextPromotionalCredits,
                promotionalCreditsExpireAt: nextPromotionalExpiryAt,
            } : {}),
            carryForwardCredits,
            carryForwardFromSubscriptionId: oldSubscriptionId,
            carryForwardAppliedAt: appliedAt as any,
            founderMonitorReplacementForSubscriptionId: oldSubscriptionId,
            founderMonitorReplacementMrrPaise: getFounderSubscriptionMrrPaise(oldSubscription),
            founderMonitorReplacementPlanId: oldSubscription.planId || null,
            founderMonitorReplacementPlanName: oldSubscription.planName || null,
            statuses: appendBoundedBillingStatusHistory(newSubscription.statuses, carryAlreadyApplied ? [] : [{
                    status: 'carry_forward_applied',
                    timestamp: appliedAt as any,
                    amount: newSubscription.amount,
                    currency: newSubscription.currency,
                    remark: `Credits transferred from upgraded subscription: ${remainingCredits}`,
            }]),
        };
        transaction.set(oldSubscriptionRef, productDocPayload(productId, oldUpdate), { merge: true });
        transaction.set(newSubscriptionRef, productDocPayload(productId, newUpdate), { merge: true });

        return {
            applied: true,
            duplicate: false,
            newSubscription: {
                ...newSubscription,
                ...newUpdate,
                id: newSnapshot.id,
            } as FirestoreSubscriptionDoc,
            oldSubscription: {
                ...oldSubscription,
                ...oldUpdate,
                id: oldSnapshot.id,
            } as FirestoreSubscriptionDoc,
            remainingCredits,
        };
    });
}

/**
 * Serialize one non-payment provider event against the subscription document.
 * This prevents two different webhook deliveries from overwriting each other's
 * status history and prevents a partial-failure retry from appending twice.
 */
export async function applyProductSubscriptionWebhookEvent(
    productId: ProductId,
    params: {
        eventKey: string;
        expectedStatuses?: FirestoreSubscriptionDoc['status'][];
        nextStatus?: FirestoreSubscriptionDoc['status'];
        statusEntry?: FirestoreSubscriptionDoc['statuses'][number];
        subscriptionId: string;
        update?: Partial<FirestoreSubscriptionDoc>;
    },
): Promise<ProductSubscriptionWebhookApplicationResult | null> {
    if (isProductBillingDisabled(productId)) {
        throw new Error(getDisabledBillingMessage(productId));
    }
    const subscriptionId = isAnswerlatticeBillingProduct(productId)
        ? normalizeAnswerlatticeSubscriptionId(params.subscriptionId)
        : normalizeBillingSubscriptionDocumentId(params.subscriptionId);
    const eventKey = String(params.eventKey || '').trim();
    if (
        !subscriptionId
        || eventKey !== params.eventKey
        || eventKey.length > 180
        || !isValidFirestoreDocumentId(eventKey)
    ) {
        throw new Error('Invalid subscription webhook application.');
    }

    const db = getBillingFirestoreAdminForProduct(productId);
    const subscriptionRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(subscriptionRef);
        if (!snapshot.exists) return null;

        const current = {
            ...(snapshot.data() as FirestoreSubscriptionDoc),
            id: snapshot.id,
        } as FirestoreSubscriptionDoc;
        if (!getProductSubscriptionBillingScope(productId, current)) return null;
        const eventHistory = Array.isArray(current.webhookEventHistory)
            ? current.webhookEventHistory.filter((entry): entry is string => typeof entry === 'string')
            : [];
        if (eventHistory.includes(eventKey)) {
            return {
                applied: false,
                duplicate: true,
                previousSubscription: current,
                subscription: current,
            };
        }
        if (
            params.expectedStatuses?.length
            && !params.expectedStatuses.includes(current.status)
        ) {
            return {
                applied: false,
                duplicate: false,
                previousSubscription: current,
                subscription: current,
            };
        }
        if (
            params.nextStatus
            && !validateTransition(current.status, params.nextStatus, 'webhook:event-transaction')
        ) {
            return {
                applied: false,
                duplicate: false,
                previousSubscription: current,
                subscription: current,
            };
        }
        const currentScope = getProductSubscriptionBillingScope(productId, current);
        if (
            isAnswerlatticeBillingProduct(productId)
            && currentScope
            && (
                params.nextStatus === 'active'
                || (!params.nextStatus && current.status === 'active')
            )
        ) {
            await assertAnswerlatticeWorkspaceAllowsBillingActivation(transaction, db, currentScope);
        }

        const {
            billingHistory: _ignoredBillingHistory,
            creditsLastResetMonth: _ignoredResetPeriod,
            monthlyCredits: _ignoredMonthlyCredits,
            monthlyCreditsAllowance: _ignoredMonthlyCreditsAllowance,
            status: _ignoredStatus,
            statuses: _ignoredStatuses,
            topUpCredits: _ignoredTopUpCredits,
            webhookEventHistory: _ignoredWebhookEventHistory,
            ...safeUpdate
        } = params.update || {};
        const update = {
            ...safeUpdate,
            ...(params.nextStatus ? { status: params.nextStatus } : {}),
            ...(params.nextStatus === 'past_due' && safeUpdate.pastDueSinceAt ? {
                pastDueSinceAt: current.pastDueSinceAt || safeUpdate.pastDueSinceAt,
            } : {}),
            webhookEventHistory: [...eventHistory.slice(-99), eventKey],
            ...(params.statusEntry ? {
                statuses: appendBoundedBillingStatusHistory(current.statuses, params.statusEntry),
            } : {}),
        };
        transaction.set(subscriptionRef, productDocPayload(productId, update), { merge: true });

        return {
            applied: true,
            duplicate: false,
            previousSubscription: current,
            subscription: {
                ...current,
                ...update,
                id: snapshot.id,
            } as FirestoreSubscriptionDoc,
        };
    });
}

export const syncAnswerlatticeSubscriptionEntitlementFromSubscription = async (
    subscription: FirestoreSubscriptionDoc,
    source: string,
): Promise<void> => {
    const subscriptionScope = getProductSubscriptionBillingScope(
        PRODUCT_IDS.ANSWERLATTICE,
        subscription,
    );
    const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(subscriptionScope?.tenantId);
    const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(subscriptionScope?.storeId);
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(subscription.id || subscription.providerSubscriptionId);
    if (!tenantScope || !storeScope || !subscriptionId) return;

    const db = getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE);
    const subscriptionsRef = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
    const subscriptionRef = subscriptionsRef.doc(subscriptionId);
    const activeSubscriptionsQuery = subscriptionsRef
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('status', '==', 'active')
        .where('storeId', '==', storeScope.numericId)
        .where('tenantId', '==', tenantScope.numericId)
        .where('tId', '==', tenantScope.numericId)
        .where('sId', '==', storeScope.numericId)
        .where('cycleEndDate', '>=', admin.firestore.Timestamp.now())
        .orderBy('cycleEndDate', 'desc')
        .limit(10);
    await db.runTransaction(async (transaction) => {
        const [snapshot, activeSubscriptionsSnapshot] = await Promise.all([
            transaction.get(subscriptionRef),
            transaction.get(activeSubscriptionsQuery),
        ]);
        if (!snapshot.exists) return;

        const currentData = snapshot.data() || {};
        const currentScope = getProductSubscriptionBillingScope(
            PRODUCT_IDS.ANSWERLATTICE,
            currentData,
        );
        const currentTenantScope = normalizeAnswerlatticeBillingScopeDocumentId(currentScope?.tenantId);
        const currentStoreScope = normalizeAnswerlatticeBillingScopeDocumentId(currentScope?.storeId);
        if (
            !currentTenantScope
            || !currentStoreScope
            || currentTenantScope.numericId !== tenantScope.numericId
            || currentStoreScope.numericId !== storeScope.numericId
            || !isAnswerlatticeSubscriptionInScope(currentData, {
                tId: tenantScope.numericId,
                sId: storeScope.numericId,
            })
        ) return;

        const current = normalizeAnswerlatticeSubscription(
            currentData,
            snapshot.id,
            currentTenantScope.numericId,
            currentStoreScope.numericId,
        );
        if (!current) return;
        const syncedAt = admin.firestore.FieldValue.serverTimestamp();
        const activeSubscription = activeSubscriptionsSnapshot.docs
            .filter((activeSnapshot) => isAnswerlatticeSubscriptionInScope(activeSnapshot.data(), {
                tId: currentTenantScope.numericId,
                sId: currentStoreScope.numericId,
            }))
            .map((activeSnapshot) => normalizeAnswerlatticeSubscription(
                activeSnapshot.data(),
                activeSnapshot.id,
                currentTenantScope.numericId,
                currentStoreScope.numericId,
            ))
            .filter((candidate): candidate is FirestoreSubscriptionDoc => Boolean(candidate))
            .filter((candidate) => isAnswerlatticeSubscriptionForScope(
                candidate,
                currentTenantScope.numericId,
                currentStoreScope.numericId,
            ))
            .sort((left, right) => (
                (getAnswerlatticeSubscriptionTimestampMillis(right.cycleEndDate) || 0)
                - (getAnswerlatticeSubscriptionTimestampMillis(left.cycleEndDate) || 0)
            ))[0]
            || null;
        const summarySubscription = activeSubscription || current;
        const activePlanType = activeSubscription
            ? getActivePlanTypeForSubscription(activeSubscription)
            : null;
        const providerSubscriptionId = normalizeAnswerlatticeSubscriptionId(
            summarySubscription.providerSubscriptionId || summarySubscription.id,
        );
        const subscriptionSummary = {
            id: summarySubscription.id,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: currentTenantScope.numericId,
            sId: currentStoreScope.numericId,
            tenantId: currentTenantScope.numericId,
            storeId: currentStoreScope.numericId,
            providerSubscriptionId: providerSubscriptionId || summarySubscription.id,
            planId: summarySubscription.planId || null,
            planName: summarySubscription.planName || null,
            status: summarySubscription.status || null,
            currency: summarySubscription.currency || null,
            amount: summarySubscription.amount ?? null,
            isBeta: false,
            subscriptionEndDate: summarySubscription.subscriptionEndDate || null,
            monthlyCreditsAllowance: summarySubscription.monthlyCreditsAllowance ?? 0,
            monthlyCredits: summarySubscription.monthlyCredits ?? 0,
            topUpCredits: summarySubscription.topUpCredits ?? 0,
            creditsLastResetMonth: summarySubscription.creditsLastResetMonth ?? null,
            updatedAt: syncedAt,
        };

        transaction.set(db.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId), {
            activePlanType,
            answerlatticeSubscription: subscriptionSummary,
            answerlatticeBillingUpdatedAt: syncedAt,
        }, { merge: true });
        transaction.set(subscriptionRef, {
            analyticsEntitlement: {
                activePlanType,
                status: current.status || null,
                syncedAt,
                source,
            },
        }, { merge: true });
    });
};

export async function safeSyncProductSubscriptionEntitlementFromSubscription(
    productId: ProductId,
    subscription: FirestoreSubscriptionDoc,
    source: string,
): Promise<void> {
    if (isProductBillingDisabled(productId)) {
        return;
    }

    if (!isAnswerlatticeBillingProduct(productId)) {
        await safeSyncStorePlanEntitlementFromSubscription(subscription, source);
        return;
    }

    try {
        await syncAnswerlatticeSubscriptionEntitlementFromSubscription(subscription, source);
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_subscription_entitlement_sync_failed',
            error,
            getAnswerlatticeBillingEntitlementLogContext(subscription, source),
        );
    }
}
