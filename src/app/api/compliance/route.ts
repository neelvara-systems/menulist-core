export const dynamic = 'force-dynamic';
/**
 * Compliance Pages API (Overrides-Only Model)
 *
 * GET /api/compliance — Get override status + system-generated preview
 * POST /api/compliance — Save custom override or delete override (reset)
 *
 * System content is ALWAYS generated from store data (pure template).
 * Only custom overrides are stored in Firestore.
 *
 * @see __docs__/compliance-pages/compliance-pages_impl.md §5
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import {
    deleteComplianceOverrideServer,
    getComplianceCacheTag,
    getComplianceOverridesServer,
    saveComplianceOverrideServer,
} from '@database/compliance/server';
import { sanitizeComplianceContent } from '@lib/compliance/sanitizer';
import { composeComplianceContent, extractComplianceInputs, generateComplianceContent } from '@lib/compliance/templates';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from '@lib/publicTruth/entityEligibility';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { withAuth } from '../../../middleware/auth';
import { hashPublicRateLimitValue } from '../../../middleware/publicApi';

const OverrideSchema = z.object({
    type: z.enum(['privacy', 'terms', 'refund']),
    action: z.enum(['override', 'reset']),
    content: z.string().max(15000).optional(),
});
const COMPLIANCE_OVERRIDE_MAX_BODY_BYTES = 32 * 1024;
type ComplianceStoreLookupResult =
    | { ok: true; store: any | null }
    | { ok: false };

async function revalidateCompliancePublicCache(sId: string, tId: string): Promise<boolean> {
    try {
        revalidateTag(getComplianceCacheTag(sId), { expire: 0 });
        return false;
    } catch (error) {
        logRuntimeFailure('compliance_public_cache_revalidation_failed', error, {
            ...getBoundedRuntimeStringContext('storeId', sId),
            ...getBoundedRuntimeStringContext('tenantId', tId),
            failurePolicy: 'bounded_60_second_stale_fallback',
        });
        return true;
    }
}

function normalizeComplianceSessionDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function getComplianceSessionScope(session: any): { sId: string; tId: string } | null {
    const sId = normalizeComplianceSessionDocumentId(session?.sId);
    const tId = normalizeComplianceSessionDocumentId(session?.tId);
    return sId && tId ? { sId, tId } : null;
}

/**
 * GET /api/compliance — Get compliance pages status for dashboard
 *
 * Returns: system-generated content + override status for each page.
 * Dashboard uses this to show current content and whether custom override exists.
 */
export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const scope = getComplianceSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const { sId, tId } = scope;

    // Get store data for template generation
    const storeLookup = await getStoreData(sId, tId);
    if (!storeLookup.ok) {
        return NextResponse.json(
            { error: 'Unable to load compliance page details' },
            { status: 500 },
        );
    }

    const inputs = storeLookup.store ? extractComplianceInputs(storeLookup.store) : null;

    if (!inputs) {
        return NextResponse.json({
            privacy: null,
            terms: null,
            missingData: true,
            message: 'Add at least one contact method (email or phone) to generate compliance pages.',
        });
    }

    // Always generate system content (pure function, zero cost)
    const systemPrivacy = generateComplianceContent('privacy', inputs);
    const systemTerms = generateComplianceContent('terms', inputs);
    const systemRefund = generateComplianceContent('refund', inputs);

    // Check for custom overrides
    const overrides = await getComplianceOverridesServer(sId, tId);

    return NextResponse.json({
        privacy: {
            content: composeComplianceContent(systemPrivacy, overrides?.privacyOverride),
            customContent: overrides?.privacyOverride || '',
            source: overrides?.privacyOverride ? 'custom' : 'system',
            systemContent: systemPrivacy,
        },
        terms: {
            content: composeComplianceContent(systemTerms, overrides?.termsOverride),
            customContent: overrides?.termsOverride || '',
            source: overrides?.termsOverride ? 'custom' : 'system',
            systemContent: systemTerms,
        },
        refund: {
            content: composeComplianceContent(systemRefund, overrides?.refundOverride),
            customContent: overrides?.refundOverride || '',
            source: overrides?.refundOverride ? 'custom' : 'system',
            systemContent: systemRefund,
        },
    });
});

