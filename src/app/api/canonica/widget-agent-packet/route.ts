export const dynamic = 'force-dynamic';

/**
 * Canonica Widget Agent Packet API
 *
 * Protected dashboard endpoint that returns a workspace-specific install packet
 * without exposing the raw widget key. The full key is copied only through the
 * existing widget-key flow.
 */

import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireCanonicaPermission } from '@lib/canonica/accessControl';
import { buildCanonicaAgentPacketJson, renderCanonicaAgentPrompt } from '@lib/canonica/installContract/contract';
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
        key: `canonica-widget-agent-packet:${scope.storeId}`,
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

        const widgetState = normalizeCanonicaWidgetApiState(storeData.canonicaWidgetApi);
        const config = normalizeWidgetConfig(storeData.widgetConfig);
        const input = {
            widgetKeyPrefix: widgetState.keyPrefix || storeData.publicApi?.keyPrefix || null,
            allowedOrigins: normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins),
            blockedRoutes: config.blockedRoutes,
        };

        return NextResponse.json({
            packet: buildCanonicaAgentPacketJson(input),
            prompt: renderCanonicaAgentPrompt(input),
        });
    } catch (error) {
        secureError('[Canonica Widget Agent Packet] Failed to build packet', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to build install packet' }, { status: 500 });
    }
});
