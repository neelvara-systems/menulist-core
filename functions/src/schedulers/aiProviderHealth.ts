import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { AI_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { genAIClient } from '../genAiClient';

const logger = functions.logger;
const HEALTH_DOC_ID = 'aiProvider_gemini';
const PROVIDER = 'gemini';

function responseText(response: any): string {
    if (!response) return '';
    if (typeof response.text === 'function') return String(response.text() || '');
    if (typeof response.text === 'string') return response.text;
    return '';
}

function compactError(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 500);
    return String(error || 'Unknown provider error').slice(0, 500);
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
            throw new Error('Gemini health check returned an unexpected response.');
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
        const message = compactError(error);
        await db.collection(DB_COLLECTIONS.HEALTH).doc(HEALTH_DOC_ID).set({
            ...base,
            error: message,
            keyStats: keyStats(),
            latencyMs,
            status: 'failed',
            success: false,
            updatedAt: Timestamp.now(),
        }, { merge: true }).catch((writeError) => {
            logger.error('[AI Provider Health] Failed to persist failure state', {
                error: compactError(writeError),
            });
        });
        throw new Error(`Gemini provider health check failed: ${message}`);
    }
}

