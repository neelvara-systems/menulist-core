import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import {
    AnswerlatticeAiActor,
    AnswerlatticeCapacityCheckResult,
    AnswerlatticeAiScope,
    checkAnswerlatticeAICapacity,
    finalizeAnswerlatticeAiOperationAccounting,
    isAnswerlatticeAiCapacityExceededError,
} from '@lib/answerlattice/aiAccounting';
import type { CoreSearchResult, SearchMountContext } from '@lib/search/types';

const SUPPORT_SEARCH_ACTION = AI_ACTIONS_TYPES.ANSWERLATTICE_SUPPORT_SEARCH;
const SUPPORT_SEARCH_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,120}$/;

export class AnswerlatticeSupportSearchCapacityError extends Error {
    readonly code = 'ANSWERLATTICE_SUPPORT_CREDITS_REQUIRED';
    readonly remaining: number;
    readonly required: number;
    readonly status = 402;

    constructor(remaining: number, required: number) {
        super('This workspace needs more support credits before using AI fallback.');
        this.name = 'AnswerlatticeSupportSearchCapacityError';
        Object.setPrototypeOf(this, new.target.prototype);
        this.remaining = Math.max(0, Number(remaining) || 0);
        this.required = Math.max(0, Number(required) || 0);
    }
}

export type AnswerlatticeSupportSearchAccounting = {
    beforeAiProviderCall: () => Promise<void>;
    settle: (result: CoreSearchResult, processingTime: number) => Promise<void>;
};

export const createAnswerlatticeSupportSearchAccounting = (params: {
    actor?: AnswerlatticeAiActor | null;
    mountContext: SearchMountContext;
    requestId: string;
    scope: AnswerlatticeAiScope;
}): AnswerlatticeSupportSearchAccounting => {
    if (!SUPPORT_SEARCH_REQUEST_ID_PATTERN.test(params.requestId)) {
        throw new Error('Answerlattice support search request ID is invalid.');
    }

    let capacityPromise: Promise<AnswerlatticeCapacityCheckResult> | null = null;
    const loadCapacity = async () => {
        if (!capacityPromise) {
            capacityPromise = checkAnswerlatticeAICapacity(params.scope, SUPPORT_SEARCH_ACTION, 1);
        }
        const capacity = await capacityPromise;
        if (!capacity.allowed || !capacity.subscription) {
            throw new AnswerlatticeSupportSearchCapacityError(capacity.remaining, capacity.unitsRequired);
        }
        return capacity;
    };

    return {
        beforeAiProviderCall: async () => {
            await loadCapacity();
        },
        settle: async (result, processingTime) => {
            if (!result.aiProviderUsed) return;
            const capacity = await loadCapacity();
            try {
                await finalizeAnswerlatticeAiOperationAccounting({
                    actor: params.actor,
                    capacitySubscription: capacity.subscription,
                    context: {
                        aiProviderOperationCount: result.aiProviderOperations?.length || 0,
                        answerSource: result.answerSource || null,
                        canonical: Boolean(result.canonical),
                        imageProcessed: Boolean(result.imageProcessed),
                        mountContext: params.mountContext,
                        referenceCount: result.references?.length || 0,
                        suggestedQuestionCount: result.suggestedQuestions?.length || 0,
                    },
                    idempotencyKey: `support-search:${params.mountContext}:${params.requestId}`,
                    input: {
                        action: SUPPORT_SEARCH_ACTION,
                        billingMode: 'billable',
                        candidatesTokenCount: result.aiProviderTokenUsage?.candidatesTokenCount || 0,
                        clientResponse: {
                            aiProviderOperations: result.aiProviderOperations || [],
                            answerSource: result.answerSource || null,
                            canonical: Boolean(result.canonical),
                            imageProcessed: Boolean(result.imageProcessed),
                            referencesCount: result.references?.length || 0,
                        },
                        model: 'coreSearch',
                        processingTime: Math.max(0, Math.floor(Number(processingTime) || 0)),
                        promptTokenCount: result.aiProviderTokenUsage?.promptTokenCount || 0,
                        source: params.mountContext === 'widget'
                            ? 'answerlattice_widget_search'
                            : 'answerlattice_help_center_search',
                        totalTokenCount: result.aiProviderTokenUsage?.totalTokenCount || 0,
                        tokenCountSource: result.aiProviderTokenUsage?.tokenCountSource || 'none',
                        unitsConsumed: getUnitCost(SUPPORT_SEARCH_ACTION),
                    },
                    logLabel: 'support_search',
                    scope: params.scope,
                });
            } catch (error) {
                if (isAnswerlatticeAiCapacityExceededError(error)) {
                    throw new AnswerlatticeSupportSearchCapacityError(error.remaining, error.required);
                }
                throw error;
            }
        },
    };
};
