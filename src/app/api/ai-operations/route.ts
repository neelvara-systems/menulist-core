export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { PERMISSIONS } from '@constant/permissions';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { resolveStorePermissionSessionScope } from '@lib/permissions/scopeDocumentId';
import {
    AI_OPERATION_DATE_FILTER_MAX_LENGTH,
    isAiOperationHistoryCursorAdmissible,
    isValidAiOperationCursorId,
    normalizeAiOperationHistoryDateRange,
    resolveAiOperationActionScanBoundary,
} from '@lib/ai/operationHistoryQuery';
import { projectAiOperationHistoryFields } from '@lib/ai/operationHistoryProjection';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../middleware/auth';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 15;
const FILTER_SCAN_LIMIT = 100;
const MAX_FILTER_SCAN_DOCS = 500;
const AI_OPERATIONS_ENDPOINT = '/api/ai-operations';
const AI_OPERATIONS_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

function privateJson(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    Object.entries(AI_OPERATIONS_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

const QuerySchema = z.object({
    action: z.string().trim().max(80).optional(),
    cursorId: z.string().trim().max(160)
        .refine((value) => !value || isValidAiOperationCursorId(value), 'Invalid cursor ID')
        .optional(),
    endDate: z.string().trim().max(AI_OPERATION_DATE_FILTER_MAX_LENGTH).optional(),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    startDate: z.string().trim().max(AI_OPERATION_DATE_FILTER_MAX_LENGTH).optional(),
});

const PLATFORM_ONLY_FIELDS = new Set([
    'candidatesTokenCount',
    'chargePerCredit',
    'fileId',
    'geminiResponse',
    'generationConfig',
    'marginPaise',
    'model',
    'ourChargePaise',
    'promptTokenCount',
    'rawBatchResponses',
    'rawProviderResponse',
    'realCostPaise',
    'sId',
    'storeId',
    'tId',
    'tokenUsage',
    'tokenPerCredit',
    'transactionId',
    'totalCharge',
    'totalCredits',
    'totalTokenCount',
    'uId',
]);

const OWNER_VISIBLE_FIELDS = new Set([
    'action',
    'billingMode',
    'clientResponse',
    'contentLength',
    'createdOn',
    'files',
    'id',
    'inputStrings',
    'itemDetails',
    'itemsList',
    'languageSummary',
    'modifiedOn',
    'processingTime',
    'projectId',
    'sourceLang',
    'targetLang',
    'targetLanguages',
    'unitsConsumed',
]);

const PLATFORM_VISIBLE_FIELDS = new Set([
    ...Array.from(OWNER_VISIBLE_FIELDS),
    'candidatesTokenCount',
    'chargePerCredit',
    'fileId',
    'marginPaise',
    'model',
    'ourChargePaise',
    'promptTokenCount',
    'realCostPaise',
    'tokenPerCredit',
    'totalCharge',
    'totalCredits',
    'totalTokenCount',
    'transactionId',
]);

const OWNER_RESPONSE_FIELDS = new Set(
    Array.from(OWNER_VISIBLE_FIELDS).filter((key) => !PLATFORM_ONLY_FIELDS.has(key)),
);

type AiOperationHistoryScopeDocumentId = {
    numericId: number;
    documentId: string;
};

function normalizeAiOperationHistoryScopeDocumentId(value: unknown): AiOperationHistoryScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

function getAiOperationsReadLogContext(
    request: NextRequest,
    session: any,
    metadata: {
        action?: unknown;
        cursorId?: unknown;
        pageSize?: unknown;
        platformRole?: unknown;
    } = {},
) {
    const searchParams = request.nextUrl.searchParams;
    const requestedPageSize = Number(metadata.pageSize ?? searchParams.get('pageSize'));
    const sessionScope = resolveStorePermissionSessionScope(session);
    const tenantId = sessionScope?.tenantScope.documentId;
    const storeId = sessionScope?.storeScope.documentId;
    const userId = resolveCurrentSessionUserDocumentId(session);
    const platformRole = metadata.platformRole ?? resolveExactSessionPlatformRole(session);

    return {
        endpoint: AI_OPERATIONS_ENDPOINT,
        ...getBoundedRuntimeStringContext('tenantId', tenantId),
        ...getBoundedRuntimeStringContext('storeId', storeId),
        ...getBoundedRuntimeStringContext('userId', userId),
        ...getBoundedRuntimeStringContext('platformRole', platformRole),
        ...getBoundedRuntimeStringContext('action', metadata.action ?? searchParams.get('action')),
        ...getBoundedRuntimeStringContext('cursorId', metadata.cursorId ?? searchParams.get('cursorId')),
        hasStartDate: searchParams.has('startDate'),
        hasEndDate: searchParams.has('endDate'),
        pageSize: Number.isFinite(requestedPageSize) ? requestedPageSize : null,
        queryParamCount: Array.from(searchParams.keys()).length,
    };
}

function sanitizeOwnerOperation(id: string, data: Record<string, unknown>) {
    return projectAiOperationHistoryFields({
        data,
        documentId: id,
        visibleFields: OWNER_RESPONSE_FIELDS,
    });
}

function sanitizePlatformOperation(id: string, data: Record<string, unknown>) {
    return projectAiOperationHistoryFields({
        data,
        documentId: id,
        visibleFields: PLATFORM_VISIBLE_FIELDS,
    });
}

async function getCursorDoc(
    tenantId: string,
    storeId: string,
    cursorId?: string,
) {
    if (!cursorId) return null;

    const cursorDoc = await firestoreAdmin
        .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
        .doc(tenantId)
        .collection(storeId)
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
    const boundary = resolveAiOperationActionScanBoundary({
        hasScanCursor: Boolean(scanCursorDoc),
        matchedCount: matchedDocs.length,
        maxScanDocs: MAX_FILTER_SCAN_DOCS,
        pageSize,
        reachedEnd,
        scannedDocs,
    });
    const cursorSource = boundary.cursorSource === 'last_match'
        ? docs[docs.length - 1]
        : boundary.cursorSource === 'scan_cursor'
            ? scanCursorDoc
            : null;

    return {
        docs,
        hasMore: boundary.hasMore,
        lastVisibleDoc: cursorSource ? { id: cursorSource.id } : null,
        requiresManualContinuation: boundary.requiresManualContinuation,
    };
}

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const validation = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
        if (!validation.success) {
            return privateJson(
                { error: 'Invalid query parameters', details: getSafeZodValidationDetails(validation.error) },
                { status: 400 },
            );
        }

        const sessionScope = resolveStorePermissionSessionScope(session);
        const tenantScope = normalizeAiOperationHistoryScopeDocumentId(sessionScope?.tenantScope.documentId);
        const storeScope = normalizeAiOperationHistoryScopeDocumentId(sessionScope?.storeScope.documentId);
        if (!tenantScope || !storeScope) {
            return privateJson({ error: 'User not onboarded' }, { status: 400 });
        }
        const tenantId = tenantScope.documentId;
        const storeId = storeScope.documentId;
        const platformRole = resolveExactSessionPlatformRole(session);
        const isPlatform = platformRole === 'PLATFORM';
        const { action, cursorId, pageSize, startDate, endDate } = validation.data;

        const rateLimitConfig = getRateLimitForFeature('DATA_READ');
        const userId = resolveCurrentSessionUserDocumentId(session);
        if (!userId || platformRole === null) {
            return privateJson({ error: 'Forbidden' }, { status: 403 });
        }
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
        const storeRateLimitHash = hashPublicRateLimitValue(storeId);
        const rateLimit = await checkRateLimit({
            key: `ai-operations:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });

        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            logger.security('Rate Limit Exceeded', {
                ...getAiOperationsReadLogContext(request, session, {
                    action,
                    cursorId,
                    pageSize,
                    platformRole,
                }),
                limit: rateLimitConfig.limit,
                waitSeconds,
                window: rateLimitConfig.window,
            }, 'medium');

            return privateJson(
                {
                    error: providerUnavailable
                        ? 'AI transaction history is temporarily unavailable. Please try again later.'
                        : `Too many requests. Please wait ${waitSeconds} seconds.`,
                    retryAfter: waitSeconds,
                    resetAt: rateLimit.resetAt,
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimit.remaining),
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    },
                },
            );
        }

        const dateRange = normalizeAiOperationHistoryDateRange(startDate, endDate);
        if (!dateRange) {
            return privateJson({ error: 'Invalid date filter' }, { status: 400 });
        }

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.ACCESS_BILLING],
            'AI transaction history',
        );
        if (permissionError) return permissionError;

        let query: FirebaseFirestore.Query = firestoreAdmin
            .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
            .doc(tenantId)
            .collection(storeId)
            .orderBy('createdOn', 'desc');

        if (dateRange.start) {
            query = query.where('createdOn', '>=', dateRange.start);
        }
        if (dateRange.end) {
            query = query.where('createdOn', '<=', dateRange.end);
        }

        const cursorDoc = await getCursorDoc(tenantId, storeId, cursorId);
        if (!isAiOperationHistoryCursorAdmissible({
            cursorCreatedOn: cursorDoc?.get('createdOn'),
            cursorExists: Boolean(cursorDoc),
            cursorRequested: Boolean(cursorId),
            dateRange,
        })) {
            return privateJson({ error: 'Invalid cursor' }, { status: 400 });
        }

        const result = action
            ? await getActionFilteredDocs({ action, cursorDoc, pageSize, query })
            : await (async () => {
                const snapshot = await (cursorDoc ? query.startAfter(cursorDoc) : query).limit(pageSize + 1).get();
                const docs = snapshot.docs.slice(0, pageSize);
                return {
                    docs,
                    hasMore: snapshot.docs.length > pageSize,
                    lastVisibleDoc: docs.length > 0 ? { id: docs[docs.length - 1].id } : null,
                    requiresManualContinuation: false,
                };
            })();

        const { docs } = result;
        const data = docs.map((doc) => (
            isPlatform
                ? sanitizePlatformOperation(doc.id, doc.data())
                : sanitizeOwnerOperation(doc.id, doc.data())
        ));

        return privateJson({
            data,
            hasMore: result.hasMore,
            lastVisibleDoc: result.lastVisibleDoc,
            requiresManualContinuation: result.requiresManualContinuation,
        });
    } catch (error) {
        logRuntimeFailure('ai_operations_read_failed', error, getAiOperationsReadLogContext(request, session));
        return privateJson({ error: 'Failed to load transactions' }, { status: 500 });
    }
});
