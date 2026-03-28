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
import { isReservedSubdomain } from "@constant/reservedSlugs";
import { admin } from "@lib/firebase/firebaseAdmin";
import { slugify } from "@lib/utils/slugify";
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

// Minimum subdomain length
const MIN_SUBDOMAIN_LENGTH = 3;
const MAX_SUBDOMAIN_LENGTH = 63; // DNS label max

export const GET = withAuth(async (request: NextRequest) => {
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
        preview: `${subdomain}.menulist.ai`,
    });
});
