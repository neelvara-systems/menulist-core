export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { admin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { markOwnerActionDoneTransaction } from '@lib/analytics/ownerActionReceiptTransaction';
import {
    requireAnyStorePermission,
    resolveStorePermissionSessionScope,
} from '@lib/permissions/server';
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
const OWNER_ACTION_SCOPE_DOCUMENT_ID_PATTERN = /^\d+$/;

const MarkDoneProjectIdSchema = z.string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine(isValidFirestoreDocumentId, 'Invalid project ID');

const MarkDoneSchema = z.object({
    projectId: MarkDoneProjectIdSchema,
    actionId: z.string().min(1).max(160),
    actionType: z.string().min(1).max(80),
    actionTitle: z.string().min(1).max(180),
    actionLabel: z.string().min(1).max(180),
    metricLabel: z.string().max(120).optional(),
});

function buildReceiptId(projectId: string, actionId: string): string {
    return createHash('sha256').update(`${projectId}:${actionId}`).digest('hex').slice(0, 32);
}

function normalizeMarkDoneScopeDocumentId(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const documentId = String(value);
    if (!OWNER_ACTION_SCOPE_DOCUMENT_ID_PATTERN.test(documentId) || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? documentId
        : null;
}

export const POST = withAuth(async (request: NextRequest, session) => {
    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.VIEW_ANALYTICS],
        'Analytics action receipts',
    );
    if (permissionError) return permissionError;

    const sessionScope = resolveStorePermissionSessionScope(session);
    const rawTenantId = sessionScope?.tenantScope.documentId;
    const rawStoreId = sessionScope?.storeScope.documentId;
    const tenantId = normalizeMarkDoneScopeDocumentId(rawTenantId);
    const storeId = normalizeMarkDoneScopeDocumentId(rawStoreId);
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!tenantId || !storeId || !userId) {
        logAnalyticsFailure('owner_action_mark_done_invalid_session_scope', undefined, {
            ...getBoundedAnalyticsStringContext('endpoint', '/api/analytics/owner-action/mark-done'),
            ...getBoundedAnalyticsStringContext('tenantId', rawTenantId),
            ...getBoundedAnalyticsStringContext('storeId', rawStoreId),
        });
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
    if (!isValidFirestoreDocumentId(dashboardDocId)) {
        logAnalyticsFailure('owner_action_mark_done_invalid_dashboard_doc_id', undefined, {
            ...getBoundedAnalyticsStringContext('endpoint', '/api/analytics/owner-action/mark-done'),
            ...getBoundedAnalyticsStringContext('tenantId', tenantId),
            ...getBoundedAnalyticsStringContext('storeId', storeId),
            ...getBoundedAnalyticsStringContext('projectId', projectId),
        });
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const dashboardRef = admin.firestore().collection(DB_COLLECTIONS.ANALYTICS).doc(dashboardDocId);

    try {
        const outcome = await markOwnerActionDoneTransaction(admin.firestore(), {
            actionId,
            actionLabel,
            actionTitle,
            actionType,
            dashboardRef,
            metricLabel,
            receiptId,
            userId,
        });
        if (outcome.ok === false) {
            return NextResponse.json({ error: outcome.error }, { status: outcome.status });
        }
        return NextResponse.json({ success: true, receipt: outcome.receipt });
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
