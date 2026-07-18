export type ConfirmedResolutionHistoryRow = Readonly<{
    createdOnMillis: number;
    resolutionSubmittedAtMillis?: number;
    widgetSessionId?: string;
    resolutionOutcome?: 'resolved' | 'not_resolved';
}>;

export type ConfirmedResolutionMetrics = Readonly<{
    rate: number;
    confirmedResolved: number;
    confirmedNotResolved: number;
    explicitOutcomeTotal: number;
    recontactEligible: number;
    recontactedSameSession: number;
    observationWindowHours: number;
}>;

const toPercent = (numerator: number, denominator: number): number => (
    denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
);

export const calculateConfirmedResolutionMetrics = (
    historyRows: ReadonlyArray<ConfirmedResolutionHistoryRow>,
    observationWindowHours = 24,
): ConfirmedResolutionMetrics => {
    const explicitOutcomeRows = historyRows.filter(row => Boolean(row.resolutionOutcome));
    const confirmedResolvedRows = explicitOutcomeRows.filter(row => row.resolutionOutcome === 'resolved');
    const confirmedNotResolvedRows = explicitOutcomeRows.filter(row => row.resolutionOutcome === 'not_resolved');
    const observationWindowMs = observationWindowHours * 60 * 60 * 1000;
    const sessionRows = new Map<string, ConfirmedResolutionHistoryRow[]>();

    for (const row of historyRows) {
        if (!row.widgetSessionId || row.createdOnMillis <= 0) continue;
        const rows = sessionRows.get(row.widgetSessionId) || [];
        rows.push(row);
        sessionRows.set(row.widgetSessionId, rows);
    }
    sessionRows.forEach((rows) => {
        rows.sort((left, right) => left.createdOnMillis - right.createdOnMillis);
    });

    let recontactEligible = 0;
    let recontactedSameSession = 0;
    for (const row of confirmedResolvedRows) {
        const outcomeAtMillis = row.resolutionSubmittedAtMillis || row.createdOnMillis;
        if (!row.widgetSessionId || outcomeAtMillis <= 0) continue;
        recontactEligible++;
        const laterQueryExists = (sessionRows.get(row.widgetSessionId) || []).some(candidate => (
            candidate.createdOnMillis > outcomeAtMillis
            && candidate.createdOnMillis - outcomeAtMillis <= observationWindowMs
        ));
        if (laterQueryExists) recontactedSameSession++;
    }

    return {
        rate: toPercent(confirmedResolvedRows.length, explicitOutcomeRows.length),
        confirmedResolved: confirmedResolvedRows.length,
        confirmedNotResolved: confirmedNotResolvedRows.length,
        explicitOutcomeTotal: explicitOutcomeRows.length,
        recontactEligible,
        recontactedSameSession,
        observationWindowHours,
    };
};
