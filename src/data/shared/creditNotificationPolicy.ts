export type CreditNotificationDecision = {
    eventType: 'CREDITS_LOW' | 'CREDITS_EXHAUSTED' | null;
    lowThreshold: number;
};

export type CreditNotificationMilestone =
    | '70_percent_used'
    | '90_percent_used'
    | 'exhausted';

export type CreditNotificationMilestoneDecision = CreditNotificationDecision & {
    milestone: CreditNotificationMilestone | null;
    warningThreshold: number;
};

export function resolveCreditNotification(params: {
    monthlyAllowance: number;
    remainingCredits: number;
}): CreditNotificationDecision {
    const monthlyAllowance = Number.isSafeInteger(params.monthlyAllowance) && params.monthlyAllowance >= 0
        ? params.monthlyAllowance
        : 0;
    const remainingCredits = Number.isSafeInteger(params.remainingCredits) && params.remainingCredits >= 0
        ? params.remainingCredits
        : 0;
    const lowThreshold = Math.max(5, Math.ceil(monthlyAllowance * 0.1));
    return {
        eventType: remainingCredits === 0
            ? 'CREDITS_EXHAUSTED'
            : remainingCredits <= lowThreshold
                ? 'CREDITS_LOW'
                : null,
        lowThreshold,
    };
}

export function resolveCreditNotificationMilestone(params: {
    monthlyAllowance: number;
    previousRemainingCredits: number;
    remainingCredits: number;
}): CreditNotificationMilestoneDecision {
    const monthlyAllowance = Number.isSafeInteger(params.monthlyAllowance) && params.monthlyAllowance >= 0
        ? params.monthlyAllowance
        : 0;
    const previousRemainingCredits = Number.isSafeInteger(params.previousRemainingCredits) && params.previousRemainingCredits >= 0
        ? params.previousRemainingCredits
        : 0;
    const remainingCredits = Number.isSafeInteger(params.remainingCredits) && params.remainingCredits >= 0
        ? params.remainingCredits
        : 0;
    const warningThreshold = Math.max(5, Math.ceil(monthlyAllowance * 0.3));
    const lowThreshold = Math.max(5, Math.ceil(monthlyAllowance * 0.1));

    if (remainingCredits === 0 && previousRemainingCredits > 0) {
        return {
            eventType: 'CREDITS_EXHAUSTED',
            lowThreshold,
            milestone: 'exhausted',
            warningThreshold,
        };
    }
    if (remainingCredits <= lowThreshold && previousRemainingCredits > lowThreshold) {
        return {
            eventType: 'CREDITS_LOW',
            lowThreshold,
            milestone: '90_percent_used',
            warningThreshold,
        };
    }
    if (remainingCredits <= warningThreshold && previousRemainingCredits > warningThreshold) {
        return {
            eventType: 'CREDITS_LOW',
            lowThreshold,
            milestone: '70_percent_used',
            warningThreshold,
        };
    }
    return {
        eventType: null,
        lowThreshold,
        milestone: null,
        warningThreshold,
    };
}

// Compatibility export for the existing MenuList capacity producer.
export const resolveMenuListCreditNotification = resolveCreditNotification;
