export const dynamic = 'force-dynamic';
/**
 * Custom Domain Management API
 * 
 * POST /api/domain — Add a custom domain to the Vercel project
 * GET /api/domain — Get domain status/verification info
 * DELETE /api/domain — Remove a custom domain
 * 
 * Uses Vercel API v9 for domain management.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID env vars.
 * 
 * URL Routing Architecture — Phase 2 (Custom Domain)
 * @see __docs__/url-routing-architecture/README.md
 */
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
    addDomainToVercelProject,
    getVercelDomainConfig,
    isVercelDomainConfigured,
    removeDomainFromVercelProject,
} from "@lib/domains/vercelDomains";
import { revalidateMenuCache } from "@lib/actions/revalidateMenuCache";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../middleware/auth";

// Validation
const AddDomainSchema = z.object({
    domain: z.string()
        .min(4)
        .max(253)
        .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, {
            message: "Invalid domain format. Example: yourbusiness.com",
        }),
});
const DOMAIN_ACTION_MAX_BODY_BYTES = 4 * 1024;
const DOMAIN_PROVIDER_FAILURE_MESSAGE = "Failed to add domain to Vercel";
const DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE = "Failed to check domain status with Vercel";
const DOMAIN_REMOVE_PROVIDER_FAILURE_MESSAGE = "Failed to remove domain from Vercel";

const getBoundedDomainRouteStringContext = (label: string, value: unknown) => {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const normalizeDomainRouteFailure = (error: unknown, message: string): Error => {
    const normalized = new Error(message);
    if (error instanceof Error && error.name) {
        normalized.name = error.name;
    }
    return normalized;
};

const buildDomainRouteLogContext = (
    domain: unknown,
    storeId: unknown,
    tenantId: unknown,
    metadata: Record<string, boolean | number | string | undefined> = {},
) => ({
    ...getBoundedDomainRouteStringContext('domain', domain),
    ...getBoundedDomainRouteStringContext('storeId', storeId),
    ...getBoundedDomainRouteStringContext('tenantId', tenantId),
    ...metadata,
});

async function checkDomainManagementRateLimit(session: any, storeId: string | number) {
    const config = getRateLimitForFeature('DOMAIN_MANAGEMENT');
    const userId = session?.uId || session?.user?.id || session?.userId || 'unknown';
    const userRateLimitHash = hashPublicRateLimitValue(userId || session.user?.id || 'unknown');
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const result = await checkRateLimit({
        key: `domain-management:${userRateLimitHash}:${storeRateLimitHash}`,
        ...config,
    });

    if (result.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        { error: "Too many domain requests. Please try again later.", retryAfter: waitSeconds },
        {
            status: 429,
            headers: {
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(config.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(result.resetAt),
            },
        },
    );
}

/**
 * POST /api/domain — Add custom domain to Vercel project + store in Firestore
 */
export const POST = withAuth(async (request: NextRequest, session) => {
    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Custom domain");
    if (permissionError) return permissionError;

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, DOMAIN_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid domain",
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = bodyResult.data;
    const validation = AddDomainSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid domain", details: getSafeZodValidationDetails(validation.error) },
            { status: 400 }
        );
    }

    const { domain } = validation.data;
    const normalizedDomain = domain.toLowerCase().trim();

    // Check domain isn't already used by another store
    const db = admin.firestore();
    const existingStore = await db
        .collection(DB_COLLECTIONS.STORES)
        .where("customDomain", "==", normalizedDomain)
        .where("active", "==", true)
        .limit(1)
        .get();

    if (!existingStore.empty) {
        const existingStoreId = existingStore.docs[0].data().storeId;
        if (String(existingStoreId) !== String(storeId)) {
            return NextResponse.json(
                { error: "This domain is already linked to another store" },
                { status: 409 }
            );
        }
    }

    try {
        // Add domain to Vercel project
        const result = await addDomainToVercelProject(normalizedDomain);

        if (!result.ok && result.status !== 409) {
            // 409 = domain already exists on project (re-adding is fine)
            secureError(
                "[Domain] Vercel API error",
                new Error(DOMAIN_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(normalizedDomain, storeId, tenantId, {
                    providerStatus: result.status,
                }),
            );
            return NextResponse.json(
                { error: DOMAIN_PROVIDER_FAILURE_MESSAGE },
                { status: result.status }
            );
        }

        // Get verification info
        const configResult = await getVercelDomainConfig(normalizedDomain);

        // Update store doc with custom domain info
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(storeId));
        await storeRef.update({
            customDomain: normalizedDomain,
            domainVerified: false,
            domainAddedAt: admin.firestore.Timestamp.now(),
        });

        // Invalidate all public truth packets that depend on store routing.
        await revalidateMenuCache(storeId, { tId: tenantId });

        return NextResponse.json({
            success: true,
            domain: normalizedDomain,
            verified: false,
            verification: configResult.data,
            message: "Domain added. Configure your DNS records to complete setup.",
        });
    } catch (error) {
        secureError(
            "[Domain] Error adding domain",
            normalizeDomainRouteFailure(error, "Domain add failed"),
            buildDomainRouteLogContext(normalizedDomain, storeId, tenantId),
        );
        return NextResponse.json(
            { error: "Failed to add domain. Please try again." },
            { status: 500 }
        );
    }
});

