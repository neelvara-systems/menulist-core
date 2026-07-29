const MAX_PROVIDER_CANDIDATES_TO_INSPECT = 100;
const MAX_PROVIDER_PARTS_TO_INSPECT = 100;

type UnknownRecord = Record<PropertyKey, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === 'object';
}

function readProperty(value: unknown, key: PropertyKey): unknown {
    if (!isRecord(value)) return undefined;
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
}

function readArray(
    value: unknown,
    key: PropertyKey,
    maxItems: number,
): { count: number; values: unknown[] } {
    const candidate = readProperty(value, key);
    if (!Array.isArray(candidate)) return { count: 0, values: [] };
    try {
        const count = candidate.length;
        const values: unknown[] = [];
        for (let index = 0; index < Math.min(count, maxItems); index += 1) {
            values.push(Reflect.get(candidate, index));
        }
        return { count, values };
    } catch {
        return { count: 0, values: [] };
    }
}

function readNonNegativeSafeInteger(value: unknown, key: PropertyKey): number | undefined {
    const candidate = readProperty(value, key);
    return typeof candidate === 'number'
        && Number.isSafeInteger(candidate)
        && candidate >= 0
        ? candidate
        : undefined;
}

function summarizeUsageMetadata(value: unknown): Record<string, number> | null {
    const summary = {
        cachedContentTokenCount: readNonNegativeSafeInteger(value, 'cachedContentTokenCount'),
        candidatesTokenCount: readNonNegativeSafeInteger(value, 'candidatesTokenCount'),
        promptTokenCount: readNonNegativeSafeInteger(value, 'promptTokenCount'),
        thoughtsTokenCount: readNonNegativeSafeInteger(value, 'thoughtsTokenCount'),
        totalTokenCount: readNonNegativeSafeInteger(value, 'totalTokenCount'),
    };
    const admitted = Object.entries(summary)
        .filter((entry): entry is [string, number] => entry[1] !== undefined);
    return admitted.length > 0 ? Object.fromEntries(admitted) : null;
}

export function summarizeImageProviderResponse(response: unknown) {
    const candidates = readArray(response, 'candidates', MAX_PROVIDER_CANDIDATES_TO_INSPECT);
    let imagePartCount = 0;
    let textPartCount = 0;

    for (const candidate of candidates.values) {
        const content = readProperty(candidate, 'content');
        const parts = readArray(content, 'parts', MAX_PROVIDER_PARTS_TO_INSPECT);
        for (const part of parts.values) {
            if (readProperty(part, 'inlineData') !== undefined) imagePartCount += 1;
            if (typeof readProperty(part, 'text') === 'string') textPartCount += 1;
        }
    }

    return {
        candidateCount: candidates.count,
        generatedImageCount: readArray(response, 'generatedImages', 0).count,
        imagePartCount,
        textPartCount,
        usageMetadata: summarizeUsageMetadata(readProperty(response, 'usageMetadata')),
    };
}
