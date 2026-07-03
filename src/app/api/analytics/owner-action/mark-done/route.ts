export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const MARK_DONE_MAX_BODY_BYTES = 6 * 1024;
const MAX_OWNER_ACTION_RECEIPTS = 20;
const RESULT_CHECK_DELAY_DAYS = 7;

const MarkDoneSchema = z.object({
    projectId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/),
    actionId: z.string().min(1).max(160),
    actionType: z.string().min(1).max(80),
    actionTitle: z.string().min(1).max(180),
    actionLabel: z.string().min(1).max(180),
    metricLabel: z.string().max(120).optional(),
});

function addDaysToDateKey(dateKey: string, days: number): string {
    const [year, month, day] = dateKey.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function buildReceiptId(projectId: string, actionId: string): string {
    return createHash('sha256').update(`${projectId}:${actionId}`).digest('hex').slice(0, 32);
}

function pickBaselineMetrics(data: Record<string, any>) {
    return data?.wtd?.metrics
        || data?.weekly?.metrics
        || data?.daily?.metrics
        || data?.overview?.wtd?.metrics
        || data?.overview?.yesterday?.metrics
        || {};
}

function getReceiptEntries(data: Record<string, any>) {
    const receipts = data.ownerActionReceipts
        || data.ownerActionPlan?.receipts
        || data.overview?.ownerActionPlan?.receipts
        || {};
    return Object.entries(receipts).filter(([, receipt]) => receipt && typeof receipt === 'object');
}

function getOldestReceiptId(data: Record<string, any>): string | null {
    const entries = getReceiptEntries(data);
    if (entries.length < MAX_OWNER_ACTION_RECEIPTS) return null;
    const sorted = entries.sort(([, a], [, b]) => {
        const aTime = new Date((a as any).markedDoneAt || 0).getTime() || 0;
        const bTime = new Date((b as any).markedDoneAt || 0).getTime() || 0;
        return aTime - bTime;
    });
    return sorted[0]?.[0] || null;
}

export const POST = withAuth(async (request: NextRequest, session) => {
    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.VIEW_ANALYTICS],
        'Analytics action receipts',
    );
    if (permissionError) return permissionError;

    const tenantId = String(session.tId || session.user?.tenantId || '');
    const storeId = String(session.sId || session.user?.storeId || '');
    const userId = String(session.uId || session.user?.id || 'unknown');
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
    const rateLimit = await checkRateLimit({
        key: `owner-action-done:${hashPublicRateLimitValue(userId)}:${hashPublicRateLimitValue(storeId)}`,
        ...rateLimitConfig,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({
            error: 'Too many requests. Please try again later.',
            resetAt: rateLimit.resetAt,
        }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, MARK_DONE_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = MarkDoneSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Invalid input', details: getSafeZodValidationDetails(validation.error) },
            { status: 400 },
        );
    }

    const { projectId, actionId, actionType, actionTitle, actionLabel, metricLabel } = validation.data;
    const receiptId = buildReceiptId(projectId, actionId);
    const dashboardDocId = `${tenantId}_${storeId}_${projectId}_dashboard_summary`;
    const dashboardRef = admin.firestore().collection(DB_COLLECTIONS.ANALYTICS).doc(dashboardDocId);

    try {
        const dashboardSnap = await dashboardRef.get();
        if (!dashboardSnap.exists) {
            return NextResponse.json({ error: 'Action list is not ready yet' }, { status: 404 });
        }

        const dashboardData = dashboardSnap.data() || {};
        const actionPlan = dashboardData.ownerActionPlan || dashboardData.overview?.ownerActionPlan;
        const currentAction = Array.isArray(actionPlan?.actions)
            ? actionPlan.actions.find((action: any) => action?.id === actionId)
            : null;
        if (!currentAction) {
            return NextResponse.json({ error: 'Action is no longer available' }, { status: 409 });
        }

        const baselineLocalDate = dashboardData.lastSettledLocalDate || dashboardData.daily?.date || null;
        if (!baselineLocalDate) {
            return NextResponse.json({ error: 'Settled analytics are not ready yet' }, { status: 409 });
        }

        const markedDoneAt = new Date().toISOString();
        const receipt = {
            receiptId,
            actionId,
            actionType: currentAction.type || actionType,
            actionTitle: currentAction.title || actionTitle,
            actionLabel: currentAction.actionLabel || actionLabel,
            ...(currentAction.metricLabel || metricLabel ? { metricLabel: currentAction.metricLabel || metricLabel } : {}),
            status: 'marked_done',
            markedDoneAt,
            markedBy: userId,
            baselineLocalDate,
            checkAfterLocalDate: addDaysToDateKey(baselineLocalDate, RESULT_CHECK_DELAY_DAYS),
            baselineSnapshot: pickBaselineMetrics(dashboardData),
            result: {
                status: 'pending',
                label: 'Marked',
                message: 'Marked done. MenuList will check the next settled results after a few days.',
                checkAfterLocalDate: addDaysToDateKey(baselineLocalDate, RESULT_CHECK_DELAY_DAYS),
            },
        };

        const updates: Record<string, any> = {
            [`ownerActionReceipts.${receiptId}`]: receipt,
            [`ownerActionPlan.receipts.${receiptId}`]: receipt,
            [`overview.ownerActionPlan.receipts.${receiptId}`]: receipt,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        };
        const oldestReceiptId = getOldestReceiptId(dashboardData);
        if (oldestReceiptId && oldestReceiptId !== receiptId) {
            updates[`ownerActionReceipts.${oldestReceiptId}`] = admin.firestore.FieldValue.delete();
            updates[`ownerActionPlan.receipts.${oldestReceiptId}`] = admin.firestore.FieldValue.delete();
            updates[`overview.ownerActionPlan.receipts.${oldestReceiptId}`] = admin.firestore.FieldValue.delete();
        }

        await dashboardRef.update(updates);
        return NextResponse.json({ success: true, receipt });
    } catch (error) {
        logAnalyticsFailure('owner_action_mark_done_failed', error, {
            ...getBoundedAnalyticsStringContext('endpoint', '/api/analytics/owner-action/mark-done'),
            ...getBoundedAnalyticsStringContext('projectId', projectId),
            ...getBoundedAnalyticsStringContext('tenantId', tenantId),
            ...getBoundedAnalyticsStringContext('storeId', storeId),
            ...getBoundedAnalyticsStringContext('actionId', actionId),
        });
        return NextResponse.json({ error: 'Could not mark action done' }, { status: 500 });
    }
});
