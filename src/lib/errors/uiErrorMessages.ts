const TECHNICAL_ERROR_PATTERNS = [
    /missing or insufficient permissions/i,
    /insufficient permissions/i,
    /permission[-\s]?denied/i,
    /firebase(?:error)?/i,
    /failed-precondition/i,
    /internal assertion/i,
];

export function extractUiErrorMessage(error: unknown): string | null {
    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        return typeof message === 'string' ? message : null;
    }

    return null;
}

export function getSafeUiErrorMessage(error: unknown, fallback: string): string {
    const rawMessage = extractUiErrorMessage(error)?.replace(/^Error:\s*/i, '').trim();

    if (!rawMessage) {
        return fallback;
    }

    if (TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(rawMessage))) {
        return fallback;
    }

    return rawMessage;
}
