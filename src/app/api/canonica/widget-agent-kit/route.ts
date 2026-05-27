export const dynamic = 'force-dynamic';

/**
 * Canonica Widget Agent Kit API
 *
 * Protected dashboard ZIP download. It includes only key prefix, allowed origins,
 * blocked routes, and v1 contract files generated from the Canonica install
 * source of truth.
 */

import JSZip from 'jszip';
import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireCanonicaPermission } from '@lib/canonica/accessControl';
import { buildCanonicaAgentKitFiles } from '@lib/canonica/installContract/contract';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { normalizeCanonicaWidgetApiState } from '@lib/canonica/widgetKeyManager';
import { normalizeWidgetAllowedOrigins, normalizeWidgetConfig } from '@lib/canonica/widgetConfig';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET || !FEATURE_FLAGS.ENABLE_CANONICA_AGENT_INSTALL) {
        return NextResponse.json({ error: 'Canonica agent install is not enabled.' }, { status: 403 });
    }

    const permission = await requireCanonicaPermission(request, session, CANONICA_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveCanonicaSessionScope(session);
    if (!scope?.tenantId || !scope?.storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getCanonicaDb();
    if (!db) {
        return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });
    }

    const rateLimitResult = await checkRateLimit({
        key: `canonica-widget-agent-kit:${scope.storeId}`,
        limit: 10,
        window: 60,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== Number(scope.tenantId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const widgetState = normalizeCanonicaWidgetApiState(storeData.canonicaWidgetApi);
        const config = normalizeWidgetConfig(storeData.widgetConfig);
        const files = buildCanonicaAgentKitFiles({
            widgetKeyPrefix: widgetState.keyPrefix || storeData.publicApi?.keyPrefix || null,
            allowedOrigins: normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins),
            blockedRoutes: config.blockedRoutes,
        });

        const zip = new JSZip();
        Object.entries(files).forEach(([filePath, content]) => {
            zip.file(`canonica-agent-kit/${filePath}`, content);
        });
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="canonica-agent-kit.zip"',
                'Cache-Control': 'private, max-age=60',
            },
        });
    } catch (error) {
        secureError('[Canonica Widget Agent Kit] Failed to build kit', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to build agent kit' }, { status: 500 });
    }
});
