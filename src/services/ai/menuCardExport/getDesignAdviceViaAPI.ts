import { logger } from '@lib/monitoring/logger';
import type { MenuCardDesignAdvisorRecommendation } from '@lib/menu-card-export/ai/designAdvisor';
import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';
import { syncBalanceFromResponse } from '@services/ai/balanceSync';
import { AICapacityError, checkCapacityResponse } from '@services/ai/capacityError';

export class MenuCardDesignAdvisorPlanError extends Error {
    public code = 'plan_required';

    constructor(message = 'Layout suggestions are included in Pro and Premium.') {
        super(message);
        this.name = 'MenuCardDesignAdvisorPlanError';
    }
}

export interface MenuCardDesignAdvisorResponse {
    recommendation: MenuCardDesignAdvisorRecommendation;
    remainingBalance?: {
        monthlyCredits: number;
        topUpCredits: number;
    } | null;
    transaction?: {
        transactionId: string | null;
        unitsConsumed: number;
        processingTime: number;
    };
}

export default async function getMenuCardDesignAdviceViaAPI(
    payload: MenuCardDesignAdvisorRequest,
): Promise<MenuCardDesignAdvisorResponse | null> {
    try {
        const response = await fetch('/api/menu-card-export/design-advisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.status === 403) {
            const errorJson = await response.json().catch(() => ({}));
            if (errorJson?.code === 'plan_required') {
                throw new MenuCardDesignAdvisorPlanError(errorJson.error);
            }
        }

        await checkCapacityResponse(response);
        if (!response.ok) {
            let serverMessage = response.statusText;
            try {
                const errorJson = await response.json();
                serverMessage = errorJson?.details || errorJson?.error || serverMessage;
            } catch {
                // Ignore JSON parse failure for error bodies.
            }
            throw new Error(`Menu card design advisor request failed: ${serverMessage}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        return responseJson?.recommendation ? responseJson : null;
    } catch (error) {
        if (error instanceof AICapacityError || error instanceof MenuCardDesignAdvisorPlanError) {
            throw error;
        }
        logger.error('Menu card design advisor API failed', error, {
            projectId: payload.projectId,
            sourceHash: payload.sourceHash,
        });
        return null;
    }
}
