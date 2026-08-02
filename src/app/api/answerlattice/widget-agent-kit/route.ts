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
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { normalizeAnswerlatticeWidgetApiState } from '@lib/answerlattice/widgetKeyManager';
import { normalizeWidgetAllowedOrigins, normalizeWidgetConfig } from '@lib/answerlattice/widgetConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const ANSWERLATTICE_AGENT_KIT_MAX_BYTES = 2 * 1024 * 1024;
const PRIVATE_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};
const kitJsonResponse = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
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
    return answerlatticeFirestoreAdmin;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_AGENT_INSTALL) {
        return kitJsonResponse({ error: 'Answerlattice agent install is not enabled.' }, { status: 403 });
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope?.tenantId || !scope?.storeId) {
        return kitJsonResponse({ error: 'Not onboarded' }, { status: 400 });
    }
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return kitJsonResponse({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-widget-agent-kit',
                userId,
                scope.tenantId,
                scope.storeId,
            ),
            limit: 10,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            return kitJsonResponse(
                { error: providerUnavailable ? 'Agent kit is temporarily unavailable' : 'Too many requests' },
                { status: providerUnavailable ? 503 : 429 },
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
        if (permission.response) return withPrivateNoStore(permission.response);

        const db = getAnswerlatticeDb();
        if (!db) {
            return kitJsonResponse({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
        }

        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return kitJsonResponse({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return kitJsonResponse({ error: 'Forbidden' }, { status: 403 });
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
        if (buffer.byteLength === 0 || buffer.byteLength > ANSWERLATTICE_AGENT_KIT_MAX_BYTES) {
            throw new Error('answerlattice_widget_agent_kit_size_invalid');
        }

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="answerlattice-agent-kit.zip"',
                ...PRIVATE_NO_STORE_HEADERS,
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_agent_kit_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return kitJsonResponse({ error: 'Failed to build agent kit' }, { status: 500 });
    }
});
