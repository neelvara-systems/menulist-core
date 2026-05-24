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
import { CanonicaContextSchema } from '@lib/validation/contextSchema';
import { handlePublicApiCorsPreflight, hashApiKey, hasPublicApiCredentialScope, isRequestOriginAllowed, validatePublicApiKey, withPublicApiCors } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import type { CanonicaContextPayload } from '@type/canonica';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PredictiveHelpRequestSchema = z.object({
    page: z.string().trim().min(1).max(200),
    feature: z.string().trim().max(200).optional(),
    workflow: z.string().trim().max(200).optional(),
    plan: z.string().trim().max(80).optional(),
    userRole: z.string().trim().max(80).optional(),
    entityHints: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
    userId: z.string().trim().max(160).optional(),
});
const WIDGET_AUTH_CACHE_TTL_MS = 15_000;

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function POST(request: NextRequest) {
    try {
        // Feature flag gate
        if (!FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) {
            return new NextResponse(null, { status: 204 });
        }

        // API key authentication (same pattern as widget search)
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey) {
            return new NextResponse(null, { status: 204 });
        }
        if (!apiKey.startsWith('cn_')) {
            return new NextResponse(null, { status: 204 });
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `canon-predict:${apiKeyRateLimitId}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return new NextResponse(null, { status: 204 });
        }

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeCanonicaWidgetApi: true,
            preferCanonicaWidgetApi: true,
        });
        if (!authResult) {
            return new NextResponse(null, { status: 204 });
        }
        const credential = authResult.credential || {};
        if (credential.productId && credential.productId !== 'CN') {
            return new NextResponse(null, { status: 204 });
        }
        if (credential.purpose && !String(credential.purpose).startsWith('canonica')) {
            return new NextResponse(null, { status: 204 });
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:predictive')) {
            return new NextResponse(null, { status: 204 });
        }

        // Extract tenant context from authenticated API key (never trust body for tId/sId)
        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            secureError(
                '[Canonica Predictive Help] Invalid API key workspace context',
                new Error('Authenticated API key does not resolve to a valid tenant/store'),
                { storeId }
            );
            return new NextResponse(null, { status: 204 });
        }

        const requestOrigin = request.headers.get('origin');
        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
            return new NextResponse(null, { status: 204 });
        }

        const validation = PredictiveHelpRequestSchema.safeParse(await request.json());
        if (!validation.success) {
            return new NextResponse(null, { status: 204 });
        }
        const { page, feature, workflow, plan, userRole, entityHints, userId } = validation.data;

        const context = CanonicaContextSchema.parse({
            page,
            feature: feature || undefined,
            workflow: workflow || undefined,
            plan: plan || undefined,
            userRole: userRole || undefined,
            entityHints,
        }) as CanonicaContextPayload;
        if (!context.page) {
            return new NextResponse(null, { status: 204 });
        }

        // Evaluate triggers
        const suggestion = await evaluateTriggers(
            context,
            tId,
            sId,
            hashApiKey(`${apiKeyRateLimitId}:${userId || 'anonymous'}`).slice(0, 24)
        );

        if (!suggestion) {
            return new NextResponse(null, { status: 204 });
        }

        return withPublicApiCors(NextResponse.json({ suggestion }), request);

    } catch (error) {
        secureError('[Canonica Predictive Help] Error', error as Error);
        // Graceful degradation — never return errors to widget
        return new NextResponse(null, { status: 204 });
    }
}
