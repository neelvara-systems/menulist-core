export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getResellerProfile } from "@database/reseller/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
import { projectResellerSelfProfile } from "@lib/reseller/resellerSelfProfile";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { applyResellerReadRateLimit } from "../readRateLimit";

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

        const rateLimitResponse = await applyResellerReadRateLimit(session, "profile");
        if (rateLimitResponse) return rateLimitResponse;

        const resellerId = session.user.id;
        const profileData = await getResellerProfile(
            resellerId,
            session.user.email,
            session.user.resellerProfileId,
        );
        if (!isActiveResellerProfileForSession({
            actorId: resellerId,
            profile: profileData,
            sessionEmail: session.user.email,
            sessionProfileId: session.user.resellerProfileId,
        })) {
            return NextResponse.json({ error: "Reseller profile not found." }, { status: 404 });
        }
        const profile = projectResellerSelfProfile(
            profileData.id,
            profileData,
        );

        return NextResponse.json({ profile });

    } catch (error) {
        logResellerApiFailure('reseller_profile_route_failed', error, {
            ...getBoundedResellerApiStringContext('userId', session.uId || session.user?.id),
        });
        return NextResponse.json(
            { error: 'Failed to fetch profile.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });
