export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import {
    ANSWERLATTICE_EARLY_ACCESS_STATUSES,
    AnswerlatticeEarlyAccessPublicRequestSchema,
    type AnswerlatticeEarlyAccessStatus,
} from '@lib/answerlattice/earlyAccessContracts';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdminCompat';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    normalizePublicContactReferrer,
    normalizePublicContactSourcePath,
} from '@lib/publicContact/contactBoundary';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { withCORS } from '@lib/security/corsValidation';
import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
    checkPublicRateLimit,
    getClientIp,
    hashPublicRateLimitValue,
    sanitizeString,
    validateHoneypot,
    verifyTurnstileToken,
} from 'src/middleware/publicApi';

const MAX_BODY_BYTES = 8 * 1024;
const RESPONSE_HEADERS = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const earlyAccessJson = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
    headers: RESPONSE_HEADERS,
    status,
});

const getAnswerlatticeDb = () => (
    answerlatticeAdminApp ? answerlatticeFirestoreAdmin : null
);

const cleanHeader = (value: string | null, maximum: number): string | null => {
    const sanitized = sanitizeString(value || undefined);
    return sanitized ? sanitized.slice(0, maximum) : null;
};

const buildRequestId = (normalizedEmail: string): string => (
    createHash('sha256').update(normalizedEmail).digest('base64url').slice(0, 43)
);

const normalizeExistingStatus = (value: unknown): AnswerlatticeEarlyAccessStatus => (
    ANSWERLATTICE_EARLY_ACCESS_STATUSES.includes(value as AnswerlatticeEarlyAccessStatus)
        ? value as AnswerlatticeEarlyAccessStatus
        : 'pending'
);

async function postEarlyAccess(request: NextRequest) {
    const rateLimitResponse = await checkPublicRateLimit(request, 'ANSWERLATTICE_EARLY_ACCESS', {
        failClosed: true,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const bodyResult = await readBoundedJsonBody(request, MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request body.',
        tooLargeMessage: 'Request body too large.',
    });
    if (bodyResult.ok === false) {
        return earlyAccessJson(
            {
                accepted: false,
                error: bodyResult.response.status === 413
                    ? 'Request body too large.'
                    : 'Please check the form and try again.',
            },
            bodyResult.response.status,
        );
    }

    const validation = AnswerlatticeEarlyAccessPublicRequestSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return earlyAccessJson({ accepted: false, error: 'Please check the form and try again.' }, 400);
    }

    const body = validation.data;
    if (!validateHoneypot(body.website || undefined)) {
        return earlyAccessJson({ accepted: true });
    }

    const captchaResult = await verifyTurnstileToken(body.captchaToken, request);
    if (!captchaResult.ok) {
        return earlyAccessJson({ accepted: false, error: 'Could not verify request. Please try again.' }, 403);
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return earlyAccessJson({ accepted: false, error: 'Early access requests are temporarily unavailable.' }, 503);
    }

    try {
        const now = admin.firestore.Timestamp.now();
        const requestId = buildRequestId(body.workEmail);
        const requestRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_EARLY_ACCESS_REQUESTS).doc(requestId);
        const ipHash = hashPublicRateLimitValue(getClientIp(request));
        const sourcePath = normalizePublicContactSourcePath(body.sourcePath);
        const referrer = normalizePublicContactReferrer(request.headers.get('referer'));
        const userAgent = cleanHeader(request.headers.get('user-agent'), 300);

        const outcome = await db.runTransaction(async (transaction) => {
            const current = await transaction.get(requestRef);
            const currentData = current.data() || {};
            const submissionCount = current.exists && Number.isSafeInteger(currentData.submissionCount)
                ? Math.min(1_000_000, Math.max(1, Number(currentData.submissionCount)) + 1)
                : 1;
            const status = current.exists ? normalizeExistingStatus(currentData.status) : 'pending';
            const statusHistory = Array.isArray(currentData.statusHistory)
                ? currentData.statusHistory.slice(-24)
                : [];

            const writeData = sanitizeForFirestore({
                pId: PRODUCT_IDS.ANSWERLATTICE,
                source: 'answerlattice_public_early_access',
                status,
                name: body.name,
                workEmail: body.workEmail,
                productUrl: body.productUrl,
                productStage: body.productStage,
                supportArea: body.supportArea,
                supportQuestions: body.supportQuestions,
                featureIdea: body.featureIdea,
                consent: body.consent,
                sourcePath,
                referrer,
                userAgent,
                ipHash,
                submissionCount,
                createdAt: current.exists && currentData.createdAt ? currentData.createdAt : now,
                lastSubmittedAt: now,
                modifiedOn: now,
                internalNotes: current.exists ? currentData.internalNotes || null : null,
                statusHistory: current.exists
                    ? statusHistory
                    : [{ from: null, to: 'pending', changedAt: now, changedBy: 'public_submission' }],
                ...getAnswerlatticeRetentionFields('earlyAccessRequests', now),
            }, { undefinedObjectValue: 'omit' });

            transaction.set(requestRef, writeData, { merge: true });
            return { created: !current.exists, submissionCount };
        });

        logRuntimeDiagnostic('answerlattice_early_access_request_accepted', {
            created: outcome.created,
            hasFeatureIdea: Boolean(body.featureIdea),
            productStage: body.productStage,
            submissionCount: outcome.submissionCount,
            supportArea: body.supportArea,
        });

        return earlyAccessJson({ accepted: true });
    } catch (error) {
        logRuntimeFailure('answerlattice_early_access_request_failed', error, {
            hasFeatureIdea: Boolean(body.featureIdea),
            productStage: body.productStage,
            supportArea: body.supportArea,
        });
        return earlyAccessJson({ accepted: false, error: 'Could not register your request right now. Please try again.' }, 500);
    }
}

export const POST = withCORS(postEarlyAccess);
