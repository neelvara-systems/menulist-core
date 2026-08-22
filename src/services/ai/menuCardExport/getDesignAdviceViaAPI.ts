import { MenuCardDesignAdvisorRecommendationSchema } from '@lib/menu-card-export/ai/designAdvisor';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';
import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure } from '@services/ai/aiServiceDiagnostics';
import { syncBalanceFromResponse } from '@services/ai/balanceSync';
import { AICapacityError, checkCapacityResponse } from '@services/ai/capacityError';
import { z } from 'zod';

const MENU_CARD_DESIGN_ADVISOR_RESPONSE_JSON_MAX_BYTES = 16 * 1024;

export class MenuCardDesignAdvisorPlanError extends Error {
    public code = 'plan_required';

    constructor(message = 'Layout suggestions are included in Pro and Multi-location.') {
        super(message);
        this.name = 'MenuCardDesignAdvisorPlanError';
    }
}

export const MenuCardDesignAdvisorResponseSchema = z.object({
    success: z.literal(true),
    recommendation: MenuCardDesignAdvisorRecommendationSchema,
    remainingBalance: z.object({
        billingStoreId: z.number().int().safe().positive(),
        monthlyCredits: z.number().int().safe().nonnegative(),
        topUpCredits: z.number().int().safe().nonnegative(),
    }).strict().nullable(),
    transaction: z.object({
        transactionId: z.string().trim().min(1).max(240).nullable(),
        unitsConsumed: z.number().int().safe().nonnegative(),
        processingTime: z.number().int().safe().nonnegative(),
    }).strict(),
}).strict();

export type MenuCardDesignAdvisorResponse = z.infer<typeof MenuCardDesignAdvisorResponseSchema>;

type MenuCardDesignAdvisorErrorResponse = {
    code?: unknown;
};

const getMenuCardDesignAdvisorLogContext = (
    payload: MenuCardDesignAdvisorRequest,
    response: Response,
    phase: string,
) => ({
    ...getBoundedAiServiceStringContext('projectId', payload.projectId),
    ...getBoundedAiServiceStringContext('sourceHash', payload.sourceHash),
    maxBytes: MENU_CARD_DESIGN_ADVISOR_RESPONSE_JSON_MAX_BYTES,
    phase,
    responseStatus: response.status,
});

async function readMenuCardDesignAdvisorResponseJson<T>(
    response: Response,
    payload: MenuCardDesignAdvisorRequest,
    phase: string,
): Promise<T | null> {
    try {
        return await readJsonResponseWithLimit<T>(
            response,
            MENU_CARD_DESIGN_ADVISOR_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logAiServiceFailure(
            'ai_menu_card_design_advisor_response_parse_failed',
            error,
            getMenuCardDesignAdvisorLogContext(payload, response, phase),
        );
        return null;
    }
}

export default async function getMenuCardDesignAdviceViaAPI(
    payload: MenuCardDesignAdvisorRequest,
): Promise<MenuCardDesignAdvisorResponse | null> {
    try {
        const response = await fetch('/api/menu-card-export/design-advisor', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.status === 403) {
            const errorJson = await readMenuCardDesignAdvisorResponseJson<MenuCardDesignAdvisorErrorResponse>(
                response,
                payload,
                'plan_gate',
            );
            if (errorJson?.code === 'plan_required') {
                throw new MenuCardDesignAdvisorPlanError();
            }
        }

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_menu_card_design_advisor_request_failed', response);
        }

        const responseJson = await readMenuCardDesignAdvisorResponseJson<unknown>(
            response,
            payload,
            'recommendation',
        );
        const parsed = MenuCardDesignAdvisorResponseSchema.safeParse(responseJson);
        if (!parsed.success) return null;
        syncBalanceFromResponse(parsed.data);
        return parsed.data;
    } catch (error) {
        if (error instanceof AICapacityError || error instanceof MenuCardDesignAdvisorPlanError) {
            throw error;
        }
        logAiServiceFailure('ai_menu_card_design_advisor_api_failed', error, {
            ...getBoundedAiServiceStringContext('projectId', payload.projectId),
            ...getBoundedAiServiceStringContext('sourceHash', payload.sourceHash),
        });
        return null;
    }
}
