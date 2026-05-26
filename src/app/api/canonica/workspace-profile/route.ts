export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { PRODUCT_IDS } from '@constant/product';
import { requireCanonicaPermission } from '@lib/canonica/accessControl';
import { markCanonicaCompiledContextSourceChangedAdmin } from '@lib/canonica/compiledSourceVersionsAdmin';
import {
    normalizeCanonicaBusinessDayEndTime,
    normalizeCanonicaTimeZone,
} from '@lib/canonica/schedulerSettings';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { upsertCanonicaTenantSummaryAdmin } from '@lib/canonica/tenantSummaryAdmin';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const OptionalUrlSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().url().max(300).optional(),
);
const OptionalEmailSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().email().max(160).optional(),
);
const WorkspaceProfileSchema = z.object({
    productName: z.string().trim().min(1).max(120),
    productUrl: OptionalUrlSchema,
    supportEmail: OptionalEmailSchema,
    billingModel: z.enum(['free', 'subscription', 'usage', 'one_time', 'not_sure']).default('subscription'),
    primarySurfaces: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
    timeZone: z.string().trim().max(80).optional(),
    businessDayEndTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const scope = resolveCanonicaSessionScope(session);
    if (!scope) return null;
    const tenantId = Number(scope.tenantId);
    const storeId = Number(scope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

const normalizePrimarySurfaces = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(
        values
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '_').replace(/_+/g, '_').slice(0, 80))
            .filter(Boolean)
    )).slice(0, 8);
};

const buildProfileResponse = (storeData: Record<string, any>) => ({
    productName: storeData.productName || storeData.name || '',
    productUrl: storeData.productUrl || '',
    supportEmail: storeData.supportEmail || '',
    billingModel: storeData.billingModel || 'subscription',
    primarySurfaces: normalizePrimarySurfaces(storeData.primarySurfaces),
    timeZone: normalizeCanonicaTimeZone(storeData.timeZone),
    businessDayEndTime: normalizeCanonicaBusinessDayEndTime(storeData.businessDayEndTime),
});

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
        return NextResponse.json({ error: 'Canonica is not enabled.' }, { status: 403 });
    }
    const permission = await requireCanonicaPermission(_request, session, CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getCanonicaDb();
    if (!db) return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });

    try {
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        const storeData = storeSnap.data() || {};
        const tenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(tenantId) && tenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json({ profile: buildProfileResponse(storeData) }, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        secureError('[Canonica Workspace Profile] Failed to load profile', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to load workspace profile' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
        return NextResponse.json({ error: 'Canonica is not enabled.' }, { status: 403 });
    }
    const permission = await requireCanonicaPermission(request, session, CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getCanonicaDb();
    if (!db) return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });

    try {
        const rateLimitResult = await checkRateLimit({
            key: `canonica-workspace-profile:${scope.storeId}`,
            limit: 20,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const parsed = WorkspaceProfileSchema.parse(await request.json().catch(() => null));
        const primarySurfaces = normalizePrimarySurfaces(parsed.primarySurfaces);
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        const storeData = storeSnap.data() || {};
        const tenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(tenantId) && tenantId !== scope.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const nextProfile = {
            productName: parsed.productName,
            productUrl: parsed.productUrl || '',
            supportEmail: parsed.supportEmail || '',
            billingModel: parsed.billingModel,
            primarySurfaces,
            timeZone: normalizeCanonicaTimeZone(parsed.timeZone),
            businessDayEndTime: normalizeCanonicaBusinessDayEndTime(parsed.businessDayEndTime),
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
            pId: PRODUCT_IDS.CANONICA,
            productId: PRODUCT_IDS.CANONICA,
            timeZone: nextProfile.timeZone,
            businessDayEndTime: nextProfile.businessDayEndTime,
            canonicaLaunchProfile: {
                ...nextProfile,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        await upsertCanonicaTenantSummaryAdmin({
            tId: scope.tenantId,
            sId: scope.storeId,
            source: 'workspace_profile_update',
            timeZone: nextProfile.timeZone,
            businessDayEndTime: nextProfile.businessDayEndTime,
        }).catch((summaryError) => {
            secureError('[Canonica Workspace Profile] Failed to sync scheduler summary', summaryError as Error, {
                storeId: scope.storeId,
                tenantId: scope.tenantId,
            });
        });
        await markCanonicaCompiledContextSourceChangedAdmin('workspaceProfile', scope.tenantId, scope.storeId, {
            reason: 'workspace_profile_update',
            sourceType: 'stores',
            sourceId: String(scope.storeId),
        }).catch((sourceVersionError) => {
            secureError('[Canonica Workspace Profile] Failed to mark compiled context stale', sourceVersionError as Error, {
                storeId: scope.storeId,
                tenantId: scope.tenantId,
            });
        });

        secureLog('[Canonica Workspace Profile] Saved', {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
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

        secureError('[Canonica Workspace Profile] Failed to save profile', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to save workspace profile' }, { status: 500 });
    }
});
