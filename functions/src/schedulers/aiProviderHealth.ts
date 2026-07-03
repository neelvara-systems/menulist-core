import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { AI_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { genAIClient } from '../genAiClient';

const logger = functions.logger;
const HEALTH_DOC_ID = 'aiProvider_gemini';
const PROVIDER = 'gemini';
const AI_PROVIDER_HEALTH_FAILED_CODE = 'AI_PROVIDER_HEALTH_CHECK_FAILED';
const AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE = 'AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE';
const AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED_CODE = 'AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED';

function responseText(response: any): string {
    if (!response) return '';
    if (typeof response.text === 'function') return String(response.text() || '');
    if (typeof response.text === 'string') return response.text;
    return '';
}

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getAiProviderHealthErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

function getAiProviderHealthFailureCode(error: unknown): string {
    const code = boundedDiagnosticValue((error as { code?: unknown })?.code);
    if (code === AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE) {
        return AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE;
    }
    return AI_PROVIDER_HEALTH_FAILED_CODE;
}

function keyStats() {
    const maybeGateway = genAIClient as unknown as { getKeyStats?: () => unknown };
    if (typeof maybeGateway.getKeyStats !== 'function') return null;
    try {
        return maybeGateway.getKeyStats();
    } catch {
        return null;
    }
}

export async function runAiProviderHealthCheckLogic(): Promise<Record<string, unknown>> {
    const startedAt = Date.now();
    const checkedAt = Timestamp.now();
    const base = {
        checkedAt,
        model: AI_MODEL,
        productId: 'ML',
        provider: PROVIDER,
        sdkSurface: 'firebase-functions',
        source: 'menulistMaintenanceScheduler',
    };

    try {
        const response = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: 'Reply with exactly OK.',
            config: {
                maxOutputTokens: 8,
                temperature: 0,
            },
        });
        const latencyMs = Date.now() - startedAt;
        const text = responseText(response).trim();
        if (!/^ok[.!]?$/i.test(text)) {
            throw Object.assign(new Error(AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE), {
                code: AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE,
            });
        }

        const details = {
            ...base,
            error: null,
            keyStats: keyStats(),
            latencyMs,
            status: 'ok',
            success: true,
            updatedAt: Timestamp.now(),
        };

        await db.collection(DB_COLLECTIONS.HEALTH).doc(HEALTH_DOC_ID).set(details, { merge: true });
        return {
            latencyMs,
            model: AI_MODEL,
            provider: PROVIDER,
            status: 'ok',
        };
    } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const failureCode = getAiProviderHealthFailureCode(error);
        const errorContext = getAiProviderHealthErrorContext(error);
        await db.collection(DB_COLLECTIONS.HEALTH).doc(HEALTH_DOC_ID).set({
            ...base,
            error: failureCode,
            failureCode,
            keyStats: keyStats(),
            latencyMs,
            status: 'failed',
            ...errorContext,
            success: false,
            updatedAt: Timestamp.now(),
        }, { merge: true }).catch((writeError) => {
            logger.error('[AI Provider Health] Failed to persist failure state', {
                failureCode: AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED_CODE,
                ...getAiProviderHealthErrorContext(writeError),
            });
        });
        throw new Error(failureCode);
    }
}
