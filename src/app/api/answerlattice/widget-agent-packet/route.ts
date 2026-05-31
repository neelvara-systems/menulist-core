export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Agent Packet API
 *
 * Protected dashboard endpoint that returns a workspace-specific install packet
 * without exposing the raw widget key. The full key is copied only through the
 * existing widget-key flow.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeAgentPacketJson, renderAnswerlatticeAgentPrompt } from '@lib/answerlattice/installContract/contract';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticeWidgetApiState } from '@lib/answerlattice/widgetKeyManager';
import { normalizeWidgetAllowedOrigins, normalizeWidgetConfig } from '@lib/answerlattice/widgetConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
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

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope?.tenantId || !scope?.storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    const rateLimitResult = await checkRateLimit({
        key: `answerlattice-widget-agent-packet:${scope.storeId}`,
        limit: 30,
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

        const widgetState = normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi);
        const config = normalizeWidgetConfig(storeData.widgetConfig);
        const input = {
            widgetKeyPrefix: widgetState.keyPrefix || storeData.publicApi?.keyPrefix || null,
            allowedOrigins: normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins),
            blockedRoutes: config.blockedRoutes,
        };

        return NextResponse.json({
            packet: buildAnswerlatticeAgentPacketJson(input),
            prompt: renderAnswerlatticeAgentPrompt(input),
        });
    } catch (error) {
        secureError('[Answerlattice Widget Agent Packet] Failed to build packet', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to build install packet' }, { status: 500 });
    }
});
