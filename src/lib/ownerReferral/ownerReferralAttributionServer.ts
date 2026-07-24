import { DB_COLLECTIONS } from '@constant/database';
import { DEFAULT_PRODUCT_ID } from '@constant/product';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { normalizeBillingSubscriptionScopeDocumentId } from '@database/subscriptions/server';
import {
    OWNER_REFERRAL_BUSINESS_NAME_MAX_LENGTH,
    OWNER_REFERRAL_COOKIE_NAME,
    OWNER_REFERRAL_ONBOARDING_SOURCE_MAX_LENGTH,
    OWNER_REFERRAL_PROGRAM_VERSION,
    OWNER_REFERRAL_STATUS,
    OWNER_REFERRAL_SUBSCRIPTION_HISTORY_LIMIT,
    OWNER_REFERRAL_TOKEN_TTL_DAYS,
} from '@data/shared/ownerReferralPolicy';
import type { NextRequest, NextResponse } from 'next/server';
import {
    getOwnerReferralDocumentId,
    hashOwnerReferralEvidence,
    validateOwnerReferralToken,
} from './ownerReferralTokenServer';
import { isOwnerReferralPilotStoreAllowed } from './ownerReferralFeature';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { getMenuListSubscriptionEntitlementScope } from '@lib/billing/menuListSubscriptionEntitlementBoundary';
import type {
    OwnerReferralDocument,
    OwnerReferralResolvedToken,
    OwnerReferralScope,
} from './ownerReferralTypes';

export type OwnerReferralAttributionResult =
    | { status: 'bound'; referralId: string }
    | { status: 'existing'; referralId: string }
    | { status: 'invalid' | 'prior_paid' | 'same_scope' };

const normalizeOwnerReferralText = (value: unknown, fallback: string, maxLength: number): string => {
    const normalized = typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
        : '';
    return (normalized || fallback).slice(0, maxLength);
};

const normalizeOwnerReferralScope = (scope: OwnerReferralScope): OwnerReferralScope | null => {
    const tenant = normalizeBillingSubscriptionScopeDocumentId(scope.tenantId);
    const store = normalizeBillingSubscriptionScopeDocumentId(scope.storeId);
    return tenant && store ? { tenantId: tenant.numericId, storeId: store.numericId } : null;
};

export const getOwnerReferralCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: OWNER_REFERRAL_TOKEN_TTL_DAYS * 24 * 60 * 60,
});

export const getExpiredOwnerReferralCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
});

export const setOwnerReferralCookie = (response: NextResponse, token: string): void => {
    response.cookies.set(OWNER_REFERRAL_COOKIE_NAME, token, getOwnerReferralCookieOptions());
};

export const clearOwnerReferralCookie = (response: NextResponse): void => {
    response.cookies.set(OWNER_REFERRAL_COOKIE_NAME, '', getExpiredOwnerReferralCookieOptions());
};

export const readOwnerReferralCookie = (request: NextRequest): string | null => (
    request.cookies.get(OWNER_REFERRAL_COOKIE_NAME)?.value || null
);

export const resolveOwnerReferralTokenForAttribution = async (
    token: string | null | undefined,
): Promise<OwnerReferralResolvedToken | null> => {
    const payload = validateOwnerReferralToken(token);
    if (!payload || !isOwnerReferralPilotStoreAllowed(payload.referrerStoreId)) return null;

    const referrerStore = await firestoreAdmin
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(payload.referrerStoreId))
        .get();
    const storeData = referrerStore.exists ? referrerStore.data() : null;
    if (
        !storeData
        || Number(storeData.tenantId) !== payload.referrerTenantId
        || storeData.active === false
        || storeData.deleted === true
        || isPlatformEntityBlocked(storeData)
    ) {
        return null;
    }

    return {
        payload,
        referrerBusinessName: normalizeOwnerReferralText(
            getStoreContextName(storeData as any, 'MenuList business'),
            'MenuList business',
            OWNER_REFERRAL_BUSINESS_NAME_MAX_LENGTH,
        ),
    };
};

export const resolveOwnerReferralCookieForAttribution = async (
    request: NextRequest,
): Promise<OwnerReferralResolvedToken | null> => (
    resolveOwnerReferralTokenForAttribution(readOwnerReferralCookie(request))
);

const getOwnerReferralSubscriptionHistoryQuery = (scope: OwnerReferralScope) => (
    firestoreAdmin
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('pId', '==', DEFAULT_PRODUCT_ID)
        .where('productId', '==', DEFAULT_PRODUCT_ID)
        .where('tenantId', '==', scope.tenantId)
        .where('storeId', '==', scope.storeId)
        .where('tId', '==', scope.tenantId)
        .where('sId', '==', scope.storeId)
        .limit(OWNER_REFERRAL_SUBSCRIPTION_HISTORY_LIMIT)
);

