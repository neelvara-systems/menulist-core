export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import {
    ANSWERLATTICE_EARLY_ACCESS_STATUSES,
    AnswerlatticeEarlyAccessAdminQuerySchema,
    AnswerlatticeEarlyAccessAdminUpdateSchema,
    type AnswerlatticeEarlyAccessStatus,
} from '@lib/answerlattice/earlyAccessContracts';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withPlatformAuth } from '../../../../../middleware/auth';

const MAX_BODY_BYTES = 8 * 1024;
const RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const earlyAccessAdminJson = (body: unknown, status = 200, headers?: HeadersInit) => NextResponse.json(body, {
    headers: { ...RESPONSE_HEADERS, ...Object.fromEntries(new Headers(headers).entries()) },
    status,
});

const getAnswerlatticeDb = () => (
    answerlatticeAdminApp ? answerlatticeFirestoreAdmin : null
);

const checkAdminRateLimit = async (session: any, operation: 'read' | 'write') => {
    const operatorId = resolveCurrentSessionUserDocumentId(session);
    if (!operatorId) return earlyAccessAdminJson({ error: 'Unauthorized.' }, 401);
    const config = getRateLimitForFeature(operation === 'read' ? 'DATA_READ' : 'DATA_WRITE');
    const operatorHash = hashPublicRateLimitValue(operatorId);
    const result = await checkRateLimit({
        key: `answerlattice:early-access:${operation}:${operatorHash}`,
        ...config,
        failClosedOnProviderError: true,
    });
    if (result.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    return earlyAccessAdminJson(
        {
            error: result.reason === 'provider_unavailable'
                ? 'Early access review is temporarily unavailable.'
                : 'Too many requests. Please try again later.',
            retryAfter: waitSeconds,
        },
        result.reason === 'provider_unavailable' ? 503 : 429,
        { 'Retry-After': String(waitSeconds) },
    );
};

const timestampToIso = (value: unknown): string | null => {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (value && typeof value === 'object' && 'toDate' in value) {
        const toDate = (value as { toDate?: unknown }).toDate;
        if (typeof toDate !== 'function') return null;
        const date = toDate.call(value);
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
    return null;
};

const readString = (value: unknown, maximum: number): string => (
    typeof value === 'string' ? value.trim().slice(0, maximum) : ''
);

const readNullableString = (value: unknown, maximum: number): string | null => {
    const normalized = readString(value, maximum);
    return normalized || null;
};

const readStatus = (value: unknown): AnswerlatticeEarlyAccessStatus => (
    ANSWERLATTICE_EARLY_ACCESS_STATUSES.includes(value as AnswerlatticeEarlyAccessStatus)
        ? value as AnswerlatticeEarlyAccessStatus
        : 'pending'
);

const serializeRequestData = (id: string, data: FirebaseFirestore.DocumentData) => {
    return {
        id,
        name: readString(data.name, 120),
        workEmail: readString(data.workEmail, 180),
        productUrl: readString(data.productUrl, 300),
        productStage: readString(data.productStage, 40),
        supportArea: readString(data.supportArea, 80),
        supportQuestions: readString(data.supportQuestions, 1600),
        featureIdea: readNullableString(data.featureIdea, 1200),
        status: readStatus(data.status),
        internalNotes: readNullableString(data.internalNotes, 2000),
        submissionCount: Number.isSafeInteger(data.submissionCount) ? Math.max(1, Number(data.submissionCount)) : 1,
        createdAt: timestampToIso(data.createdAt),
        lastSubmittedAt: timestampToIso(data.lastSubmittedAt),
        modifiedOn: timestampToIso(data.modifiedOn),
    };
};

const serializeRequest = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) => (
    serializeRequestData(doc.id, doc.data() || {})
);

const countQuery = async (query: FirebaseFirestore.Query): Promise<number> => {
    const snapshot = await query.count().get();
    const count = snapshot.data().count;
    if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error('answerlattice_early_access_count_invalid');
    }
    return count;
};

