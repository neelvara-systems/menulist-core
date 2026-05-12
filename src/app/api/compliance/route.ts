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
import { deleteComplianceOverride, getComplianceOverrides, saveComplianceOverride } from '@database/compliance';
import { sanitizeComplianceContent } from '@lib/compliance/sanitizer';
import { composeComplianceContent, extractComplianceInputs, generateComplianceContent } from '@lib/compliance/templates';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../middleware/auth';

const OverrideSchema = z.object({
    type: z.enum(['privacy', 'terms', 'refund']),
    action: z.enum(['override', 'reset']),
    content: z.string().max(15000).optional(),
});

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
    const store = await getStoreData(sId);
    const inputs = store ? extractComplianceInputs(store) : null;

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
    const overrides = await getComplianceOverrides(sId);

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

    const body = await request.json();
    const validation = OverrideSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: validation.error.flatten() },
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

        await saveComplianceOverride(sId, tId, type, sanitized);

        return NextResponse.json({
            success: true,
            message: `${pageLabel} updated with your custom content.`,
        });
    }

    if (action === 'reset') {
        await deleteComplianceOverride(sId, type);

        return NextResponse.json({
            success: true,
            message: `${pageLabel} reset to default.`,
        });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
});

/**
 * Helper: Get store data by storeId
 */
async function getStoreData(sId: number): Promise<any | null> {
    try {
        const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
        const q = query(
            storesRef,
            where('storeId', '==', sId),
            where('active', '==', true),
            limit(1),
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return snapshot.docs[0].data();
    } catch {
        return null;
    }
}
