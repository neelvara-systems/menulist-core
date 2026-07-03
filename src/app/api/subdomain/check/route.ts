export const dynamic = 'force-dynamic';
/**
 * GET /api/subdomain/check?subdomain=joes-pizza
 * 
 * Checks if a subdomain is available for use.
 * Returns: { available: boolean, reason?: string }
 * 
 * URL Routing Architecture — Phase 2
 * @see __docs__/url-routing-architecture/README.md
 */
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { isReservedSubdomain } from "@constant/reservedSlugs";
import { getMenuUrl } from "@constant/urls";
import { admin } from "@lib/firebase/firebaseAdmin";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { slugify } from "@lib/utils/slugify";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { withAuth } from "../../../../middleware/auth";

// Minimum subdomain length
const MIN_SUBDOMAIN_LENGTH = 3;
const MAX_SUBDOMAIN_LENGTH = 63; // DNS label max
const SUBDOMAIN_CHECK_RATE_LIMIT_KEY = "subdomain-check";

const checkSubdomainReadRateLimit = async (session: any) => {
    const rateLimitConfig = getRateLimitForFeature("DATA_READ");
    const userId = session?.uId || session?.user?.id || "unknown";
    const tenantId = session?.tId || session?.user?.tenantId || "unknown";
    const storeId = session?.sId || session?.user?.storeId || "unknown";
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);

    const rateLimit = await checkRateLimit({
        key: `${SUBDOMAIN_CHECK_RATE_LIMIT_KEY}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            available: false,
            reason: "Too many requests. Please try again later.",
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            headers: {
                "Retry-After": String(waitSeconds),
                "X-RateLimit-Limit": String(rateLimitConfig.limit),
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(rateLimit.resetAt),
            },
            status: 429,
        },
    );
};

export const GET = withAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await checkSubdomainReadRateLimit(session);
    if (rateLimitResponse) return rateLimitResponse;

    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Subdomain");
    if (permissionError) return permissionError;

    const { searchParams } = new URL(request.url);
    const rawSubdomain = searchParams.get('subdomain');

    if (!rawSubdomain) {
        return NextResponse.json(
            { available: false, reason: 'Subdomain is required' },
            { status: 400 }
        );
    }

    // Normalize: slugify the input
    const subdomain = slugify(rawSubdomain).toLowerCase();

    // Validate format
    if (!subdomain || subdomain.length < MIN_SUBDOMAIN_LENGTH) {
        return NextResponse.json({
            available: false,
            reason: `Subdomain must be at least ${MIN_SUBDOMAIN_LENGTH} characters`,
            normalized: subdomain,
        });
    }

    if (subdomain.length > MAX_SUBDOMAIN_LENGTH) {
        return NextResponse.json({
            available: false,
            reason: `Subdomain must be at most ${MAX_SUBDOMAIN_LENGTH} characters`,
            normalized: subdomain,
        });
    }

    // Check reserved list
    if (isReservedSubdomain(subdomain)) {
        return NextResponse.json({
            available: false,
            reason: 'This name is reserved',
            normalized: subdomain,
        });
    }

    // Check Firestore for existing stores with this subdomain
    const db = admin.firestore();
    const storesSnapshot = await db
        .collection(DB_COLLECTIONS.STORES)
        .where('subdomain', '==', subdomain)
        .where('active', '==', true)
        .limit(1)
        .get();

    if (!storesSnapshot.empty) {
        return NextResponse.json({
            available: false,
            reason: 'This subdomain is already taken',
            normalized: subdomain,
        });
    }

    return NextResponse.json({
        available: true,
        normalized: subdomain,
        preview: getMenuUrl(subdomain).replace(/^https?:\/\//, ''),
    });
});
