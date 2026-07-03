import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { ANSWERLATTICE_EMBEDDING_MODEL, ANSWERLATTICE_TEXT_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { answerlatticeGenAIClient } from '../genAiClient';

export const ANSWERLATTICE_AI_ACTIONS = {
    KB_EMBEDDING: 'answerlattice_kb_embedding',
    DRAFT_GENERATION: 'answerlattice_draft_generation',
    TICKET_KNOWLEDGE_EXTRACTION: 'answerlattice_ticket_knowledge_extraction',
    ONBOARDING_BOOTSTRAP: 'answerlattice_onboarding_bootstrap',
    FRICTION_INSIGHT: 'answerlattice_friction_insight',
} as const;

export type AnswerlatticeTokenCountSource = 'provider' | 'estimated' | 'none';

export type AnswerlatticeUsageMetadata = {
    candidatesTokenCount: number;
    promptTokenCount: number;
    tokenCountSource: AnswerlatticeTokenCountSource;
    totalTokenCount: number;
};

export type AnswerlatticeGeminiCallResult = {
    processingTime: number;
    text: string | null;
    usageMetadata: AnswerlatticeUsageMetadata;
};

export type AnswerlatticeAiOperationInput = {
    action: string;
    billingMode?: 'billable' | 'free' | 'internal' | 'public';
    byteSize?: number;
    candidatesTokenCount?: number;
    clientResponse?: Record<string, any>;
    model?: string;
    processingTime?: number;
    promptTokenCount?: number;
    sId: number;
    source: string;
    tId: number;
    tokenCountSource?: AnswerlatticeTokenCountSource;
    totalTokenCount?: number;
    unitsConsumed?: number;
};

const PRODUCT_ID = 'AL';
const TOKENS_PER_CREDIT = 500;
const CHARGE_PER_CREDIT = 100;
const GEMINI_MODEL = ANSWERLATTICE_TEXT_MODEL;
const EMBEDDING_MODEL = ANSWERLATTICE_EMBEDDING_MODEL;

const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return Timestamp.fromDate(value);
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    if (value && typeof value === 'object') {
        if (typeof value.toDate === 'function' && typeof value.seconds === 'number') return value;
        if (value.constructor?.name && String(value.constructor.name).includes('FieldValue')) return value;
        return Object.fromEntries(
            Object.entries(value)
                .filter(([, nested]) => typeof nested !== 'function')
                .map(([key, nested]) => [key, sanitizeForFirestore(nested)]),
        );
    }
    return value;
};

export const estimateTokenCount = (value: string): number => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text ? Math.max(1, Math.ceil(text.length / 4)) : 0;
};

export const extractGeminiUsageMetadata = (
    responseOrResult: any,
    fallbackInputText?: string,
    fallbackOutputText?: string,
): AnswerlatticeUsageMetadata => {
    const usage = responseOrResult?.usageMetadata
        || responseOrResult?.response?.usageMetadata
        || responseOrResult?.response?.usage_metadata
        || {};
    const promptTokenCount = Number(usage.promptTokenCount || usage.prompt_token_count || 0);
    const candidatesTokenCount = Number(usage.candidatesTokenCount || usage.candidates_token_count || 0);
    const totalTokenCount = Number(usage.totalTokenCount || usage.total_token_count || 0);

    if (promptTokenCount > 0 || candidatesTokenCount > 0 || totalTokenCount > 0) {
        return {
            promptTokenCount,
            candidatesTokenCount,
            totalTokenCount: totalTokenCount || promptTokenCount + candidatesTokenCount,
            tokenCountSource: 'provider',
        };
    }

    const estimatedPrompt = estimateTokenCount(fallbackInputText || '');
    const estimatedCandidates = estimateTokenCount(fallbackOutputText || '');
    const estimatedTotal = estimatedPrompt + estimatedCandidates;

    return {
        promptTokenCount: estimatedPrompt,
        candidatesTokenCount: estimatedCandidates,
        totalTokenCount: estimatedTotal,
        tokenCountSource: estimatedTotal > 0 ? 'estimated' : 'none',
    };
};

export const extractGeminiResultText = (responseOrResult: any): string | null => {
    if (!responseOrResult) return null;
    if (typeof responseOrResult.text === 'function') return String(responseOrResult.text() || '') || null;
    if (typeof responseOrResult.text === 'string') return responseOrResult.text || null;
    if (typeof responseOrResult.response?.text === 'function') return String(responseOrResult.response.text() || '') || null;
    if (typeof responseOrResult.response?.text === 'string') return responseOrResult.response.text || null;

    const parts = responseOrResult.response?.candidates?.[0]?.content?.parts
        || responseOrResult.candidates?.[0]?.content?.parts
        || [];
    const text = Array.isArray(parts)
        ? parts.map((part: any) => typeof part?.text === 'string' ? part.text : '').filter(Boolean).join('')
        : '';
    return text || null;
};

