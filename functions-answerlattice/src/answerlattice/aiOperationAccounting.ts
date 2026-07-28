import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { ANSWERLATTICE_EMBEDDING_MODEL, ANSWERLATTICE_TEXT_MODEL } from '../constants/ai';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { answerlatticeGenAIClient } from '../genAiClient';
import { sanitizeForFirestore as sanitizeFirestoreValue } from '../lib/sanitizeForFirestore';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

export const ANSWERLATTICE_AI_ACTIONS = {
    KB_GENERATION: 'answerlattice_kb_generation',
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
    clientResponse?: Record<string, unknown>;
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
const ANSWERLATTICE_AI_ACTION_SET = new Set<string>(Object.values(ANSWERLATTICE_AI_ACTIONS));
const ANSWERLATTICE_TOKEN_COUNT_SOURCES = new Set<AnswerlatticeTokenCountSource>(['provider', 'estimated', 'none']);
const ANSWERLATTICE_BILLING_MODES = new Set<NonNullable<AnswerlatticeAiOperationInput['billingMode']>>([
    'billable',
    'free',
    'internal',
    'public',
]);
const MAX_ACCOUNTING_LABEL_LENGTH = 180;

type NormalizedAnswerlatticeAiOperationInput = {
    action: string;
    billingMode: NonNullable<AnswerlatticeAiOperationInput['billingMode']>;
    byteSize: number;
    candidatesTokenCount: number;
    clientResponse: Record<string, unknown>;
    model: string;
    processingTime: number;
    promptTokenCount: number;
    sId: number;
    source: string;
    tId: number;
    tokenCountSource: AnswerlatticeTokenCountSource;
    totalTokenCount: number;
    unitsConsumed: number;
};

function normalizeNonNegativeSafeInteger(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function normalizePositiveScopeId(value: unknown): number | null {
    const normalized = normalizeNonNegativeSafeInteger(value);
    return normalized !== null && normalized > 0 ? normalized : null;
}

function normalizeOptionalCount(value: unknown): number | null {
    return value === undefined ? 0 : normalizeNonNegativeSafeInteger(value);
}

function normalizeAccountingLabel(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_ACCOUNTING_LABEL_LENGTH || /[\u0000-\u001f\u007f]/.test(normalized)) {
        return null;
    }
    return normalized;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function copyOptionalAccountingCount(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    key: string,
): boolean {
    if (!hasOwn(source, key)) return true;
    const value = normalizeNonNegativeSafeInteger(source[key]);
    if (value === null) return false;
    target[key] = value;
    return true;
}

function normalizeAccountingDocumentId(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > MAX_ACCOUNTING_LABEL_LENGTH) return null;
    if (!value || value.trim() !== value || value === '.' || value === '..' || value.includes('/') || /^__.*__$/.test(value)) {
        return null;
    }
    return /[\u0000-\u001f\u007f]/.test(value) ? null : value;
}

function copyOptionalAccountingDocumentId(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    key: string,
    nullable = false,
): boolean {
    if (!hasOwn(source, key)) return true;
    if (nullable && source[key] === null) {
        target[key] = null;
        return true;
    }
    const value = normalizeAccountingDocumentId(source[key]);
    if (value === null) return false;
    target[key] = value;
    return true;
}

function normalizeAnswerlatticeFunctionsClientResponse(
    action: string,
    value: unknown,
): Record<string, unknown> | null {
    if (value === undefined) return {};
    if (!isPlainRecord(value)) return null;

    const projected: Record<string, unknown> = {};
    if (action === ANSWERLATTICE_AI_ACTIONS.KB_GENERATION) {
        return copyOptionalAccountingCount(value, projected, 'sourceFileCount')
            && copyOptionalAccountingCount(value, projected, 'responseLength')
            ? projected
            : null;
    }

    if (action === ANSWERLATTICE_AI_ACTIONS.KB_EMBEDDING) {
        return copyOptionalAccountingDocumentId(value, projected, 'articleId', true)
            && copyOptionalAccountingCount(value, projected, 'embeddingDimensions')
            ? projected
            : null;
    }

    if (action === ANSWERLATTICE_AI_ACTIONS.DRAFT_GENERATION) {
        return copyOptionalAccountingDocumentId(value, projected, 'entityId')
            && copyOptionalAccountingDocumentId(value, projected, 'proposalId')
            && copyOptionalAccountingCount(value, projected, 'signalExamplesCount')
            ? projected
            : null;
    }

    if (action === ANSWERLATTICE_AI_ACTIONS.TICKET_KNOWLEDGE_EXTRACTION) {
        return copyOptionalAccountingDocumentId(value, projected, 'entityId')
            && copyOptionalAccountingCount(value, projected, 'sourceTicketCount')
            ? projected
            : null;
    }

    if (action === ANSWERLATTICE_AI_ACTIONS.ONBOARDING_BOOTSTRAP) {
        if (!hasOwn(value, 'step')) return {};
        if (value.step === 'entity_extraction') {
            projected.step = value.step;
            return copyOptionalAccountingCount(value, projected, 'articlesInBatch')
                && copyOptionalAccountingCount(value, projected, 'batchIndex')
                ? projected
                : null;
        }
        if (value.step === 'draft_generation') {
            const entityName = normalizeAccountingLabel(value.entityName);
            if (hasOwn(value, 'entityName') && (entityName === null || entityName !== value.entityName)) return null;
            projected.step = value.step;
            if (entityName !== null) projected.entityName = entityName;
            return copyOptionalAccountingDocumentId(value, projected, 'entityId')
                && copyOptionalAccountingCount(value, projected, 'relevantArticlesCount')
                ? projected
                : null;
        }
        return null;
    }

    if (action === ANSWERLATTICE_AI_ACTIONS.FRICTION_INSIGHT) {
        if (
            hasOwn(value, 'frictionLevel')
            && value.frictionLevel !== 'LOW'
            && value.frictionLevel !== 'MODERATE'
            && value.frictionLevel !== 'HIGH'
        ) {
            return null;
        }
        if (hasOwn(value, 'frictionLevel')) projected.frictionLevel = value.frictionLevel;
        return copyOptionalAccountingCount(value, projected, 'emergingTopicsCount')
            && copyOptionalAccountingCount(value, projected, 'suggestedActionCount')
            ? projected
            : null;
    }

    return null;
}

function normalizeAnswerlatticeFunctionsAiOperationInput(
    input: AnswerlatticeAiOperationInput,
): NormalizedAnswerlatticeAiOperationInput | null {
    const tId = normalizePositiveScopeId(input.tId);
    const sId = normalizePositiveScopeId(input.sId);
    const source = normalizeAccountingLabel(input.source);
    const model = normalizeAccountingLabel(input.model === undefined ? GEMINI_MODEL : input.model);
    const promptTokenCount = normalizeOptionalCount(input.promptTokenCount);
    const candidatesTokenCount = normalizeOptionalCount(input.candidatesTokenCount);
    const totalTokenCount = normalizeOptionalCount(input.totalTokenCount);
    const processingTime = normalizeOptionalCount(input.processingTime);
    const unitsConsumed = normalizeOptionalCount(input.unitsConsumed);
    const byteSize = normalizeOptionalCount(input.byteSize);
    const clientResponse = normalizeAnswerlatticeFunctionsClientResponse(input.action, input.clientResponse);
    const tokenCountSource = input.tokenCountSource === undefined ? 'none' : input.tokenCountSource;
    const billingMode = input.billingMode === undefined
        ? ((unitsConsumed ?? 0) > 0 ? 'billable' : 'internal')
        : input.billingMode;

    if (
        !ANSWERLATTICE_AI_ACTION_SET.has(input.action)
        || tId === null
        || sId === null
        || source === null
        || model === null
        || promptTokenCount === null
        || candidatesTokenCount === null
        || totalTokenCount === null
        || processingTime === null
        || unitsConsumed === null
        || byteSize === null
        || clientResponse === null
        || !ANSWERLATTICE_TOKEN_COUNT_SOURCES.has(tokenCountSource)
        || !ANSWERLATTICE_BILLING_MODES.has(billingMode)
        || totalTokenCount < promptTokenCount + candidatesTokenCount
        || (tokenCountSource === 'none' && totalTokenCount !== 0)
        || (tokenCountSource !== 'none' && totalTokenCount === 0)
    ) {
        return null;
    }

    return {
        action: input.action,
        billingMode,
        byteSize,
        candidatesTokenCount,
        clientResponse,
        model,
        processingTime,
        promptTokenCount,
        sId,
        source,
        tId,
        tokenCountSource,
        totalTokenCount,
        unitsConsumed,
    };
}

function getAiAccountingErrorContext(error: unknown): {
    sourceErrorName: string;
    sourceErrorCode: string | null;
    sourceStatusCode: number | null;
} {
    let sourceErrorCode: string | null = null;
    let sourceStatusCode: number | null = null;
    try {
        const record = error && typeof error === 'object' ? error as Record<string, unknown> : null;
        const rawCode = record?.code;
        const rawStatus = record?.statusCode ?? record?.status;
        sourceErrorCode = typeof rawCode === 'string' ? rawCode.slice(0, 80) : null;
        sourceStatusCode = normalizeNonNegativeSafeInteger(rawStatus);
    } catch {
        // Error objects can expose throwing accessors. The class name remains enough for bounded diagnostics.
    }

    return {
        sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
        sourceErrorCode,
        sourceStatusCode,
    };
}

function getAiAccountingInputContext(input: AnswerlatticeAiOperationInput) {
    return {
        actionRegistered: typeof input.action === 'string' && ANSWERLATTICE_AI_ACTION_SET.has(input.action),
        actionLength: typeof input.action === 'string' ? input.action.length : null,
        sourceLength: typeof input.source === 'string' ? input.source.length : null,
        tenantScopeType: typeof input.tId,
        storeScopeType: typeof input.sId,
    };
}

const sanitizeForFirestore = (value: any): any => {
    return sanitizeFirestoreValue(value, {
        dateTransform: (date) => Timestamp.fromDate(date),
    });
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
    const rawPromptTokenCount = usage.promptTokenCount ?? usage.prompt_token_count;
    const rawCandidatesTokenCount = usage.candidatesTokenCount ?? usage.candidates_token_count;
    const rawTotalTokenCount = usage.totalTokenCount ?? usage.total_token_count;
    const suppliedCounts = [rawPromptTokenCount, rawCandidatesTokenCount, rawTotalTokenCount]
        .filter((value) => value !== undefined && value !== null);
    const providerCountsAreValid = suppliedCounts.every((value) => normalizeNonNegativeSafeInteger(value) !== null);
    const promptTokenCount = normalizeNonNegativeSafeInteger(rawPromptTokenCount) ?? 0;
    const candidatesTokenCount = normalizeNonNegativeSafeInteger(rawCandidatesTokenCount) ?? 0;
    const suppliedTotalTokenCount = normalizeNonNegativeSafeInteger(rawTotalTokenCount);
    const summedTokenCount = normalizeNonNegativeSafeInteger(promptTokenCount + candidatesTokenCount);
    const totalTokenCount = suppliedTotalTokenCount ?? summedTokenCount ?? 0;

    if (
        suppliedCounts.length > 0
        && providerCountsAreValid
        && totalTokenCount >= promptTokenCount + candidatesTokenCount
        && totalTokenCount > 0
    ) {
        return {
            promptTokenCount,
            candidatesTokenCount,
            totalTokenCount,
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
        const normalized = normalizeAnswerlatticeFunctionsAiOperationInput(input);
        if (!normalized) {
            logger.warn('[Answerlattice AI Accounting] Skipped invalid operation log', {
                failureCode: 'ANSWERLATTICE_AI_OPERATION_INPUT_INVALID',
                ...getAiAccountingInputContext(input),
            });
            return null;
        }

        const tokenPerCredit = TOKENS_PER_CREDIT;
        const totalCredits = normalized.totalTokenCount / tokenPerCredit;
        const chargePerCredit = CHARGE_PER_CREDIT;
        const now = Timestamp.now();
        const data = sanitizeForFirestore({
            action: normalized.action,
            aiLogMode: 'accounting_only',
            billingMode: normalized.billingMode,
            byteSize: normalized.byteSize,
            candidatesTokenCount: normalized.candidatesTokenCount,
            chargePerCredit,
            clientResponse: normalized.clientResponse,
            createdBy: 'answerlattice-functions',
            createdOn: now,
            detailRetentionDays: 0,
            geminiResponse: null,
            model: normalized.model,
            modifiedBy: 'answerlattice-functions',
            modifiedOn: now,
            pId: PRODUCT_ID,
            processingTime: normalized.processingTime,
            promptTokenCount: normalized.promptTokenCount,
            sId: normalized.sId,
            source: normalized.source,
            tId: normalized.tId,
            tokenCountSource: normalized.tokenCountSource,
            tokenPerCredit,
            totalCharge: chargePerCredit * totalCredits,
            totalCredits,
            totalTokenCount: normalized.totalTokenCount,
            unitsConsumed: normalized.unitsConsumed,
            uId: 'answerlattice-functions',
        });

        const docRef = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
            .doc(String(normalized.tId))
            .collection(String(normalized.sId))
            .add(data);

        return docRef.id;
    } catch (error) {
        logger.error('[Answerlattice AI Accounting] Operation log failed', {
            failureCode: 'ANSWERLATTICE_AI_OPERATION_LOG_FAILED',
            ...getAiAccountingInputContext(input),
            ...getAiAccountingErrorContext(error),
        });
        return null;
    }
};

export const recordGeminiCallOperation = async (params: {
    action: string;
    clientResponse?: Record<string, unknown>;
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
    model?: string;
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
            embeddingDimensions: params.dimensions ?? 0,
        },
        model: params.model || EMBEDDING_MODEL,
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
