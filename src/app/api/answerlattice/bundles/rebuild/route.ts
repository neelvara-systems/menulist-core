export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeContextBundleServer } from '@lib/answerlattice/contextBundleBuilderServer';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
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
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_BUNDLE_BUILDER) {
        return NextResponse.json({ error: 'Compiled context bundles are not enabled.' }, { status: 404 });
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT);
    if (permission.response) return permission.response;

    const scope = resolveAnswerlatticeSessionScope(session);
    const tenantId = Number(scope?.tenantId);
    const storeId = Number(scope?.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available.' }, { status: 400 });
    }

    try {
        const rateLimit = await checkRateLimit({
            key: `answerlattice-context-bundle:rebuild:${tenantId}:${storeId}`,
            limit: 4,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: 'Too many rebuild requests.' }, { status: 429 });
        }

        const parsed = RebuildRequestSchema.parse(await request.json().catch(() => ({})));
        const manifest = await buildAnswerlatticeContextBundleServer({
            tId: tenantId,
            sId: storeId,
            reason: parsed.reason,
            requestedBy: session.user?.id || session.user?.email || 'owner',
            force: parsed.force,
        });

        secureLog('[Answerlattice Bundles] Rebuilt compiled context', {
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
                lastBuildError: manifest.lastBuildError ? 'Compiled context rebuild failed. Check platform logs.' : null,
                staleReason: manifest.staleReason || null,
            },
        });
    } catch (error) {
        secureError('[Answerlattice Bundles] Failed to rebuild compiled context', error as Error, {
            tenantId,
            storeId,
        });
        return NextResponse.json({ error: 'Failed to rebuild compiled context.' }, { status: 500 });
    }
});
