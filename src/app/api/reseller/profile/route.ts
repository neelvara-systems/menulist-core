export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { admin } from "@lib/firebase/firebaseAdmin";
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
        const db = admin.firestore();
        const directDoc = await db.collection(DB_COLLECTIONS.RESELLER_PROFILES).doc(resellerId).get();
        let profileDoc = directDoc.exists ? directDoc : null;

        if (!profileDoc && session.user.email) {
            const normalizedEmail = session.user.email.toLowerCase().trim();
            const emailSnapshot = await db.collection(DB_COLLECTIONS.RESELLER_PROFILES)
                .where("email", "==", normalizedEmail)
                .limit(1)
                .get();
            profileDoc = emailSnapshot.docs[0] || null;
        }

        if (!profileDoc) {
            return NextResponse.json({ error: "Reseller profile not found." }, { status: 404 });
        }

        const { password: _password, ...profileData } = profileDoc.data() || {};
        const profile = {
            ...profileData,
            id: profileDoc.id,
            activatedAt: profileData.activatedAt?.toDate?.()?.toISOString?.() || profileData.activatedAt || null,
            createdOn: profileData.createdOn?.toDate?.()?.toISOString?.() || profileData.createdOn || null,
            modifiedOn: profileData.modifiedOn?.toDate?.()?.toISOString?.() || profileData.modifiedOn || null,
        };

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
