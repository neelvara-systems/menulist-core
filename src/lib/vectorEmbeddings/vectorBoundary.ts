export const isValidEmbeddingVector = (
    value: unknown,
    expectedDimensions: number,
): value is number[] => {
    if (!Array.isArray(value) || value.length !== expectedDimensions) return false;

    let hasNonZeroValue = false;
    for (const item of value) {
        if (typeof item !== 'number' || !Number.isFinite(item)) return false;
        if (item !== 0) hasNonZeroValue = true;
    }

    return hasNonZeroValue;
};
