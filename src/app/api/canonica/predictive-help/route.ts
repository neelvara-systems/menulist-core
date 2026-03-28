export const dynamic = 'force-dynamic';

/**
 * Canonica — Predictive Help API (Expansion Item #12)
 *
 * Returns proactive help suggestions based on user's current product context.
 * Called by the widget SDK on page entry (canon.page()).
 *
 * POST /api/canonica/predictive-help
 * Body: { page, feature?, workflow?, plan?, userRole?, entityHints?, userId }
 *
 * Auth: API key (widget) or withAuth (help center)
 * Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
 *
 * @see __docs__/canonica/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
import { evaluateTriggers } from '@lib/canonica/predictiveEngine';
import { validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import type { CanonicaContextPayload } from '@type/canonica';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Feature flag gate
        if (!FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) {
            return new NextResponse(null, { status: 204 });
        }

        // API key authentication (same pattern as widget search)
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return new NextResponse(null, { status: 204 });
        }

        const authResult = await validatePublicApiKey(apiKey);
        if (!authResult) {
            return new NextResponse(null, { status: 204 });
        }

        // Extract tenant context from authenticated API key (never trust body for tId/sId)
        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);

        const body = await request.json();
        const {
            page,
            feature,
            workflow,
            plan,
            userRole,
            entityHints,
            userId,
        } = body;

        // Validate required fields
        if (!page || typeof page !== 'string') {
            return new NextResponse(null, { status: 204 });
        }

        // Rate limiting per API key
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `canon-predict:${apiKey}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return new NextResponse(null, { status: 204 });
        }

        // Build context payload (reuses existing CanonicaContextPayload type)
        const context: CanonicaContextPayload = {
            page,
            feature: feature || undefined,
            workflow: workflow || undefined,
            plan: plan || undefined,
            userRole: userRole || undefined,
            entityHints: Array.isArray(entityHints) ? entityHints.slice(0, 5) : undefined,
        };

        // Evaluate triggers
        const suggestion = await evaluateTriggers(
            context,
            tId,
            sId,
            userId || 'anonymous'
        );

        if (!suggestion) {
            return new NextResponse(null, { status: 204 });
        }

        return NextResponse.json({ suggestion });

    } catch (error) {
        console.error('[Canonica Predictive Help] Error:', error);
        // Graceful degradation — never return errors to widget
        return new NextResponse(null, { status: 204 });
    }
}
