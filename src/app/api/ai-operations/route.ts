export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
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

const QuerySchema = z.object({
    action: z.string().trim().max(80).optional(),
    cursorId: z.string().trim().max(160).optional(),
    endDate: z.string().trim().optional(),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    startDate: z.string().trim().optional(),
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
    const tenantId = session.tId || session.user?.tenantId;
    const storeId = session.sId || session.user?.storeId;
    const userId = session.uId || session.user?.id;
    const platformRole = metadata.platformRole ?? (session.platformRole || session.user?.platformRole);

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

function getDateParam(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
}

function sanitizeOwnerOperation(id: string, data: Record<string, any>) {
    const serialized = serializeFirestoreValue({ id, ...data });
    return Object.fromEntries(
        Object.entries(serialized).filter(([key]) => OWNER_VISIBLE_FIELDS.has(key) && !PLATFORM_ONLY_FIELDS.has(key)),
    );
}

function sanitizePlatformOperation(id: string, data: Record<string, any>) {
    const serialized = serializeFirestoreValue({ id, ...data });
    return Object.fromEntries(
        Object.entries(serialized).filter(([key]) => PLATFORM_VISIBLE_FIELDS.has(key)),
    );
}

async function getCursorDoc(
    tenantId: string | number,
    storeId: string | number,
    cursorId?: string,
) {
    if (!cursorId) return null;

    const cursorDoc = await firestoreAdmin
        .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
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
    const hasMore = docs.length > 0 && (matchedDocs.length > pageSize || (!reachedEnd && scannedDocs >= MAX_FILTER_SCAN_DOCS && Boolean(scanCursorDoc)));
    const cursorSource = docs.length > 0 ? docs[docs.length - 1] : scanCursorDoc;

    return {
        docs,
        hasMore,
        lastVisibleDoc: cursorSource ? { id: cursorSource.id } : null,
    };
}

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const validation = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: getSafeZodValidationDetails(validation.error) },
                { status: 400 },
            );
        }

        const tenantId = session.tId || session.user?.tenantId;
        const storeId = session.sId || session.user?.storeId;
        if (!tenantId || !storeId) {
            return NextResponse.json({ error: 'User not onboarded' }, { status: 400 });
        }
        const platformRole = session.platformRole || session.user?.platformRole;
        const isPlatform = platformRole === 'PLATFORM';
        const { action, cursorId, pageSize, startDate, endDate } = validation.data;

        const rateLimitConfig = getRateLimitForFeature('DATA_READ');
        const userId = session.uId || session.user?.id || 'unknown';
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
        const storeRateLimitHash = hashPublicRateLimitValue(storeId);
        const rateLimit = await checkRateLimit({
            key: `ai-operations:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
            ...rateLimitConfig,
        });

        if (!rateLimit.allowed) {
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

        const start = getDateParam(startDate);
        const end = getDateParam(endDate);

        if ((startDate && !start) || (endDate && !end)) {
            return NextResponse.json({ error: 'Invalid date filter' }, { status: 400 });
        }

        let query: FirebaseFirestore.Query = firestoreAdmin
            .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
            .doc(String(tenantId))
            .collection(String(storeId))
            .orderBy('createdOn', 'desc');

        if (start) {
            query = query.where('createdOn', '>=', start);
        }
        if (end) {
            query = query.where('createdOn', '<=', end);
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

        const { docs } = result;
        const data = docs.map((doc) => (
            isPlatform
                ? sanitizePlatformOperation(doc.id, doc.data())
                : sanitizeOwnerOperation(doc.id, doc.data())
        ));

        return NextResponse.json({
            data,
            hasMore: result.hasMore,
            lastVisibleDoc: result.lastVisibleDoc,
        });
    } catch (error) {
        logRuntimeFailure('ai_operations_read_failed', error, getAiOperationsReadLogContext(request, session));
        return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 });
    }
});
