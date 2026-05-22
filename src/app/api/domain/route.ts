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
import { requireAnyStorePermission } from "@lib/permissions/server";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
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

    const body = await request.json();
    const validation = AddDomainSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid domain", details: validation.error.flatten() },
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
        if (existingStoreId !== storeId) {
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
            console.error("[Domain] Vercel API error:", result.data);
            return NextResponse.json(
                { error: result.data?.error?.message || "Failed to add domain to Vercel" },
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

        // Invalidate store cache so public pages pick up the new domain info
        revalidateTag('client-stores');

        return NextResponse.json({
            success: true,
            domain: normalizedDomain,
            verified: false,
            verification: configResult.data,
            message: "Domain added. Configure your DNS records to complete setup.",
        });
    } catch (error) {
        console.error("[Domain] Error adding domain:", error);
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

        // Check if domain is properly configured
        const isConfigured = isVercelDomainConfigured(configResult.data);

        // If newly verified, update store doc + invalidate cache
        if (isConfigured && !storeData.domainVerified) {
            await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
                domainVerified: true,
                domainVerifiedAt: admin.firestore.Timestamp.now(),
            });
            // Invalidate so subdomain→custom domain redirect activates immediately
            revalidateTag('client-stores');
        }

        return NextResponse.json({
            hasDomain: true,
            domain,
            verified: isConfigured || storeData.domainVerified,
            verifiedAt: storeData.domainVerifiedAt || null,
            config: configResult.data,
        });
    } catch (error) {
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

    const db = admin.firestore();
    const storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
    const storeData = storeDoc.data();

    if (!storeData?.customDomain) {
        return NextResponse.json({ error: "No custom domain to remove" }, { status: 404 });
    }

    const domain = storeData.customDomain;

    try {
        // Remove from Vercel
        await removeDomainFromVercelProject(domain);
    } catch {
        // Non-blocking — even if Vercel fails, remove from our side
    }

    // Remove from store doc
    await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).update({
        customDomain: admin.firestore.FieldValue.delete(),
        domainVerified: admin.firestore.FieldValue.delete(),
        domainAddedAt: admin.firestore.FieldValue.delete(),
        domainVerifiedAt: admin.firestore.FieldValue.delete(),
    });

    // Invalidate store cache so subdomain stops redirecting to removed domain
    revalidateTag('client-stores');

    return NextResponse.json({
        success: true,
        message: "Custom domain removed",
    });
});
