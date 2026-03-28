export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { calculateOfflineAmount, getResellerTierById, RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { createResellerTransaction, getResellerProfile } from "@database/reseller";
import { updateSubscription } from "@database/subscriptions";
import { logger } from "@lib/monitoring/logger";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { ResellerRenewSchema } from "@lib/validation/resellerSchemas";
import { Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

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

    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const body = await request.json();
        const validation = validateAPIInput(ResellerRenewSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { storeId, tenantId, pricingTier, durationMonths, paymentMode } = validation.data;

        // Validate reseller profile
        const resellerProfile = await getResellerProfile(resellerId);
        if (!resellerProfile || !resellerProfile.active) {
            return NextResponse.json({ error: "Reseller profile not found or inactive." }, { status: 403 });
        }

        // Validate tier
        const tier = getResellerTierById(pricingTier);
        if (!tier) {
            return NextResponse.json({ error: "Selected pricing tier is not available." }, { status: 400 });
        }

        // Only offline renewals go through this route; online auto-renews via Razorpay
        if (paymentMode !== 'offline') {
            return NextResponse.json({
                error: "Online subscriptions auto-renew via Razorpay. Manual renewal is only for offline subscriptions.",
            }, { status: 400 });
        }

        if (!RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE) {
            return NextResponse.json({ error: "Offline payment mode is no longer available." }, { status: 400 });
        }

        // Find existing subscription for this store
        const { getDocs, query, where, collection } = await import('firebase/firestore');
        const { firebaseClient } = await import('@lib/firebase/firebaseClient');
        const { DB_COLLECTIONS } = await import('@constant/database');

        const subsQuery = query(
            collection(firebaseClient, DB_COLLECTIONS.SUBSCRIPTIONS),
            where('storeId', '==', storeId),
            where('tenantId', '==', tenantId),
            where('billingMode', '==', 'manual')
        );
        const subsSnapshot = await getDocs(subsQuery);

        if (subsSnapshot.empty) {
            return NextResponse.json({ error: "No manual subscription found for this store." }, { status: 404 });
        }

        const existingSub = subsSnapshot.docs[0];
        const existingSubData = existingSub.data();

        // Verify this reseller owns this subscription
        if (existingSubData.resellerId !== resellerId && session.platformRole !== 'PLATFORM') {
            logger.security('Reseller Renew - Unauthorized Access', {
                ...buildSecurityContext(session, request),
                resellerId,
                storeId,
            }, 'high');
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        // Renewal Anchor Rule:
        // Before expiry → extend from previous validUntil
        // After expiry → start from NOW
        const now = new Date();
        let renewalStart: Date;

        if (existingSubData.validUntil) {
            const previousExpiry = existingSubData.validUntil.toDate();
            renewalStart = previousExpiry > now ? previousExpiry : now;
        } else {
            renewalStart = now;
        }

        const newValidUntil = new Date(renewalStart);
        newValidUntil.setMonth(newValidUntil.getMonth() + durationMonths);

        const totalAmount = calculateOfflineAmount(pricingTier, durationMonths);

        // Update subscription
        await updateSubscription(existingSub.id, {
            status: 'active',
            validUntil: Timestamp.fromDate(newValidUntil),
            resellerPricingTier: pricingTier,
            commitmentPeriodMonths: durationMonths,
            amount: totalAmount,
            manualPaymentConfirmed: true,
            manualPaymentConfirmedAt: Timestamp.now(),
            cycleStartDate: Timestamp.fromDate(renewalStart),
            cycleEndDate: Timestamp.fromDate(newValidUntil),
            subscriptionEndDate: Timestamp.fromDate(newValidUntil),
            statuses: [
                ...(existingSubData.statuses || []),
                {
                    status: 'active',
                    timestamp: Timestamp.now(),
                    amount: totalAmount,
                    currency: 'INR',
                    remark: `Reseller renewal (${tier.name}) — ${durationMonths} months`,
                },
            ],
        });

        // Create new transaction record (append, never mutate old)
        const transactionId = await createResellerTransaction({
            resellerId,
            resellerEmail: session.user.email || '',
            storeId,
            tenantId,
            storeName: existingSubData.name || '',
            action: 'RENEW',
            pricingTier,
            billingInterval: 'MONTH',
            commitmentMonths: durationMonths,
            amountExpected: totalAmount,
            currency: 'INR',
            paymentMode: 'offline',
            status: 'active',
            subscriptionId: existingSub.id,
            validFrom: Timestamp.fromDate(renewalStart),
            validUntil: Timestamp.fromDate(newValidUntil),
        });

        return NextResponse.json({
            success: true,
            subscriptionId: existingSub.id,
            transactionId,
            validFrom: renewalStart.toISOString(),
            validUntil: newValidUntil.toISOString(),
        });

    } catch (error) {
        console.error('[Reseller Renew] Failed:', error);
        return NextResponse.json(
            { error: 'Failed to renew license. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
