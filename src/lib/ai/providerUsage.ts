export type AiProviderUsageSummary = {
    candidatesTokenCount: number;
    promptTokenCount: number;
    providerCallCount: number;
    totalTokenCount: number;
};

const toTokenCount = (value: unknown): number => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.floor(value)
        : 0
);

const getUsageMetadata = (response: unknown): Record<string, unknown> => {
    if (!response || typeof response !== 'object' || Array.isArray(response)) return {};
    const record = response as Record<string, unknown>;
    const direct = record.usageMetadata;
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
        return direct as Record<string, unknown>;
    }
    const nestedResponse = record.response;
    if (nestedResponse && typeof nestedResponse === 'object' && !Array.isArray(nestedResponse)) {
        const nestedUsage = (nestedResponse as Record<string, unknown>).usageMetadata;
        if (nestedUsage && typeof nestedUsage === 'object' && !Array.isArray(nestedUsage)) {
            return nestedUsage as Record<string, unknown>;
        }
    }
    return {};
};

export function summarizeAiProviderUsage(responses: readonly unknown[]): AiProviderUsageSummary {
    return responses.reduce<AiProviderUsageSummary>((summary, response) => {
        const usage = getUsageMetadata(response);
        const promptTokenCount = toTokenCount(usage.promptTokenCount);
        const candidatesTokenCount = toTokenCount(usage.candidatesTokenCount);
        const reportedTotal = toTokenCount(usage.totalTokenCount);

        return {
            candidatesTokenCount: summary.candidatesTokenCount + candidatesTokenCount,
            promptTokenCount: summary.promptTokenCount + promptTokenCount,
            providerCallCount: summary.providerCallCount + 1,
            totalTokenCount: summary.totalTokenCount
                + (reportedTotal || promptTokenCount + candidatesTokenCount),
        };
    }, {
        candidatesTokenCount: 0,
        promptTokenCount: 0,
        providerCallCount: 0,
        totalTokenCount: 0,
    });
}
