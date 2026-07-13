export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import {
    OWNER_REFERRAL_OWNER_STATUS,
    OWNER_REFERRAL_RECENT_LIMIT,
    OWNER_REFERRAL_REFERRED_CREDITS,
    OWNER_REFERRAL_REFERRER_CREDITS,
    OWNER_REFERRAL_STATUS,
} from '@data/shared/ownerReferralPolicy';
import { canManageBillingMutation } from '@lib/billing/billingAccess';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedSecurityRouteContext, logSecurityFailure } from '@lib/security/securityDiagnostics';
import {
    buildOwnerReferralInviteUrl,
    canIssueOwnerReferralTokens,
    createOwnerReferralToken,
} from '@lib/ownerReferral/ownerReferralTokenServer';
import { getDirectVerifiedPaidOwnerReferralWallet } from '@lib/ownerReferral/ownerReferralSettlementServer';
import { isOwnerReferralAcquisitionEnabledForStore } from '@lib/ownerReferral/ownerReferralFeature';
import type { OwnerReferralDocument } from '@lib/ownerReferral/ownerReferralTypes';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { verifyTenantAccess, withAuth } from 'src/middleware/auth';

const unavailable = () => NextResponse.json(
    { error: 'Invitations are not available.' },
    { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
);

const asPositiveInteger = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const timestampToIso = (value: unknown): string | null => {
    try {
        if (
            value
            && typeof value === 'object'
            && 'toDate' in value
            && typeof value.toDate === 'function'
        ) return value.toDate().toISOString();
        if (value instanceof Date) return value.toISOString();
    } catch {
        return null;
    }
    return null;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    const tenantId = asPositiveInteger(session.user.tenantId ?? session.tId);
    const storeId = asPositiveInteger(session.user.storeId ?? session.sId);
    if (!tenantId || !storeId || !isOwnerReferralAcquisitionEnabledForStore(storeId)) return unavailable();
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
    }
    if (!(await canManageBillingMutation(session, request, '/api/owner-referrals'))) {
        return NextResponse.json({ error: 'Forbidden - Access denied' }, { status: 403 });
    }

    const config = getRateLimitForFeature('OWNER_REFERRAL_READ');
    const rateLimit = await checkRateLimit({
        key: `owner-referral:${hashPublicRateLimitValue(session.user.id)}:${hashPublicRateLimitValue(storeId)}`,
        ...config,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            { status: 429, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }

    try {
        const paidWallet = await getDirectVerifiedPaidOwnerReferralWallet({ tenantId, storeId });
        if (!paidWallet || !canIssueOwnerReferralTokens()) return unavailable();

        const { token } = createOwnerReferralToken({
            referrerTenantId: tenantId,
            referrerStoreId: storeId,
        });
        const recentSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.OWNER_REFERRALS)
            .where('referrerTenantId', '==', tenantId)
            .where('referrerStoreId', '==', storeId)
            .orderBy('createdAt', 'desc')
            .limit(OWNER_REFERRAL_RECENT_LIMIT)
            .get();
        const recent = recentSnapshot.docs.flatMap((document) => {
            const referral = document.data() as Partial<OwnerReferralDocument>;
            if (
                referral.status !== OWNER_REFERRAL_STATUS.ATTRIBUTED
                && referral.status !== OWNER_REFERRAL_STATUS.PAYMENT_PENDING
                && referral.status !== OWNER_REFERRAL_STATUS.REWARD_ISSUED
            ) return [];
            const date = timestampToIso(referral.rewardIssuedAt || referral.updatedAt || referral.createdAt);
            if (!date) return [];
            const status = referral.status === OWNER_REFERRAL_STATUS.REWARD_ISSUED
                ? OWNER_REFERRAL_OWNER_STATUS.ISSUED
                : OWNER_REFERRAL_OWNER_STATUS.WAITING_FOR_PAYMENT;
            const businessName = typeof referral.referredBusinessNameSnapshot === 'string'
                && referral.referredBusinessNameSnapshot.trim()
                ? referral.referredBusinessNameSnapshot.trim().slice(0, 100)
                : 'A business';
            return [{
                businessName,
                status,
                date,
            }];
        });

        return NextResponse.json({
            eligible: true,
            inviteUrl: buildOwnerReferralInviteUrl(token),
            policy: {
                referrerCredits: OWNER_REFERRAL_REFERRER_CREDITS,
                referredCredits: OWNER_REFERRAL_REFERRED_CREDITS,
                paymentOnly: true,
                rewardCap: null,
            },
            recent,
        }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        logSecurityFailure('owner_referral_owner_api_failed', error, getBoundedSecurityRouteContext(session, request));
        return NextResponse.json(
            { error: 'Invitations could not be loaded.' },
            { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
});
