const DEFAULT_AI_ACTION_PROGRESS_LABEL = 'Working on it...';

export function normalizeAiActionProgressLabels(labels: readonly unknown[]): string[] {
    const normalized = labels
        .filter((label): label is string => typeof label === 'string')
        .map((label) => label.trim())
        .filter(Boolean);

    return normalized.length > 0 ? normalized : [DEFAULT_AI_ACTION_PROGRESS_LABEL];
}

export function getAiActionProgressLabel(labels: readonly unknown[], index: unknown): string {
    const normalized = normalizeAiActionProgressLabels(labels);
    const numericIndex = typeof index === 'number' && Number.isFinite(index)
        ? Math.trunc(index)
        : 0;
    const boundedIndex = ((numericIndex % normalized.length) + normalized.length) % normalized.length;
    return normalized[boundedIndex];
}
