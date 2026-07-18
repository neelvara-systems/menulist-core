export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { getBusinessAnalyticsDateKey, resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { addDaysToAnalyticsDateKey } from '@lib/analytics/dateKey';
import { getResolvedAnalyticsPreferences, type ResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { normalizeAnalyticsDateKey } from '@lib/analytics/readBoundary';
import { isValidAnalyticsTimeZone } from '@lib/analytics/timeZoneDiagnostics';
import { filterAnalyticsUpdateData } from '@lib/analytics/writePolicy';
import { writePublicAnalyticsEventAdmin } from '@lib/analytics/serverWrite';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { withCORS } from '@lib/security/corsValidation';
import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit } from 'src/middleware/publicApi';
import { z } from 'zod';

const AnalyticsValueSchema = z.union([
    z.number().finite().min(0).max(1000),
    z.string().max(300),
    z.boolean(),
    z.null(),
]);

const AnalyticsTrackSchema = z.object({
    tenantId: z.union([z.string().regex(/^\d{1,20}$/), z.number().int().positive()]),
    storeId: z.union([z.string().regex(/^\d{1,20}$/), z.number().int().positive()]),
    projectId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/).refine(isValidFirestoreDocumentId, 'Invalid project ID'),
    dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    storeTimeZone: z.string().trim().max(80).optional(),
    businessDayEndTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    updateData: z.record(
        z.string().min(1).max(180),
        AnalyticsValueSchema,
    ).refine((data) => Object.keys(data).length <= 100, {
        message: 'Too many analytics fields.',
    }),
});

const RESERVED_PROJECT_IDS = new Set(['obp', 'customerApp']);
const PUBLIC_ANALYTICS_TRACK_MAX_BODY_BYTES = 64 * 1024;

type PublicAnalyticsNumericDocumentId = {
    documentId: string;
    numericId: number;
};

function normalizePublicAnalyticsNumericDocumentId(value: unknown): PublicAnalyticsNumericDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !/^\d+$/.test(documentId) || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { documentId, numericId }
        : null;
}

type ValidatedAnalyticsTarget = {
    analyticsPreferences: ResolvedAnalyticsPreferences;
    businessDayEndTime?: string;
    storeTimeZone?: string;
};

