const MAX_SAFE_UI_ERROR_LENGTH = 160;

const TECHNICAL_ERROR_PATTERNS = [
    /missing or insufficient permissions/i,
    /insufficient permissions/i,
    /permission[-\s]?denied/i,
    /firebase(?:error)?/i,
    /firestore/i,
    /failed-precondition/i,
    /internal assertion/i,
    /razorpay/i,
    /googleapis/i,
    /api[_-\s]?key/i,
    /authorization/i,
    /session/i,
    /cookie/i,
    /stack/i,
    /typeerror/i,
    /referenceerror/i,
    /syntaxerror/i,
    /\bat\s+\S+\s*\(/i,
    /https?:\/\//i,
    /\/api\//i,
];

const TECHNICAL_ERROR_SHAPE_PATTERN = /[\r\n\t{}[\]`]|[A-Z0-9_]{8,}/;

type SafeUiErrorMessageOptions = {
    allowTrustedPlainText?: boolean;
};

export function extractUiErrorMessage(error: unknown): string | null {
    if (typeof error === 'string') {
        return error;
    }

    if (error && typeof error === 'object') {
        try {
            if (!Object.prototype.hasOwnProperty.call(error, 'message')) {
                return null;
            }
            const message = Reflect.get(error, 'message');
            return typeof message === 'string' ? message : null;
        } catch {
            return null;
        }
    }

    return null;
}

export function getSafeUiErrorMessage(
    error: unknown,
    fallback: string,
    options: SafeUiErrorMessageOptions = {},
): string {
    const rawMessage = extractUiErrorMessage(error)?.replace(/^Error:\s*/i, '').trim();

    if (!rawMessage) {
        return fallback;
    }

    if (rawMessage.length > MAX_SAFE_UI_ERROR_LENGTH || TECHNICAL_ERROR_SHAPE_PATTERN.test(rawMessage)) {
        return fallback;
    }

    if (TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(rawMessage))) {
        return fallback;
    }

    if (!options.allowTrustedPlainText) {
        return fallback;
    }

    return rawMessage;
}
