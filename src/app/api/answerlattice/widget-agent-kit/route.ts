export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Agent Kit API
 *
 * Protected dashboard ZIP download. It includes only key prefix, allowed origins,
 * blocked routes, and v1 contract files generated from the Answerlattice install
 * source of truth.
 */

import JSZip from 'jszip';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeAgentKitFiles } from '@lib/answerlattice/installContract/contract';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { isAnswerlatticeStoreInScope, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticeWidgetApiState } from '@lib/answerlattice/widgetKeyManager';
import { normalizeWidgetAllowedOrigins, normalizeWidgetConfig } from '@lib/answerlattice/widgetConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AGENT_INSTALL) {
        return NextResponse.json({ error: 'Answerlattice agent install is not enabled.' }, { status: 403 });
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope?.tenantId || !scope?.storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-agent-kit', scope.storeId),
            limit: 10,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return permission.response;

        const db = getAnswerlatticeDb();
        if (!db) {
            return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
        }

        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const widgetState = normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi);
        const config = normalizeWidgetConfig(storeData.widgetConfig);
        const files = buildAnswerlatticeAgentKitFiles({
            widgetKeyPrefix: widgetState.keyPrefix || null,
            allowedOrigins: normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins),
            blockedRoutes: config.blockedRoutes,
        });

        const zip = new JSZip();
        Object.entries(files).forEach(([filePath, content]) => {
            zip.file(`answerlattice-agent-kit/${filePath}`, content);
        });
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="answerlattice-agent-kit.zip"',
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_agent_kit_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to build agent kit' }, { status: 500 });
    }
});
