export const getAIProviderRetryAfter = (error: any): number | null => {
    const message = String(error?.message || error || '');
    const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
    if (retryMatch?.[1]) {
        return Math.max(1, Math.ceil(Number(retryMatch[1])));
    }
    return null;
};

export const isAIProviderRateLimitError = (error: any): boolean => {
    const message = String(error?.message || error || '').toLowerCase();
    return error?.status === 429 ||
        error?.httpStatusCode === 429 ||
        message.includes('429 too many requests') ||
        message.includes('resource_exhausted') ||
        message.includes('quota exceeded') ||
        message.includes('rate limit');
};
