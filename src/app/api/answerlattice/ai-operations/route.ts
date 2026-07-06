export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
    AI_OPERATION_DATE_FILTER_MAX_LENGTH,
    isValidAiOperationCursorId,
    normalizeAiOperationHistoryDateRange,
} from '@lib/ai/operationHistoryQuery';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 15;
const FILTER_SCAN_LIMIT = 100;
const MAX_FILTER_SCAN_DOCS = 500;

const QuerySchema = z.object({
    action: z.string().trim().max(120).optional(),
    cursorId: z.string().trim().max(160)
        .refine((value) => !value || isValidAiOperationCursorId(value), 'Invalid cursor ID')
        .optional(),
    endDate: z.string().trim().max(AI_OPERATION_DATE_FILTER_MAX_LENGTH).optional(),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    startDate: z.string().trim().max(AI_OPERATION_DATE_FILTER_MAX_LENGTH).optional(),
});

const PLATFORM_ONLY_FIELDS = new Set([
    'chargePerCredit',
    'fileId',
    'geminiResponse',
    'generationConfig',
    'marginPaise',
    'ourChargePaise',
    'rawBatchResponses',
    'rawProviderResponse',
    'realCostPaise',
    'tokenPerCredit',
    'totalCharge',
    'totalCredits',
]);

const OWNER_VISIBLE_FIELDS = new Set([
    'action',
    'aiProviderOperations',
    'billingMode',
    'byteSize',
    'candidatesTokenCount',
    'clientResponse',
    'creditConsumption',
    'createdOn',
    'id',
    'model',
    'modifiedOn',
    'processingTime',
    'promptTokenCount',
    'source',
    'tokenCountSource',
    'totalTokenCount',
    'unitsConsumed',
]);

function serializeFirestoreValue(value: any): any {
    if (value == null) return value;
    if (typeof value?.toDate === 'function') {
        return value.toDate().toISOString();
    }
    if (Array.isArray(value)) {
        return value.map(serializeFirestoreValue);
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, serializeFirestoreValue(entry)]),
        );
    }
    return value;
}

function sanitizeOwnerOperation(id: string, data: Record<string, any>) {
    const serialized = serializeFirestoreValue({ id, ...data });
    return Object.fromEntries(
        Object.entries(serialized).filter(([key]) => OWNER_VISIBLE_FIELDS.has(key) && !PLATFORM_ONLY_FIELDS.has(key)),
    );
}

function serializePlatformOperation(id: string, data: Record<string, any>) {
    return serializeFirestoreValue({ id, ...data });
}

async function getCursorDoc(
    tenantId: string | number,
    storeId: string | number,
    cursorId?: string,
) {
    if (!cursorId) return null;

    const cursorDoc = await answerlatticeFirestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(tenantId))
        .collection(String(storeId))
        .doc(cursorId)
        .get();

    return cursorDoc.exists ? cursorDoc : null;
}

async function getActionFilteredDocs({
    action,
    cursorDoc,
    pageSize,
    query,
}: {
    action: string;
    cursorDoc: FirebaseFirestore.DocumentSnapshot | null;
    pageSize: number;
    query: FirebaseFirestore.Query;
}) {
    const matchedDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    let scanCursorDoc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot | null = cursorDoc;
    let reachedEnd = false;
    let scannedDocs = 0;

    while (matchedDocs.length <= pageSize && scannedDocs < MAX_FILTER_SCAN_DOCS) {
        let windowQuery = query;
        if (scanCursorDoc) {
            windowQuery = windowQuery.startAfter(scanCursorDoc);
        }

        const snapshot = await windowQuery.limit(FILTER_SCAN_LIMIT).get();
        if (snapshot.empty) {
            reachedEnd = true;
            break;
        }

        for (const doc of snapshot.docs) {
            scannedDocs += 1;
            scanCursorDoc = doc;

            if (doc.data().action === action) {
                matchedDocs.push(doc);
                if (matchedDocs.length > pageSize) break;
            }

            if (scannedDocs >= MAX_FILTER_SCAN_DOCS) break;
        }

        if (matchedDocs.length > pageSize || scannedDocs >= MAX_FILTER_SCAN_DOCS) break;
        if (snapshot.docs.length < FILTER_SCAN_LIMIT) {
            reachedEnd = true;
            break;
        }
    }

    const docs = matchedDocs.slice(0, pageSize);
    const hasExtraMatchedDoc = matchedDocs.length > pageSize;
    const hitScanLimit = !reachedEnd && scannedDocs >= MAX_FILTER_SCAN_DOCS && Boolean(scanCursorDoc);
    const hasMore = hasExtraMatchedDoc || hitScanLimit;
    const cursorSource = hasExtraMatchedDoc
        ? docs[docs.length - 1]
        : scanCursorDoc;

    return {
        docs,
        hasMore,
        lastVisibleDoc: cursorSource ? { id: cursorSource.id } : null,
    };
}

