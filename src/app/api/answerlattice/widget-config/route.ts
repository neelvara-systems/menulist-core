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
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
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

    const tenantId = Number(answerlatticeScope.tenantId);
    const storeId = Number(answerlatticeScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};
const WIDGET_CONFIG_SAVE_MAX_BODY_BYTES = 32 * 1024;

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
        return NextResponse.json({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
    }
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'widget-config');
    if (rateLimitResponse) return rateLimitResponse;

    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    try {
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(buildConfigResponse(storeData));
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_config_settings_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to load widget settings' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return NextResponse.json({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
    }
    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
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
            return NextResponse.json({ error: 'Widget settings are temporarily unavailable' }, {
                status: 503,
                headers: { 'Cache-Control': 'no-store' },
            });
        }
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, {
                status: 429,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const bodyResult = await readBoundedJsonBody(request, WIDGET_CONFIG_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid widget settings',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid widget settings' },
                { status: bodyResult.response.status },
            );
        }

        const body = bodyResult.data;
        const { config, allowedOrigins } = parseWidgetConfigSaveInput(body);

        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const existingConfig = normalizeWidgetConfig(storeData.widgetConfig);
        const existingOrigins = normalizeWidgetAllowedOrigins(storeData.widgetAllowedOrigins);
        if (
            widgetConfigEquals(existingConfig, config)
            && allowedOriginsEqual(existingOrigins, allowedOrigins)
        ) {
            return NextResponse.json(buildConfigResponse(storeData));
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

        return NextResponse.json({
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
            return NextResponse.json({ error: 'Invalid widget settings' }, { status: 400 });
        }

        logRuntimeFailure('answerlattice_widget_config_settings_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to save widget settings' }, { status: 500 });
    }
});