const hasSuccessfulMenuListSubscriptionPayment = (
    snapshot: FirebaseFirestore.QuerySnapshot,
): boolean => snapshot.size >= OWNER_REFERRAL_SUBSCRIPTION_HISTORY_LIMIT || snapshot.docs.some((document) => {
    const subscription = document.data() || {};
    if (!getMenuListSubscriptionEntitlementScope(subscription)) return false;
    return Number(subscription.totalPaymentsMadeCount || 0) > 0
        || subscription.manualPaymentConfirmed === true
        || (Array.isArray(subscription.billingHistory) && subscription.billingHistory.length > 0);
});

export const buildOwnerReferralAttributionDocument = (params: {
    referredBusinessName: string;
    referredScope: OwnerReferralScope;
    resolvedToken: OwnerReferralResolvedToken;
    onboardingSource: string;
}): OwnerReferralDocument => {
    const now = admin.firestore.Timestamp.now();
    return {
        programVersion: OWNER_REFERRAL_PROGRAM_VERSION,
        status: OWNER_REFERRAL_STATUS.ATTRIBUTED,
        referrerTenantId: params.resolvedToken.payload.referrerTenantId,
        referrerStoreId: params.resolvedToken.payload.referrerStoreId,
        referrerBusinessNameSnapshot: params.resolvedToken.referrerBusinessName,
        referredTenantId: params.referredScope.tenantId,
        referredStoreId: params.referredScope.storeId,
        referredBusinessNameSnapshot: normalizeOwnerReferralText(
            params.referredBusinessName,
            'Invited business',
            OWNER_REFERRAL_BUSINESS_NAME_MAX_LENGTH,
        ),
        attributionSource: 'owner_invite',
        onboardingSource: normalizeOwnerReferralText(
            params.onboardingSource,
            'MENULIST',
            OWNER_REFERRAL_ONBOARDING_SOURCE_MAX_LENGTH,
        ),
        attributionTokenIdHash: hashOwnerReferralEvidence(params.resolvedToken.payload.tokenId),
        attributedAt: now,
        createdAt: now,
        updatedAt: now,
    };
};

export const setOwnerReferralAttributionInTransaction = (params: {
    transaction: FirebaseFirestore.Transaction;
    db: FirebaseFirestore.Firestore;
    referredBusinessName: string;
    referredScope: OwnerReferralScope;
    resolvedToken: OwnerReferralResolvedToken;
    onboardingSource: string;
}): string | null => {
    const referredScope = normalizeOwnerReferralScope(params.referredScope);
    if (!referredScope) return null;
    if (
        params.resolvedToken.payload.referrerTenantId === referredScope.tenantId
        && params.resolvedToken.payload.referrerStoreId === referredScope.storeId
    ) {
        return null;
    }

    const referralId = getOwnerReferralDocumentId(referredScope.tenantId, referredScope.storeId);
    const referralRef = params.db.collection(DB_COLLECTIONS.OWNER_REFERRALS).doc(referralId);
    params.transaction.create(referralRef, buildOwnerReferralAttributionDocument({
        referredBusinessName: params.referredBusinessName,
        referredScope,
        resolvedToken: params.resolvedToken,
        onboardingSource: params.onboardingSource,
    }));
    return referralId;
};

export const setOwnerReferralAttributionBeforeSubscription = async (params: {
    referredBusinessName: string;
    referredScope: OwnerReferralScope;
    resolvedToken: OwnerReferralResolvedToken;
    onboardingSource: string;
}): Promise<OwnerReferralAttributionResult> => {
    const referredScope = normalizeOwnerReferralScope(params.referredScope);
    if (!referredScope) return { status: 'invalid' };
    if (
        params.resolvedToken.payload.referrerTenantId === referredScope.tenantId
        && params.resolvedToken.payload.referrerStoreId === referredScope.storeId
    ) {
        return { status: 'same_scope' };
    }
    const referralId = getOwnerReferralDocumentId(referredScope.tenantId, referredScope.storeId);
    const referralRef = firestoreAdmin.collection(DB_COLLECTIONS.OWNER_REFERRALS).doc(referralId);
    const subscriptionHistoryQuery = getOwnerReferralSubscriptionHistoryQuery(referredScope);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [existing, subscriptionHistory] = await Promise.all([
            transaction.get(referralRef),
            transaction.get(subscriptionHistoryQuery),
        ]);
        if (existing.exists) return { status: 'existing', referralId };
        if (hasSuccessfulMenuListSubscriptionPayment(subscriptionHistory)) {
            return { status: 'prior_paid' };
        }

        transaction.create(referralRef, buildOwnerReferralAttributionDocument({
            referredBusinessName: params.referredBusinessName,
            referredScope,
            resolvedToken: params.resolvedToken,
            onboardingSource: params.onboardingSource,
        }));
        return { status: 'bound', referralId };
    });
};

export const deleteOwnerReferralAttributionInTransaction = (params: {
    transaction: FirebaseFirestore.Transaction;
    db: FirebaseFirestore.Firestore;
    referredScope: OwnerReferralScope;
}): void => {
    const scope = normalizeOwnerReferralScope(params.referredScope);
    if (!scope) return;
    params.transaction.delete(
        params.db.collection(DB_COLLECTIONS.OWNER_REFERRALS).doc(
            getOwnerReferralDocumentId(scope.tenantId, scope.storeId),
        ),
    );
};
