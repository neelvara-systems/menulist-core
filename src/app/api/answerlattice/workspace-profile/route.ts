export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { markAnswerlatticeCompiledContextSourceChangedAdmin } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    normalizeAnswerlatticeBusinessDayEndTime,
    normalizeAnswerlatticeTimeZone,
} from '@lib/answerlattice/schedulerSettings';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { upsertAnswerlatticeTenantSummaryAdmin } from '@lib/answerlattice/tenantSummaryAdmin';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const OptionalUrlSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().url().max(300).optional(),
);
const OptionalEmailSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().email().max(160).optional(),
);
const WORKSPACE_BILLING_MODEL_VALUES = ['subscription', 'usage', 'one_time', 'not_sure'] as const;
type WorkspaceBillingModel = typeof WORKSPACE_BILLING_MODEL_VALUES[number];

const WorkspaceProfileSchema = z.object({
    productName: z.string().trim().min(1).max(120),
    productUrl: OptionalUrlSchema,
    supportEmail: OptionalEmailSchema,
    billingModel: z.enum(WORKSPACE_BILLING_MODEL_VALUES).default('subscription'),
    primarySurfaces: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    timeZone: z.string().trim().max(80).optional(),
    businessDayEndTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
}).strict();

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return null;
    return { tenantId: scope.tenantId, storeId: scope.storeId };
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};
const WORKSPACE_PROFILE_SAVE_MAX_BODY_BYTES = 32 * 1024;

const normalizePrimarySurfaces = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(
        values
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_').slice(0, 80))
            .filter(Boolean)
    )).slice(0, 8);
};

const normalizeWorkspaceBillingModel = (value: unknown): WorkspaceBillingModel => {
    const normalized = String(value || '').trim();
    return (WORKSPACE_BILLING_MODEL_VALUES as readonly string[]).includes(normalized)
        ? normalized as WorkspaceBillingModel
        : 'subscription';
};

const buildProfileResponse = (storeData: Record<string, any>) => ({
    productName: storeData.productName || storeData.name || '',
    productUrl: storeData.productUrl || '',
    supportEmail: storeData.supportEmail || '',
    billingModel: normalizeWorkspaceBillingModel(storeData.billingModel),
    primarySurfaces: normalizePrimarySurfaces(storeData.primarySurfaces),
    timeZone: normalizeAnswerlatticeTimeZone(storeData.timeZone),
    businessDayEndTime: normalizeAnswerlatticeBusinessDayEndTime(storeData.businessDayEndTime),
});

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return NextResponse.json({ error: 'Answerlattice is not enabled.' }, { status: 403 });
    }
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'workspace-profile');
    if (rateLimitResponse) return rateLimitResponse;

    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getAnswerlatticeDb();
    if (!db) return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });

    try {
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        const storeData = storeSnap.data() || {};
        const tenantId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
        if (tenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json({ profile: buildProfileResponse(storeData) }, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_workspace_profile_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to load workspace profile' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return NextResponse.json({ error: 'Answerlattice is not enabled.' }, { status: 403 });
    }
    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getAnswerlatticeDb();
    if (!db) return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-workspace-profile', scope.storeId),
            limit: 20,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, WORKSPACE_PROFILE_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid workspace profile',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid workspace profile' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = WorkspaceProfileSchema.parse(bodyResult.data);
        const primarySurfaces = normalizePrimarySurfaces(parsed.primarySurfaces);
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        const storeData = storeSnap.data() || {};
        const tenantId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
        if (tenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const nextProfile = {
            productName: parsed.productName,
            productUrl: parsed.productUrl || '',
            supportEmail: parsed.supportEmail || '',
            billingModel: parsed.billingModel,
            primarySurfaces,
            timeZone: normalizeAnswerlatticeTimeZone(parsed.timeZone),
            businessDayEndTime: normalizeAnswerlatticeBusinessDayEndTime(parsed.businessDayEndTime),
        };
        const currentProfile = buildProfileResponse(storeData);
        if (JSON.stringify(currentProfile) === JSON.stringify(nextProfile)) {
            return NextResponse.json({ profile: currentProfile }, {
                headers: {
                    'Cache-Control': 'private, no-store',
                },
            });
        }

        await storeRef.set({
            ...nextProfile,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            timeZone: nextProfile.timeZone,
            businessDayEndTime: nextProfile.businessDayEndTime,
            answerlatticeLaunchProfile: {
                ...nextProfile,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await upsertAnswerlatticeTenantSummaryAdmin({
            tId: scope.tenantId,
            sId: scope.storeId,
            source: 'workspace_profile_update',
            timeZone: nextProfile.timeZone,
            businessDayEndTime: nextProfile.businessDayEndTime,
        }).catch((summaryError) => {
            logRuntimeFailure('answerlattice_workspace_profile_tenant_summary_sync_failed', summaryError, {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            });
        });
        await markAnswerlatticeCompiledContextSourceChangedAdmin('workspaceProfile', scope.tenantId, scope.storeId, {
            reason: 'workspace_profile_update',
            sourceType: 'stores',
            sourceId: String(scope.storeId),
        }).catch((sourceVersionError) => {
            logRuntimeFailure('answerlattice_workspace_profile_compiled_context_stale_mark_failed', sourceVersionError, {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            });
        });

        logRuntimeDiagnostic('answerlattice_workspace_profile_saved', {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            primarySurfaceCount: primarySurfaces.length,
        });

        return NextResponse.json({ profile: nextProfile }, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: 'Invalid workspace profile' }, { status: 400 });
        }

        logRuntimeFailure('answerlattice_workspace_profile_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to save workspace profile' }, { status: 500 });
    }
});