export const callAnswerlatticeGeminiContent = async (params: {
    model?: string;
    systemPrompt?: string;
    userPrompt: string;
}): Promise<AnswerlatticeGeminiCallResult> => {
    const modelName = params.model || GEMINI_MODEL;
    const request = {
        model: modelName,
        contents: [
            {
                role: 'user',
                parts: [{ text: params.userPrompt }],
            },
        ],
        ...(params.systemPrompt ? { config: { systemInstruction: params.systemPrompt } } : {}),
    };

    const startedAt = Date.now();
    const result = await answerlatticeGenAIClient.models.generateContent(request);
    const text = extractGeminiResultText(result);

    return {
        processingTime: Date.now() - startedAt,
        text,
        usageMetadata: extractGeminiUsageMetadata(result, `${params.systemPrompt || ''}\n\n${params.userPrompt}`, text || ''),
    };
};

export const recordAnswerlatticeAiOperation = async (input: AnswerlatticeAiOperationInput): Promise<string | null> => {
    try {
        const tenantId = Number(input.tId);
        const storeId = Number(input.sId);
        if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) {
            logger.warn('[Answerlattice AI Accounting] Skipped operation log because scope is invalid', {
                action: input.action,
                tId: input.tId,
                sId: input.sId,
            });
            return null;
        }

        const totalTokenCount = Number(input.totalTokenCount || 0);
        const tokenPerCredit = TOKENS_PER_CREDIT;
        const totalCredits = tokenPerCredit > 0 ? totalTokenCount / tokenPerCredit : 0;
        const chargePerCredit = CHARGE_PER_CREDIT;
        const now = Timestamp.now();
        const data = sanitizeForFirestore({
            action: input.action,
            aiLogMode: 'accounting_only',
            billingMode: input.billingMode || (Number(input.unitsConsumed || 0) > 0 ? 'billable' : 'internal'),
            byteSize: input.byteSize || 0,
            candidatesTokenCount: Number(input.candidatesTokenCount || 0),
            chargePerCredit,
            clientResponse: input.clientResponse || {},
            createdBy: 'answerlattice-functions',
            createdOn: now,
            detailRetentionDays: 0,
            geminiResponse: null,
            model: input.model || GEMINI_MODEL,
            modifiedBy: 'answerlattice-functions',
            modifiedOn: now,
            pId: PRODUCT_ID,
            processingTime: Number(input.processingTime || 0),
            promptTokenCount: Number(input.promptTokenCount || 0),
            sId: storeId,
            source: input.source,
            tId: tenantId,
            tokenCountSource: input.tokenCountSource || 'none',
            tokenPerCredit,
            totalCharge: chargePerCredit * totalCredits,
            totalCredits,
            totalTokenCount,
            unitsConsumed: Number(input.unitsConsumed || 0),
            uId: 'answerlattice-functions',
        });

        const docRef = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
            .doc(String(tenantId))
            .collection(String(storeId))
            .add(data);

        return docRef.id;
    } catch (error) {
        logger.error('[Answerlattice AI Accounting] Operation log failed', {
            action: input.action,
            error,
            sId: input.sId,
            tId: input.tId,
        });
        return null;
    }
};

export const recordGeminiCallOperation = async (params: {
    action: string;
    clientResponse?: Record<string, any>;
    model?: string;
    processingTime?: number;
    sId: number;
    source: string;
    tId: number;
    usageMetadata: AnswerlatticeUsageMetadata;
}) => recordAnswerlatticeAiOperation({
    action: params.action,
    billingMode: 'internal',
    candidatesTokenCount: params.usageMetadata.candidatesTokenCount,
    clientResponse: params.clientResponse,
    model: params.model || GEMINI_MODEL,
    processingTime: params.processingTime,
    promptTokenCount: params.usageMetadata.promptTokenCount,
    sId: params.sId,
    source: params.source,
    tId: params.tId,
    tokenCountSource: params.usageMetadata.tokenCountSource,
    totalTokenCount: params.usageMetadata.totalTokenCount,
    unitsConsumed: 0,
});

export const recordEmbeddingOperation = async (params: {
    articleId?: string;
    dimensions?: number;
    processingTime?: number;
    sId: number;
    source: string;
    textToEmbed: string;
    tId: number;
    usageMetadata?: AnswerlatticeUsageMetadata;
}) => {
    const usageMetadata = params.usageMetadata || extractGeminiUsageMetadata(null, params.textToEmbed);
    return recordAnswerlatticeAiOperation({
        action: ANSWERLATTICE_AI_ACTIONS.KB_EMBEDDING,
        billingMode: 'internal',
        byteSize: Buffer.byteLength(params.textToEmbed || '', 'utf8'),
        candidatesTokenCount: usageMetadata.candidatesTokenCount,
        clientResponse: {
            articleId: params.articleId || null,
            embeddingDimensions: Number(params.dimensions || 0),
        },
        model: EMBEDDING_MODEL,
        processingTime: params.processingTime,
        promptTokenCount: usageMetadata.promptTokenCount,
        sId: params.sId,
        source: params.source,
        tId: params.tId,
        tokenCountSource: usageMetadata.tokenCountSource,
        totalTokenCount: usageMetadata.totalTokenCount,
        unitsConsumed: 0,
    });
};
