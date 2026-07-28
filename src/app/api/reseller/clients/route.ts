export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { DEFAULT_PRODUCT_ID } from "@constant/product";
import { getResellerProfile } from "@database/reseller/server";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { getMenuListSubscriptionEntitlementScope } from "@lib/billing/menuListSubscriptionEntitlementBoundary";
import { admin } from "@lib/firebase/firebaseAdmin";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";
import { projectResellerClientRecord } from "@lib/reseller/resellerClientRecord";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
import { withAuth } from "../../../../middleware/auth";
import { applyResellerReadRateLimit, resellerPrivateJson } from "../readRateLimit";

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
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitResponse = await applyResellerReadRateLimit(session, "clients");
        if (rateLimitResponse) return rateLimitResponse;

        const isPlatform = resolveExactSessionPlatformRole(session) === 'PLATFORM';
        const resellerId = session.user.id;
        if (isPlatform) {
            if (!await getCurrentPlatformUser(session)) {
                return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
            }
        } else {
            const currentProfile = await getResellerProfile(
                resellerId,
                session.user.email,
                session.user.resellerProfileId,
            );
            if (!isActiveResellerProfileForSession({
                actorId: resellerId,
                profile: currentProfile,
                sessionEmail: session.user.email,
                sessionProfileId: session.user.resellerProfileId,
            })) {
                return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
            }
        }
        const db = admin.firestore();

        const resultLimit = isPlatform ? 200 : 100;
        const subscriptionsCollection = db.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
        const subscriptionsQuery = isPlatform
            ? subscriptionsCollection
                .where('pId', '==', DEFAULT_PRODUCT_ID)
                .where('productId', '==', DEFAULT_PRODUCT_ID)
                .where('onboardingSource', '==', 'RESELLER_ONBOARDING')
                .orderBy('createdOn', 'desc')
                .limit(resultLimit + 1)
            : subscriptionsCollection
                .where('pId', '==', DEFAULT_PRODUCT_ID)
                .where('productId', '==', DEFAULT_PRODUCT_ID)
                .where('resellerId', '==', resellerId)
                .orderBy('createdOn', 'desc')
                .limit(resultLimit + 1);
        const snapshot = await subscriptionsQuery.get();
        const projectedTransactions = snapshot.docs.flatMap((doc) => {
            const scope = getMenuListSubscriptionEntitlementScope(doc.data());
            if (!scope) return [];
            const subscription = doc.data() || {};
            const transaction = projectResellerClientRecord(
                doc.id,
                subscription,
                scope,
                normalizeRazorpaySubscriptionCheckoutUrl(subscription.shortUrl),
            );
            return transaction ? [transaction] : [];
        });
        const invalidRowCount = snapshot.size - projectedTransactions.length;
        const isPartial = (
            snapshot.size > resultLimit
            || projectedTransactions.length > resultLimit
            || invalidRowCount > 0
        );
        const transactions = projectedTransactions.slice(0, resultLimit);

        return resellerPrivateJson({ invalidRowCount, isPartial, transactions });

    } catch (error) {
        logResellerApiFailure('reseller_clients_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return resellerPrivateJson(
            { error: 'Failed to fetch clients.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
