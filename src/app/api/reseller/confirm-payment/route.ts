export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getResellerProfile } from "@database/reseller/server";
import { confirmManualSubscriptionPayment } from "@database/subscriptions/server";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { logger } from "@lib/monitoring/logger";
import { markResellerTransactionsActiveForSubscription } from "@lib/reseller/resellerLedger";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
import { safelyRecordOwnerReferralPaymentAndRepair } from '@lib/ownerReferral/ownerReferralSettlementServer';
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ResellerConfirmPaymentSchema } from "@lib/validation/resellerSchemas";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/reseller/confirm-payment — Offline payment confirmation
 * 
 * Reseller confirms they received cash/UPI from the client.
 * Updates subscription status from pending to active.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.2
 */
export const POST = withAuth(async (request, session) => {
    const resellerId = session.user.id;
    const isPlatformUser = session.user.platformRole === 'PLATFORM' || session.platformRole === 'PLATFORM';

    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-confirm-payment:${resellerRateLimitHash}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data;
        const validation = validateAPIInput(ResellerConfirmPaymentSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { subscriptionId } = validation.data;

        if (isPlatformUser) {
            if (!await getCurrentPlatformUser(session)) {
                return NextResponse.json({ error: "Access denied." }, { status: 403 });
            }
        } else {
            const resellerProfile = await getResellerProfile(resellerId, session.user.email);
            if (!isActiveResellerProfileForSession({
                actorId: resellerId,
                profile: resellerProfile,
                sessionEmail: session.user.email,
                sessionProfileId: session.user.resellerProfileId,
            })) {
                return NextResponse.json({ error: "Reseller profile not found or inactive." }, { status: 403 });
            }
        }

        const confirmation = await confirmManualSubscriptionPayment({
            actorId: resellerId,
            isPlatformUser,
            subscriptionId,
        });
        if (confirmation.kind === 'not_found') {
            return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
        }
        if (confirmation.kind === 'forbidden') {
            logger.security('Reseller Confirm Payment - Unauthorized Access', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
            }, 'high');
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }
        if (confirmation.kind === 'wrong_mode') {
            return NextResponse.json({ error: "This subscription uses online payment. No manual confirmation needed." }, { status: 400 });
        }
        if (confirmation.kind === 'invalid_state') {
            return NextResponse.json({ error: "Only a pending manual subscription can be confirmed." }, { status: 409 });
        }
        if (confirmation.kind === 'malformed') {
            return NextResponse.json({ error: "This subscription cannot be confirmed. Contact support." }, { status: 409 });
        }

        await markResellerTransactionsActiveForSubscription(
            subscriptionId,
            'api:reseller-confirm-payment',
        );

        await safeSyncStorePlanEntitlementFromSubscription(
            {
                id: subscriptionId,
                planId: confirmation.planId,
                status: 'active',
                storeId: confirmation.storeId,
                tenantId: confirmation.tenantId,
            },
            'api:reseller-confirm-payment',
        );
        await safelyRecordOwnerReferralPaymentAndRepair({
            paidScope: {
                tenantId: confirmation.tenantId,
                storeId: confirmation.storeId,
            },
            evidence: {
                paidAt: new Date(),
                paymentEvidenceId: subscriptionId,
                source: 'api:reseller-confirm-payment',
                subscriptionId,
            },
        });

        return NextResponse.json({
            success: true,
            alreadyConfirmed: confirmation.alreadyConfirmed,
            subscriptionId,
            status: 'active',
        });

    } catch (error) {
        logResellerApiFailure('reseller_confirm_payment_route_failed', error, {
            ...getBoundedResellerApiStringContext('resellerId', resellerId),
        });
        return NextResponse.json(
            { error: 'Failed to confirm payment. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
