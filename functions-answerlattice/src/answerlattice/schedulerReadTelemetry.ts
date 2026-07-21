const MAX_READ_WINDOWS_PER_TASK = 8;
const MAX_IDENTIFIER_LENGTH = 80;
const MAX_COUNTER = 10_000_000;

export type AnswerlatticeSchedulerReadWindow = readonly [
    source: string,
    window: string,
    operationCount: number,
    documentsReturned: number,
    configuredLimit: number,
    saturated: 0 | 1,
];

type ReadWindowInput = {
    source: string;
    window: string;
    documentsReturned: number;
    queryLimit: number;
    saturated?: boolean;
};

function normalizeIdentifier(value: unknown): string | null {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_IDENTIFIER_LENGTH) return null;
    return /^[a-zA-Z0-9_:-]+$/.test(value) ? value : null;
}

function normalizeCounter(value: unknown): number | null {
    return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_COUNTER
        ? Number(value)
        : null;
}

/**
 * Collects logical source-window observations without changing task behavior.
 * These counters are not Firebase billing data: retries, index-entry reads,
 * uninstrumented direct reads, and provider costs remain outside this model.
 */
export class AnswerlatticeSchedulerReadObserver {
    private readonly windows = new Map<string, AnswerlatticeSchedulerReadWindow>();

    record(input: ReadWindowInput): void {
        const source = normalizeIdentifier(input.source);
        const window = normalizeIdentifier(input.window);
        const documentsReturned = normalizeCounter(input.documentsReturned);
        const queryLimit = normalizeCounter(input.queryLimit);
        if (!source || !window || documentsReturned === null || queryLimit === null) return;

        const key = `${source}\u0000${window}`;
        const current = this.windows.get(key);
        if (current) {
            this.windows.set(key, [
                source,
                window,
                Math.min(MAX_COUNTER, current[2] + 1),
                Math.min(MAX_COUNTER, current[3] + documentsReturned),
                Math.min(MAX_COUNTER, current[4] + queryLimit),
                current[5] === 1 || input.saturated === true ? 1 : 0,
            ]);
            return;
        }
        if (this.windows.size >= MAX_READ_WINDOWS_PER_TASK) return;

        this.windows.set(key, [
            source,
            window,
            1,
            documentsReturned,
            queryLimit,
            input.saturated === true ? 1 : 0,
        ]);
    }

    snapshot(): AnswerlatticeSchedulerReadWindow[] {
        return Array.from(this.windows.values());
    }
}
