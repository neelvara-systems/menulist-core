export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin } from "@lib/firebase/firebaseAdmin";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { applyResellerReadRateLimit } from "../readRateLimit";

/**
 * GET /api/reseller/clients — List reseller's onboarded clients
 * 
 * Returns all transactions for the authenticated reseller.
 * PLATFORM role sees all resellers' transactions.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.3
 */
export const GET = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitResponse = await applyResellerReadRateLimit(session, "clients");
        if (rateLimitResponse) return rateLimitResponse;

        const isPlatform = session.user.platformRole === 'PLATFORM' || session.platformRole === 'PLATFORM';
        const resellerId = session.user.id;
        const db = admin.firestore();

        const resultLimit = isPlatform ? 200 : 100;
        const subscriptionsCollection = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
        const subscriptionsQuery = isPlatform
            ? subscriptionsCollection
                .where('onboardingSource', '==', 'RESELLER_ONBOARDING')
                .orderBy('createdOn', 'desc')
                .limit(resultLimit + 1)
            : subscriptionsCollection
                .where('resellerId', '==', resellerId)
                .orderBy('createdOn', 'desc')
                .limit(resultLimit + 1);
        const snapshot = await subscriptionsQuery.get();
        const isPartial = snapshot.size > resultLimit;
        const transactions = snapshot.docs.slice(0, resultLimit).map((doc) => {
            const subscription = doc.data() || {};
            const quantity = Math.max(1, Number(subscription.quantity || 1));
            const isManual = subscription.billingMode === 'manual';
            const subscriptionStatus = String(subscription.status || '');
            const amount = Math.max(0, Number(subscription.amount || 0));
            return {
                action: 'ONBOARD',
                amountExpected: isManual ? amount : amount * quantity,
                billingInterval: subscription.planType === 'YEAR' ? 'YEAR' : 'MONTH',
                commitmentMonths: subscription.commitmentPeriodMonths || null,
                createdOn: subscription.createdOn?.toDate?.()?.toISOString?.() || subscription.createdOn || null,
                currency: 'INR',
                id: doc.id,
                locationCount: quantity,
                modifiedOn: subscription.modifiedOn?.toDate?.()?.toISOString?.() || subscription.modifiedOn || null,
                paymentMode: isManual ? 'offline' : 'online',
                pricingTier: subscription.resellerPricingTier || '',
                resellerEmail: '',
                resellerId: subscription.resellerId || '',
                resellerProfileId: subscription.resellerProfileId || null,
                status: subscriptionStatus === 'pending' ? 'pending_payment' : subscriptionStatus,
                storeId: Number(subscription.storeId),
                storeName: subscription.name || '',
                subscriptionAmount: amount,
                subscriptionBillingMode: subscription.billingMode,
                subscriptionId: doc.id,
                subscriptionQuantity: quantity,
                subscriptionShortUrl: normalizeRazorpaySubscriptionCheckoutUrl(subscription.shortUrl),
                subscriptionStatus,
                tenantId: Number(subscription.tenantId),
                validUntil: subscription.validUntil?.toDate?.()?.toISOString?.()
                    || subscription.cycleEndDate?.toDate?.()?.toISOString?.()
                    || null,
            };
        });

        return NextResponse.json({ isPartial, transactions });

    } catch (error) {
        logResellerApiFailure('reseller_clients_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return NextResponse.json(
            { error: 'Failed to fetch clients.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
