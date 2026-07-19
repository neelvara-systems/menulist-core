export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Config API
 *
 * Protected management endpoint for dashboard saves. The public widget runtime
 * reads the sanitized public subset from /api/widget/config.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { markAnswerlatticeCompiledContextSourceChangedAdmin } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { isAnswerlatticeStoreInScope, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { getWidgetRuntimeStatusFromStoreData } from '@lib/answerlattice/widgetRuntimeStatus';
import {
    ANSWERLATTICE_WIDGET_KEY_LIMIT,
    buildAnswerlatticeWidgetKeySummaries,
    normalizeAnswerlatticeWidgetApiState,
} from '@lib/answerlattice/widgetKeyManager';
import {
    ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
    parseWidgetConfigSaveInput,
    normalizeWidgetAllowedOrigins,
    normalizeWidgetConfig,
} from '@lib/answerlattice/widgetConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};
const WIDGET_CONFIG_SAVE_MAX_BODY_BYTES = 32 * 1024;
const widgetConfigJsonResponse = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
    ...init,
    headers: {
        'Cache-Control': 'private, no-store',
        ...(init.headers || {}),
    },
});
const withPrivateNoStore = <T extends NextResponse>(response: T): T => {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
};

const buildConfigResponse = (storeData: Record<string, any>) => ({
    schemaVersion: ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
    config: normalizeWidgetConfig(storeData.widgetConfig),
    allowedOrigins: normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins),
    keyPrefix: normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi).keyPrefix || null,
    hasWidgetKey: normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi).keyHashes.length > 0,
    keys: buildAnswerlatticeWidgetKeySummaries(storeData.answerlatticeWidgetApi),
    keyLimit: ANSWERLATTICE_WIDGET_KEY_LIMIT,
    encryptionConfigured: false,
    configVersion: Number(storeData.widgetConfigVersion || 0),
    runtimeStatus: getWidgetRuntimeStatusFromStoreData(storeData),
});

const widgetConfigEquals = (
    left: Record<string, any>,
    right: Record<string, any>,
): boolean => JSON.stringify(normalizeWidgetConfig(left)) === JSON.stringify(normalizeWidgetConfig(right));

const allowedOriginsEqual = (left: string[], right: string[]): boolean => {
    if (left.length !== right.length) return false;
    const leftSorted = [...left].sort();
    const rightSorted = [...right].sort();
    return leftSorted.every((origin, index) => origin === rightSorted[index]);
};

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return widgetConfigJsonResponse({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
    }
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'widget-config');
    if (rateLimitResponse) return withPrivateNoStore(rateLimitResponse);

    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return withPrivateNoStore(permission.response);

    const scope = resolveSessionScope(session);
    if (!scope) {
        return widgetConfigJsonResponse({ error: 'Not onboarded' }, { status: 400 });
    }
    const db = getAnswerlatticeDb();
    if (!db) {
        return widgetConfigJsonResponse({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    try {
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return widgetConfigJsonResponse({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return widgetConfigJsonResponse({ error: 'Forbidden' }, { status: 403 });
        }

        return widgetConfigJsonResponse(buildConfigResponse(storeData));
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_config_settings_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return widgetConfigJsonResponse({ error: 'Failed to load widget settings' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return widgetConfigJsonResponse({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
    }
    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return withPrivateNoStore(permission.response);

    const scope = resolveSessionScope(session);
    if (!scope) {
        return widgetConfigJsonResponse({ error: 'Not onboarded' }, { status: 400 });
    }
    const db = getAnswerlatticeDb();
    if (!db) {
        return widgetConfigJsonResponse({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-widget-config', scope.storeId),
            limit: 20,
            window: 60,
        });
        if (
            rateLimitResult.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && rateLimitResult.current === 0
            && rateLimitResult.remaining === 20
        ) {
            return widgetConfigJsonResponse({ error: 'Widget settings are temporarily unavailable' }, {
                status: 503,
                headers: { 'Cache-Control': 'no-store' },
            });
        }
        if (!rateLimitResult.allowed) {
            return widgetConfigJsonResponse({ error: 'Too many requests' }, {
                status: 429,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const bodyResult = await readBoundedJsonBody(request, WIDGET_CONFIG_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid widget settings',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return widgetConfigJsonResponse(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid widget settings' },
                { status: bodyResult.response.status },
            );
        }

        const body = bodyResult.data;
        const { config, allowedOrigins } = parseWidgetConfigSaveInput(body);

        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return widgetConfigJsonResponse({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return widgetConfigJsonResponse({ error: 'Forbidden' }, { status: 403 });
        }

        const existingConfig = normalizeWidgetConfig(storeData.widgetConfig);
        const existingOrigins = normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins);
        if (
            widgetConfigEquals(existingConfig, config)
            && allowedOriginsEqual(existingOrigins, allowedOrigins)
        ) {
            return widgetConfigJsonResponse(buildConfigResponse(storeData));
        }

        await storeRef.set({
            widgetConfig: config,
            widgetAllowedOrigins: allowedOrigins,
            widgetConfigSchemaVersion: ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
            widgetConfigUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            widgetConfigVersion: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
        await markAnswerlatticeCompiledContextSourceChangedAdmin('widgetConfig', scope.tenantId, scope.storeId, {
            reason: 'widget_config_update',
            sourceType: 'stores',
            sourceId: String(scope.storeId),
        }).catch((sourceVersionError) => {
            logRuntimeFailure('answerlattice_widget_config_compiled_context_stale_mark_failed', sourceVersionError, {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            });
        });

        logRuntimeDiagnostic('answerlattice_widget_config_saved', {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            originsCount: allowedOrigins.length,
        });

        return widgetConfigJsonResponse({
            schemaVersion: ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
            config,
            allowedOrigins,
            keyPrefix: normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi).keyPrefix || null,
            hasWidgetKey: normalizeAnswerlatticeWidgetApiState(storeData.answerlatticeWidgetApi).keyHashes.length > 0,
            keys: buildAnswerlatticeWidgetKeySummaries(storeData.answerlatticeWidgetApi),
            keyLimit: ANSWERLATTICE_WIDGET_KEY_LIMIT,
            encryptionConfigured: false,
            configVersion: Number(storeData.widgetConfigVersion || 0) + 1,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return widgetConfigJsonResponse({ error: 'Invalid widget settings' }, { status: 400 });
        }

        logRuntimeFailure('answerlattice_widget_config_settings_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return widgetConfigJsonResponse({ error: 'Failed to save widget settings' }, { status: 500 });
    }
});
