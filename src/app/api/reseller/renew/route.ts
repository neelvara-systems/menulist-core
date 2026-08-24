export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { calculateOfflineAmount, getResellerTierById, RESELLER_CAPS, RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import {
    getResellerOfflineCapFromError,
    getResellerProfile,
    ResellerOfflineCapExceededError,
} from "@database/reseller/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import { appendBoundedBillingStatusHistory } from '@lib/billing/subscriptionStatusHistory';
import { getMenuListSubscriptionEntitlementScope } from '@lib/billing/menuListSubscriptionEntitlementBoundary';
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import {
    isNonNegativeSafeInteger,
    isPositiveSafeInteger,
    projectResellerMutationProfileCounters,
    projectRenewReplay,
    resellerMutationDate,
    resolveResellerMutationProfileId,
} from "@lib/reseller/resellerMutationState";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
import { safelyRecordOwnerReferralPaymentAndRepair } from '@lib/ownerReferral/ownerReferralSettlementServer';
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ResellerRenewSchema } from "@lib/validation/resellerSchemas";
import { Timestamp } from "firebase/firestore";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";
import { resellerPrivateJson, withResellerPrivateHeaders } from "../readRateLimit";

const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/reseller/renew — Renew an offline license for an existing store
 * 
 * Renewal Anchor Rule:
 * - Before expiry → validUntil extends from previous validUntil
 * - After expiry → validUntil starts from NOW
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.4
 */