export const GET = withPlatformAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await checkAdminRateLimit(session, 'read');
    if (rateLimitResponse) return rateLimitResponse;

    const queryValidation = AnswerlatticeEarlyAccessAdminQuerySchema.safeParse({
        cursor: request.nextUrl.searchParams.get('cursor') || undefined,
        pageSize: request.nextUrl.searchParams.get('pageSize') || undefined,
        status: request.nextUrl.searchParams.get('status') || undefined,
    });
    if (!queryValidation.success) {
        return earlyAccessAdminJson({ error: 'Invalid request.' }, 400);
    }

    const db = getAnswerlatticeDb();
    if (!db) return earlyAccessAdminJson({ error: 'Early access review is temporarily unavailable.' }, 503);

    try {
        const { cursor, pageSize, status } = queryValidation.data;
        const collection = db.collection(DB_COLLECTIONS.ANSWERLATTICE_EARLY_ACCESS_REQUESTS);
        let listQuery: FirebaseFirestore.Query = status
            ? collection.where('status', '==', status)
            : collection;
        listQuery = listQuery.orderBy('lastSubmittedAt', 'desc');

        if (cursor) {
            const cursorSnapshot = await collection.doc(cursor).get();
            if (!cursorSnapshot.exists || (status && readStatus(cursorSnapshot.data()?.status) !== status)) {
                return earlyAccessAdminJson({ error: 'The request list changed. Refresh and try again.' }, 409);
            }
            listQuery = listQuery.startAfter(cursorSnapshot);
        }

        const [listSnapshot, total, ...statusCounts] = await Promise.all([
            listQuery.limit(pageSize + 1).get(),
            countQuery(collection),
            ...ANSWERLATTICE_EARLY_ACCESS_STATUSES.map((candidateStatus) => (
                countQuery(collection.where('status', '==', candidateStatus))
            )),
        ]);

        const hasMore = listSnapshot.docs.length > pageSize;
        const visibleDocs = listSnapshot.docs.slice(0, pageSize);
        const counts = ANSWERLATTICE_EARLY_ACCESS_STATUSES.reduce<Record<AnswerlatticeEarlyAccessStatus, number>>(
            (acc, candidateStatus, index) => {
                acc[candidateStatus] = statusCounts[index] ?? 0;
                return acc;
            },
            { pending: 0, approved: 0, invited: 0, activated: 0, declined: 0, withdrawn: 0 },
        );

        return earlyAccessAdminJson({
            counts: { ...counts, total },
            hasMore,
            nextCursor: hasMore && visibleDocs.length ? visibleDocs[visibleDocs.length - 1].id : null,
            requests: visibleDocs.map(serializeRequest),
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_early_access_admin_read_failed', error, {
            hasCursor: Boolean(queryValidation.data.cursor),
            status: queryValidation.data.status || 'all',
        });
        return earlyAccessAdminJson({ error: 'Could not load early access requests.' }, 500);
    }
});

export const PATCH = withPlatformAuth(async (request: NextRequest, session) => {
    const rateLimitResponse = await checkAdminRateLimit(session, 'write');
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request body.',
        tooLargeMessage: 'Request body too large.',
    });
    if (bodyResult.ok === false) {
        return earlyAccessAdminJson({ error: 'Invalid request.' }, bodyResult.response.status);
    }

    const validation = AnswerlatticeEarlyAccessAdminUpdateSchema.safeParse(bodyResult.data);
    if (!validation.success) return earlyAccessAdminJson({ error: 'Invalid request.' }, 400);

    const db = getAnswerlatticeDb();
    if (!db) return earlyAccessAdminJson({ error: 'Early access review is temporarily unavailable.' }, 503);

    const { internalNotes, requestId, status } = validation.data;
    const operatorId = resolveCurrentSessionUserDocumentId(session);
    if (!operatorId) return earlyAccessAdminJson({ error: 'Unauthorized.' }, 401);
    try {
        const requestRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_EARLY_ACCESS_REQUESTS).doc(requestId);
        const updated = await db.runTransaction(async (transaction) => {
            const current = await transaction.get(requestRef);
            if (!current.exists) return null;

            const currentData = current.data() || {};
            const previousStatus = readStatus(currentData.status);
            const now = Timestamp.now();
            const statusHistory = Array.isArray(currentData.statusHistory)
                ? currentData.statusHistory.slice(-24)
                : [];
            const statusChanged = previousStatus !== status;
            const update = sanitizeForFirestore({
                status,
                internalNotes,
                modifiedOn: now,
                reviewedAt: now,
                reviewedBy: operatorId,
                statusHistory: statusChanged
                    ? [...statusHistory, {
                        from: previousStatus,
                        to: status,
                        changedAt: now,
                        changedBy: operatorId,
                    }]
                    : statusHistory,
            }, { undefinedObjectValue: 'omit' });
            transaction.update(requestRef, update);
            return { ...currentData, ...update };
        });

        if (!updated) return earlyAccessAdminJson({ error: 'Request not found.' }, 404);

        logRuntimeDiagnostic('answerlattice_early_access_admin_updated', {
            hasInternalNotes: Boolean(internalNotes),
            status,
        });
        return earlyAccessAdminJson({ request: serializeRequestData(requestId, updated) });
    } catch (error) {
        logRuntimeFailure('answerlattice_early_access_admin_update_failed', error, {
            hasRequestId: true,
            status,
        });
        return earlyAccessAdminJson({ error: 'Could not update the request.' }, 500);
    }
});
