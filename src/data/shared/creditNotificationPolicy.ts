export type CreditNotificationDecision = {
    eventType: 'CREDITS_LOW' | 'CREDITS_EXHAUSTED' | null;
    lowThreshold: number;
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

// Compatibility export for the existing MenuList capacity producer.
export const resolveMenuListCreditNotification = resolveCreditNotification;
