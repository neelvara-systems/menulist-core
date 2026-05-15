export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getAllResellerTransactions, getResellerTransactions } from "@database/reseller";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

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

        const isPlatform = session.user.platformRole === 'PLATFORM' || session.platformRole === 'PLATFORM';
        const resellerId = session.user.id;

        // PLATFORM role sees all resellers' clients
        const transactions = isPlatform
            ? await getAllResellerTransactions(200)
            : await getResellerTransactions(resellerId, 100);

        return NextResponse.json({ transactions });

    } catch (error) {
        console.error('[Reseller Clients] Failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clients.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
