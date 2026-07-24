import { getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES } from '@constant/common';
import {
    getNonNegativeCreditInteger,
    getPositiveCreditInteger,
} from '@data/shared/aiCreditScalarContract';
import {
    AnswerlatticeAiActor,
    AnswerlatticeAiCapacityReservation,
    AnswerlatticeCapacityCheckResult,
    AnswerlatticeAiScope,
    checkAnswerlatticeAICapacity,
    isAnswerlatticeAiCapacityExceededError,
    refundAnswerlatticeAiOperationReservation,
    reserveAnswerlatticeAiOperationCapacity,
    settleAnswerlatticeAiOperationReservation,
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
        const normalizedRemaining = getNonNegativeCreditInteger(remaining);
        const normalizedRequired = getPositiveCreditInteger(required);
        if (normalizedRemaining === null || normalizedRequired === null) {
            throw new Error('Answerlattice support-search capacity evidence is invalid.');
        }
        super('This workspace needs more support credits before using AI fallback.');
        this.name = 'AnswerlatticeSupportSearchCapacityError';
        Object.setPrototypeOf(this, new.target.prototype);
        this.remaining = normalizedRemaining;
        this.required = normalizedRequired;
    }
}

export type AnswerlatticeSupportSearchAccounting = {
    abort: (reason: string) => Promise<void>;
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
    let reservationPromise: Promise<AnswerlatticeAiCapacityReservation> | null = null;
    const idempotencyKey = `support-search:${params.mountContext}:${params.requestId}`;
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
    const loadReservation = async () => {
        if (!reservationPromise) {
            reservationPromise = loadCapacity().then((capacity) => reserveAnswerlatticeAiOperationCapacity({
                action: SUPPORT_SEARCH_ACTION,
                idempotencyKey,
                scope: params.scope,
                subscription: capacity.subscription!,
                unitsToReserve: getUnitCost(SUPPORT_SEARCH_ACTION),
            }));
        }
        try {
            return await reservationPromise;
        } catch (error) {
            if (isAnswerlatticeAiCapacityExceededError(error)) {
                throw new AnswerlatticeSupportSearchCapacityError(error.remaining, error.required);
            }
            throw error;
        }
    };

    return {
        abort: async (reason) => {
            if (!reservationPromise) return;
            let reservation: AnswerlatticeAiCapacityReservation;
            try {
                reservation = await loadReservation();
            } catch {
                return;
            }
            await refundAnswerlatticeAiOperationReservation({ reason, reservation });
        },
        beforeAiProviderCall: async () => {
            await loadReservation();
        },
        settle: async (result, processingTime) => {
            if (!reservationPromise) {
                if (result.aiProviderUsed) {
                    throw new Error('Answerlattice support-search provider work has no credit reservation.');
                }
                return;
            }
            const reservation = await loadReservation();
            if (!result.aiProviderUsed) {
                await refundAnswerlatticeAiOperationReservation({
                    reason: 'provider_not_used',
                    reservation,
                });
                return;
            }
            try {
                await settleAnswerlatticeAiOperationReservation({
                    actor: params.actor,
                    context: {
                        aiProviderOperationCount: result.aiProviderOperations?.length || 0,
                        answerSource: result.answerSource || null,
                        canonical: Boolean(result.canonical),
                        imageProcessed: Boolean(result.imageProcessed),
                        mountContext: params.mountContext,
                        referenceCount: result.references?.length || 0,
                        suggestedQuestionCount: result.suggestedQuestions?.length || 0,
                    },
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
                    reservation,
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