async function validateAnalyticsTargetUncached(
    tenantId: string,
    storeId: string,
    projectId: string,
): Promise<ValidatedAnalyticsTarget | null> {
    const storeSnap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get();
    if (!storeSnap.exists) return null;

    const store = storeSnap.data() || {};
    const storeTenantId = String(store.tenantId ?? store.tId ?? '');
    if (storeTenantId !== tenantId) return null;
    if (store.active === false || store.deleted === true || isPlatformEntityBlocked(store)) return null;

    const tenantSnap = await firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantId).get();
    const tenant = tenantSnap.data();
    if (
        !tenantSnap.exists
        || tenant?.active === false
        || tenant?.deleted === true
        || isPlatformEntityBlocked(tenant)
    ) return null;

    const rawStoreTimeZone = typeof store.timeZone === 'string' ? store.timeZone.trim() : '';
    const target: ValidatedAnalyticsTarget = {
        analyticsPreferences: getResolvedAnalyticsPreferences(store.analytics || null),
        businessDayEndTime: resolveBusinessDayEndTime(
            store.businessType,
            store.businessDayEndTime,
            store.businessCategory,
        ),
        storeTimeZone: rawStoreTimeZone && isValidAnalyticsTimeZone(rawStoreTimeZone, 'analytics_date_key')
            ? rawStoreTimeZone
            : undefined,
    };

    if (RESERVED_PROJECT_IDS.has(projectId)) return target;

    const summarySnap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${storeId}`)
        .get();
    if (!summarySnap.exists) return null;

    const projects = parseSummaryProjects(summarySnap.data());
    const project = projects[projectId];
    return project && project.active !== false && project.deleted !== true ? target : null;
}

const validateAnalyticsTarget = unstable_cache(
    validateAnalyticsTargetUncached,
    ['public-analytics-target'],
    { revalidate: 300, tags: ['client-stores'] },
);

const DECISION_ANALYTICS_KEY_PREFIXES = [
    'decisionBlocksRendered',
    'hourlyDecisionBlocksRendered',
    'hourlyRecommendationClicks',
    'recommendationClicks',
    'recommendationClicksByItem',
    'totalDecisionBlocksRendered',
    'totalRecommendationClicks',
];

function isAnalyticsSurfaceEnabled(
    projectId: string,
    preferences: ResolvedAnalyticsPreferences,
): boolean {
    if (projectId === 'obp') return preferences.trackOfficialBusinessPage;
    if (projectId === 'customerApp') return preferences.trackCustomerApp;
    return preferences.trackMenuViews;
}

function filterAnalyticsFieldsForPreferences(
    updateData: Record<string, string | number | boolean | null>,
    preferences: ResolvedAnalyticsPreferences,
): Record<string, string | number | boolean | null> {
    if (preferences.trackDecisionBlocks) return updateData;

    return Object.fromEntries(
        Object.entries(updateData).filter(([key]) => !DECISION_ANALYTICS_KEY_PREFIXES.some(
            (prefix) => key === prefix || key.startsWith(`${prefix}.`),
        )),
    );
}

function resolveAcceptedDate(
    requestedDate: string | undefined,
    storeTimeZone?: string,
    businessDayEndTime?: string,
) {
    const currentDate = getBusinessAnalyticsDateKey(new Date(), storeTimeZone, businessDayEndTime);
    const dateString = normalizeAnalyticsDateKey(requestedDate || currentDate);
    const oldestAcceptedDate = addDaysToAnalyticsDateKey(currentDate, -1);

    if (!dateString || dateString < oldestAcceptedDate || dateString > currentDate) {
        return null;
    }

    return dateString;
}

async function postAnalyticsTrack(req: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(req, 'PUBLIC_ANALYTICS');
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(req, PUBLIC_ANALYTICS_TRACK_MAX_BODY_BYTES);
    if (bodyResult.ok === false) {
        return NextResponse.json(
            {
                success: false,
                error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid JSON body.',
            },
            { status: bodyResult.response.status },
        );
    }

    const validation = AnalyticsTrackSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return NextResponse.json({ success: false, error: 'Validation failed.' }, { status: 400 });
    }

    const data = validation.data;
    const tenantScope = normalizePublicAnalyticsNumericDocumentId(data.tenantId);
    const storeScope = normalizePublicAnalyticsNumericDocumentId(data.storeId);
    if (!tenantScope || !storeScope) {
        return NextResponse.json({ success: false, error: 'Validation failed.' }, { status: 400 });
    }
    const tenantId = tenantScope.documentId;
    const storeId = storeScope.documentId;
    if (data.dateString && !normalizeAnalyticsDateKey(data.dateString)) {
        return NextResponse.json({ success: false, error: 'Invalid analytics date.' }, { status: 400 });
    }

    try {
        const validTarget = await validateAnalyticsTarget(tenantId, storeId, data.projectId);
        if (!validTarget) {
            return NextResponse.json({ success: false, error: 'Invalid analytics target.' }, { status: 400 });
        }

        if (!isAnalyticsSurfaceEnabled(data.projectId, validTarget.analyticsPreferences)) {
            return NextResponse.json({ success: true, skipped: true });
        }

        const filteredUpdateData = filterAnalyticsUpdateData(filterAnalyticsFieldsForPreferences(
            data.updateData,
            validTarget.analyticsPreferences,
        ));
        if (Object.keys(filteredUpdateData).length === 0) {
            return NextResponse.json({ success: true, skipped: true });
        }

        const trustedDateString = resolveAcceptedDate(
            data.dateString,
            validTarget.storeTimeZone,
            validTarget.businessDayEndTime,
        );
        if (!trustedDateString) {
            return NextResponse.json({ success: false, error: 'Invalid analytics date.' }, { status: 400 });
        }

        await writePublicAnalyticsEventAdmin({
            updateData: filteredUpdateData,
            tenantId,
            storeId,
            projectId: data.projectId,
            dateString: trustedDateString,
            storeTimeZone: validTarget.storeTimeZone,
            businessDayEndTime: validTarget.businessDayEndTime,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logAnalyticsFailure('public_analytics_track_failed', error, {
            ...getBoundedAnalyticsStringContext('tenantId', tenantId),
            ...getBoundedAnalyticsStringContext('storeId', storeId),
            ...getBoundedAnalyticsStringContext('projectId', data.projectId),
            updateFieldCount: Object.keys(data.updateData).length,
            hasRequestedDate: Boolean(data.dateString),
        });
        return NextResponse.json({ success: false, error: 'Analytics unavailable.' }, { status: 500 });
    }
}

export const POST = withCORS(postAnalyticsTrack);
