export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { getBusinessAnalyticsDateKey, resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { addDaysToAnalyticsDateKey } from '@lib/analytics/dateKey';
import { getResolvedAnalyticsPreferences, type ResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { filterAnalyticsUpdateData } from '@lib/analytics/writePolicy';
import { writePublicAnalyticsEventAdmin } from '@lib/analytics/serverWrite';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { secureError } from '@lib/security/secureLogger';
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
    projectId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/),
    dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    storeTimeZone: z.string().trim().max(80).optional(),
    businessDayEndTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    updateData: z.record(
        z.string().regex(/^[A-Za-z0-9_.:-]{1,180}$/),
        AnalyticsValueSchema,
    ).refine((data) => Object.keys(data).length <= 100, {
        message: 'Too many analytics fields.',
    }),
});

const RESERVED_PROJECT_IDS = new Set(['obp', 'customerApp']);

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

    const target: ValidatedAnalyticsTarget = {
        analyticsPreferences: getResolvedAnalyticsPreferences(store.analytics || null),
        businessDayEndTime: resolveBusinessDayEndTime(
            store.businessType,
            store.businessDayEndTime,
            store.businessCategory,
        ),
        storeTimeZone: typeof store.timeZone === 'string' && store.timeZone.trim()
            ? store.timeZone.trim()
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
    const dateString = requestedDate || currentDate;
    const oldestAcceptedDate = addDaysToAnalyticsDateKey(currentDate, -1);
    const newestAcceptedDate = addDaysToAnalyticsDateKey(currentDate, 1);

    if (dateString < oldestAcceptedDate || dateString > newestAcceptedDate) {
        return null;
    }

    return dateString;
}

export async function POST(req: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(req, 'PUBLIC_ANALYTICS');
    if (rateLimitResponse) return rateLimitResponse;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const validation = AnalyticsTrackSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ success: false, error: 'Validation failed.' }, { status: 400 });
    }

    const data = validation.data;
    const tenantId = String(data.tenantId);
    const storeId = String(data.storeId);

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
        secureError(
            '[PublicAnalytics] Track failed',
            error instanceof Error ? error : new Error(String(error)),
            { tenantId, storeId, projectId: data.projectId },
        );
        return NextResponse.json({ success: false, error: 'Analytics unavailable.' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