/**
 * POST /api/compliance — Save custom override or reset (delete override)
 *
 * action: 'override' → save custom text
 * action: 'reset' → delete override field (system template takes over)
 */
export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const scope = getComplianceSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const { sId, tId } = scope;

    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE],
        'Compliance pages',
    );
    if (permissionError) return permissionError;

    const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
    const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || 'unknown');
    const storeRateLimitHash = hashPublicRateLimitValue(sId);
    const rateLimitResult = await checkRateLimit({
        key: `compliance:${userRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json({
            error: 'Too many requests. Please try again later.',
            resetAt: rateLimitResult.resetAt,
        }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Validation failed',
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const body = bodyResult.data;
    const validation = OverrideSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: getSafeZodValidationDetails(validation.error) },
            { status: 400 },
        );
    }

    const { type, action, content } = validation.data;
    const pageLabelMap: Record<string, string> = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', refund: 'Refund & Cancellation Policy' };
    const pageLabel = pageLabelMap[type] || type;

    if (action === 'override') {
        if (!content) {
            return NextResponse.json(
                { error: 'Content is required for override' },
                { status: 400 },
            );
        }

        const sanitized = sanitizeComplianceContent(content);
        if (!sanitized) {
            return NextResponse.json(
                { error: 'Content is too short (minimum 100 characters) or contains invalid content' },
                { status: 400 },
            );
        }

        await saveComplianceOverrideServer(sId, tId, type, sanitized);
        const refreshPending = await revalidateCompliancePublicCache(sId, tId);

        return NextResponse.json({
            action,
            success: true,
            type,
            refreshPending,
            message: `${pageLabel} updated with your custom content.`,
        });
    }

    if (action === 'reset') {
        await deleteComplianceOverrideServer(sId, tId, type);
        const refreshPending = await revalidateCompliancePublicCache(sId, tId);

        return NextResponse.json({
            action,
            success: true,
            type,
            refreshPending,
            message: `${pageLabel} reset to default.`,
        });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
});

/**
 * Helper: Get store data by storeId
 */
async function getStoreData(sId: string, tId?: string): Promise<ComplianceStoreLookupResult> {
    try {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .doc(sId)
            .get();
        const store = snapshot.data();
        if (!snapshot.exists || !isMenuListPublicEntityEligible(store)) return { ok: true, store: null };

        const storeIdentityValues = [store?.storeId, store?.sId]
            .filter((value) => value !== undefined && value !== null);
        const tenantIdentityValues = [store?.tenantId, store?.tId]
            .filter((value) => value !== undefined && value !== null);
        const storeIdentityMatches = storeIdentityValues.length === 0
            || normalizeMenuListPublicEntityIdentityAliases(storeIdentityValues)?.documentId === sId;
        const tenantIdentityMatches = tenantIdentityValues.length > 0
            && normalizeMenuListPublicEntityIdentityAliases(tenantIdentityValues)?.documentId === tId;
        if (!storeIdentityMatches || !tenantIdentityMatches) {
            logRuntimeFailure('compliance_store_scope_mismatch', new Error('compliance_store_scope_mismatch'), {
                ...getBoundedRuntimeStringContext('storeId', sId),
                ...getBoundedRuntimeStringContext('tenantId', tId),
                failurePolicy: 'return_500',
            });
            return { ok: false };
        }
        return { ok: true, store };
    } catch (error) {
        logRuntimeFailure('compliance_store_lookup_failed', error, {
            ...getBoundedRuntimeStringContext('storeId', sId),
            ...getBoundedRuntimeStringContext('tenantId', tId),
            failurePolicy: 'return_500',
        });
        return { ok: false };
    }
}
