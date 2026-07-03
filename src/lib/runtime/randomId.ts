let fallbackCounter = 0;

const getRuntimeCrypto = (): Crypto | undefined => (
    typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
);

const normalizeLength = (length: number): number => (
    Math.max(1, Math.floor(Number.isFinite(length) ? length : 12))
);

const normalizePrefix = (prefix: string): string => {
    const normalized = String(prefix || 'id')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
    return normalized || 'id';
};

const bytesToHex = (bytes: Uint8Array): string => (
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
);

const getRandomUuid = (): string | null => {
    const runtimeCrypto = getRuntimeCrypto();
    return typeof runtimeCrypto?.randomUUID === 'function'
        ? runtimeCrypto.randomUUID()
        : null;
};

export const createRandomIdSegment = (length = 12): string => {
    const segmentLength = normalizeLength(length);
    const uuid = getRandomUuid();
    if (uuid) return uuid.replace(/-/g, '').slice(0, segmentLength);

    const runtimeCrypto = getRuntimeCrypto();
    if (typeof runtimeCrypto?.getRandomValues === 'function') {
        const bytes = new Uint8Array(Math.ceil(segmentLength / 2));
        runtimeCrypto.getRandomValues(bytes);
        return bytesToHex(bytes).slice(0, segmentLength);
    }

    fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER;
    const fallback = `${Date.now().toString(36)}${fallbackCounter.toString(36).padStart(4, '0')}`;
    return fallback.padStart(segmentLength, '0').slice(-segmentLength);
};

export const createUppercaseRandomIdSegment = (length = 6): string => (
    createRandomIdSegment(length).toUpperCase()
);

export const createRuntimeId = (prefix = 'id'): string => {
    const normalizedPrefix = normalizePrefix(prefix);
    const uuid = getRandomUuid();
    if (uuid) return `${normalizedPrefix}_${uuid}`;
    return `${normalizedPrefix}_${Date.now().toString(36)}_${createRandomIdSegment(12)}`;
};

export const createTimestampedRuntimeId = (prefix = 'id', segmentLength = 8): string => (
    `${normalizePrefix(prefix)}_${Date.now().toString(36)}_${createRandomIdSegment(segmentLength)}`
);
