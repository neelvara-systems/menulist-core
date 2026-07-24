export const getNonNegativeCreditInteger = (value: unknown): number | null => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
        ? value
        : null
);

export const getPositiveCreditInteger = (value: unknown): number | null => {
    const credit = getNonNegativeCreditInteger(value);
    return credit !== null && credit > 0 ? credit : null;
};

export const getCreditBillingPeriodKey = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
    const year = Math.floor(value / 100);
    const month = value % 100;
    return year >= 2000 && year <= 9999 && month >= 1 && month <= 12
        ? value
        : null;
};
