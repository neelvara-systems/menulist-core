export function getReusableEmbeddingVectorDimensions(vector: unknown): number {
    if (!vector || typeof vector !== 'object' || Array.isArray(vector)) return 0;
    const candidate = vector as {
        values?: unknown;
        _values?: unknown;
        toArray?: () => unknown;
    };

    let values: unknown;
    try {
        values = typeof candidate.toArray === 'function'
            ? candidate.toArray()
            : candidate.values ?? candidate._values;
    } catch {
        return 0;
    }
    if (!Array.isArray(values) || values.length === 0) return 0;

    let nonZero = false;
    for (const value of values) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
        if (value !== 0) nonZero = true;
    }
    return nonZero ? values.length : 0;
}

export function isValidGeneratedEmbeddingVector(vector: unknown, expectedDimensions: number): vector is number[] {
    if (!Array.isArray(vector) || vector.length !== expectedDimensions) return false;
    let nonZero = false;
    for (const value of vector) {
        if (typeof value !== 'number' || !Number.isFinite(value)) return false;
        if (value !== 0) nonZero = true;
    }
    return nonZero;
}
