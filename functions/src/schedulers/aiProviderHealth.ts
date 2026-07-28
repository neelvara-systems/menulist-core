import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { AI_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { genAIClient } from '../genAiClient';
import type { KeyManagerStats } from '../ai/keyManager';
import {
    getBoundedFunctionsErrorCode,
    getBoundedFunctionsErrorName,
    getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

const logger = functions.logger;
const HEALTH_DOC_ID = 'aiProvider_gemini';
const PROVIDER = 'gemini';
const AI_PROVIDER_HEALTH_FAILED_CODE = 'AI_PROVIDER_HEALTH_CHECK_FAILED';
const AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE = 'AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE';
const AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED_CODE = 'AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED';

type AiProviderHealthBaseState = {
    checkedAt: Timestamp;
    keyStats: KeyManagerStats | null;
    latencyMs: number;
    model: string;
    productId: 'ML';
    provider: typeof PROVIDER;
    sdkSurface: 'firebase-functions';
    source: 'menulistMaintenanceScheduler';
    updatedAt: Timestamp;
};

export type AiProviderHealthState = AiProviderHealthBaseState & (
    | {
        error: null;
        status: 'ok';
        success: true;
    }
    | {
        error: string;
        failureCode: string;
        sourceErrorCode: string | number | null;
        sourceErrorName: string;
        sourceErrorStatus: string | number | null;
        status: 'failed';
        success: false;
    }
);

function responseText(response: any): string {
    if (!response) return '';
    if (typeof response.text === 'function') return String(response.text() || '');
    if (typeof response.text === 'string') return response.text;
    return '';
}

function getAiProviderHealthErrorContext(error: unknown): Pick<
    Extract<AiProviderHealthState, { status: 'failed' }>,
    'sourceErrorCode' | 'sourceErrorName' | 'sourceErrorStatus'
> {
    return {
        sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
        sourceErrorCode: getBoundedFunctionsErrorCode(error) ?? null,
        sourceErrorStatus: getBoundedFunctionsErrorStatus(error) ?? null,
    };
}

function getAiProviderHealthFailureCode(error: unknown): string {
    const code = getBoundedFunctionsErrorCode(error);
    if (code === AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE) {
        return AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE_CODE;
    }
    return AI_PROVIDER_HEALTH_FAILED_CODE;
}

function keyStats(): KeyManagerStats | null {
    try {
        return genAIClient.getKeyStats();
    } catch {
        return null;
    }
}

export async function replaceAiProviderHealthState(details: AiProviderHealthState): Promise<void> {
    await db.collection(DB_COLLECTIONS.HEALTH).doc(HEALTH_DOC_ID).set(details);
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
    } as const;

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

        const details: AiProviderHealthState = {
            ...base,
            error: null,
            keyStats: keyStats(),
            latencyMs,
            status: 'ok',
            success: true,
            updatedAt: Timestamp.now(),
        };

        await replaceAiProviderHealthState(details);
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
        const failureState: AiProviderHealthState = {
            ...base,
            error: failureCode,
            failureCode,
            keyStats: keyStats(),
            latencyMs,
            status: 'failed',
            ...errorContext,
            success: false,
            updatedAt: Timestamp.now(),
        };
        await replaceAiProviderHealthState(failureState).catch((writeError) => {
            logger.error('[AI Provider Health] Failed to persist failure state', {
                failureCode: AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED_CODE,
                ...getAiProviderHealthErrorContext(writeError),
            });
        });
        throw new Error(failureCode);
    }
}
