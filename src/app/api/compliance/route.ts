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
import { deleteComplianceOverrideServer, getComplianceOverridesServer, saveComplianceOverrideServer } from '@database/compliance/server';
import { sanitizeComplianceContent } from '@lib/compliance/sanitizer';
import { composeComplianceContent, extractComplianceInputs, generateComplianceContent } from '@lib/compliance/templates';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { NextRequest, NextResponse } from 'next/server';
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

    const { sId, tId } = session;
    if (!sId || !tId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

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
    const overrides = await getComplianceOverridesServer(sId);

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

    const { sId, tId } = session;
    if (!sId || !tId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

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

        return NextResponse.json({
            action,
            success: true,
            type,
            message: `${pageLabel} updated with your custom content.`,
        });
    }

    if (action === 'reset') {
        await deleteComplianceOverrideServer(sId, type);

        return NextResponse.json({
            action,
            success: true,
            type,
            message: `${pageLabel} reset to default.`,
        });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
});

/**
 * Helper: Get store data by storeId
 */
async function getStoreData(sId: number, tId?: number): Promise<ComplianceStoreLookupResult> {
    try {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .doc(String(sId))
            .get();
        if (!snapshot.exists || snapshot.data()?.active === false) return { ok: true, store: null };
        return { ok: true, store: snapshot.data() };
    } catch (error) {
        logRuntimeFailure('compliance_store_lookup_failed', error, {
            ...getBoundedRuntimeStringContext('storeId', sId),
            ...getBoundedRuntimeStringContext('tenantId', tId),
            failurePolicy: 'return_500',
        });
        return { ok: false };
    }
}
