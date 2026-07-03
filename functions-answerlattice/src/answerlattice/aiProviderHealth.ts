import { Timestamp } from 'firebase-admin/firestore';
import { ANSWERLATTICE_TEXT_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { callAnswerlatticeGeminiContent } from './aiOperationAccounting';

const HEALTH_DOC_ID = 'answerlatticeAiProviderHealth';
const PROVIDER = 'gemini';
const ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED';
const ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE';

function utcDayKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

function timestampMillis(value: unknown): number | null {
    if (!value) return null;
    if (typeof (value as any).toMillis === 'function') return (value as any).toMillis();
    if (typeof (value as any).seconds === 'number') return (value as any).seconds * 1000;
    return null;
}

function getProviderHealthSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const sourceStatusCode = typeof source.status === 'number'
        ? source.status
        : (typeof source.statusCode === 'number' ? source.statusCode : null);

    return {
        sourceErrorName: typeof source.name === 'string' ? source.name : null,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number' ? source.code : null,
        sourceStatusCode,
    };
}

function getProviderHealthFailureCode(error: unknown): string {
    return error instanceof Error && error.message === ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE
        ? ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE
        : ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED;
}

export async function runAnswerlatticeAiProviderHealthCheck(params: {
    force?: boolean;
} = {}): Promise<{ activity: boolean; details: Record<string, unknown> }> {
    const now = new Date();
    const dayKey = utcDayKey(now);
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(HEALTH_DOC_ID);
    const current = (await ref.get()).data() || {};

    if (!params.force && current.lastCompletedDayKey === dayKey) {
        return {
            activity: false,
            details: {
                model: ANSWERLATTICE_TEXT_MODEL,
                provider: PROVIDER,
                reason: 'already_completed_today',
                status: current.status || 'ok',
            },
        };
    }

    const startedAt = Date.now();
    const base = {
        checkedAt: Timestamp.fromDate(now),
        lastAttemptDayKey: dayKey,
        model: ANSWERLATTICE_TEXT_MODEL,
        productId: 'AL',
        provider: PROVIDER,
        sdkSurface: 'answerlattice-functions-vertex',
        source: 'answerlatticeMasterScheduler',
    };

    try {
        const result = await callAnswerlatticeGeminiContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            userPrompt: 'Reply with exactly OK.',
        });
        const latencyMs = Date.now() - startedAt;
        const text = String(result.text || '').trim();
        if (!/^ok[.!]?$/i.test(text)) {
            throw new Error(ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE);
        }

        const details = {
            ...base,
            error: null,
            lastCompletedAt: Timestamp.now(),
            lastCompletedDayKey: dayKey,
            latencyMs,
            status: 'ok',
            success: true,
            tokenCountSource: result.usageMetadata.tokenCountSource,
            totalTokenCount: result.usageMetadata.totalTokenCount,
            updatedAt: Timestamp.now(),
        };
        await ref.set(details, { merge: true });

        return {
            activity: false,
            details: {
                latencyMs,
                model: ANSWERLATTICE_TEXT_MODEL,
                provider: PROVIDER,
                status: 'ok',
                previousCheckAgeMs: timestampMillis(current.lastCompletedAt)
                    ? now.getTime() - Number(timestampMillis(current.lastCompletedAt))
                    : null,
            },
        };
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const failureCode = getProviderHealthFailureCode(error);
        await ref.set({
            ...base,
            error: failureCode,
            latencyMs,
            status: 'failed',
            ...getProviderHealthSourceErrorContext(error),
            success: false,
            updatedAt: Timestamp.now(),
        }, { merge: true });
        throw new Error(failureCode);
    }
}
