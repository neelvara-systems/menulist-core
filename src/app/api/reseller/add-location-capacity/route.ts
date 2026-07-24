export const dynamic = 'force-dynamic';
import { calculateOfflineLocationTopup } from "@config/resellerPricing";
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import { getResellerProfile } from "@database/reseller/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { appendBoundedBillingStatusHistory } from '@lib/billing/subscriptionStatusHistory';
import { getMenuListSubscriptionEntitlementScope } from '@lib/billing/menuListSubscriptionEntitlementBoundary';
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
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

        const { storeId, tenantId, locationCount, operationId } = validation.data;

        const resellerProfile = isPlatformUser
            ? null
            : await getResellerProfile(resellerId, session.user.email);
        if (isPlatformUser) {
            if (!await getCurrentPlatformUser(session)) {
                return NextResponse.json({ error: "Access denied." }, { status: 403 });
            }
        } else if (!isActiveResellerProfileForSession({
            actorId: resellerId,
            profile: resellerProfile,
            sessionEmail: session.user.email,
            sessionProfileId: session.user.resellerProfileId,
        })) {
            logger.security('Reseller Add Location Capacity - Profile Not Found or Inactive', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
            }, 'high');
            return NextResponse.json({ error: "Reseller profile not found or inactive." }, { status: 403 });
        }

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
            return NextResponse.json({ error: "No manual subscription found for this store." }, { status: 404 });
        }

        const existingSub = subsSnapshot.docs[0];
        const existingSubData = existingSub.data();
        const existingScope = getMenuListSubscriptionEntitlementScope(existingSubData);
        if (!existingScope || existingScope.tenantId !== tenantId || existingScope.storeId !== storeId) {
            return NextResponse.json({ error: "No manual subscription found for this store." }, { status: 404 });
        }

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

        const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(existingSub.id);
        const transactionRef = firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(operationId);
        const operationResult = await firestoreAdmin.runTransaction(async (tx) => {
            const [operationSnap, subscriptionSnap] = await Promise.all([
                tx.get(transactionRef),
                tx.get(subscriptionRef),
            ]);
            if (operationSnap.exists) {
                const storedOperation = operationSnap.data() || {};
                if (
                    storedOperation.operationId !== operationId
                    || storedOperation.action !== 'ADD_LOCATION'
                    || storedOperation.resellerId !== resellerId
                    || Number(storedOperation.storeId) !== storeId
                    || Number(storedOperation.tenantId) !== tenantId
                    || Number(storedOperation.locationCount) !== locationCount
                    || storedOperation.subscriptionId !== existingSub.id
                ) {
                    throw new Error('Reseller operation id is already used by another action.');
                }
                return {
                    amountExpected: Number(storedOperation.amountExpected),
                    daysRemaining: Number(storedOperation.daysRemaining),
                    locationCount: Number(storedOperation.locationCount),
                    quantity: Number(storedOperation.subscriptionQuantity),
                    validUntil: toDate(storedOperation.validUntil),
                };
            }
            if (!subscriptionSnap.exists) throw new Error('Manual subscription disappeared during update.');

            const currentSubscription = subscriptionSnap.data() || {};
            const currentScope = getMenuListSubscriptionEntitlementScope(currentSubscription);
            if (
                !currentScope
                || currentScope.tenantId !== tenantId
                || currentScope.storeId !== storeId
                || currentSubscription.billingMode !== 'manual'
                || currentSubscription.status !== 'active'
                || (currentSubscription.resellerId !== resellerId && !isPlatformUser)
            ) {
                throw new Error('Manual subscription is no longer eligible for location capacity.');
            }
            const currentPricingTier = currentSubscription.resellerPricingTier;
            const currentValidUntil = currentSubscription.validUntil
                || currentSubscription.cycleEndDate
                || currentSubscription.subscriptionEndDate;
            const currentValidUntilDate = toDate(currentValidUntil);
            if (!currentPricingTier || !currentValidUntilDate || currentValidUntilDate.getTime() <= Date.now()) {
                throw new Error('Manual subscription must be renewed before adding a location.');
            }

            const currentTopup = calculateOfflineLocationTopup({
                locationCount,
                pricingTier: currentPricingTier,
                validUntil: currentValidUntil,
            });
            if (currentTopup.daysRemaining <= 0 || currentTopup.amountPaise <= 0) {
                throw new Error('Manual subscription must be renewed before adding a location.');
            }

            const currentQuantity = Math.max(1, Number(currentSubscription.quantity || 1));
            const nextQuantity = currentQuantity + currentTopup.locationCount;
            const nextAmount = Number(currentSubscription.amount || 0) + currentTopup.amountPaise;
            const now = admin.firestore.Timestamp.now();
            const profileId = currentSubscription.resellerProfileId || resellerProfile?.id || null;
            const profileRef = profileId
                ? firestoreAdmin.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(profileId)
                : null;
            if (profileRef) {
                const profileSnap = await tx.get(profileRef);
                if (!profileSnap.exists) throw new Error('Reseller profile disappeared during update.');
                if (!isPlatformUser && profileSnap.data()?.active !== true) {
                    throw new Error('Reseller profile is no longer active.');
                }
            }

            tx.set(subscriptionRef, {
                amount: nextAmount,
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: now,
                quantity: nextQuantity,
                statuses: appendBoundedBillingStatusHistory(currentSubscription.statuses, {
                        status: 'active',
                        timestamp: now,
                        amount: currentTopup.amountPaise,
                        currency: 'INR',
                        remark: `Reseller prepaid location capacity — +${currentTopup.locationCount} location${currentTopup.locationCount > 1 ? 's' : ''} until current expiry`,
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
                action: 'ADD_LOCATION',
                pricingTier: currentPricingTier,
                billingInterval: 'MONTH',
                commitmentMonths: Math.max(1, Math.ceil(currentTopup.daysRemaining / 30)),
                locationCount: currentTopup.locationCount,
                subscriptionQuantity: nextQuantity,
                amountExpected: currentTopup.amountPaise,
                daysRemaining: currentTopup.daysRemaining,
                currency: 'INR',
                paymentMode: 'offline',
                status: 'active',
                subscriptionId: existingSub.id,
                validFrom: now,
                validUntil: currentValidUntil,
                createdOn: now,
                modifiedOn: now,
            });
            if (profileRef) {
                tx.update(profileRef, {
                    totalTransactions: admin.firestore.FieldValue.increment(1),
                    totalRevenueCollectedPaise: admin.firestore.FieldValue.increment(currentTopup.amountPaise),
                    modifiedOn: now,
                });
            }

            return {
                amountExpected: currentTopup.amountPaise,
                daysRemaining: currentTopup.daysRemaining,
                locationCount: currentTopup.locationCount,
                quantity: nextQuantity,
                validUntil: currentValidUntilDate,
            };
        });

        if (!operationResult.validUntil) throw new Error('Location capacity result is missing its expiry.');

        return NextResponse.json({
            success: true,
            amountExpected: operationResult.amountExpected,
            daysRemaining: operationResult.daysRemaining,
            locationCount: operationResult.locationCount,
            quantity: operationResult.quantity,
            storeId,
            subscriptionId: existingSub.id,
            tenantId,
            transactionId: operationId,
            validUntil: operationResult.validUntil.toISOString(),
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
