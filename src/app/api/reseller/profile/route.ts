export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getResellerProfile } from "@database/reseller";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

/**
 * GET /api/reseller/profile — Get reseller's own profile
 * 
 * Returns profile with caps, counts, and status.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.5
 */
export const GET = withAuth(async (request, session) => {
    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const resellerId = session.user.id;
        const profile = await getResellerProfile(resellerId, session.user.email);

        if (!profile) {
            return NextResponse.json({ error: "Reseller profile not found." }, { status: 404 });
        }

        return NextResponse.json({ profile });

    } catch (error) {
        console.error('[Reseller Profile] Failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
