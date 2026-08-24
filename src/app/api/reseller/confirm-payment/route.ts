export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { getResellerProfile } from "@database/reseller/server";
import { confirmManualSubscriptionPayment } from "@database/subscriptions/server";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
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
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";
import { resellerPrivateJson, withResellerPrivateHeaders } from "../readRateLimit";

const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/reseller/confirm-payment — Retained manual-payment implementation
 *
 * The route fails closed before any mutation while manual reseller collection
 * is not commercially admitted.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.2
 */
export const POST = withAuth(async (request, session) => {
    const resellerId = session.user.id;
    const isPlatformUser = resolveExactSessionPlatformRole(session) === 'PLATFORM';

    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }
        if (!RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE) {
            return resellerPrivateJson({
                error: 'Manual reseller collection is unavailable until its invoicing and remittance contract is approved.',
            }, { status: 409 });
        }

        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-confirm-payment:${resellerRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            return resellerPrivateJson({
                error: rateLimitResult.reason === 'provider_unavailable'
                    ? "Service temporarily unavailable. Please try again later."
                    : "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: rateLimitResult.reason === 'provider_unavailable' ? 503 : 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return withResellerPrivateHeaders(bodyResult.response);
        const validation = validateAPIInput(ResellerConfirmPaymentSchema, bodyResult.data);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            return resellerPrivateJson({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { subscriptionId } = validation.data;

        if (isPlatformUser) {
            if (!await getCurrentPlatformUser(session)) {
                return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
            }
        } else {
            const resellerProfile = await getResellerProfile(
                resellerId,
                session.user.email,
                session.user.resellerProfileId,
            );
            if (!isActiveResellerProfileForSession({
                actorId: resellerId,
                profile: resellerProfile,
                sessionEmail: session.user.email,
                sessionProfileId: session.user.resellerProfileId,
            })) {
                return resellerPrivateJson({ error: "Reseller profile not found or inactive." }, { status: 403 });
            }
        }

        const confirmation = await confirmManualSubscriptionPayment({
            actorId: resellerId,
            isPlatformUser,
            subscriptionId,
        });
        if (confirmation.kind === 'not_found') {
            return resellerPrivateJson({ error: "Subscription not found." }, { status: 404 });
        }
        if (confirmation.kind === 'forbidden') {
            logger.security('Reseller Confirm Payment - Unauthorized Access', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
            }, 'high');
            return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
        }
        if (confirmation.kind === 'wrong_mode') {
            return resellerPrivateJson({ error: "This subscription uses online payment. No manual confirmation needed." }, { status: 400 });
        }
        if (confirmation.kind === 'invalid_state') {
            return resellerPrivateJson({ error: "Only a pending manual subscription can be confirmed." }, { status: 409 });
        }
        if (confirmation.kind === 'malformed') {
            return resellerPrivateJson({ error: "This subscription cannot be confirmed. Contact support." }, { status: 409 });
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

        return resellerPrivateJson({
            success: true,
            alreadyConfirmed: confirmation.alreadyConfirmed,
            subscriptionId,
            status: 'active',
        });

    } catch (error) {
        logResellerApiFailure('reseller_confirm_payment_route_failed', error, {
            ...getBoundedResellerApiStringContext('resellerId', resellerId),
        });
        return resellerPrivateJson(
            { error: 'Failed to confirm payment. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