/**
 * GET /api/domain — Check domain verification status
 */
export const GET = withAuth(async (request: NextRequest, session) => {
    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Custom domain");
    if (permissionError) return permissionError;

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);
    if (rateLimitResponse) return rateLimitResponse;

    // Get current store's custom domain
    const db = admin.firestore();
    const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
    const storeData = storeDoc.data();

    if (!storeData?.customDomain) {
        return NextResponse.json({ hasDomain: false });
    }

    const domain = storeData.customDomain;

    try {
        // Check domain config from Vercel
        const configResult = await getVercelDomainConfig(domain);
        if (!configResult.ok) {
            secureError(
                "[Domain] Vercel status API error",
                new Error(DOMAIN_STATUS_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(domain, storeId, tenantId, {
                    statusProviderStatus: configResult.status,
                }),
            );
        }

        // Check if domain is properly configured
        const isConfigured = isVercelDomainConfigured(configResult.data);

        // If newly verified, update store doc + invalidate cache
        if (isConfigured && !storeData.domainVerified) {
            await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
                domainVerified: true,
                domainVerifiedAt: admin.firestore.Timestamp.now(),
            });
            // Invalidate so canonical metadata and subdomain→custom-domain redirect activate immediately.
            await revalidateMenuCache(storeId, { tId: tenantId });
        }

        return NextResponse.json({
            hasDomain: true,
            domain,
            verified: isConfigured || storeData.domainVerified,
            verifiedAt: storeData.domainVerifiedAt || null,
            config: configResult.data,
        });
    } catch (error) {
        secureError(
            "[Domain] Error checking domain status",
            normalizeDomainRouteFailure(error, "Domain status check failed"),
            buildDomainRouteLogContext(domain, storeId, tenantId),
        );
        return NextResponse.json({
            hasDomain: true,
            domain,
            verified: storeData.domainVerified || false,
            error: "Could not check domain status",
        });
    }
});

/**
 * DELETE /api/domain — Remove custom domain from Vercel + Firestore
 */
export const DELETE = withAuth(async (request: NextRequest, session) => {
    const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE], "Custom domain");
    if (permissionError) return permissionError;

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const rateLimitResponse = await checkDomainManagementRateLimit(session, storeId);
    if (rateLimitResponse) return rateLimitResponse;

    const db = admin.firestore();
    const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
    const storeData = storeDoc.data();

    if (!storeData?.customDomain) {
        return NextResponse.json({ error: "No custom domain to remove" }, { status: 404 });
    }

    const domain = storeData.customDomain;

    try {
        // Remove from Vercel
        const removeResult = await removeDomainFromVercelProject(domain);
        if (!removeResult.ok && removeResult.status !== 404) {
            secureError(
                "[Domain] Vercel remove API error",
                new Error(DOMAIN_REMOVE_PROVIDER_FAILURE_MESSAGE),
                buildDomainRouteLogContext(domain, storeId, tenantId, {
                    removeProviderStatus: removeResult.status,
                }),
            );
        }
    } catch (error) {
        secureError(
            "[Domain] Error removing domain from Vercel",
            normalizeDomainRouteFailure(error, "Domain remove failed"),
            buildDomainRouteLogContext(domain, storeId, tenantId),
        );
        // Non-blocking — even if Vercel fails, remove from our side
    }

    // Remove from store doc
    await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
        customDomain: admin.firestore.FieldValue.delete(),
        domainVerified: admin.firestore.FieldValue.delete(),
        domainAddedAt: admin.firestore.FieldValue.delete(),
        domainVerifiedAt: admin.firestore.FieldValue.delete(),
    });

    // Invalidate all public truth packets so canonical links and redirects drop the removed domain.
    await revalidateMenuCache(storeId, { tId: tenantId });

    return NextResponse.json({
        removed: true,
        success: true,
        message: "Custom domain removed",
    });
});
