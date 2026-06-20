export const dynamic = 'force-dynamic';

/**
 * Answerlattice — Predictive Help API (Expansion Item #12)
 *
 * Returns proactive help suggestions based on user's current product context.
 * Called by the widget SDK on page entry (canon.page()).
 *
 * POST /api/answerlattice/predictive-help
 * Body: { page, feature?, workflow?, plan?, userRole?, entityHints?, userId }
 *
 * Auth: API key (widget) or withAuth (help center)
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 *
 * @see __docs__/answerlattice/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import { evaluateTriggers } from '@lib/answerlattice/predictiveEngine';
import { AnswerlatticeContextSchema } from '@lib/validation/contextSchema';
import { handlePublicApiCorsPreflight, hashApiKey, hasPublicApiCredentialScope, isRequestOriginAllowed, validatePublicApiKey, withPublicApiCors } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import type { AnswerlatticeContextPayload } from '@type/answerlattice';
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

const emptyCorsResponse = (request: NextRequest, init?: ResponseInit): NextResponse => (
    withPublicApiCors(new NextResponse(null, init), request)
);

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function POST(request: NextRequest) {
    try {
        // Feature flag gate
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
            return emptyCorsResponse(request, { status: 204 });
        }

        // API key authentication (same pattern as widget search)
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey) {
            return emptyCorsResponse(request, { status: 204 });
        }
        if (!apiKey.startsWith('al_')) {
            return emptyCorsResponse(request, { status: 204 });
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `canon-predict:${apiKeyRateLimitId}`,
            ...rateLimitConfig,
        });
        if (
            rateLimitResult.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && rateLimitResult.current === 0
            && rateLimitResult.remaining === rateLimitConfig.limit
        ) {
            return emptyCorsResponse(request, {
                status: 204,
                headers: { 'Cache-Control': 'no-store' },
            });
        }
        if (!rateLimitResult.allowed) {
            return emptyCorsResponse(request, {
                status: 204,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        });
        if (!authResult) {
            return emptyCorsResponse(request, { status: 204 });
        }
        const credential = authResult.credential || {};
        if (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE) {
            return emptyCorsResponse(request, { status: 204 });
        }
        if (credential.purpose && credential.purpose !== 'answerlattice_widget') {
            return emptyCorsResponse(request, { status: 204 });
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:predictive')) {
            return emptyCorsResponse(request, { status: 204 });
        }

        // Extract tenant context from authenticated API key (never trust body for tId/sId)
        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            secureError(
                '[Answerlattice Predictive Help] Invalid API key workspace context',
                new Error('Authenticated API key does not resolve to a valid tenant/store'),
                { storeId }
            );
            return emptyCorsResponse(request, { status: 204 });
        }

        const requestOrigin = request.headers.get('origin');
        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
            return emptyCorsResponse(request, { status: 204 });
        }

        const validation = PredictiveHelpRequestSchema.safeParse(await request.json().catch(() => null));
        if (!validation.success) {
            return emptyCorsResponse(request, { status: 204 });
        }
        const { page, feature, workflow, plan, userRole, entityHints, userId } = validation.data;

        const context = AnswerlatticeContextSchema.parse({
            page,
            feature: feature || undefined,
            workflow: workflow || undefined,
            plan: plan || undefined,
            userRole: userRole || undefined,
            entityHints,
        }) as AnswerlatticeContextPayload;
        if (!context.page) {
            return emptyCorsResponse(request, { status: 204 });
        }

        // Evaluate triggers
        const suggestion = await evaluateTriggers(
            context,
            tId,
            sId,
            hashApiKey(`${apiKeyRateLimitId}:${userId || 'anonymous'}`).slice(0, 24)
        );

        if (!suggestion) {
            return emptyCorsResponse(request, { status: 204 });
        }

        return withPublicApiCors(NextResponse.json({ suggestion }), request);

    } catch (error) {
        secureError('[Answerlattice Predictive Help] Error', error as Error);
        // Graceful degradation — never return errors to widget
        return emptyCorsResponse(request, { status: 204 });
    }
}
