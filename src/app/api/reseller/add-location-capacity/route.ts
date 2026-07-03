export const dynamic = 'force-dynamic';
import { calculateOfflineLocationTopup } from "@config/resellerPricing";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { createResellerTransaction, getResellerProfile, updateResellerStatsOnRenewal } from "@database/reseller/server";
import { updateSubscription } from "@database/subscriptions/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ResellerAddLocationCapacitySchema } from "@lib/validation/resellerSchemas";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;

const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * POST /api/reseller/add-location-capacity
 *
 * Manual/offline clients cannot be charged automatically when they add an
 * outlet. This route records the reseller-collected prepaid amount first and
 * increases the licensed location capacity until the current prepaid expiry.
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
            key: `reseller-add-location:${resellerRateLimitHash}`,
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
        const body = bodyResult.data as any;
        const validation = validateAPIInput(ResellerAddLocationCapacitySchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Reseller Add Location Capacity Input Validation Failed', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/reseller/add-location-capacity',
                error: errorMsg,
            }, 'medium');
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { storeId, tenantId, locationCount } = validation.data;

        const resellerProfile = await getResellerProfile(resellerId, session.user.email);
        if (!isPlatformUser && (!resellerProfile || !resellerProfile.active)) {
            logger.security('Reseller Add Location Capacity - Profile Not Found or Inactive', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
            }, 'high');
            return NextResponse.json({ error: "Reseller profile not found or inactive." }, { status: 403 });
        }

        const subsSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
            .where('storeId', '==', storeId)
            .where('tenantId', '==', tenantId)
            .where('billingMode', '==', 'manual')
            .limit(1)
            .get();

        if (subsSnapshot.empty) {
            return NextResponse.json({ error: "No manual subscription found for this store." }, { status: 404 });
        }

        const existingSub = subsSnapshot.docs[0];
        const existingSubData = existingSub.data();

        if (existingSubData.resellerId !== resellerId && !isPlatformUser) {
            logger.security('Reseller Add Location Capacity - Unauthorized Access', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('storeId', storeId),
                ...getBoundedResellerApiStringContext('tenantId', tenantId),
                ...getBoundedResellerApiStringContext('subscriptionId', existingSub.id),
                ...getBoundedResellerApiStringContext('actualResellerId', existingSubData.resellerId),
            }, 'high');
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        if (existingSubData.status !== 'active') {
            return NextResponse.json({ error: "Renew this client before adding another location." }, { status: 400 });
        }

        const pricingTier = existingSubData.resellerPricingTier;
        if (!pricingTier) {
            return NextResponse.json({ error: "Missing reseller pricing tier. Renew this client before adding another location." }, { status: 400 });
        }

        const validUntil = existingSubData.validUntil || existingSubData.cycleEndDate || existingSubData.subscriptionEndDate;
        const validUntilDate = toDate(validUntil);
        if (!validUntilDate || validUntilDate.getTime() <= Date.now()) {
            return NextResponse.json({ error: "Renew this client before adding another location." }, { status: 400 });
        }

        const topup = calculateOfflineLocationTopup({ locationCount, pricingTier, validUntil });
        if (topup.daysRemaining <= 0 || topup.amountPaise <= 0) {
            return NextResponse.json({ error: "Renew this client before adding another location." }, { status: 400 });
        }

        const currentQuantity = Math.max(1, Number(existingSubData.quantity || 1));
        const nextQuantity = currentQuantity + topup.locationCount;
        const nextAmount = Number(existingSubData.amount || 0) + topup.amountPaise;
        const now = admin.firestore.Timestamp.now();

        await updateSubscription(existingSub.id, {
            amount: nextAmount,
            manualPaymentConfirmed: true,
            manualPaymentConfirmedAt: now as any,
            quantity: nextQuantity,
            statuses: [
                ...(existingSubData.statuses || []),
                {
                    status: 'active',
                    timestamp: now as any,
                    amount: topup.amountPaise,
                    currency: 'INR',
                    remark: `Reseller prepaid location capacity — +${topup.locationCount} location${topup.locationCount > 1 ? 's' : ''} until current expiry`,
                },
            ],
        });

        const profileId = existingSubData.resellerProfileId || resellerProfile?.id || null;
        const transactionId = await createResellerTransaction({
            resellerId,
            resellerProfileId: profileId,
            resellerEmail: session.user.email || '',
            storeId,
            tenantId,
            storeName: existingSubData.name || '',
            action: 'ADD_LOCATION',
            pricingTier,
            billingInterval: 'MONTH',
            commitmentMonths: Math.max(1, Math.ceil(topup.daysRemaining / 30)),
            locationCount: topup.locationCount,
            subscriptionQuantity: nextQuantity,
            amountExpected: topup.amountPaise,
            currency: 'INR',
            paymentMode: 'offline',
            status: 'active',
            subscriptionId: existingSub.id,
            validFrom: now as any,
            validUntil,
        });

        if (profileId) {
            await updateResellerStatsOnRenewal(profileId, topup.amountPaise);
        }

        return NextResponse.json({
            success: true,
            amountExpected: topup.amountPaise,
            daysRemaining: topup.daysRemaining,
            locationCount: topup.locationCount,
            quantity: nextQuantity,
            storeId,
            subscriptionId: existingSub.id,
            tenantId,
            transactionId,
            validUntil: validUntilDate.toISOString(),
        });
    } catch (error) {
        logResellerApiFailure('reseller_add_location_capacity_route_failed', error, {
            ...getBoundedResellerApiStringContext('resellerId', resellerId),
        });
        return NextResponse.json(
            { error: 'Failed to add location capacity. Please try again.' },
            { status: 500 },
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
