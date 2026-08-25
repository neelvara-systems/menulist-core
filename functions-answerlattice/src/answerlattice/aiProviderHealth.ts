import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { ANSWERLATTICE_TEXT_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { callAnswerlatticeGeminiContent } from './aiOperationAccounting';

const HEALTH_DOC_ID = 'answerlatticeAiProviderHealth';
const PROVIDER = 'gemini';
const ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED';
const ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE';
const ANSWERLATTICE_AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED = 'ANSWERLATTICE_AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED';
const MAX_FIRESTORE_TIMESTAMP_MILLIS = 253_402_300_799_999;

type AnswerlatticeAiProviderHealthBaseState = {
    checkedAt: Timestamp;
    lastAttemptDayKey: string;
    latencyMs: number;
    model: string;
    productId: 'AL';
    provider: typeof PROVIDER;
    sdkSurface: 'answerlattice-functions-google-genai';
    source: 'answerlatticeMasterScheduler';
    updatedAt: Timestamp;
};

export type AnswerlatticeAiProviderHealthSuccessState = AnswerlatticeAiProviderHealthBaseState & {
    error: null;
    lastCompletedAt: Timestamp;
    lastCompletedDayKey: string;
    status: 'ok';
    success: true;
    tokenCountSource: 'provider' | 'estimated' | 'none';
    totalTokenCount: number;
};

type AnswerlatticeAiProviderHealthFailureState = AnswerlatticeAiProviderHealthBaseState & {
    error: typeof ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED | typeof ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE;
    failureCode: typeof ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED | typeof ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE;
    lastCompletedAt?: Timestamp;
    lastCompletedDayKey?: string;
    sourceErrorCode: string | number | null;
    sourceErrorName: string | null;
    sourceStatusCode: number | null;
    status: 'failed';
    success: false;
};

function utcDayKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

export function timestampMillis(value: unknown): number | null {
    if (!value || typeof value !== 'object') return null;
    try {
        const record = value as Record<string, unknown>;
        if (typeof record.toMillis === 'function') {
            const millis = record.toMillis.call(value);
            return typeof millis === 'number'
                && Number.isSafeInteger(millis)
                && millis >= 0
                && millis <= MAX_FIRESTORE_TIMESTAMP_MILLIS
                ? millis
                : null;
        }
        if (typeof record.seconds === 'number' && Number.isSafeInteger(record.seconds) && record.seconds >= 0) {
            const millis = record.seconds * 1000;
            return Number.isSafeInteger(millis) && millis <= MAX_FIRESTORE_TIMESTAMP_MILLIS ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null;
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized ? normalized.slice(0, 80) : null;
}

function getSafeErrorName(error: unknown): string | null {
    if (!(error instanceof Error)) return null;
    try {
        return typeof error.name === 'string' && error.name.trim()
            ? error.name.trim().slice(0, 80)
            : 'Error';
    } catch {
        return null;
    }
}

export function getProviderHealthSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    try {
        const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
        const status = boundedDiagnosticValue(source.status ?? source.statusCode);

        return {
            sourceErrorName: typeof source.name === 'string'
                ? String(boundedDiagnosticValue(source.name) || '') || null
                : getSafeErrorName(error),
            sourceErrorCode: boundedDiagnosticValue(source.code),
            sourceStatusCode: typeof status === 'number' && status >= 100 && status <= 599 ? status : null,
        };
    } catch {
        return {
            sourceErrorName: getSafeErrorName(error),
            sourceErrorCode: null,
            sourceStatusCode: null,
        };
    }
}

function getProviderHealthFailureCode(error: unknown): AnswerlatticeAiProviderHealthFailureState['failureCode'] {
    return error instanceof Error && error.message === ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE
        ? ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE
        : ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED;
}

function normalizeDayKey(value: unknown): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function projectPreviousCompletion(current: Record<string, unknown>, nowMillis: number): {
    lastCompletedAt: Timestamp;
    lastCompletedDayKey: string;
} | null {
    const lastCompletedDayKey = normalizeDayKey(current.lastCompletedDayKey);
    const lastCompletedMillis = timestampMillis(current.lastCompletedAt);
    if (
        !lastCompletedDayKey
        || lastCompletedMillis === null
        || lastCompletedMillis > nowMillis
        || new Date(lastCompletedMillis).toISOString().slice(0, 10) !== lastCompletedDayKey
    ) return null;
    return {
        lastCompletedAt: Timestamp.fromMillis(lastCompletedMillis),
        lastCompletedDayKey,
    };
}

export async function replaceAnswerlatticeAiProviderHealthState(
    details: AnswerlatticeAiProviderHealthSuccessState | AnswerlatticeAiProviderHealthFailureState,
): Promise<void> {
    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(HEALTH_DOC_ID).set(details);
}

export async function runAnswerlatticeAiProviderHealthCheck(params: {
    force?: boolean;
} = {}): Promise<{ activity: boolean; details: Record<string, unknown> }> {
    const now = new Date();
    const dayKey = utcDayKey(now);
    const ref = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(HEALTH_DOC_ID);
    const current = (await ref.get()).data() || {};
    const previousCompletion = projectPreviousCompletion(current, now.getTime());

    if (!params.force && current.status === 'ok' && current.success === true && previousCompletion?.lastCompletedDayKey === dayKey) {
        return {
            activity: false,
            details: {
                model: ANSWERLATTICE_TEXT_MODEL,
                provider: PROVIDER,
                reason: 'already_completed_today',
                status: 'ok',
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
        sdkSurface: 'answerlattice-functions-google-genai',
        source: 'answerlatticeMasterScheduler',
    } as const;

    let result: Awaited<ReturnType<typeof callAnswerlatticeGeminiContent>>;
    try {
        result = await callAnswerlatticeGeminiContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            userPrompt: 'Reply with exactly OK.',
        });
        const text = String(result.text || '').trim();
        if (!/^ok[.!]?$/i.test(text)) {
            throw new Error(ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE);
        }
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const failureCode = getProviderHealthFailureCode(error);
        const failureState: AnswerlatticeAiProviderHealthFailureState = {
            ...base,
            error: failureCode,
            failureCode,
            latencyMs,
            status: 'failed',
            ...getProviderHealthSourceErrorContext(error),
            success: false,
            updatedAt: Timestamp.now(),
            ...(previousCompletion || {}),
        };
        await replaceAnswerlatticeAiProviderHealthState(failureState).catch((writeError) => {
            logger.error('[Answerlattice AI Provider Health] Failed to persist failure state', {
                failureCode: ANSWERLATTICE_AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED,
                ...getProviderHealthSourceErrorContext(writeError),
            });
        });
        throw new Error(failureCode);
    }

    const latencyMs = Date.now() - startedAt;
    const completedAt = Timestamp.now();
    const details: AnswerlatticeAiProviderHealthSuccessState = {
        ...base,
        error: null,
        lastCompletedAt: completedAt,
        lastCompletedDayKey: dayKey,
        latencyMs,
        status: 'ok',
        success: true,
        tokenCountSource: result.usageMetadata.tokenCountSource,
        totalTokenCount: result.usageMetadata.totalTokenCount,
        updatedAt: completedAt,
    };
    try {
        await replaceAnswerlatticeAiProviderHealthState(details);
    } catch (writeError) {
        logger.error('[Answerlattice AI Provider Health] Failed to persist success state', {
            failureCode: ANSWERLATTICE_AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED,
            ...getProviderHealthSourceErrorContext(writeError),
        });
        throw new Error(ANSWERLATTICE_AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED);
    }

    const previousCompletedMillis = timestampMillis(current.lastCompletedAt);
    return {
        activity: true,
        details: {
            latencyMs,
            model: ANSWERLATTICE_TEXT_MODEL,
            provider: PROVIDER,
            status: 'ok',
            previousCheckAgeMs: previousCompletedMillis !== null && previousCompletedMillis <= now.getTime()
                ? now.getTime() - previousCompletedMillis
                : null,
        },
    };
}
