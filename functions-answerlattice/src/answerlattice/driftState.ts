export interface AutomatedDriftState {
    driftFlag: boolean;
    driftReason: string | null;
    shouldWrite: boolean;
}

/**
 * Automated drift evaluation is monotonic. It may raise drift or refresh the
 * detected reason, but only the governed manual-validation action may clear it.
 */
export function deriveAutomatedDriftState(
    previousDriftFlag: boolean,
    previousDriftReason: unknown,
    driftReasons: string[],
): AutomatedDriftState {
    const normalizedPreviousReason = typeof previousDriftReason === 'string' && previousDriftReason.trim()
        ? previousDriftReason.trim()
        : null;
    const normalizedReasons = driftReasons
        .map(reason => reason.trim())
        .filter(Boolean);

    if (normalizedReasons.length === 0) {
        return {
            driftFlag: previousDriftFlag,
            driftReason: normalizedPreviousReason,
            shouldWrite: false,
        };
    }

    const driftReason = normalizedReasons.join('; ');
    return {
        driftFlag: true,
        driftReason,
        shouldWrite: !previousDriftFlag || normalizedPreviousReason !== driftReason,
    };
}