export const GET = withAuth(async (request: NextRequest, session) => {
    let tenantIdForLog: string | number | undefined;
    let storeIdForLog: string | number | undefined;
    let userIdForLog: string | undefined;
    let actionForLog: string | undefined;
    let cursorIdForLog: string | undefined;
    let pageSizeForLog: number | undefined;
    let hasStartDateForLog = false;
    let hasEndDateForLog = false;

    try {
        const validation = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: getSafeZodValidationDetails(validation.error) },
                { status: 400 },
            );
        }

        const scope = resolveAnswerlatticeSessionScope(session);
        if (!scope) {
            return NextResponse.json({ error: 'Answerlattice account scope is missing' }, { status: 400 });
        }

        const tenantId = scope.tenantId;
        const storeId = scope.storeId;
        tenantIdForLog = tenantId;
        storeIdForLog = storeId;
        const rateLimitConfig = getRateLimitForFeature('DATA_READ');
        const userId = session.uId || session.user?.id || 'unknown';
        userIdForLog = userId;
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-ai-operations', userId, tenantId, storeId),
            ...rateLimitConfig,
        });

        if (!rateLimit.allowed) {
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded', {
                endpoint: '/api/answerlattice/ai-operations',
                limit: rateLimitConfig.limit,
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('userId', userId),
                waitSeconds,
                window: rateLimitConfig.window,
            }, 'medium');

            return NextResponse.json(
                {
                    error: `Too many requests. Please wait ${waitSeconds} seconds.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING);
        if (permission.response) return permission.response;

        const platformRole = session.platformRole || session.user?.platformRole;
        const isPlatform = platformRole === 'PLATFORM';
        const { action, cursorId, pageSize, startDate, endDate } = validation.data;
        actionForLog = action;
        cursorIdForLog = cursorId;
        pageSizeForLog = pageSize;
        hasStartDateForLog = Boolean(startDate);
        hasEndDateForLog = Boolean(endDate);
        const dateRange = normalizeAiOperationHistoryDateRange(startDate, endDate);

        if (!dateRange) {
            return NextResponse.json({ error: 'Invalid date filter' }, { status: 400 });
        }

        let query: FirebaseFirestore.Query = answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
            .doc(String(tenantId))
            .collection(String(storeId))
            .orderBy('createdOn', 'desc');

        if (dateRange.start) {
            query = query.where('createdOn', '>=', dateRange.start);
        }
        if (dateRange.end) {
            query = query.where('createdOn', '<=', dateRange.end);
        }

        const cursorDoc = await getCursorDoc(tenantId, storeId, cursorId);
        const result = action
            ? await getActionFilteredDocs({ action, cursorDoc, pageSize, query })
            : await (async () => {
                const snapshot = await (cursorDoc ? query.startAfter(cursorDoc) : query).limit(pageSize + 1).get();
                const docs = snapshot.docs.slice(0, pageSize);
                return {
                    docs,
                    hasMore: snapshot.docs.length > pageSize,
                    lastVisibleDoc: docs.length > 0 ? { id: docs[docs.length - 1].id } : null,
                };
            })();

        const data = result.docs.map((doc) => (
            isPlatform
                ? serializePlatformOperation(doc.id, doc.data())
                : sanitizeOwnerOperation(doc.id, doc.data())
        ));

        return NextResponse.json({
            data,
            hasMore: result.hasMore,
            lastVisibleDoc: result.lastVisibleDoc,
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_ai_operations_load_failed', error, {
            ...getBoundedRuntimeStringContext('path', request.nextUrl.pathname),
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
            ...getBoundedRuntimeStringContext('action', actionForLog),
            ...getBoundedRuntimeStringContext('cursorId', cursorIdForLog),
            pageSize: pageSizeForLog,
            hasStartDate: hasStartDateForLog,
            hasEndDate: hasEndDateForLog,
        });
        return NextResponse.json({ error: 'Failed to load support credit usage' }, { status: 500 });
    }
});
