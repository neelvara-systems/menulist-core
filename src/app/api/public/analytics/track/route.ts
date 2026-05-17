export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { addDaysToAnalyticsDateKey } from '@lib/analytics/dateKey';
import { writePublicAnalyticsEventAdmin } from '@lib/analytics/serverWrite';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { secureError } from '@lib/security/secureLogger';
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

async function validateAnalyticsTarget(
    tenantId: string,
    storeId: string,
    projectId: string,
): Promise<boolean> {
    const storeSnap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId).get();
    if (!storeSnap.exists) return false;

    const store = storeSnap.data() || {};
    const storeTenantId = String(store.tenantId ?? store.tId ?? '');
    if (storeTenantId !== tenantId) return false;
    if (store.active === false || store.deleted === true || isPlatformEntityBlocked(store)) return false;

    if (RESERVED_PROJECT_IDS.has(projectId)) return true;

    const summarySnap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary')
        .doc(`projects_${storeId}`)
        .get();
    if (!summarySnap.exists) return false;

    const projects = parseSummaryProjects(summarySnap.data());
    const project = projects[projectId];
    return Boolean(project && project.active !== false && project.deleted !== true);
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
    const dateString = resolveAcceptedDate(data.dateString, data.storeTimeZone, data.businessDayEndTime);

    if (!dateString) {
        return NextResponse.json({ success: false, error: 'Invalid analytics date.' }, { status: 400 });
    }

    try {
        const validTarget = await validateAnalyticsTarget(tenantId, storeId, data.projectId);
        if (!validTarget) {
            return NextResponse.json({ success: false, error: 'Invalid analytics target.' }, { status: 400 });
        }

        await writePublicAnalyticsEventAdmin({
            updateData: data.updateData,
            tenantId,
            storeId,
            projectId: data.projectId,
            dateString,
            storeTimeZone: data.storeTimeZone,
            businessDayEndTime: data.businessDayEndTime,
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
