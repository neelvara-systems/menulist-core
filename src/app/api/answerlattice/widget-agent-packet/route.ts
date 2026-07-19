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
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { isAnswerlatticeStoreInScope, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { normalizeAnswerlatticeWidgetApiState } from '@lib/answerlattice/widgetKeyManager';
import { normalizeWidgetAllowedOrigins, normalizeWidgetConfig } from '@lib/answerlattice/widgetConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const PRIVATE_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};
const packetJsonResponse = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
    ...init,
    headers: {
        ...PRIVATE_NO_STORE_HEADERS,
        ...(init.headers || {}),
    },
});
const withPrivateNoStore = <T extends NextResponse>(response: T): T => {
    response.headers.set('Cache-Control', PRIVATE_NO_STORE_HEADERS['Cache-Control']);
    response.headers.set('X-Content-Type-Options', PRIVATE_NO_STORE_HEADERS['X-Content-Type-Options']);
    return response;
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AGENT_INSTALL) {
        return packetJsonResponse({ error: 'Answerlattice agent install is not enabled.' }, { status: 403 });
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope?.tenantId || !scope?.storeId) {
        return packetJsonResponse({ error: 'Not onboarded' }, { status: 400 });
    }
    const userId = String(session.uId || session.user?.id || 'unknown');

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-widget-agent-packet',
                userId,
                scope.tenantId,
                scope.storeId,
            ),
            limit: 30,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return packetJsonResponse({ error: 'Too many requests' }, { status: 429 });
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return withPrivateNoStore(permission.response);

        const db = getAnswerlatticeDb();
        if (!db) {
            return packetJsonResponse({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
        }

        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return packetJsonResponse({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return packetJsonResponse({ error: 'Forbidden' }, { status: 403 });
        }

        const widgetState = normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi);
        const config = normalizeWidgetConfig(storeData.widgetConfig);
        const input = {
            widgetKeyPrefix: widgetState.keyPrefix || null,
            allowedOrigins: normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins),
            blockedRoutes: config.blockedRoutes,
        };

        return packetJsonResponse({
            packet: buildAnswerlatticeAgentPacketJson(input),
            prompt: renderAnswerlatticeAgentPrompt(input),
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_agent_packet_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return packetJsonResponse({ error: 'Failed to build install packet' }, { status: 500 });
    }
});