export const POST = withAuth(async (request, session) => {
    const resellerId = session.user.id;
    const isPlatformUser = resolveExactSessionPlatformRole(session) === 'PLATFORM';

    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-renew:${resellerRateLimitHash}`,
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
        const validation = validateAPIInput(ResellerRenewSchema, bodyResult.data);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            return resellerPrivateJson({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { storeId, tenantId, pricingTier, durationMonths, paymentMode, operationId } = validation.data;

        // Validate reseller profile
        const resellerProfile = isPlatformUser
            ? null
            : await getResellerProfile(
                resellerId,
                session.user.email,
                session.user.resellerProfileId,
            );
        if (isPlatformUser) {
            if (!await getCurrentPlatformUser(session)) {
                return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
            }
        } else if (!isActiveResellerProfileForSession({
            actorId: resellerId,
            profile: resellerProfile,
            sessionEmail: session.user.email,
            sessionProfileId: session.user.resellerProfileId,
        })) {
            return resellerPrivateJson({ error: "Reseller profile not found or inactive." }, { status: 403 });
        }

        // Validate tier
        const tier = getResellerTierById(pricingTier);
        if (!tier) {
            return resellerPrivateJson({ error: "Selected pricing tier is not available." }, { status: 400 });
        }

        // Only offline renewals go through this route; online auto-renews via Razorpay
        if (paymentMode !== 'offline') {
            return resellerPrivateJson({
                error: "Online subscriptions auto-renew via Razorpay. Manual renewal is only for offline subscriptions.",
            }, { status: 400 });
        }

        if (!RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE) {
            return resellerPrivateJson({
                error: 'Manual reseller collection is unavailable until its invoicing and remittance contract is approved.',
            }, { status: 409 });
        }

        // Find existing subscription for this store using Admin SDK.
        const subsSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
            .where('pId', '==', DEFAULT_PRODUCT_ID)
            .where('productId', '==', DEFAULT_PRODUCT_ID)
            .where('storeId', '==', storeId)
            .where('tenantId', '==', tenantId)
            .where('sId', '==', storeId)
            .where('tId', '==', tenantId)
            .where('billingMode', '==', 'manual')
            .limit(1)
            .get();

        if (subsSnapshot.empty) {
            return resellerPrivateJson({ error: "No manual subscription found for this store." }, { status: 404 });
        }

        const existingSub = subsSnapshot.docs[0];
        const existingSubData = existingSub.data();
        const existingScope = getMenuListSubscriptionEntitlementScope(existingSubData);
        if (!existingScope || existingScope.tenantId !== tenantId || existingScope.storeId !== storeId) {
            return resellerPrivateJson({ error: "No manual subscription found for this store." }, { status: 404 });
        }

        // Verify this reseller owns this subscription
        if (existingSubData.resellerId !== resellerId && !isPlatformUser) {
            logger.security('Reseller Renew - Unauthorized Access', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('storeId', storeId),
                ...getBoundedResellerApiStringContext('tenantId', tenantId),
                ...getBoundedResellerApiStringContext('subscriptionId', existingSub.id),
                ...getBoundedResellerApiStringContext('actualResellerId', existingSubData.resellerId),
            }, 'high');
            return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
        }
        if (!['active', 'expired'].includes(String(existingSubData.status || ''))) {
            return resellerPrivateJson({ error: "Only an active or expired manual subscription can be renewed." }, { status: 409 });
        }
        if (existingSubData.resellerPricingTier && existingSubData.resellerPricingTier !== pricingTier) {
            return resellerPrivateJson({ error: "Renew this client on its existing reseller tier." }, { status: 409 });
        }

        const requestNow = new Date();
        const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(existingSub.id);
        const transactionRef = firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(operationId);
        const operationResult = await firestoreAdmin.runTransaction(async (tx) => {
            const [operationSnap, subscriptionSnap] = await Promise.all([
                tx.get(transactionRef),
                tx.get(subscriptionRef),
            ]);
            if (operationSnap.exists) {
                const storedOperation = operationSnap.data() || {};
                const replay = projectRenewReplay(storedOperation, {
                    durationMonths,
                    operationId,
                    pricingTier,
                    resellerId,
                    storeId,
                    subscriptionId: existingSub.id,
                    tenantId,
                });
                if (!replay) {
                    throw new Error('Reseller operation id is already used by another action.');
                }
                return replay;
            }
            if (!subscriptionSnap.exists) throw new Error('Manual subscription disappeared during renewal.');

            const currentSubscription = subscriptionSnap.data() || {};
            const currentScope = getMenuListSubscriptionEntitlementScope(currentSubscription);
            if (
                !currentScope
                || currentScope.tenantId !== tenantId
                || currentScope.storeId !== storeId
                || currentSubscription.billingMode !== 'manual'
                || !['active', 'expired'].includes(String(currentSubscription.status || ''))
                || (currentSubscription.resellerPricingTier && currentSubscription.resellerPricingTier !== pricingTier)
                || (currentSubscription.resellerId !== resellerId && !isPlatformUser)
            ) {
                throw new Error('Manual subscription is no longer eligible for renewal.');
            }

            const previousExpiry = resellerMutationDate(currentSubscription.validUntil);
            const wasExpired = currentSubscription.status === 'expired';
            if (!wasExpired && !previousExpiry) {
                throw new Error('Active manual subscription has invalid expiry state.');
            }
            const renewalStart = previousExpiry && previousExpiry > requestNow ? previousExpiry : requestNow;
            const newValidUntil = new Date(renewalStart);
            newValidUntil.setMonth(newValidUntil.getMonth() + durationMonths);
            const subscriptionQuantity = currentSubscription.quantity === undefined
                ? 1
                : currentSubscription.quantity;
            if (!isPositiveSafeInteger(subscriptionQuantity)) {
                throw new Error('Manual subscription has invalid quantity state.');
            }
            const totalAmount = calculateOfflineAmount(pricingTier, durationMonths, subscriptionQuantity);
            if (!isNonNegativeSafeInteger(totalAmount)) {
                throw new Error('Manual subscription renewal amount is invalid.');
            }
            const nowTimestamp = Timestamp.fromDate(requestNow);
            const validFromTimestamp = Timestamp.fromDate(renewalStart);
            const validUntilTimestamp = Timestamp.fromDate(newValidUntil);
            const profileId = resolveResellerMutationProfileId(
                currentSubscription.resellerProfileId,
                resellerProfile?.id,
                isPlatformUser,
            );
            if (!isPlatformUser && !profileId) {
                throw new Error('Manual subscription reseller profile no longer matches current authority.');
            }
            if (isPlatformUser && currentSubscription.resellerProfileId != null && !profileId) {
                throw new Error('Manual subscription has invalid reseller profile identity.');
            }
            const profileRef = profileId
                ? firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId)
                : null;
            let profileCounterUpdates: Record<string, number> | null = null;
            if (profileRef) {
                const profileSnap = await tx.get(profileRef);
                if (!profileSnap.exists) throw new Error('Reseller profile disappeared during renewal.');
                if (!isPlatformUser && profileSnap.data()?.active !== true) {
                    throw new Error('Reseller profile is no longer active.');
                }
                const counterResult = projectResellerMutationProfileCounters(
                    profileSnap.data(),
                    totalAmount,
                    {
                        addOfflineSlot: wasExpired,
                        defaultOfflineCap: RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER,
                    },
                );
                if (counterResult.status === "cap-exceeded") {
                    throw new ResellerOfflineCapExceededError(counterResult.cap);
                }
                if (counterResult.status !== "ok") throw new Error("Reseller profile counters are invalid.");
                profileCounterUpdates = counterResult.updates;
            }

            tx.set(subscriptionRef, {
                status: 'active',
                validUntil: validUntilTimestamp,
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: durationMonths,
                amount: totalAmount,
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: nowTimestamp,
                cycleStartDate: validFromTimestamp,
                cycleEndDate: validUntilTimestamp,
                subscriptionEndDate: validUntilTimestamp,
                statuses: appendBoundedBillingStatusHistory(currentSubscription.statuses, {
                        status: 'active',
                        timestamp: nowTimestamp,
                        amount: totalAmount,
                        currency: 'INR',
                        remark: `Reseller renewal (${tier.name}) — ${subscriptionQuantity} location${subscriptionQuantity > 1 ? 's' : ''}, ${durationMonths} months`,
                }),
            }, { merge: true });
            tx.create(transactionRef, {
                id: operationId,
                operationId,
                resellerId,
                resellerProfileId: profileId,
                resellerEmail: session.user.email || '',
                storeId,
                tenantId,
                storeName: currentSubscription.name || '',
                action: 'RENEW',
                pricingTier,
                billingInterval: 'MONTH',
                commitmentMonths: durationMonths,
                locationCount: subscriptionQuantity,
                subscriptionQuantity,
                amountExpected: totalAmount,
                currency: 'INR',
                paymentMode: 'offline',
                status: 'active',
                subscriptionId: existingSub.id,
                validFrom: validFromTimestamp,
                validUntil: validUntilTimestamp,
                createdOn: nowTimestamp,
                modifiedOn: nowTimestamp,
            });
            if (profileRef && profileCounterUpdates) {
                tx.update(profileRef, {
                    ...profileCounterUpdates,
                    modifiedOn: nowTimestamp,
                });
            }

            return {
                amountExpected: totalAmount,
                locationCount: subscriptionQuantity,
                validFrom: renewalStart,
                validUntil: newValidUntil,
            };
        });

        await safeSyncStorePlanEntitlementFromSubscription(
            {
                id: existingSub.id,
                tenantId,
                storeId,
                planId: existingSubData.planId,
                status: 'active',
            },
            'api:reseller-renew',
        );
        await safelyRecordOwnerReferralPaymentAndRepair({
            paidScope: { tenantId, storeId },
            evidence: {
                paidAt: operationResult.validFrom,
                paymentEvidenceId: operationId,
                source: 'api:reseller-renew',
                subscriptionId: existingSub.id,
            },
        });

        return resellerPrivateJson({
            success: true,
            storeId,
            subscriptionId: existingSub.id,
            tenantId,
            transactionId: operationId,
            locationCount: operationResult.locationCount,
            amountExpected: operationResult.amountExpected,
            validFrom: operationResult.validFrom.toISOString(),
            validUntil: operationResult.validUntil.toISOString(),
        });

    } catch (error) {
        const exceededOfflineCap = getResellerOfflineCapFromError(error);
        if (exceededOfflineCap) {
            return resellerPrivateJson({
                error: `Maximum offline activations reached (${exceededOfflineCap}). Wait for another prepaid client to expire before renewing this client.`,
            }, { status: 409 });
        }
        logResellerApiFailure('reseller_renew_route_failed', error, {
            ...getBoundedResellerApiStringContext('resellerId', resellerId),
        });
        return resellerPrivateJson(
            { error: 'Failed to renew license. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
