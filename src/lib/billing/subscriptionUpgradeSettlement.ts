export interface SubscriptionUpgradeCreditTransferInput {
    calculatedRemainingCredits: unknown;
    currentNewTopUpCredits: unknown;
    oldSubscriptionId: string;
    replacementCarryForwardCredits: unknown;
    replacementCarryForwardFromSubscriptionId: string | null;
}

export interface SubscriptionUpgradeCreditTransfer {
    carryAlreadyApplied: boolean;
    carryForwardCredits: number;
    nextTopUpCredits: number;
    remainingCredits: number;
}

const MAX_CARRY_FORWARD_CREDITS = 1_000_000;

/**
 * Resolve upgrade credit arithmetic without touching Firestore. The existing
 * replacement balance is additive, while an already-recorded carry marker
 * makes retries preserve the stored balance instead of crediting it twice.
 */
export function resolveSubscriptionUpgradeCreditTransfer(
    params: SubscriptionUpgradeCreditTransferInput,
): SubscriptionUpgradeCreditTransfer | null {
    const calculatedRemainingCredits = Number(params.calculatedRemainingCredits);
    const currentNewTopUpCredits = Number(params.currentNewTopUpCredits);
    const storedCarryForwardCredits = Number(params.replacementCarryForwardCredits);
    const carryAlreadyApplied = params.replacementCarryForwardFromSubscriptionId === params.oldSubscriptionId;
    if (
        !Number.isFinite(calculatedRemainingCredits)
        || calculatedRemainingCredits < 0
        || !Number.isSafeInteger(currentNewTopUpCredits)
        || currentNewTopUpCredits < 0
        || (
            carryAlreadyApplied
            && (!Number.isSafeInteger(storedCarryForwardCredits) || storedCarryForwardCredits < 0)
        )
    ) {
        return null;
    }

    const remainingCredits = Math.max(
        0,
        Math.min(MAX_CARRY_FORWARD_CREDITS, Math.floor(calculatedRemainingCredits)),
    );
    const nextTopUpCredits = carryAlreadyApplied
        ? currentNewTopUpCredits
        : currentNewTopUpCredits + remainingCredits;
    if (!Number.isSafeInteger(nextTopUpCredits)) return null;

    return {
        carryAlreadyApplied,
        carryForwardCredits: carryAlreadyApplied ? storedCarryForwardCredits : remainingCredits,
        nextTopUpCredits,
        remainingCredits,
    };
}
