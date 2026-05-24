export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { buildCanonicaContextBundleServer } from '@lib/canonica/contextBundleBuilderServer';
import { canUseCanonicaManagement, resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const RebuildRequestSchema = z.object({
    reason: z.string().trim().min(1).max(80).optional().default('manual'),
    force: z.boolean().optional().default(false),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_CANONICA_BUNDLE_BUILDER) {
        return NextResponse.json({ error: 'Compiled context bundles are not enabled.' }, { status: 404 });
    }

    if (!canUseCanonicaManagement(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const scope = resolveCanonicaSessionScope(session);
    const tenantId = Number(scope?.tenantId);
    const storeId = Number(scope?.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return NextResponse.json({ error: 'Canonica workspace is not available.' }, { status: 400 });
    }

    try {
        const rateLimit = await checkRateLimit({
            key: `canonica-context-bundle:rebuild:${tenantId}:${storeId}`,
            limit: 4,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: 'Too many rebuild requests.' }, { status: 429 });
        }

        const parsed = RebuildRequestSchema.parse(await request.json().catch(() => ({})));
        const manifest = await buildCanonicaContextBundleServer({
            tId: tenantId,
            sId: storeId,
            reason: parsed.reason,
            requestedBy: session.user?.id || session.user?.email || 'owner',
            force: parsed.force,
        });

        secureLog('[Canonica Bundles] Rebuilt compiled context', {
            tenantId,
            storeId,
            status: manifest.status,
            bundleVersion: manifest.bundleVersion,
            bytesTotal: manifest.stats?.bytesTotal || 0,
        });

        return NextResponse.json({
            ok: manifest.status === 'ready',
            manifest: {
                status: manifest.status,
                bundleVersion: manifest.bundleVersion,
                activeVersion: manifest.activeVersion,
                lastReadyVersion: manifest.lastReadyVersion,
                stats: manifest.stats,
                lastBuildError: manifest.lastBuildError || null,
                staleReason: manifest.staleReason || null,
            },
        });
    } catch (error) {
        secureError('[Canonica Bundles] Failed to rebuild compiled context', error as Error, {
            tenantId,
            storeId,
        });
        return NextResponse.json({ error: 'Failed to rebuild compiled context.' }, { status: 500 });
    }
});
